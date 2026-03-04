"""DexScreener API proxy — new token discovery."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()
DEX = "https://api.dexscreener.com"


@router.get("/latest-profiles")
async def latest_profiles():
    """Get newest token profiles across chains."""
    return await fetch_json(f"{DEX}/token-profiles/latest/v1", ttl=30)


@router.get("/search")
async def search_tokens(
    q: str = Query(..., min_length=1),
    chainIds: str = Query("bsc"),
):
    """Search tokens on DexScreener."""
    return await fetch_json(
        f"{DEX}/latest/dex/search",
        params={"q": q, "chainIds": chainIds},
        ttl=30,
    )


@router.get("/pairs")
async def get_pairs(
    chain: str = Query("bsc"),
    pairAddress: str = Query(...),
):
    """Get pair data by address."""
    return await fetch_json(f"{DEX}/latest/dex/pairs/{chain}/{pairAddress}", ttl=30)


@router.get("/token")
async def get_token(address: str = Query(...)):
    """Get token info from DexScreener."""
    return await fetch_json(f"{DEX}/latest/dex/tokens/{address}", ttl=30)


@router.get("/token-chain")
async def get_token_chain(
    chain: str = Query("bsc"),
    address: str = Query(...),
):
    """Get token pairs filtered by chain."""
    return await fetch_json(f"{DEX}/tokens/v1/{chain}/{address}", ttl=30)


@router.get("/top-boosts")
async def top_boosts():
    """Top boosted tokens on DexScreener."""
    return await fetch_json(f"{DEX}/token-boosts/top/v1", ttl=30)
