import hashlib
import hmac
import time
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from fastapi.requests import Request

from proxy.cache import fetch_json, get_client
from proxy.config import settings

router = APIRouter()

BASE = settings.SPOT_BASE


def _sign(params: dict) -> dict:
    """Add timestamp and HMAC-SHA256 signature to params."""
    if not settings.has_api_key:
        raise HTTPException(status_code=403, detail="Binance API key not configured")
    params["timestamp"] = int(time.time() * 1000)
    query_string = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    signature = hmac.new(
        settings.binance_api_secret.encode(),
        query_string.encode(),
        hashlib.sha256,
    ).hexdigest()
    params["signature"] = signature
    return params


async def _signed_get(path: str, params: dict) -> dict:
    """Execute a signed GET request against Binance."""
    params = _sign(params)
    client = await get_client()
    resp = await client.get(
        f"{BASE}{path}",
        params=params,
        headers={"X-MBX-APIKEY": settings.binance_api_key},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


async def _signed_post(path: str, params: dict) -> dict:
    """Execute a signed POST request against Binance."""
    params = _sign(params)
    client = await get_client()
    resp = await client.post(
        f"{BASE}{path}",
        params=params,
        headers={"X-MBX-APIKEY": settings.binance_api_key},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


_tickers_cache = {"data": None, "ts": 0}


@router.get("/tickers")
async def tickers(
    symbols: Optional[str] = Query(None, description="Comma-separated symbols"),
):
    """Get 24hr ticker data — pre-filtered USDT pairs, sorted by volume."""
    import time as _time

    # Aggressive caching: keep tickers for 30s in a dedicated fast-path cache
    now = _time.time()
    if symbols:
        # Single symbol request
        url = f"{BASE}/api/v3/ticker/24hr"
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        if len(symbol_list) == 1:
            return await fetch_json(url, params={"symbol": symbol_list[0]}, ttl=30)
        import json as _json

        return await fetch_json(
            url, params={"symbols": _json.dumps(symbol_list)}, ttl=30
        )

    # No params = all tickers — use aggressive cache + filter
    if _tickers_cache["data"] and now - _tickers_cache["ts"] < 30:
        return _tickers_cache["data"]

    url = f"{BASE}/api/v3/ticker/24hr"
    raw = await fetch_json(url, ttl=30)
    if not isinstance(raw, list):
        return raw  # error passthrough

    # Filter USDT pairs with meaningful volume, take top 100
    filtered = sorted(
        [
            t
            for t in raw
            if t.get("symbol", "").endswith("USDT")
            and float(t.get("quoteVolume", 0)) > 50000
        ],
        key=lambda x: float(x.get("quoteVolume", 0)),
        reverse=True,
    )[:100]
    _tickers_cache["data"] = filtered
    _tickers_cache["ts"] = now
    return filtered


@router.get("/ticker")
async def ticker(symbol: str = Query(..., description="Trading pair, e.g. BTCUSDT")):
    """Get latest price for a single symbol."""
    url = f"{BASE}/api/v3/ticker/price"
    params = {"symbol": symbol.upper()}
    return await fetch_json(url, params=params, ttl=60)


@router.get("/depth")
async def depth(
    symbol: str = Query(..., description="Trading pair, e.g. BTCUSDT"),
    limit: int = Query(20, description="Order book depth limit"),
):
    """Get order book depth for a symbol."""
    url = f"{BASE}/api/v3/depth"
    params = {"symbol": symbol.upper(), "limit": limit}
    return await fetch_json(url, params=params, ttl=5)


@router.get("/klines")
async def klines(
    symbol: str = Query(..., description="Trading pair, e.g. BTCUSDT"),
    interval: str = Query("1h", description="Kline interval, e.g. 1m, 5m, 1h, 1d"),
    limit: int = Query(100, description="Number of klines to return"),
):
    """Get kline/candlestick data for a symbol."""
    url = f"{BASE}/api/v3/klines"
    params = {"symbol": symbol.upper(), "interval": interval, "limit": limit}
    return await fetch_json(url, params=params, ttl=60)


@router.get("/account")
async def account():
    """Get account information (HMAC-signed, requires API key)."""
    return await _signed_get("/api/v3/account", {})


@router.get("/orders")
async def open_orders(
    symbol: Optional[str] = Query(None, description="Filter by symbol"),
):
    """Get open orders (HMAC-signed, requires API key)."""
    params = {}
    if symbol:
        params["symbol"] = symbol.upper()
    return await _signed_get("/api/v3/openOrders", params)


@router.post("/order")
async def place_order(
    request: Request, test: bool = Query(False, description="Use test endpoint")
):
    """Place an order (HMAC-signed, requires API key). Set test=true for test mode."""
    body = await request.json()
    params = {}
    for key in (
        "symbol",
        "side",
        "type",
        "timeInForce",
        "quantity",
        "price",
        "stopPrice",
        "newOrderRespType",
    ):
        if key in body:
            params[key] = body[key]
    if not params.get("symbol") or not params.get("side") or not params.get("type"):
        raise HTTPException(
            status_code=400, detail="symbol, side, and type are required"
        )
    params["symbol"] = params["symbol"].upper()
    path = "/api/v3/order/test" if test else "/api/v3/order"
    return await _signed_post(path, params)
