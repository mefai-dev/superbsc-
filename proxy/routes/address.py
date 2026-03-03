from fastapi import APIRouter, Query, HTTPException

from proxy.cache import fetch_json
from proxy.config import settings

router = APIRouter()

WEB3 = settings.WEB3_BASE


_CHAIN_MAP = {"bsc": "56", "eth": "1", "sol": "CT_501", "base": "8453", "arb": "42161"}


@router.get("/positions")
async def active_positions(
    address: str = Query(..., description="Wallet address to look up"),
    chain_id: str = Query(
        "56",
        alias="chainId",
        description="Chain ID: 56=BSC, CT_501=Solana, 8453=Base, 1=ETH",
    ),
    chain: str = Query(None, description="Chain shorthand (bsc, eth, sol, base, arb)"),
    offset: int = Query(0, description="Pagination offset"),
):
    """Get active token positions for a wallet address.

    GET https://web3.binance.com/bapi/defi/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list
    """
    if not address:
        raise HTTPException(status_code=400, detail="address is required")

    # Resolve chain shorthand to Binance chain ID
    resolved_chain = chain_id
    if chain:
        resolved_chain = _CHAIN_MAP.get(chain.lower(), chain)

    url = f"{WEB3}/v3/public/wallet-direct/buw/wallet/address/pnl/active-position-list"
    params = {
        "address": address,
        "chainId": resolved_chain,
        "offset": offset,
    }
    return await fetch_json(url, params=params, ttl=60)
