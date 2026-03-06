"""Binance Square Content Intelligence — content generation + post proxy."""

import asyncio
import time
from fastapi import APIRouter, Query, Body
from proxy.cache import fetch_json

router = APIRouter()
BAPI = "https://www.binance.com/bapi"
SPOT = "https://data-api.binance.vision"
# Frankfurt proxy — premiumIndex, ticker24hr (geo-unblocked)
FAPI = "http://134.122.77.171:9500"
# Singapore proxy — topLongShortPositionRatio, fundingInfo (full access)
FAPI2 = "http://46.101.148.181:9500"

PAIRS = [
    "BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
    "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "DOTUSDT", "LINKUSDT",
    "MATICUSDT", "LTCUSDT", "SHIBUSDT", "TRXUSDT", "ATOMUSDT",
    "UNIUSDT", "XLMUSDT", "NEARUSDT", "APTUSDT", "FILUSDT",
    "ARBUSDT", "OPUSDT", "MKRUSDT", "AAVEUSDT", "INJUSDT",
    "SUIUSDT", "SEIUSDT", "TIAUSDT", "JUPUSDT", "WIFUSDT",
    "FETUSDT", "RENDERUSDT", "GRTUSDT", "IMXUSDT", "RUNEUSDT",
    "ENAUSDT", "PEPEUSDT", "FLOKIUSDT", "BONKUSDT", "ORDIUSDT",
    "PENDLEUSDT", "STXUSDT", "ONDOUSDT", "WLDUSDT", "ALGOUSDT",
    "FTMUSDT", "GALAUSDT", "SANDUSDT", "AXSUSDT", "MANAUSDT",
    "DYDXUSDT", "GMXUSDT",
]

TEMPLATES = [
    "market-brief", "smart-money-alert", "funding-snapshot",
    "sector-rotation", "regime-change", "accumulation-watchlist",
    "custom-analysis",
]

SQUARE_ERRORS = {
    "000000": "Post published successfully",
    "10004": "Network error. Please try again",
    "10005": "Identity verification required to post",
    "10007": "Feature currently unavailable",
    "20002": "Content contains restricted words. Please edit",
    "20013": "Content exceeds character limit",
    "20020": "Cannot publish empty content",
    "20022": "Content flagged for review. Check highlighted sections",
    "20041": "URL in content flagged as security risk",
    "30004": "Account not found",
    "30008": "Account restricted from posting",
    "220003": "Invalid API Key. Check configuration",
    "220004": "API Key expired. Generate a new key",
    "220009": "Daily post limit reached. Try again tomorrow",
    "220010": "Content type not supported",
    "220011": "Content body cannot be empty",
    "2000001": "Account permanently restricted",
    "2000002": "Device permanently restricted",
}

TEMPLATE_HASHTAGS = {
    "market-brief": ["#MarketBrief", "#CryptoMarket", "#Binance"],
    "smart-money-alert": ["#SmartMoney", "#TradingSignals", "#Binance"],
    "funding-snapshot": ["#FundingRate", "#Contrarian", "#CryptoTrading"],
    "sector-rotation": ["#SectorRotation", "#SmartMoney", "#CryptoAnalysis"],
    "regime-change": ["#RegimeChange", "#MarketStructure", "#Binance"],
    "accumulation-watchlist": ["#Accumulation", "#InstitutionalFlow", "#CryptoWatchlist"],
    "custom-analysis": ["#MarketAnalysis", "#DeepDive", "#Binance"],
}

# --- Cached premium index (all symbols) ---
_premium_cache = {"data": {}, "ts": 0}


async def _get_all_premium():
    """Fetch and cache all premium index data (funding rates)."""
    now = time.time()
    if now - _premium_cache["ts"] < 30 and _premium_cache["data"]:
        return _premium_cache["data"]
    raw = await fetch_json(f"{FAPI}/fapi/premiumIndex", ttl=15)
    if isinstance(raw, list):
        result = {item["symbol"]: item for item in raw if isinstance(item, dict) and "symbol" in item}
        _premium_cache["data"] = result
        _premium_cache["ts"] = now
        return result
    return _premium_cache["data"]


