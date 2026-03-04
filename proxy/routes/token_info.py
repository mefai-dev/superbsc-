import logging
from typing import Optional

from fastapi import APIRouter, Query, HTTPException

from proxy.cache import fetch_json
from proxy.config import settings

logger = logging.getLogger("mefai.token_info")

router = APIRouter()

WEB3 = settings.WEB3_BASE
DQUERY = settings.DQUERY_BASE
SPOT_BASE = settings.SPOT_BASE

# Common DEX token addresses → Binance CEX symbol mappings for kline fallback
_ADDR_TO_SYMBOL = {
    "0xbb4cdb9cbd36b01bd1cbaebf2de08d9173bc095c": "BNBUSDT",
    "0x2170ed0880ac9a755fd29b2688956bd959f933f8": "ETHUSDT",
    "0x7130d2a12b9bcbfae4f2634d864a1ee1ce3ead9c": "BTCUSDT",
    "0x55d398326f99059ff775485246999027b3197955": "USDTUSDT",
}


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
    limit = min(max(limit, 1), 1000)
    if not address:
        raise HTTPException(status_code=400, detail="address is required")

    # DQuery supported intervals — others need Binance spot fallback
    dquery_intervals = {
        "1m", "1h", "2h", "4h", "6h", "8h", "12h", "1d", "3d", "1w", "1M",
    }

    # Map unsupported intervals to nearest DQuery interval for DEX tokens
    _interval_map = {"5m": "1m", "15m": "1m", "30m": "1h", "3m": "1m"}

    # Try Binance spot fallback first for known CEX pairs
    symbol = _ADDR_TO_SYMBOL.get(address.lower())
    if symbol and symbol != "USDTUSDT":
        fallback_url = f"{SPOT_BASE}/api/v3/klines"
        fallback_params = {"symbol": symbol, "interval": interval, "limit": limit}
        result = await fetch_json(fallback_url, params=fallback_params, ttl=60)
        if isinstance(result, list) and len(result) > 0:
            return {"data": result, "source": "binance"}

    # Resolve platform from chain
    plat = platform or _CHAIN_TO_PLATFORM.get(chain or "56", "bsc")
    dq_interval = interval if interval in dquery_intervals else _interval_map.get(interval, "1h")
    dq_limit = limit * 5 if dq_interval != interval else limit  # more candles if aggregating

    url = f"{DQUERY}/k-line/candles"
    params = {
        "address": address,
        "platform": plat,
        "interval": dq_interval,
        "limit": min(dq_limit, 1000),
    }
    result = await fetch_json(url, params=params, ttl=60)

    # Check for DQuery error response
    if isinstance(result, dict):
        status = result.get("status", {})
        if status.get("error_code") not in (None, "0", 0):
            # DQuery failed — try Binance spot as last resort
            if symbol:
                fallback_url = f"{SPOT_BASE}/api/v3/klines"
                fallback_params = {"symbol": symbol, "interval": interval, "limit": limit}
                return await fetch_json(fallback_url, params=fallback_params, ttl=60)
            return {"data": [], "error": status.get("error_message", "No data")}
        if result.get("error"):
            if symbol:
                fallback_url = f"{SPOT_BASE}/api/v3/klines"
                fallback_params = {"symbol": symbol, "interval": interval, "limit": limit}
                return await fetch_json(fallback_url, params=fallback_params, ttl=60)

    return result
