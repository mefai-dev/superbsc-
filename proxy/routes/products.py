"""Binance public product data — market cap, symbols, asset details."""

from fastapi import APIRouter

from proxy.cache import fetch_json

router = APIRouter()
BAPI = "https://www.binance.com/bapi"


@router.get("/symbols")
async def symbol_list():
    """All listed coins with market cap, dominance, ATH/ATL, tags, supply data."""
    return await fetch_json(
        f"{BAPI}/composite/v1/public/marketing/symbol/list",
        ttl=120,
    )


@router.get("/list")
async def product_list():
    """All trading products with live prices, circulating supply, tags."""
    return await fetch_json(
        f"{BAPI}/asset/v2/public/asset-service/product/get-products",
        ttl=120,
    )
