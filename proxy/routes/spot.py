import hashlib
import hmac
import time
from typing import Optional

from fastapi import APIRouter, Query, HTTPException
from fastapi.requests import Request

from proxy.cache import fetch_json, post_json, get_client
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


@router.get("/tickers")
async def tickers(symbols: Optional[str] = Query(None, description="Comma-separated symbols, e.g. BTCUSDT,ETHUSDT")):
    """Get 24hr ticker data for all or selected symbols."""
    url = f"{BASE}/api/v3/ticker/24hr"
    params = {}
    if symbols:
        symbol_list = [s.strip().upper() for s in symbols.split(",")]
        if len(symbol_list) == 1:
            params["symbol"] = symbol_list[0]
        else:
            params["symbols"] = str(symbol_list).replace("'", '"')
    return await fetch_json(url, params=params, ttl=60)


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
    return await fetch_json(url, params=params, ttl=60)


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
async def place_order(request: Request, test: bool = Query(False, description="Use test endpoint")):
    """Place an order (HMAC-signed, requires API key). Set test=true for test mode."""
    body = await request.json()
    params = {}
    for key in ("symbol", "side", "type", "timeInForce", "quantity", "price", "stopPrice", "newOrderRespType"):
        if key in body:
            params[key] = body[key]
    if not params.get("symbol") or not params.get("side") or not params.get("type"):
        raise HTTPException(status_code=400, detail="symbol, side, and type are required")
    params["symbol"] = params["symbol"].upper()
    path = "/api/v3/order/test" if test else "/api/v3/order"
    return await _signed_post(path, params)
