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
    return await fetch_json(
        f"{STABLES}/stablecoins", params={"includePrices": "true"}, ttl=300
    )


@router.get("/stablecoin-chains")
async def stablecoin_chains():
    """Stablecoin circulating amounts per chain."""
    return await fetch_json(f"{STABLES}/stablecoinchains", ttl=300)


@router.get("/dex-volume")
async def dex_volume():
    """BSC DEX volume overview — 129+ protocols."""
    return await fetch_json(f"{API}/overview/dexs/BSC", ttl=120)


@router.get("/fees")
async def fees():
    """BSC protocol fees & revenue — 237+ protocols."""
    return await fetch_json(f"{API}/overview/fees/BSC", ttl=120)


@router.get("/chain-tvl")
async def chain_tvl():
    """BSC historical TVL timeseries."""
    return await fetch_json(f"{API}/v2/historicalChainTvl/BSC", ttl=300)


@router.get("/chains")
async def chains():
    """All chains with current TVL for ranking."""
    return await fetch_json(f"{API}/v2/chains", ttl=300)
