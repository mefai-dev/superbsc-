"""Binance margin data — public VIP interest rates."""

from fastapi import APIRouter

from proxy.cache import fetch_json

router = APIRouter()
BAPI = "https://www.binance.com/bapi"


@router.get("/vip-rates")
async def vip_rates():
    """All margin assets with daily interest rates across VIP tiers (0-9)."""
    return await fetch_json(
        f"{BAPI}/margin/v1/public/margin/vip/spec/list-all",
        ttl=300,
    )
