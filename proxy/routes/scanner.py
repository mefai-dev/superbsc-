import asyncio
import time
from typing import Any, Optional

from fastapi import APIRouter, Query, HTTPException

from proxy.cache import fetch_json, post_json
from proxy.config import settings

router = APIRouter()

# Scanner state held in-process
_scanner_state: dict[str, Any] = {
    "running": False,
    "started_at": None,
    "stopped_at": None,
    "interval": settings.scanner_interval,
    "cycles": 0,
    "last_scan_at": None,
    "error": None,
}

_scanner_results: list[dict] = []
_scanner_task: Optional[asyncio.Task] = None

WEB3 = settings.WEB3_BASE


async def _run_scanner():
    """Background loop that periodically scans trending tokens and smart money signals."""
    global _scanner_results
    _scanner_state["running"] = True
    _scanner_state["error"] = None

    try:
        while _scanner_state["running"]:
            try:
                # Fetch trending tokens
                trending_url = f"{WEB3}/public/market-cap/unified/rank/list"
                trending = await post_json(
                    trending_url, body={"page": 1, "size": 50}, ttl=0
                )

                # Fetch social hype
                hype_url = f"{WEB3}/public/market-cap/social/hype/rank/leaderboard"
                hype = await fetch_json(hype_url, params={"page": 1, "size": 50}, ttl=0)

                # Fetch smart money signals
                smart_url = f"{WEB3}/public/market-cap/signal/smart-money"
                smart = await post_json(smart_url, body={}, ttl=0)

                _scanner_results = [
                    {
                        "source": "trending",
                        "data": trending,
                        "fetched_at": time.time(),
                    },
                    {
                        "source": "social_hype",
                        "data": hype,
                        "fetched_at": time.time(),
                    },
                    {
                        "source": "smart_money",
                        "data": smart,
                        "fetched_at": time.time(),
                    },
                ]

                _scanner_state["cycles"] += 1
                _scanner_state["last_scan_at"] = time.time()
                _scanner_state["error"] = None

            except Exception as exc:
                _scanner_state["error"] = str(exc)

            await asyncio.sleep(_scanner_state["interval"])

    except asyncio.CancelledError:
        pass
    finally:
        _scanner_state["running"] = False
        _scanner_state["stopped_at"] = time.time()


@router.get("/status")
async def scanner_status():
    """Get the current state of the auto-scanner."""
    return _scanner_state


@router.get("/results")
async def scanner_results():
    """Get the latest scanner results."""
    return {
        "count": len(_scanner_results),
        "results": _scanner_results,
        "state": {
            "running": _scanner_state["running"],
            "cycles": _scanner_state["cycles"],
            "last_scan_at": _scanner_state["last_scan_at"],
        },
    }


@router.post("/start")
async def scanner_start(
    interval: Optional[int] = Query(None, description="Scan interval in seconds"),
):
    """Start the background scanner."""
    global _scanner_task

    if _scanner_state["running"]:
        raise HTTPException(status_code=409, detail="Scanner is already running")

    if interval is not None and interval > 0:
        _scanner_state["interval"] = interval

    _scanner_state["started_at"] = time.time()
    _scanner_state["cycles"] = 0
    _scanner_task = asyncio.create_task(_run_scanner())

    return {"status": "started", "interval": _scanner_state["interval"]}


@router.post("/stop")
async def scanner_stop():
    """Stop the background scanner."""
    global _scanner_task

    if not _scanner_state["running"]:
        raise HTTPException(status_code=409, detail="Scanner is not running")

    _scanner_state["running"] = False
    if _scanner_task and not _scanner_task.done():
        _scanner_task.cancel()
        try:
            await _scanner_task
        except asyncio.CancelledError:
            pass
    _scanner_task = None

    return {"status": "stopped", "cycles": _scanner_state["cycles"]}
