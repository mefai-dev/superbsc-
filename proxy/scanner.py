"""
MEFAI Auto-Scanner Engine — Unique cross-skill intelligence pipeline.

Continuously:
1. Pulls new tokens from Meme Rush (Skill 2)
2. Audits each token (Skill 6)
3. Checks smart money inflow (Skill 5.3)
4. Checks trading signals (Skill 4)
5. Gets dynamic market data (Skill 7.3)
6. Computes composite "opportunity score"
7. Surfaces top opportunities
"""

import asyncio
import time
import logging

from proxy.cache import post_json, fetch_json
from proxy.config import settings

logger = logging.getLogger("mefai.scanner")

WEB3 = settings.WEB3_BASE


class ScannerEngine:
    def __init__(self):
        self.running = False
        self.results: list[dict] = []
        self.last_scan = 0
        self.scan_count = 0
        self._task: asyncio.Task | None = None

    async def start(self):
        if self.running:
            return
        self.running = True
        self._task = asyncio.create_task(self._loop())
        logger.info("Scanner started")

    async def stop(self):
        self.running = False
        if self._task:
            self._task.cancel()
            self._task = None
        logger.info("Scanner stopped")

    def status(self) -> dict:
        return {
            "running": self.running,
            "resultCount": len(self.results),
            "lastScan": self.last_scan,
            "scanCount": self.scan_count,
        }

    async def _loop(self):
        while self.running:
            try:
                await self._scan()
            except Exception as e:
                logger.error(f"Scan error: {e}")
            await asyncio.sleep(settings.scanner_interval)

    async def _scan(self):
        self.scan_count += 1
        self.last_scan = time.time()

        # Step 1: Pull new tokens from Meme Rush
        tokens = await self._get_meme_tokens()
        if not tokens:
            return

        scored = []
        for token in tokens[:20]:  # Limit to 20 per scan
            try:
                score_data = await self._score_token(token)
                if score_data:
                    scored.append(score_data)
            except Exception as e:
                logger.debug(f"Score error for {token.get('symbol', '?')}: {e}")

        # Sort by score descending, keep top 50
        scored.sort(key=lambda x: x.get("score", 0), reverse=True)
        self.results = scored[:50]

    async def _get_meme_tokens(self) -> list[dict]:
        try:
            data = await post_json(
                f"{WEB3}/public/meme-war/pulse/rank/list",
                body={"status": "new", "page": 1, "pageSize": 20},
                ttl=30,
            )
            return data.get("data", {}).get("list", data.get("data", []))
        except Exception:
            return []

    async def _score_token(self, token: dict) -> dict | None:
        address = token.get("address") or token.get("contractAddress") or ""
        chain = token.get("chain") or token.get("network") or "bsc"
        symbol = token.get("symbol") or token.get("name") or "?"

        if not address:
            return None

        score = 50  # Base score
        result = {
            "symbol": symbol,
            "address": address,
            "chain": chain,
            "score": score,
            "risk": "—",
            "smInflow": 0,
            "signal": "—",
            "mcap": token.get("marketCap") or token.get("mcap") or 0,
            "age": token.get("createTime") or token.get("launchTime") or 0,
            "auditResult": "—",
            "timestamp": time.time(),
        }

        # Step 2: Audit token
        try:
            audit = await post_json(
                f"{WEB3}/public/market-cap/security/token/audit",
                body={"address": address, "chain": chain},
                ttl=60,
            )
            audit_data = audit.get("data", {})
            risk = audit_data.get("riskLevel", audit_data.get("risk", ""))
            result["risk"] = risk or "—"
            result["auditResult"] = (
                "PASS" if risk and risk.lower() == "low" else risk or "—"
            )
            if risk and risk.lower() == "low":
                score += 20
            elif risk and risk.lower() == "high":
                score -= 30
        except Exception:
            pass

        # Step 3: Check smart money inflow
        try:
            inflow = await post_json(
                f"{WEB3}/public/market-cap/token/inflow/rank/query",
                body={"chain": chain, "period": "24h", "page": 1, "pageSize": 10},
                ttl=30,
            )
            inflow_list = inflow.get("data", {}).get("list", [])
            for item in inflow_list:
                if item.get("address", "").lower() == address.lower():
                    result["smInflow"] = item.get("netInflow", 0)
                    if float(result["smInflow"]) > 0:
                        score += 15
                    break
        except Exception:
            pass

        # Step 4: Check trading signals
        try:
            sigs = await post_json(
                f"{WEB3}/public/market-cap/signal/smart-money",
                body={"chain": chain, "page": 1, "pageSize": 10},
                ttl=30,
            )
            sig_list = sigs.get("data", {}).get("list", sigs.get("data", []))
            for sig in sig_list:
                sig_addr = sig.get("address", "").lower()
                if sig_addr == address.lower():
                    direction = sig.get("direction", "")
                    result["signal"] = f"{'BUY↑' if direction == 'buy' else 'SELL↓'}"
                    if direction == "buy":
                        score += 10
                    break
        except Exception:
            pass

        # Step 5: Dynamic market data
        try:
            dyn = await fetch_json(
                f"{WEB3}/public/market-cap/token/dynamic/info",
                params={"address": address, "chain": chain},
                ttl=30,
            )
            dyn_data = dyn.get("data", {})
            mcap = dyn_data.get("marketCap") or dyn_data.get("mcap")
            if mcap:
                result["mcap"] = mcap
                mcap_f = float(mcap)
                if 100_000 < mcap_f < 10_000_000:
                    score += 5  # Sweet spot market cap
        except Exception:
            pass

        result["score"] = max(0, min(100, score))
        return result


# Singleton
scanner = ScannerEngine()
