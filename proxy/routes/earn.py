"""Binance Simple Earn — SAPI signed endpoints."""

import hashlib
import hmac
import time

from fastapi import APIRouter, HTTPException, Query

from proxy.cache import get_client
from proxy.config import settings

router = APIRouter()
SAPI = settings.SAPI_BASE


def _sign(params: dict) -> dict:
    """Add timestamp and HMAC-SHA256 signature."""
    if not settings.has_api_key:
        raise HTTPException(status_code=403, detail="Binance API key not configured")
    params["timestamp"] = int(time.time() * 1000)
    qs = "&".join(f"{k}={v}" for k, v in sorted(params.items()))
    sig = hmac.new(
        settings.binance_api_secret.encode(), qs.encode(), hashlib.sha256
    ).hexdigest()
    params["signature"] = sig
    return params


async def _signed_get(path: str, params: dict) -> dict:
    params = _sign(params)
    client = await get_client()
    resp = await client.get(
        f"{SAPI}{path}",
        params=params,
        headers={"X-MBX-APIKEY": settings.binance_api_key},
    )
    if resp.status_code != 200:
        raise HTTPException(status_code=resp.status_code, detail=resp.text)
    return resp.json()


@router.get("/flexible-list")
async def flexible_list(
    asset: str = Query(None),
    current: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=100),
):
    """Simple Earn flexible product list. Requires API key."""
    params = {"current": current, "size": size}
    if asset:
        params["asset"] = asset.upper()
    return await _signed_get("/sapi/v1/simple-earn/flexible/list", params)


@router.get("/locked-list")
async def locked_list(
    asset: str = Query(None),
    current: int = Query(1, ge=1),
    size: int = Query(100, ge=1, le=100),
):
    """Simple Earn locked product list. Requires API key."""
    params = {"current": current, "size": size}
    if asset:
        params["asset"] = asset.upper()
    return await _signed_get("/sapi/v1/simple-earn/locked/list", params)
