from fastapi import APIRouter, Query
from fastapi.requests import Request

from proxy.cache import fetch_json, post_json
from proxy.config import settings

router = APIRouter()
WEB3 = settings.WEB3_BASE

# Allowed fields per endpoint (sanitize input)
_TRENDING_FIELDS = {"page", "size", "chainId", "type", "sort", "orderBy"}
_INFLOW_FIELDS = {"chainId", "tagType", "period", "page", "pageSize"}


def _sanitize(body: dict, allowed: set) -> dict:
    return {k: v for k, v in body.items() if k in allowed}


@router.get("/social-hype")
async def social_hype(
    chainId: str = Query("56"),
    page: int = Query(1),
    size: int = Query(20),
    targetLanguage: str = Query("en"),
    timeRange: int = Query(1),
):
    url = f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/social/hype/rank/leaderboard"
    params = {
        "chainId": chainId,
        "page": page,
        "size": size,
        "targetLanguage": targetLanguage,
        "timeRange": timeRange,
    }
    return await fetch_json(url, params=params, ttl=60)


@router.post("/trending")
async def trending(request: Request):
    raw = await request.json()
    body = _sanitize(raw, _TRENDING_FIELDS)
    body.setdefault("page", 1)
    body.setdefault("size", 20)
    url = f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/unified/rank/list"
    return await post_json(url, body=body, ttl=60)


@router.post("/smart-inflow")
async def smart_inflow(request: Request):
    raw = await request.json()
    body = _sanitize(raw, _INFLOW_FIELDS)
    body.setdefault("chainId", "CT_501")
    body.setdefault("tagType", 2)
    url = f"{WEB3}/v1/public/wallet-direct/tracker/wallet/token/inflow/rank/query"
    return await post_json(url, body=body, ttl=60)


@router.get("/meme")
async def meme_rank(
    chainId: str = Query("56"),
    page: int = Query(1),
    size: int = Query(50),
):
    url = f"{WEB3}/v1/public/wallet-direct/buw/wallet/market/token/pulse/exclusive/rank/list"
    return await fetch_json(
        url, params={"chainId": chainId, "page": page, "size": size}, ttl=60
    )


@router.get("/traders")
async def top_traders(
    chainId: str = Query("56"),
    tag: str = Query("ALL"),
    pageNo: int = Query(1),
    pageSize: int = Query(25),
    sortBy: int = Query(0),
    orderBy: int = Query(0),
    period: str = Query("7d"),
):
    url = f"{WEB3}/v1/public/wallet-direct/market/leaderboard/query"
    return await fetch_json(
        url,
        params={
            "chainId": chainId,
            "tag": tag,
            "pageNo": pageNo,
            "pageSize": pageSize,
            "sortBy": sortBy,
            "orderBy": orderBy,
            "period": period,
        },
        ttl=60,
    )
