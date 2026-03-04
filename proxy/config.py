import os
from dotenv import load_dotenv

load_dotenv()


class Settings:
    host: str = os.getenv("PROXY_HOST", "0.0.0.0")
    port: int = int(os.getenv("PROXY_PORT", "8000"))
    cache_ttl: int = int(os.getenv("CACHE_TTL", "60"))
    scanner_interval: int = int(os.getenv("SCANNER_INTERVAL", "30"))
    binance_api_key: str = os.getenv("BINANCE_API_KEY", "")
    binance_api_secret: str = os.getenv("BINANCE_API_SECRET", "")

    @property
    def has_api_key(self) -> bool:
        return bool(self.binance_api_key and self.binance_api_secret)

    # Base URLs
    # data-api.binance.vision — no geo-restriction for CEX market data
    SPOT_BASE = "https://data-api.binance.vision"
    # Binance Web3 wallet API (correct base)
    WEB3_BASE = "https://web3.binance.com/bapi/defi"
    # DQuery kline service
    DQUERY_BASE = "https://dquery.sintral.io/u-kline/v1"
    # Binance BAPI (public CMS/composite APIs)
    BAPI_BASE = "https://www.binance.com/bapi"
    # P2P marketplace API
    P2P_BASE = "https://p2p.binance.com/bapi"
    # Signed API (SAPI endpoints — earn, convert, etc.)
    SAPI_BASE = "https://api.binance.com"


settings = Settings()
