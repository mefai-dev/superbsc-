"""Bitcoin macro cycle indicators — Pi Cycle, Rainbow, Golden Ratio, M2."""

from fastapi import APIRouter, Query
from proxy.cache import fetch_json

router = APIRouter()

CHARTS_BASE = "https://charts.bitcoin.com/api/v1/charts"


@router.get("/pi-cycle")
async def pi_cycle():
    """Pi Cycle Top indicator — 111d MA vs 350d MA x2. Historically calls tops within 3 days."""
    return await fetch_json(f"{CHARTS_BASE}/pi-cycle-top", ttl=3600)


@router.get("/rainbow")
async def rainbow():
    """Rainbow Chart — logarithmic regression bands showing market phase."""
    return await fetch_json(f"{CHARTS_BASE}/rainbow", ttl=3600)


@router.get("/golden-ratio")
async def golden_ratio():
    """Golden Ratio Multiplier — Fibonacci levels from 350d MA."""
    return await fetch_json(f"{CHARTS_BASE}/golden-ratio", ttl=3600)


@router.get("/m2-supply")
async def m2_supply():
    """M2 Money Supply vs Bitcoin — macro liquidity correlation."""
    return await fetch_json(f"{CHARTS_BASE}/m2", ttl=3600)


@router.get("/macro-mood")
async def macro_mood():
    """Macro Mood — BTC vs Unemployment + 10Y Treasury."""
    return await fetch_json(f"{CHARTS_BASE}/macro-mood", ttl=3600)
