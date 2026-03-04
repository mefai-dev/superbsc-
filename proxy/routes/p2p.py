"""Binance P2P marketplace proxy — public ad search."""

from fastapi import APIRouter
from fastapi.requests import Request

from proxy.cache import post_json

router = APIRouter()
P2P = "https://p2p.binance.com/bapi"


@router.post("/search")
async def p2p_search(request: Request):
    """Search P2P ads. Public endpoint, no auth required."""
    body = await request.json() if await request.body() else {}

    payload = {
        "fiat": body.get("fiat", "TRY"),
        "page": max(1, int(body.get("page", 1))),
        "rows": min(max(1, int(body.get("rows", 20))), 20),
        "tradeType": body.get("tradeType", "BUY"),
        "asset": body.get("asset", "USDT"),
        "payTypes": body.get("payTypes", []),
        "publisherType": body.get("publisherType", None),
    }

    return await post_json(
        f"{P2P}/c2c/v2/friendly/c2c/adv/search",
        body=payload,
        ttl=60,
    )
