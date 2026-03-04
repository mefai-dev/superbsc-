"""Binance public announcements — CMS article list."""

from fastapi import APIRouter, Query

from proxy.cache import fetch_json

router = APIRouter()
BAPI = "https://www.binance.com/bapi"


@router.get("/list")
async def announcement_list(
    type: int = Query(1),
    catalogId: int = Query(48),
    pageNo: int = Query(1),
    pageSize: int = Query(20, ge=1, le=50),
):
    """Binance announcements. catalogId: 48=New Listings, 49=Activities, 161=Delisting, 128=Airdrop."""
    return await fetch_json(
        f"{BAPI}/composite/v1/public/cms/article/list/query",
        params={
            "type": type,
            "catalogId": catalogId,
            "pageNo": pageNo,
            "pageSize": pageSize,
        },
        ttl=120,
    )
