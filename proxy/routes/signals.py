from fastapi import APIRouter
from fastapi.requests import Request

from proxy.cache import post_json
from proxy.config import settings

router = APIRouter()

WEB3 = settings.WEB3_BASE


@router.post("/smart-money")
async def smart_money_signals(request: Request):
    """Get smart money signals from Binance Web3.

    POST https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/web/signal/smart-money
    """
    body = await request.json() if await request.body() else {}

    url = f"{WEB3}/v1/public/wallet-direct/buw/wallet/web/signal/smart-money"
    payload = {
        "page": body.get("page", 1),
        "pageSize": min(max(int(body.get("pageSize", 20)), 1), 100),
        "smartSignalType": body.get("smartSignalType", ""),
        "chainId": body.get("chainId", "56"),
    }
    return await post_json(url, body=payload, ttl=60)
