"""DefiLlama API proxy — yields, protocols, stablecoins."""

from fastapi import APIRouter
from proxy.cache import fetch_json

router = APIRouter()

YIELDS = "https://yields.llama.fi"
API = "https://api.llama.fi"
STABLES = "https://stablecoins.llama.fi"


@router.get("/yields")
async def yields():
    """DeFi yield pools across all chains."""
    return await fetch_json(f"{YIELDS}/pools", ttl=120)


@router.get("/protocols")
async def protocols():
    """All DeFi protocols with TVL data."""
    return await fetch_json(f"{API}/protocols", ttl=300)


@router.get("/stablecoins")
async def stablecoins():
    """All stablecoins with chain circulating supply."""
    return await fetch_json(f"{STABLES}/stablecoins", params={"includePrices": "true"}, ttl=300)


@router.get("/stablecoin-chains")
async def stablecoin_chains():
    """Stablecoin circulating amounts per chain."""
    return await fetch_json(f"{STABLES}/stablecoinchains", ttl=300)
