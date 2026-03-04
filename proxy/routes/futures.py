"""Binance USDM Futures — public market data (no auth needed)."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()
# Direct access is geo-blocked; use Frankfurt proxy which has unrestricted access
FAPI = "http://134.122.77.171:9500"


@router.get("/premiumIndex")
async def premium_index(symbol: str = Query(None)):
    """Mark price + funding rate for one or all symbols."""
    params = {}
    if symbol:
        params["symbol"] = symbol.upper()
    return await fetch_json(f"{FAPI}/fapi/premiumIndex", params=params or None, ttl=15)


@router.get("/ticker24hr")
async def ticker_24hr(symbol: str = Query(None)):
    params = {}
    if symbol:
        params["symbol"] = symbol.upper()
    return await fetch_json(f"{FAPI}/fapi/ticker24hr", params=params or None, ttl=15)


@router.get("/openInterest")
async def open_interest(symbol: str = Query("BTCUSDT")):
    return await fetch_json(
        f"{FAPI}/fapi/openInterest", params={"symbol": symbol.upper()}, ttl=30
    )


@router.get("/longShortRatio")
async def long_short_ratio(
    symbol: str = Query("BTCUSDT"),
    period: str = Query("1h"),
    limit: int = Query(1, le=500),
):
    return await fetch_json(
        f"{FAPI}/futures/data/globalLongShortAccountRatio",
        params={"symbol": symbol.upper(), "period": period, "limit": limit},
        ttl=60,
    )


@router.get("/fundingHistory")
async def funding_history(
    symbol: str = Query("BTCUSDT"),
    limit: int = Query(10, le=1000),
):
    return await fetch_json(
        f"{FAPI}/fapi/fundingRate",
        params={"symbol": symbol.upper(), "limit": limit},
        ttl=60,
    )


@router.get("/topLongShortPosition")
async def top_ls_position(
    symbol: str = Query("BTCUSDT"),
    period: str = Query("1h"),
    limit: int = Query(1, le=500),
):
    return await fetch_json(
        f"{FAPI}/futures/data/topLongShortPositionRatio",
        params={"symbol": symbol.upper(), "period": period, "limit": limit},
        ttl=60,
    )


@router.get("/takerBuySellRatio")
async def taker_ratio(
    symbol: str = Query("BTCUSDT"),
    period: str = Query("1h"),
    limit: int = Query(1, le=500),
):
    return await fetch_json(
        f"{FAPI}/futures/data/takerlongshortRatio",
        params={"symbol": symbol.upper(), "period": period, "limit": limit},
        ttl=60,
    )
