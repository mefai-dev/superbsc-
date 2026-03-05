"""Binance Options (EAPI) — public market data, no auth."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()

# Geo-restricted — use Frankfurt proxy
EAPI = "http://46.101.148.181:9500/eapi/v1"


@router.get("/mark")
async def mark_prices():
    """Mark price and Greeks for all option contracts."""
    return await fetch_json(f"{EAPI}/mark", ttl=30)


@router.get("/ticker")
async def ticker():
    """24hr ticker for all option contracts."""
    return await fetch_json(f"{EAPI}/ticker", ttl=30)


@router.get("/exchange-info")
async def exchange_info():
    """All active option contracts — strikes, expiries, types."""
    return await fetch_json(f"{EAPI}/exchangeInfo", ttl=600)


@router.get("/open-interest")
async def open_interest(
    underlyingAsset: str = Query("BTC"),
    expiration: str = Query(None, description="Expiry date e.g. 260626"),
):
    """Open interest by expiry and strike."""
    params = {"underlyingAsset": underlyingAsset}
    if expiration:
        params["expiration"] = expiration
    return await fetch_json(f"{EAPI}/openInterest", params=params, ttl=60)


@router.get("/exercise-history")
async def exercise_history(
    underlyingAsset: str = Query("BTC"),
):
    """Historical exercise/settlement data."""
    return await fetch_json(
        f"{EAPI}/exerciseHistory",
        params={"underlyingAsset": underlyingAsset},
        ttl=300,
    )


@router.get("/depth")
async def depth(
    symbol: str = Query(..., description="Option symbol e.g. BTC-260626-80000-C"),
    limit: int = Query(20, ge=5, le=100),
):
    """Option order book."""
    return await fetch_json(
        f"{EAPI}/depth", params={"symbol": symbol, "limit": limit}, ttl=10
    )