async def _fetch_ticker(symbol: str):
    return await fetch_json(f"{SPOT}/api/v3/ticker/24hr", params={"symbol": symbol}, ttl=30)


async def _fetch_top_traders(symbol: str):
    return await fetch_json(
        f"{FAPI2}/futures/data/topLongShortPositionRatio",
        params={"symbol": symbol, "period": "1h", "limit": 1},
        ttl=60,
    )


async def _fetch_taker_ratio(symbol: str):
    return await fetch_json(
        f"{FAPI2}/futures/data/takerlongshortRatio",
        params={"symbol": symbol, "period": "1h", "limit": 1},
        ttl=60,
    )


async def _fetch_oi_hist(symbol: str):
    return await fetch_json(
        f"{FAPI2}/futures/data/openInterestHist",
        params={"symbol": symbol, "period": "1h", "limit": 5},
        ttl=60,
    )


def _symbol_tag(symbol: str) -> str:
    base = symbol.replace("USDT", "").replace("1000", "")
    return f"#{base}"


def _fmt_price(price) -> str:
    try:
        p = float(price)
    except (ValueError, TypeError):
        return "$0.00"
    if p >= 1:
        return f"${p:,.2f}"
    if p >= 0.01:
        return f"${p:.4f}"
    return f"${p:.8f}"


def _fmt_pct(pct) -> str:
    try:
        p = float(pct)
    except (ValueError, TypeError):
        return "0.00%"
    sign = "+" if p >= 0 else ""
    return f"{sign}{p:.2f}%"


def _fmt_vol(vol) -> str:
    try:
        v = float(vol)
    except (ValueError, TypeError):
        return "$0"
    if v >= 1e9:
        return f"${v / 1e9:.1f}B"
    if v >= 1e6:
        return f"${v / 1e6:.1f}M"
    if v >= 1e3:
        return f"${v / 1e3:.1f}K"
    return f"${v:.0f}"


def _lr_to_score(traders_data) -> dict:
    """Convert top trader long/short ratio to smart money score + bias."""
    if isinstance(traders_data, list) and traders_data:
        t = traders_data[0]
        lr = float(t.get("longShortRatio", 1))
        long_pct = float(t.get("longAccount", 0.5)) * 100
        short_pct = float(t.get("shortAccount", 0.5)) * 100
        # Score: how much top traders lean long (0-100)
        score = int(long_pct)
        bias = "LONG" if score > 55 else ("SHORT" if score < 45 else "NEUTRAL")
        return {"score": score, "bias": bias, "longPct": long_pct, "shortPct": short_pct, "ratio": lr}
    return {"score": 50, "bias": "NEUTRAL", "longPct": 50, "shortPct": 50, "ratio": 1.0}


def _funding_info(premium_data: dict, symbol: str) -> dict:
    """Extract funding rate info from premium index data."""
    item = premium_data.get(symbol, {})
    rate = float(item.get("lastFundingRate", 0))
    rate_pct = rate * 100
    apr = rate_pct * 3 * 365  # 3 settlements/day * 365 days
    mark = float(item.get("markPrice", 0))
    index = float(item.get("indexPrice", 0))
    premium_pct = ((mark - index) / index * 100) if index > 0 else 0
    return {
        "rate": rate, "ratePct": rate_pct, "apr": apr,
        "mark": mark, "index": index, "premiumPct": premium_pct,
        "direction": "Overcrowded long" if rate_pct > 0.01 else ("Overcrowded short" if rate_pct < -0.01 else "Neutral"),
    }


