"""Etherscan V2 API proxy — contract source code, ABI, proxy detection."""

import os

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()
ETHERSCAN = "https://api.etherscan.io/v2/api"
API_KEY = os.getenv("ETHERSCAN_API_KEY", "")


@router.get("/sourcecode")
async def get_sourcecode(
    address: str = Query(..., min_length=10),
    chainId: str = Query("56"),
):
    """Get contract source code + proxy detection. Free on all chains."""
    params = {
        "chainid": chainId,
        "module": "contract",
        "action": "getsourcecode",
        "address": address,
    }
    if API_KEY:
        params["apikey"] = API_KEY
    return await fetch_json(ETHERSCAN, params=params, ttl=300)


@router.get("/abi")
async def get_abi(
    address: str = Query(..., min_length=10),
    chainId: str = Query("56"),
):
    """Get verified contract ABI."""
    params = {
        "chainid": chainId,
        "module": "contract",
        "action": "getabi",
        "address": address,
    }
    if API_KEY:
        params["apikey"] = API_KEY
    return await fetch_json(ETHERSCAN, params=params, ttl=300)
