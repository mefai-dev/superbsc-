import asyncio
import logging
import os

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from fastapi.middleware.gzip import GZipMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse
from slowapi import Limiter, _rate_limit_exceeded_handler
from slowapi.util import get_remote_address
from slowapi.errors import RateLimitExceeded

from proxy.routes import (
    spot,
    meme_rush,
    signals,
    token_info,
    market_rank,
    token_audit,
    address,
    futures,
    goplus,
    dexscreener,
    coingecko,
    etherscan,
    defillama,
    p2p,
    announcements,
    earn,
    margin,
    products,
    bnbchain,
    btc_macro,
    deribit,
    onchain,
    binance_options,
)
from proxy.routes import scanner as scanner_routes
from proxy.cache import fetch_json, post_json
from proxy.config import settings

logger = logging.getLogger("mefai")

# Rate limiter — 200 requests/minute per IP (generous for active trading)
limiter = Limiter(key_func=get_remote_address, default_limits=["200/minute"])

app = FastAPI(title="MEFAI Terminal Proxy", version="1.0.0")
app.state.limiter = limiter
app.add_exception_handler(RateLimitExceeded, _rate_limit_exceeded_handler)

# GZip — compress responses > 500 bytes (huge savings on JSON)
app.add_middleware(GZipMiddleware, minimum_size=500)

# CORS — no credentials needed (no cookies/auth), so use wildcard safely
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=False,
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
app.include_router(futures.router, prefix="/api/futures", tags=["Skill 8: Futures"])
app.include_router(goplus.router, prefix="/api/goplus", tags=["Skill 9: GoPlus"])
app.include_router(
    dexscreener.router, prefix="/api/dex", tags=["Skill 10: DexScreener"]
)
app.include_router(
    coingecko.router, prefix="/api/coingecko", tags=["Skill 11: CoinGecko"]
)
app.include_router(
    etherscan.router, prefix="/api/etherscan", tags=["Skill 12: Etherscan"]
)
app.include_router(
    defillama.router, prefix="/api/defillama", tags=["Skill 13: DefiLlama"]
)
app.include_router(p2p.router, prefix="/api/p2p", tags=["Skill 14: P2P"])
app.include_router(
    announcements.router, prefix="/api/announcements", tags=["Skill 15: Announcements"]
)
app.include_router(earn.router, prefix="/api/earn", tags=["Skill 17: Earn"])
app.include_router(margin.router, prefix="/api/margin", tags=["Skill 18: Margin"])
app.include_router(products.router, prefix="/api/products", tags=["Skill 19: Products"])
app.include_router(
    bnbchain.router, prefix="/api/bnbchain", tags=["Skill 20: BNB Chain"]
)
app.include_router(
    btc_macro.router, prefix="/api/btc-macro", tags=["Skill 23: BTC Macro"]
)
app.include_router(
    deribit.router, prefix="/api/deribit", tags=["Skill 24: Deribit Options"]
)
app.include_router(onchain.router, prefix="/api/onchain", tags=["Skill 25: On-Chain"])
app.include_router(
    binance_options.router,
    prefix="/api/options",
    tags=["Skill 26: Binance Options"],
)

# Serve frontend
frontend_dir = os.path.join(os.path.dirname(os.path.dirname(__file__)), "frontend")
app.mount("/static", StaticFiles(directory=frontend_dir), name="static")


@app.get("/health")
async def health():
    return {"status": "ok", "service": "mefai-terminal"}


@app.get("/")
async def index():
    return FileResponse(
        os.path.join(frontend_dir, "index.html"),
        headers={"Cache-Control": "no-cache, must-revalidate"},
    )


@app.get("/dna")
async def dna_page():
    return FileResponse(
        os.path.join(frontend_dir, "dna.html"),
        headers={"Cache-Control": "no-cache, must-revalidate"},
    )


# All warmup URLs
def _warmup_tasks():
    WEB3 = settings.WEB3_BASE
    SPOT = settings.SPOT_BASE
    FAPI2 = "http://46.101.148.181:9500"
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
        # FAPI2 (Frankfurt proxy — futures endpoints)
        (fetch_json, (f"{FAPI2}/fapi/v1/indexInfo",), {"ttl": 120}),
        (fetch_json, (f"{FAPI2}/fapi/v1/fundingInfo",), {"ttl": 300}),
        (
            fetch_json,
            (f"{FAPI2}/futures/data/openInterestHist",),
            {"params": {"symbol": "BTCUSDT", "period": "1h", "limit": 30}, "ttl": 60},
        ),
        (fetch_json, (f"{FAPI2}/fapi/v1/ticker/bookTicker",), {"ttl": 10}),
        (
            fetch_json,
            (f"{FAPI2}/futures/data/takerlongshortRatio",),
            {"params": {"symbol": "BTCUSDT", "period": "1h", "limit": 1}, "ttl": 60},
        ),
        (
            fetch_json,
            (f"{FAPI2}/futures/data/topLongShortPositionRatio",),
            {"params": {"symbol": "BTCUSDT", "period": "1h", "limit": 1}, "ttl": 60},
        ),
        # CoinGecko categories (capital rotation)
        (
            fetch_json,
            ("https://api.coingecko.com/api/v3/coins/categories",),
            {"params": {"order": "market_cap_desc"}, "ttl": 120},
        ),
        # CoinGecko global
        (fetch_json, ("https://api.coingecko.com/api/v3/global",), {"ttl": 60}),
        # DefiLlama protocols + stablecoins
        (fetch_json, ("https://api.llama.fi/protocols",), {"ttl": 300}),
        (
            fetch_json,
            ("https://stablecoins.llama.fi/stablecoins",),
            {"params": {"includePrices": "true"}, "ttl": 300},
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
        try:
            await asyncio.sleep(45)
        except asyncio.CancelledError:
            logger.info("Periodic refresh task cancelled")
            return
        try:
            tasks = [fn(*args, **kwargs) for fn, args, kwargs in _warmup_tasks()]
            await asyncio.gather(*tasks, return_exceptions=True)
        except asyncio.CancelledError:
            logger.info("Periodic refresh task cancelled")
            return
        except Exception as e:
            logger.debug(f"Periodic refresh error: {e}")