def _build_market_brief(tickers, sm_data, premium_all):
    date_str = time.strftime("%Y-%m-%d")
    score = sm_data["score"]
    bias = sm_data["bias"]

    lines = []
    lines.append(f"Daily Market Brief - {date_str}")
    lines.append("")
    lines.append(f"Top Trader Positioning: {score}% Long / {100 - score}% Short")
    lines.append(f"Institutional Bias: {bias}")
    lines.append("")
    lines.append("Today's biggest moves across major pairs:")
    lines.append("")

    sorted_t = sorted(tickers, key=lambda t: abs(float(t.get("priceChangePercent", 0))), reverse=True)
    for t in sorted_t[:8]:
        sym = t.get("symbol", "").replace("USDT", "")
        price = _fmt_price(t.get("lastPrice", 0))
        chg = _fmt_pct(t.get("priceChangePercent", 0))
        vol = _fmt_vol(t.get("quoteVolume", 0))
        fi = _funding_info(premium_all, t.get("symbol", ""))
        fund_str = f"FR: {fi['ratePct']:+.4f}%" if fi["rate"] != 0 else ""
        lines.append(f"  {sym:6s}  {price:>12s}  {chg:>8s}  Vol {vol:>6s}  {fund_str}")

    lines.append("")

    # Count bullish vs bearish
    up = sum(1 for t in tickers if float(t.get("priceChangePercent", 0)) > 0)
    dn = len(tickers) - up
    lines.append(f"Market breadth: {up} pairs up, {dn} pairs down out of {len(tickers)} tracked.")

    if score > 60:
        lines.append("Top traders are leaning bullish. Watch for continuation if volume supports the move.")
    elif score < 40:
        lines.append("Top traders are leaning bearish. Caution on long positions until positioning shifts.")
    else:
        lines.append("Top traders are split. No clear directional conviction from institutional positioning.")

    return "\n".join(lines)


def _build_smart_money_alert(ticker, sm_data, premium_all):
    symbol = ticker.get("symbol", "UNKNOWN")
    sym = symbol.replace("USDT", "")
    score = sm_data["score"]
    bias = sm_data["bias"]
    long_pct = sm_data["longPct"]
    short_pct = sm_data["shortPct"]

    fi = _funding_info(premium_all, symbol)

    lines = []
    lines.append(f"Smart Money Alert - {sym}")
    lines.append("")
    lines.append(f"Top Trader Score: {score}/100 - {bias}")
    lines.append(f"  Long: {long_pct:.1f}% | Short: {short_pct:.1f}%")
    lines.append("")
    lines.append(f"Current Price: {_fmt_price(ticker.get('lastPrice', 0))}")
    lines.append(f"24h Change: {_fmt_pct(ticker.get('priceChangePercent', 0))}")
    lines.append(f"24h Volume: {_fmt_vol(ticker.get('quoteVolume', 0))}")
    lines.append(f"24h Range: {_fmt_price(ticker.get('lowPrice', 0))} - {_fmt_price(ticker.get('highPrice', 0))}")
    lines.append("")
    lines.append(f"Funding Rate: {fi['ratePct']:+.4f}% (APR: {fi['apr']:.1f}%)")
    lines.append(f"Mark Price: {_fmt_price(fi['mark'])} | Index: {_fmt_price(fi['index'])}")
    lines.append(f"Premium: {fi['premiumPct']:+.3f}%")
    lines.append("")

    if score > 65:
        lines.append(f"Analysis: Top traders are heavily positioned long on {sym}. "
                      f"With {long_pct:.0f}% of top positions on the long side, this signals "
                      f"institutional confidence. The funding rate is {fi['direction'].lower()}, "
                      f"suggesting {'room for more upside' if fi['ratePct'] < 0.03 else 'potential for a pullback as longs pay high premiums'}.")
    elif score < 35:
        lines.append(f"Analysis: Top traders are positioned short on {sym}. "
                      f"With {short_pct:.0f}% of top positions short, this suggests institutional "
                      f"caution. {'Negative funding means shorts are paying, adding pressure.' if fi['ratePct'] < 0 else 'Despite positive funding, smart money prefers downside exposure.'}")
    else:
        lines.append(f"Analysis: Top traders are evenly split on {sym}. No strong directional "
                      f"conviction from institutional positioning. Wait for a clearer signal before taking a position.")

    return "\n".join(lines)


