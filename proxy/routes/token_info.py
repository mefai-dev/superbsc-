from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from proxy.cache import fetch_json
from proxy.config import settings

router = APIRouter()

WEB3 = settings.WEB3_BASE
DQUERY = settings.DQUERY_BASE


@router.get("/search")
async def token_search(
    keyword: str = Query(..., description="Search keyword, e.g. BTC, PEPE, ethereum"),
    chain_ids: str = Query(
        None, alias="chainIds", description="Chain IDs filter, e.g. 56,1"
    ),
):
    """Search for tokens by keyword.

    GET https://web3.binance.com/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search?keyword=X
    """
    url = f"{WEB3}/v5/public/wallet-direct/buw/wallet/market/token/search"
    params = {"keyword": keyword}
    if chain_ids:
        params["chainIds"] = chain_ids
    return await fetch_json(url, params=params, ttl=60)


@router.get("/meta")
async def token_meta(
    address: str = Query(
        ..., alias="contractAddress", description="Token contract address"
    ),
    chain_id: str = Query(
        "56",
        alias="chainId",
        description="Chain ID: 56=BSC, CT_501=Solana, 8453=Base, 1=ETH",
    ),
):
    """Get token metadata / static info (name, symbol, logo, description, links).

    GET https://web3.binance.com/bapi/defi/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info
    """
    url = f"{WEB3}/v1/public/wallet-direct/buw/wallet/dex/market/token/meta/info"
    params = {
        "chainId": chain_id,
        "contractAddress": address,
    }
    return await fetch_json(url, params=params, ttl=60)


@router.get("/dynamic")
async def token_dynamic(
    address: str = Query(
        ..., alias="contractAddress", description="Token contract address"
    ),
    chain_id: str = Query(
        "56",
        alias="chainId",
        description="Chain ID: 56=BSC, CT_501=Solana, 8453=Base, 1=ETH",
    ),
):
    """Get token dynamic info (price, volume, market cap, holders, liquidity).

    GET https://web3.binance.com/bapi/defi/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info
    """
    url = f"{WEB3}/v4/public/wallet-direct/buw/wallet/market/token/dynamic/info"
    params = {
        "chainId": chain_id,
        "contractAddress": address,
    }
    return await fetch_json(url, params=params, ttl=60)


# chainId → DQuery platform mapping
_CHAIN_TO_PLATFORM = {
    "56": "bsc",
    "bsc": "bsc",
    "1": "eth",
    "eth": "eth",
    "CT_501": "solana",
    "solana": "solana",
    "sol": "solana",
    "8453": "base",
    "base": "base",
    "42161": "arbitrum",
    "arb": "arbitrum",
    "137": "polygon",
    "polygon": "polygon",
    "43114": "avalanche",
    "avax": "avalanche",
}


@router.get("/kline")
async def token_kline(
    address: Optional[str] = Query(None, description="Token contract address"),
    chain: Optional[str] = Query("56", description="Chain ID or name"),
    platform: Optional[str] = Query(None, description="DQuery platform name"),
    interval: str = Query("1h", description="Kline interval"),
    limit: int = Query(100, description="Number of candles"),
):
    """Get token kline/candlestick data from DQuery."""
    if not address:
        raise HTTPException(status_code=400, detail="address is required")
    # Resolve platform from chain
    plat = platform or _CHAIN_TO_PLATFORM.get(chain or "56", "bsc")
    url = f"{DQUERY}/k-line/candles"
    params = {
        "address": address,
        "platform": plat,
        "interval": interval,
        "limit": limit,
    }
    return await fetch_json(url, params=params, ttl=60)
