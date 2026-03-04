"""
MEFAI Cache — Aggressive in-memory cache with stale-while-revalidate.

Strategy:
- Fresh TTL (60s): serve from cache instantly
- Stale TTL (300s): serve stale data INSTANTLY, refresh in background
- Beyond stale: fetch new data (blocking)
- Startup warmup pre-fills cache

This means users NEVER wait for Binance API — they always get instant cached data.
Background refresh keeps it fresh.
"""

import asyncio
import time
import hashlib
import json
import logging
from typing import Any

import httpx

logger = logging.getLogger("mefai.cache")

_cache: dict[str, tuple[float, Any]] = {}
_refreshing: set[str] = set()  # keys currently being refreshed in background
_client: httpx.AsyncClient | None = None

FRESH_TTL = 60  # Serve from cache without refresh
STALE_TTL = 300  # Serve stale + trigger background refresh
GEO_BLOCK_TTL = 600  # Cache 451 errors for 10 minutes


def _key(url: str, params: dict | None = None, body: dict | None = None) -> str:
    raw = (
        url
        + json.dumps(params or {}, sort_keys=True)
        + json.dumps(body or {}, sort_keys=True)
    )
    return hashlib.md5(raw.encode()).hexdigest()


def get_cached(
    url: str, params: dict | None = None, body: dict | None = None, ttl: int = FRESH_TTL
) -> tuple[Any | None, bool]:
    """Returns (data, is_fresh). data=None if nothing cached. is_fresh=False if stale."""
    if ttl <= 0:
        return None, False  # bypass cache entirely
    k = _key(url, params, body)
    if k in _cache:
        ts, data = _cache[k]
        age = time.time() - ts
        if age < ttl:
            return data, True  # fresh
        if age < STALE_TTL:
            return data, False  # stale but usable
        del _cache[k]
    return None, False


def set_cached(
    url: str, data: Any, params: dict | None = None, body: dict | None = None
) -> None:
    k = _key(url, params, body)
    _cache[k] = (time.time(), data)
    if len(_cache) > 1000:
        # Evict oldest 100 entries
        sorted_keys = sorted(_cache, key=lambda x: _cache[x][0])
        for old_k in sorted_keys[:100]:
            del _cache[old_k]


def _extra_headers(url: str) -> dict[str, str]:
    if "web3.binance.com" in url:
        return {"Accept-Encoding": "identity"}
    return {}


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(
            timeout=12.0,
            follow_redirects=True,
            limits=httpx.Limits(max_connections=50, max_keepalive_connections=20),
        )
    return _client


async def _do_fetch(url: str, params: dict | None, headers: dict) -> Any:
    client = await get_client()
    resp = await client.get(url, params=params, headers=headers)
    if resp.status_code >= 400:
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text, "status": resp.status_code}
        return {"error": True, "status": resp.status_code, "detail": err}
    return resp.json()


async def _do_post(
    url: str, body: dict | None, params: dict | None, headers: dict
) -> Any:
    client = await get_client()
    resp = await client.post(url, json=body, params=params, headers=headers)
    if resp.status_code >= 400:
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text, "status": resp.status_code}
        return {"error": True, "status": resp.status_code, "detail": err}
    return resp.json()


def _bg_refresh_get(url: str, params: dict | None, headers: dict):
    """Schedule a background refresh — non-blocking."""
    k = _key(url, params)
    if k in _refreshing:
        return  # already refreshing
    _refreshing.add(k)

    async def _refresh():
        try:
            data = await _do_fetch(url, params, headers)
            if not (isinstance(data, dict) and data.get("error")):
                set_cached(url, data, params=params)
        except Exception as e:
            logger.debug(f"Background refresh failed for {url}: {e}")
        finally:
            _refreshing.discard(k)

    asyncio.get_event_loop().create_task(_refresh())


def _bg_refresh_post(url: str, body: dict | None, params: dict | None, headers: dict):
    k = _key(url, params, body)
    if k in _refreshing:
        return
    _refreshing.add(k)

    async def _refresh():
        try:
            data = await _do_post(url, body, params, headers)
            if not (isinstance(data, dict) and data.get("error")):
                set_cached(url, data, params=params, body=body)
        except Exception as e:
            logger.debug(f"Background refresh failed for {url}: {e}")
        finally:
            _refreshing.discard(k)

    asyncio.get_event_loop().create_task(_refresh())


async def fetch_json(url: str, params: dict | None = None, ttl: int = FRESH_TTL) -> Any:
    """GET with stale-while-revalidate cache."""
    cached, is_fresh = get_cached(url, params=params, ttl=ttl)
    headers = _extra_headers(url)

    if cached is not None:
        if is_fresh:
            return cached  # instant, no refresh needed
        # Stale: return immediately, refresh in background
        _bg_refresh_get(url, params, headers)
        return cached

    # Nothing cached — must fetch (blocking)
    data = await _do_fetch(url, params, headers)
    if isinstance(data, dict) and data.get("error") and data.get("status") == 451:
        set_cached(url, data, params=params)  # cache geo-block
    elif not (isinstance(data, dict) and data.get("error")):
        set_cached(url, data, params=params)
    return data


async def post_json(
    url: str, body: dict | None = None, params: dict | None = None, ttl: int = FRESH_TTL
) -> Any:
    """POST with stale-while-revalidate cache."""
    cached, is_fresh = get_cached(url, params=params, body=body, ttl=ttl)
    headers = _extra_headers(url)

    if cached is not None:
        if is_fresh:
            return cached
        _bg_refresh_post(url, body, params, headers)
        return cached

    data = await _do_post(url, body, params, headers)
    if isinstance(data, dict) and data.get("error") and data.get("status") == 451:
        set_cached(url, data, params=params, body=body)
    elif not (isinstance(data, dict) and data.get("error")):
        set_cached(url, data, params=params, body=body)
    return data
