"""Bitcoin on-chain & network stats — blockchain.info free API."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()

BC_API = "https://api.blockchain.info"


@router.get("/stats")
async def network_stats():
    """BTC network stats — hashrate, difficulty, tx count, block time, market price."""
    return await fetch_json(f"{BC_API}/stats", ttl=120)


@router.get("/chart")
async def chart(
    name: str = Query(
        "hash-rate",
        description="Chart name: hash-rate, difficulty, n-transactions, etc.",
    ),
    timespan: str = Query("30days"),
):
    """Time-series chart data — hash-rate, difficulty, n-transactions, etc."""
    return await fetch_json(
        f"{BC_API}/charts/{name}",
        params={"timespan": timespan, "format": "json"},
        ttl=300,
    )


@router.get("/pools")
async def mining_pools(
    timespan: str = Query("4days"),
):
    """Mining pool distribution."""
    return await fetch_json(
        f"{BC_API}/pools",
        params={"timespan": timespan},
        ttl=300,
    )


@router.get("/ticker")
async def btc_ticker():
    """BTC price in 20+ fiat currencies."""
    return await fetch_json(f"{BC_API}/ticker", ttl=60)