def _build_funding_snapshot(tickers, premium_all):
    lines = []
    lines.append("Funding Rate Snapshot")
    lines.append("")
    lines.append("Current funding rates across major pairs. Extreme rates often signal "
                 "overcrowded positions and potential mean-reversion opportunities.")
    lines.append("")

    # Collect funding info for all tickers
    rows = []
    for t in tickers:
        sym = t.get("symbol", "")
        fi = _funding_info(premium_all, sym)
        rows.append((sym, t, fi))

    # Sort by absolute funding rate (most extreme first)
    rows.sort(key=lambda x: abs(x[2]["ratePct"]), reverse=True)

    extreme = [r for r in rows if abs(r[2]["ratePct"]) > 0.01]
    normal = [r for r in rows if abs(r[2]["ratePct"]) <= 0.01]

    if extreme:
        lines.append("Extreme Rates:")
        for sym, t, fi in extreme[:5]:
            s = sym.replace("USDT", "")
            lines.append(f"  {s:6s}  Rate: {fi['ratePct']:+.4f}%  APR: {fi['apr']:+.1f}%  {fi['direction']}")
            lines.append(f"         Price: {_fmt_price(t.get('lastPrice',0))}  24h: {_fmt_pct(t.get('priceChangePercent',0))}")
        lines.append("")

    if normal:
        lines.append("Normal Rates:")
        for sym, t, fi in normal[:5]:
            s = sym.replace("USDT", "")
            lines.append(f"  {s:6s}  Rate: {fi['ratePct']:+.4f}%  APR: {fi['apr']:+.1f}%")
        lines.append("")

    # Contrarian analysis
    if extreme:
        most_extreme = extreme[0]
        sym_short = most_extreme[0].replace("USDT", "")
        fi = most_extreme[2]
        if fi["ratePct"] > 0.01:
            lines.append(f"Contrarian Signal: {sym_short} has the highest funding rate at "
                         f"{fi['ratePct']:+.4f}% ({fi['apr']:.0f}% annualized). Longs are paying "
                         f"a premium to hold their positions. Historically, extreme positive "
                         f"funding often precedes pullbacks as the cost of maintaining longs "
                         f"becomes unsustainable.")
        elif fi["ratePct"] < -0.01:
            lines.append(f"Contrarian Signal: {sym_short} has deeply negative funding at "
                         f"{fi['ratePct']:+.4f}%. Shorts are paying to hold, indicating heavy "
                         f"short positioning. This can fuel short squeezes if price pushes up "
                         f"against the crowded short side.")

    return "\n".join(lines)


def _build_sector_rotation(tickers, traders_data, premium_all):
    lines = []
    lines.append("Sector Rotation Report")
    lines.append("")
    lines.append("Where is institutional capital flowing? This report analyzes top trader "
                 "positioning across sectors to identify rotation patterns.")
    lines.append("")

    pairs = []
    for i, t in enumerate(tickers):
        sm = _lr_to_score(traders_data[i] if i < len(traders_data) else [])
        fi = _funding_info(premium_all, t.get("symbol", ""))
        pairs.append((t, sm, fi))

    # Sort by long positioning (highest = most accumulated)
    pairs.sort(key=lambda x: x[1]["score"], reverse=True)

    accum = [(t, sm, fi) for t, sm, fi in pairs if sm["score"] >= 55]
    distrib = [(t, sm, fi) for t, sm, fi in pairs if sm["score"] < 45]

    if accum:
        lines.append("Accumulation (Top traders leaning long):")
        for t, sm, fi in accum:
            sym = t.get("symbol", "").replace("USDT", "")
            lines.append(f"  {sym:6s}  Long: {sm['longPct']:.0f}%  Price: {_fmt_price(t.get('lastPrice',0))}  "
                         f"24h: {_fmt_pct(t.get('priceChangePercent',0))}  FR: {fi['ratePct']:+.4f}%")
        lines.append("")

    if distrib:
        lines.append("Distribution (Top traders leaning short):")
        for t, sm, fi in distrib:
            sym = t.get("symbol", "").replace("USDT", "")
            lines.append(f"  {sym:6s}  Short: {sm['shortPct']:.0f}%  Price: {_fmt_price(t.get('lastPrice',0))}  "
                         f"24h: {_fmt_pct(t.get('priceChangePercent',0))}  FR: {fi['ratePct']:+.4f}%")
        lines.append("")

    if accum and distrib:
        lines.append(f"Capital is rotating from "
                     f"{', '.join(t.get('symbol','').replace('USDT','') for t,_,_ in distrib[:3])} "
                     f"toward {', '.join(t.get('symbol','').replace('USDT','') for t,_,_ in accum[:3])}. "
                     f"This pattern suggests institutions are repositioning into "
                     f"{'large caps' if any(t.get('symbol','') in ('BTCUSDT','ETHUSDT','BNBUSDT') for t,_,_ in accum) else 'altcoins'}.")
    elif accum:
        lines.append("Broad accumulation detected. Top traders are long across most sectors.")
    elif distrib:
        lines.append("Broad distribution detected. Top traders are reducing exposure across sectors.")

    return "\n".join(lines)


