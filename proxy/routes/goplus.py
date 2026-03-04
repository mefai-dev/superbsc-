"""GoPlus token security API proxy."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()
GOPLUS = "https://api.gopluslabs.io"


@router.get("/token-security")
async def token_security(
    address: str = Query(..., min_length=10),
    chainId: str = Query("56"),
):
    """GoPlus token security check. chainId: 56=BSC, 1=ETH, 137=Polygon, 42161=Arb, 8453=Base."""
    return await fetch_json(
        f"{GOPLUS}/api/v1/token_security/{chainId}",
        params={"contract_addresses": address.lower()},
        ttl=120,
    )
