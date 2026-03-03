from fastapi import APIRouter, Query, HTTPException

from proxy.cache import fetch_json
from proxy.config import settings

router = APIRouter()

WEB3 = settings.WEB3_BASE


@router.get("/positions")
async def active_positions(
    address: str = Query(..., description="Wallet address to look up"),
    chain_id: str = Query(
        "56",
        alias="chainId",
        description="Chain ID: 56=BSC, CT_501=Solana, 8453=Base, 1=ETH",
    ),
    offset: int = Query(0, description="Pagination offset"),
):
    """Get active token positions for a wallet address.

    GET https://web3.binance.com/bapi/defi/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list
    """
    if not address:
        raise HTTPException(status_code=400, detail="address is required")
    url = f"{WEB3}/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list"
    params = {
        "address": address,
        "chainId": chain_id,
        "offset": offset,
    }
    return await fetch_json(url, params=params, ttl=60)