def _build_regime_change(ticker, sm_data, premium_all):
    symbol = ticker.get("symbol", "UNKNOWN")
    sym = symbol.replace("USDT", "")
    fi = _funding_info(premium_all, symbol)

    lines = []
    lines.append("Regime Change Alert")
    lines.append("")
    lines.append(f"A significant shift in market structure has been detected for {sym}.")
    lines.append("")
    lines.append(f"Price: {_fmt_price(ticker.get('lastPrice', 0))} ({_fmt_pct(ticker.get('priceChangePercent', 0))} 24h)")
    lines.append(f"Volume: {_fmt_vol(ticker.get('quoteVolume', 0))}")
    lines.append(f"Range: {_fmt_price(ticker.get('lowPrice', 0))} - {_fmt_price(ticker.get('highPrice', 0))}")
    lines.append("")
    lines.append(f"Top Trader Positioning: {sm_data['longPct']:.0f}% Long / {sm_data['shortPct']:.0f}% Short")
    lines.append(f"Funding Rate: {fi['ratePct']:+.4f}% ({fi['direction']})")
    lines.append(f"Mark-Index Premium: {fi['premiumPct']:+.3f}%")
    lines.append("")

    chg = float(ticker.get("priceChangePercent", 0))
    vol_quote = float(ticker.get("quoteVolume", 0))

    if abs(chg) > 5:
        lines.append(f"A {abs(chg):.1f}% move in 24 hours indicates a possible regime transition. "
                     f"{'Bullish momentum' if chg > 0 else 'Bearish pressure'} is building. "
                     f"Watch for follow-through in the next 4-8 hours to confirm whether "
                     f"this is a breakout or a fakeout.")
    else:
        lines.append(f"While price change is moderate ({_fmt_pct(chg)}), the shift in top trader "
                     f"positioning to {sm_data['score']}% long suggests smart money is "
                     f"{'accumulating quietly before a move' if sm_data['score'] > 55 else 'reducing exposure'}.")

    lines.append("")
    lines.append("Key levels to watch:")
    high = float(ticker.get("highPrice", 0))
    low = float(ticker.get("lowPrice", 0))
    lines.append(f"  Resistance: {_fmt_price(high)}")
    lines.append(f"  Support: {_fmt_price(low)}")

    return "\n".join(lines)


