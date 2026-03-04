import uuid

from fastapi import APIRouter, HTTPException
from fastapi.requests import Request

from proxy.cache import post_json
from proxy.config import settings

router = APIRouter()

WEB3 = settings.WEB3_BASE


@router.post("/check")
async def token_audit_check(request: Request):
    """Run a security audit / rug-pull check on a token.

    POST https://web3.binance.com/bapi/defi/v1/public/wallet-direct/security/token/audit

    Expected body: {"contractAddress": "0x...", "binanceChainId": "56"}
    Optional: requestId (auto-generated if not provided)
    """
    body = await request.json() if await request.body() else {}

    contract_address = body.get("contractAddress") or body.get("address")
    if not contract_address:
        raise HTTPException(
            status_code=400, detail="contractAddress is required in request body"
        )

    # Map chain field to binanceChainId — accept all naming conventions
    _CHAIN_MAP = {
        "bsc": "56",
        "eth": "1",
        "sol": "CT_501",
        "base": "8453",
        "arb": "42161",
    }
    raw_chain = (
        body.get("binanceChainId") or body.get("chainId") or body.get("chain") or "56"
    )
    binance_chain_id = _CHAIN_MAP.get(raw_chain.lower(), raw_chain)
    request_id = body.get("requestId") or str(uuid.uuid4())

    url = f"{WEB3}/v1/public/wallet-direct/security/token/audit"
    payload = {
        "binanceChainId": binance_chain_id,
        "contractAddress": contract_address,
        "requestId": request_id,
    }
    return await post_json(url, body=payload, ttl=60)
