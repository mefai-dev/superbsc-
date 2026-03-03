import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from proxy.routes import (
    spot,
    meme_rush,
    signals,
    token_info,
    market_rank,
    token_audit,
    address,
)
from proxy.routes import scanner as scanner_routes
from proxy.cache import fetch_json, post_json
from proxy.config import settings

logger = logging.getLogger("mefai")

app = FastAPI(title="MEFAI Terminal Proxy", version="1.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

# Mount API routes
app.include_router(spot.router, prefix="/api/spot", tags=["Skill 1: Spot CEX"])
app.include_router(meme_rush.router, prefix="/api/meme", tags=["Skill 2: Meme Rush"])
app.include_router(address.router, prefix="/api/address", tags=["Skill 3: Address"])
app.include_router(signals.router, prefix="/api/signals", tags=["Skill 4: Signals"])
app.include_router(market_rank.router, prefix="/api/rank", tags=["Skill 5: Rankings"])
app.include_router(token_audit.router, prefix="/api/audit", tags=["Skill 6: Audit"])
app.include_router(token_info.router, prefix="/api/token", tags=["Skill 7: Token Info"])
app.include_router(scanner_routes.router, prefix="/api/scanner", tags=["Auto-Scanner"])

# Serve frontend
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mefai-terminal"}


@app.get("/")
async def index():
    return FileResponse(os.path.join(frontend_dir, "index.html"))


# All warmup URLs
def _warmup_tasks():
    WEB3 = settings.WEB3_BASE
    SPOT = settings.SPOT_BASE
    return [
        # Spot
        (fetch_json, (f"{SPOT}/api/v3/ticker/24hr",), {}),
        (
            fetch_json,
            (f"{SPOT}/api/v3/depth",),
            {"params": {"symbol": "BTCUSDT", "limit": 20}},
        ),
        (
            fetch_json,
            (f"{SPOT}/api/v3/klines",),
            {"params": {"symbol": "BTCUSDT", "interval": "1h", "limit": 100}},
        ),
        # Trending + Signals
        (
            post_json,
            (
                f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/unified/rank/list",
            ),
            {"body": {"page": 1, "size": 20}},
        ),
        (
            post_json,
            (f"{WEB3}/v1/public/wallet-direct/buw/wallet/web/signal/smart-money",),
            {
                "body": {
                    "page": 1,
                    "pageSize": 20,
                    "smartSignalType": "",
                    "chainId": "56",
                }
            },
        ),
        # Token profile (BNB default)
        (
            fetch_json,
            (f"{WEB3}/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info",),
            {
                "params": {
                    "chainId": "56",
                    "contractAddress": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c",
                }
            },
        ),
        # Meme + Social + Traders
        (
            fetch_json,
            (
                f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/exclusive/rank/list",
            ),
            {"params": {"chainId": "56", "page": 1, "size": 50}},
        ),
        (
            fetch_json,
            (
                f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/social/hype/rank/leaderboard",
            ),
            {
                "params": {
                    "chainId": "56",
                    "page": 1,
                    "size": 20,
                    "targetLanguage": "en",
                    "timeRange": 1,
                }
            },
        ),
        (
            fetch_json,
            (f"{WEB3}/v1/public/wallet-direct/market/leaderboard/query",),
            {
                "params": {
                    "chainId": "56",
                    "tag": "ALL",
                    "pageNo": 1,
                    "pageSize": 25,
                    "sortBy": 0,
                    "orderBy": 0,
                    "period": "7d",
                }
            },
        ),
        (
            post_json,
            (f"{WEB3}/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query",),
            {"body": {"chainId": "CT_501", "tagType": 2}},
        ),
        (
            post_json,
            (
                f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/rank/list",
            ),
            {"body": {"chainId": "56", "rankType": 10, "limit": 20}},
        ),
        (
            fetch_json,
            (
                f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/social-rush/rank/list",
            ),
            {"params": {"chainId": "56", "rankType": 10, "sort": 10}},
        ),
    ]


@app.on_event("startup")
async def warmup_cache():
    logger.info("Warming up cache (all endpoints)...")
    tasks = [fn(*args, **kwargs) for fn, args, kwargs in _warmup_tasks()]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ok = sum(
        1
        for r in results
        if not isinstance(r, Exception) and not (isinstance(r, dict) and r.get("error"))
    )
    logger.info(f"Cache warm-up complete: {ok}/{len(tasks)} endpoints cached")
    # Start periodic background refresh every 45 seconds
    asyncio.create_task(_periodic_refresh())


async def _periodic_refresh():
    """Background task: refresh all cached data every 45s so users always get instant responses."""
    while True:
        await asyncio.sleep(45)
        try:
            tasks = [fn(*args, **kwargs) for fn, args, kwargs in _warmup_tasks()]
            await asyncio.gather(*tasks, return_exceptions=True)
        except Exception:
            pass