def _build_accumulation_watchlist(tickers, traders_data, premium_all):
    lines = []
    lines.append("Accumulation Watchlist")
    lines.append("")
    lines.append("Pairs where top traders hold the strongest long positioning. "
                 "High long ratios combined with moderate funding rates often indicate "
                 "institutional accumulation ahead of larger moves.")
    lines.append("")

    pairs = []
    for i, t in enumerate(tickers):
        sm = _lr_to_score(traders_data[i] if i < len(traders_data) else [])
        fi = _funding_info(premium_all, t.get("symbol", ""))
        pairs.append((t, sm, fi))

    pairs.sort(key=lambda x: x[1]["score"], reverse=True)

    for rank, (t, sm, fi) in enumerate(pairs[:8], 1):
        sym = t.get("symbol", "").replace("USDT", "")
        lines.append(f"{rank}. {sym}")
        lines.append(f"   Top Traders: {sm['longPct']:.0f}% Long | Price: {_fmt_price(t.get('lastPrice',0))} ({_fmt_pct(t.get('priceChangePercent',0))})")
        lines.append(f"   Volume: {_fmt_vol(t.get('quoteVolume',0))} | Funding: {fi['ratePct']:+.4f}%")
        # Signal quality
        if sm["score"] > 60 and abs(fi["ratePct"]) < 0.02:
            lines.append("   Signal: Strong accumulation with healthy funding")
        elif sm["score"] > 60 and fi["ratePct"] > 0.02:
            lines.append("   Signal: Accumulation but elevated funding cost")
        lines.append("")

    return "\n".join(lines)


def _build_custom_analysis(ticker, sm_data, premium_all):
    symbol = ticker.get("symbol", "UNKNOWN")
    sym = symbol.replace("USDT", "")
    fi = _funding_info(premium_all, symbol)

    lines = []
    lines.append(f"Deep Analysis - {sym}")
    lines.append("")

    # Price section
    lines.append("Price Action:")
    lines.append(f"  Current: {_fmt_price(ticker.get('lastPrice', 0))}")
    lines.append(f"  24h Change: {_fmt_pct(ticker.get('priceChangePercent', 0))}")
    lines.append(f"  24h High: {_fmt_price(ticker.get('highPrice', 0))}")
    lines.append(f"  24h Low: {_fmt_price(ticker.get('lowPrice', 0))}")
    lines.append(f"  Volume: {_fmt_vol(ticker.get('quoteVolume', 0))}")
    lines.append("")

    # Positioning
    lines.append("Institutional Positioning:")
    lines.append(f"  Top Traders: {sm_data['longPct']:.1f}% Long / {sm_data['shortPct']:.1f}% Short")
    lines.append(f"  L/S Ratio: {sm_data['ratio']:.4f}")
    lines.append(f"  Bias: {sm_data['bias']}")
    lines.append("")

    # Funding & derivatives
    lines.append("Derivatives:")
    lines.append(f"  Funding Rate: {fi['ratePct']:+.4f}% ({fi['apr']:.1f}% APR)")
    lines.append(f"  Mark Price: {_fmt_price(fi['mark'])}")
    lines.append(f"  Index Price: {_fmt_price(fi['index'])}")
    lines.append(f"  Premium: {fi['premiumPct']:+.3f}%")
    lines.append(f"  Status: {fi['direction']}")
    lines.append("")

    # Verdict
    lines.append("Verdict:")
    chg = float(ticker.get("priceChangePercent", 0))
    score = sm_data["score"]

    if score > 60 and chg > 0 and fi["ratePct"] < 0.03:
        lines.append(f"  {sym} shows strong institutional accumulation ({score}% long) with healthy "
                     f"funding ({fi['ratePct']:+.4f}%). Price is trending up with {_fmt_pct(chg)} over 24h. "
                     f"Conditions favor continued upside as long as funding remains moderate.")
    elif score > 60 and fi["ratePct"] > 0.03:
        lines.append(f"  {sym} has heavy long positioning ({score}% long) but elevated funding "
                     f"({fi['apr']:.0f}% APR). This combination often precedes pullbacks. "
                     f"Consider taking profit or waiting for a funding reset before entering long.")
    elif score < 40 and chg < 0:
        lines.append(f"  {sym} is under distribution pressure. Top traders are {sm_data['shortPct']:.0f}% short "
                     f"and price dropped {_fmt_pct(chg)}. {'Negative funding adds further bearish pressure.' if fi['ratePct'] < 0 else 'Despite positive funding, smart money prefers downside.'}")
    else:
        lines.append(f"  {sym} shows mixed signals. Top traders at {score}% long with "
                     f"{fi['ratePct']:+.4f}% funding. No strong directional edge from current data. "
                     f"Wait for positioning to shift above 60% or below 40% for a clearer signal.")

    return "\n".join(lines)


