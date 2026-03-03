import time
import hashlib
import json
from typing import Any

import httpx

_cache: dict[str, tuple[float, Any]] = {}
_client: httpx.AsyncClient | None = None

# TTL for caching geo-restriction (451) errors
_GEO_BLOCK_TTL = 300


def _key(url: str, params: dict | None = None, body: dict | None = None) -> str:
    raw = url + json.dumps(params or {}, sort_keys=True) + json.dumps(body or {}, sort_keys=True)
    return hashlib.md5(raw.encode()).hexdigest()


def get_cached(url: str, params: dict | None = None, body: dict | None = None, ttl: int = 60) -> Any | None:
    k = _key(url, params, body)
    if k in _cache:
        ts, data = _cache[k]
        if time.time() - ts < ttl:
            return data
        del _cache[k]
    return None


def set_cached(url: str, data: Any, params: dict | None = None, body: dict | None = None) -> None:
    k = _key(url, params, body)
    _cache[k] = (time.time(), data)
    # Evict old entries if cache grows too large
    if len(_cache) > 500:
        oldest_key = min(_cache, key=lambda x: _cache[x][0])
        del _cache[oldest_key]


def _extra_headers(url: str) -> dict[str, str]:
    """Return extra headers required for specific upstream APIs."""
    if "web3.binance.com" in url:
        return {"Accept-Encoding": "identity"}
    return {}


async def get_client() -> httpx.AsyncClient:
    global _client
    if _client is None or _client.is_closed:
        _client = httpx.AsyncClient(timeout=15.0, follow_redirects=True)
    return _client


async def fetch_json(url: str, params: dict | None = None, ttl: int = 60) -> Any:
    cached = get_cached(url, params=params, ttl=ttl)
    if cached is not None:
        return cached
    client = await get_client()
    headers = _extra_headers(url)
    resp = await client.get(url, params=params, headers=headers)
    if resp.status_code >= 400:
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text, "status": resp.status_code}
        result = {"error": True, "status": resp.status_code, "detail": err}
        # Cache 451 geo-restriction for 5 minutes to avoid hammering
        if resp.status_code == 451:
            set_cached(url, result, params=params)
        return result
    data = resp.json()
    set_cached(url, data, params=params)
    return data


async def post_json(url: str, body: dict | None = None, params: dict | None = None, ttl: int = 60) -> Any:
    cached = get_cached(url, params=params, body=body, ttl=ttl)
    if cached is not None:
        return cached
    client = await get_client()
    headers = _extra_headers(url)
    resp = await client.post(url, json=body, params=params, headers=headers)
    if resp.status_code >= 400:
        try:
            err = resp.json()
        except Exception:
            err = {"error": resp.text, "status": resp.status_code}
        result = {"error": True, "status": resp.status_code, "detail": err}
        # Cache 451 geo-restriction for 5 minutes
        if resp.status_code == 451:
            set_cached(url, result, params=params, body=body)
        return result
    data = resp.json()
    set_cached(url, data, params=params, body=body)
    return data
