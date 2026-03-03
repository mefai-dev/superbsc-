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
):
    """Search for tokens by keyword.

    GET https://web3.binance.com/bapi/defi/v5/public/wallet-direct/buw/wallet/market/token/search?keyword=X
    """
    url = f"{WEB3}/v5/public/wallet-direct/buw/wallet/market/token/search"
    params = {"keyword": keyword}
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


@router.get("/kline")
async def token_kline(
    address: Optional[str] = Query(
        None, alias="contractAddress", description="Token contract address"
    ),
    symbol: Optional[str] = Query(None, description="Token symbol"),
    chain: Optional[str] = Query(None, description="Blockchain network"),
    interval: str = Query("1h", description="Kline interval, e.g. 1m, 5m, 1h, 1d"),
    limit: int = Query(100, description="Number of candles to return"),
):
    """Get token kline/candlestick data from DQuery.

    GET https://dquery.sintral.io/u-kline/v1/k-line/candles
    """
    url = f"{DQUERY}/k-line/candles"
    params = {"interval": interval, "limit": limit}
    if address:
        params["address"] = address
    if symbol:
        params["symbol"] = symbol
    if chain:
        params["chain"] = chain
    if not any(k in params for k in ("address", "symbol", "chain")):
        raise HTTPException(
            status_code=400,
            detail="At least one of contractAddress, symbol, or chain is required",
        )
    return await fetch_json(url, params=params, ttl=60)