def _add_hashtags(content: str, template: str, symbols: list) -> str:
    tags = list(TEMPLATE_HASHTAGS.get(template, ["#Binance"]))
    for sym in symbols[:3]:
        tag = _symbol_tag(sym)
        if tag not in tags:
            tags.append(tag)
    return content + "\n\n" + " ".join(tags)


@router.get("/preview")
async def square_preview(
    template: str = Query(..., description="Template type"),
    symbol: str = Query("BTCUSDT", description="Primary symbol"),
    symbols: str = Query("", description="Comma-separated symbols for multi-symbol templates"),
):
    """Generate content preview from template + live data."""
    if template not in TEMPLATES:
        return {"error": f"Unknown template: {template}. Valid: {', '.join(TEMPLATES)}"}

    sym_list = [s.strip().upper() for s in symbols.split(",") if s.strip()] if symbols else [symbol.upper()]

    try:
        # Always fetch premium index (has all funding rates)
        premium_all = await _get_all_premium()

        if template == "market-brief":
            top_syms = ["BTCUSDT", "ETHUSDT", "BNBUSDT", "SOLUSDT", "XRPUSDT",
                        "DOGEUSDT", "ADAUSDT", "AVAXUSDT", "LINKUSDT", "DOTUSDT"]
            tickers, btc_traders = await asyncio.gather(
                asyncio.gather(*[_fetch_ticker(s) for s in top_syms]),
                _fetch_top_traders("BTCUSDT"),
            )
            tickers = [t for t in tickers if isinstance(t, dict) and not t.get("error")]
            sm_data = _lr_to_score(btc_traders)
            content = _build_market_brief(tickers, sm_data, premium_all)

        elif template == "smart-money-alert":
            sym = symbol.upper()
            ticker, traders = await asyncio.gather(
                _fetch_ticker(sym),
                _fetch_top_traders(sym),
            )
            sm_data = _lr_to_score(traders)
            content = _build_smart_money_alert(ticker, sm_data, premium_all)

        elif template == "funding-snapshot":
            top_syms = sym_list if len(sym_list) > 1 else [
                "BTCUSDT", "ETHUSDT", "SOLUSDT", "DOGEUSDT", "XRPUSDT",
                "ADAUSDT", "AVAXUSDT", "LINKUSDT", "APTUSDT", "PEPEUSDT"]
            tickers = await asyncio.gather(*[_fetch_ticker(s) for s in top_syms])
            tickers = [t for t in tickers if isinstance(t, dict) and not t.get("error")]
            content = _build_funding_snapshot(tickers, premium_all)

        elif template == "sector-rotation":
            rot_syms = ["ETHUSDT", "LINKUSDT", "AVAXUSDT", "DOTUSDT", "ADAUSDT",
                        "DOGEUSDT", "SOLUSDT", "UNIUSDT", "APTUSDT", "NEARUSDT",
                        "INJUSDT", "ARBUSDT"]
            tickers, traders = await asyncio.gather(
                asyncio.gather(*[_fetch_ticker(s) for s in rot_syms]),
                asyncio.gather(*[_fetch_top_traders(s) for s in rot_syms]),
            )
            content = _build_sector_rotation(list(tickers), list(traders), premium_all)

        elif template == "regime-change":
            sym = symbol.upper()
            ticker, traders = await asyncio.gather(
                _fetch_ticker(sym),
                _fetch_top_traders(sym),
            )
            sm_data = _lr_to_score(traders)
            content = _build_regime_change(ticker, sm_data, premium_all)

        elif template == "accumulation-watchlist":
            watch_syms = sym_list if len(sym_list) > 1 else [
                "ETHUSDT", "LINKUSDT", "AVAXUSDT", "SOLUSDT", "APTUSDT",
                "NEARUSDT", "INJUSDT", "SUIUSDT", "ARBUSDT", "OPUSDT"]
            tickers, traders = await asyncio.gather(
                asyncio.gather(*[_fetch_ticker(s) for s in watch_syms]),
                asyncio.gather(*[_fetch_top_traders(s) for s in watch_syms]),
            )
            content = _build_accumulation_watchlist(list(tickers), list(traders), premium_all)

        elif template == "custom-analysis":
            sym = symbol.upper()
            ticker, traders = await asyncio.gather(
                _fetch_ticker(sym),
                _fetch_top_traders(sym),
            )
            sm_data = _lr_to_score(traders)
            content = _build_custom_analysis(ticker, sm_data, premium_all)
        else:
            content = ""

        content = _add_hashtags(content, template, sym_list)

        return {
            "template": template,
            "symbol": symbol,
            "content": content,
            "charCount": len(content),
            "maxChars": 2000,
            "hashtags": TEMPLATE_HASHTAGS.get(template, []),
        }

    except Exception as e:
        return {"error": str(e), "template": template}


