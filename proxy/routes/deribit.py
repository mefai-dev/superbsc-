"""Deribit options & volatility — public endpoints, no auth."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()

DERIBIT = "https://www.deribit.com/api/v2/public"


@router.get("/book-summary")
async def book_summary(
    currency: str = Query("BTC"),
    kind: str = Query("option", regex="^(option|future)$"),
):
    """All option/future contracts with OI, volume, mark IV."""
    return await fetch_json(
        f"{DERIBIT}/get_book_summary_by_currency",
        params={"currency": currency, "kind": kind},
        ttl=60,
    )


@router.get("/volatility-index")
async def volatility_index(
    currency: str = Query("BTC"),
    resolution: int = Query(3600),
):
    """DVOL (Deribit Volatility Index) — 30-day expected volatility."""
    import time

    end = int(time.time() * 1000)
    start = end - 7 * 86400 * 1000  # 7 days
    return await fetch_json(
        f"{DERIBIT}/get_volatility_index_data",
        params={
            "currency": currency,
            "resolution": resolution,
            "start_timestamp": start,
            "end_timestamp": end,
        },
        ttl=300,
    )


@router.get("/historical-volatility")
async def historical_volatility(
    currency: str = Query("BTC"),
):
    """Realized volatility history."""
    return await fetch_json(
        f"{DERIBIT}/get_historical_volatility",
        params={"currency": currency},
        ttl=300,
    )


@router.get("/instruments")
async def instruments(
    currency: str = Query("BTC"),
    kind: str = Query("option", regex="^(option|future)$"),
):
    """All active option/future instruments."""
    return await fetch_json(
        f"{DERIBIT}/get_instruments",
        params={"currency": currency, "kind": kind, "expired": "false"},
        ttl=300,
    )
