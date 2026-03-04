"""CoinGecko API proxy — sector/category data for capital rotation."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()
CG = "https://api.coingecko.com/api/v3"


@router.get("/categories")
async def categories(order: str = Query("market_cap_desc")):
    """All crypto categories with market cap, volume, 24h change."""
    return await fetch_json(f"{CG}/coins/categories", params={"order": order}, ttl=120)


@router.get("/category-coins")
async def category_coins(
    category: str = Query(...),
    per_page: int = Query(20, ge=1, le=250),
):
    """Top coins within a specific category."""
    return await fetch_json(
        f"{CG}/coins/markets",
        params={
            "vs_currency": "usd",
            "category": category,
            "per_page": per_page,
            "page": 1,
        },
        ttl=120,
    )


@router.get("/global")
async def global_data():
    """Global crypto market data — total mcap, volume, dominance."""
    return await fetch_json(f"{CG}/global", ttl=60)


@router.get("/global-defi")
async def global_defi():
    """Global DeFi market data — DeFi mcap, ratio, top coin."""
    return await fetch_json(f"{CG}/global/decentralized_finance_defi", ttl=60)