@router.post("/post")
async def square_post(body: dict = Body(...)):
    """Post content to Binance Square via Square OpenAPI."""
    api_key = body.get("apiKey", "")
    content = body.get("content", "")

    if not api_key or api_key == "your_api_key":
        return {"error": "Square API Key is required. Configure it in the panel settings."}
    if not content or not content.strip():
        return {"error": "Content cannot be empty."}
    if len(content) > 2000:
        return {"error": f"Content exceeds 2000 character limit ({len(content)} chars)."}

    try:
        import httpx
        async with httpx.AsyncClient(timeout=15) as client:
            resp = await client.post(
                f"{BAPI}/composite/v1/public/pgc/openApi/content/add",
                json={"bodyTextOnly": content},
                headers={
                    "X-Square-OpenAPI-Key": api_key,
                    "Content-Type": "application/json",
                    "clienttype": "binanceSkill",
                },
            )
            data = resp.json()

        code = str(data.get("code", ""))
        message = SQUARE_ERRORS.get(code, data.get("message", "Unknown error"))

        if code == "000000":
            post_id = data.get("data", {}).get("id", "")
            post_url = f"https://www.binance.com/square/post/{post_id}" if post_id else ""
            return {"success": True, "message": message, "postId": post_id, "postUrl": post_url}
        return {"success": False, "code": code, "message": message}

    except Exception as e:
        return {"success": False, "message": f"Request failed: {str(e)}"}


@router.get("/pairs")
async def square_pairs():
    return {"pairs": PAIRS, "count": len(PAIRS)}


@router.get("/templates")
async def square_templates():
    return {
        "templates": [
            {"id": "market-brief", "name": "Market Brief", "description": "Daily summary with top movers, volume, and funding rates", "multiSymbol": True},
            {"id": "smart-money-alert", "name": "Smart Money Alert", "description": "Top trader positioning analysis with funding context", "multiSymbol": False},
            {"id": "funding-snapshot", "name": "Funding Snapshot", "description": "Extreme funding rates with contrarian analysis", "multiSymbol": True},
            {"id": "sector-rotation", "name": "Sector Rotation", "description": "Where institutional capital is rotating across sectors", "multiSymbol": True},
            {"id": "regime-change", "name": "Regime Change", "description": "Market structure shifts with key levels", "multiSymbol": False},
            {"id": "accumulation-watchlist", "name": "Accumulation Watchlist", "description": "Pairs with strongest institutional accumulation signals", "multiSymbol": True},
            {"id": "custom-analysis", "name": "Custom Analysis", "description": "Full deep-dive: price, positioning, funding, and verdict", "multiSymbol": False},
        ]
    }
