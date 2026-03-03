import asyncio
import logging

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
import os

from proxy.routes import spot, meme_rush, signals, token_info, market_rank, token_audit, address
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


# Warm-up cache on startup — pre-fetch overview panel data
@app.on_event("startup")
async def warmup_cache():
    WEB3 = settings.WEB3_BASE
    SPOT = settings.SPOT_BASE
    logger.info("Warming up cache...")
    tasks = [
        # Overview layout panels: Market Overview, Trending, Smart Signals, Token Profile
        fetch_json(f"{SPOT}/api/v3/ticker/24hr", ttl=60),
        post_json(f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/unified/rank/list", body={"page": 1, "size": 20}, ttl=60),
        post_json(f"{WEB3}/v1/public/wallet-direct/buw/wallet/web/signal/smart-money", body={"page": 1, "pageSize": 20, "smartSignalType": "", "chainId": "56"}, ttl=60),
        fetch_json(f"{WEB3}/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info", params={"chainId": "56", "contractAddress": "0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c"}, ttl=60),
        # Other frequently used
        fetch_json(f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/exclusive/rank/list", params={"chainId": "56", "page": 1, "size": 50}, ttl=60),
        fetch_json(f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/social/hype/rank/leaderboard", params={"chainId": "56", "page": 1, "size": 20, "targetLanguage": "en", "timeRange": 1}, ttl=60),
    ]
    results = await asyncio.gather(*tasks, return_exceptions=True)
    ok = sum(1 for r in results if not isinstance(r, Exception) and not (isinstance(r, dict) and r.get("error")))
    logger.info(f"Cache warm-up complete: {ok}/{len(tasks)} endpoints cached")
