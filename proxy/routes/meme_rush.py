from fastapi import APIRouter, Query
from fastapi.requests import Request

from proxy.cache import fetch_json, post_json
from proxy.config import settings

router = APIRouter()
WEB3 = settings.WEB3_BASE


_RUSH_FIELDS = {"chainId", "rankType", "limit", "page", "pageSize"}


@router.post("/rush")
async def meme_rush_pulse(request: Request):
    raw = await request.json()
    body = {k: v for k, v in raw.items() if k in _RUSH_FIELDS}
    body.setdefault("chainId", "56")
    body.setdefault("rankType", 10)
    body.setdefault("limit", 20)
    url = f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/rank/list"
    return await post_json(url, body=body, ttl=60)


@router.get("/topics")
async def meme_rush_topics(
    chainId: str = Query("56"),
    rankType: int = Query(10),  # 10=Latest, 20=Rising, 30=Viral (INTEGER)
    sort: int = Query(10),  # 10=create time, 20=net inflow, 30=viral time
):
    url = (
        f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/social-rush/rank/list"
    )
    return await fetch_json(
        url, params={"chainId": chainId, "rankType": rankType, "sort": sort}, ttl=60
    )
