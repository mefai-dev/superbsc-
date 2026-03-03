from fastapi import APIRouter, Query

from proxy.cache import post_json
from proxy.config import settings

router = APIRouter()

WEB3 = settings.WEB3_BASE


@router.post("/smart-money")
async def smart_money_signals(
    page: int = Query(1, description="Page number"),
    size: int = Query(20, alias="pageSize", description="Page size"),
    chain_id: str = Query(
        "56",
        alias="chainId",
        description="Chain ID: 56=BSC, CT_501=Solana, 8453=Base, 1=ETH",
    ),
    signal_type: str = Query(
        "",
        alias="smartSignalType",
        description="Signal type filter (empty string for all)",
    ),
):
    """Get smart money signals from Binance Web3.

    POST https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money
    """
    url = f"{WEB3}/v1/public/wallet-direct/buw/wallet/web/signal/smart-money"
    body = {
        "page": page,
        "pageSize": size,
        "smartSignalType": signal_type,
        "chainId": chain_id,
    }
    return await post_json(url, body=body, ttl=60)
