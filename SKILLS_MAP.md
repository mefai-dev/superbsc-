# MEFAI Skills Map

Complete mapping of all 48 skills to panels and API endpoints.

## Core CEX Skills (1 to 7)

### Skill 1: Binance Spot CEX API
| Endpoint | Panel | Method |
|----------|-------|--------|
| `/api/v3/ticker/24hr` | Market Overview | GET |
| `/api/v3/ticker/price` | Market Overview | GET |
| `/api/v3/depth` | Order Book | GET |
| `/api/v3/klines` | Price Chart | GET |
| `/api/v3/ticker` (window) | Momentum Cascade | GET |
| `/api/v3/ticker/bookTicker` | Microstructure Health, Anomaly Composite | GET |
| `/api/v3/order` | Spot Trading | POST |
| `/api/v3/openOrders` | Spot Trading | GET |
| `/api/v3/account` | Spot Trading | GET |

### Skill 2: Meme Rush + Topic Rush
| Endpoint | Panel | Method |
|----------|-------|--------|
| `pulse/rank/list` | Meme Rush Board | POST |
| `social rush/rank/list` | Topic Rush | GET |

### Skill 3: Query Address Info
| Endpoint | Panel | Method |
|----------|-------|--------|
| `active position list` | Wallet Tracker | GET |

### Skill 4: Trading Signal
| Endpoint | Panel | Method |
|----------|-------|--------|
| `signal/smart money` | Smart Money Signals | POST |

### Skill 5: Market Rankings (5 sub APIs)
| Endpoint | Panel | Method |
|----------|-------|--------|
| `social/hype/rank/leaderboard` | Social Hype | GET |
| `unified/rank/list` | Trending Tokens | POST |
| `token/inflow/rank/query` | Smart Money Inflow | POST |
| `exclusive/rank/list` | Meme Rank | GET |
| `leaderboard/query` | Top Traders | GET |

### Skill 6: Token Security Audit
| Endpoint | Panel | Method |
|----------|-------|--------|
| `security/token/audit` | Token Audit | POST |
| GoPlus `address_security` | Wallet Risk Score | GET |
| GoPlus `token_security` | GoPlus Scanner | GET |

### Skill 7: Token Info (4 sub APIs)
| Endpoint | Panel | Method |
|----------|-------|--------|
| `token/search` | Token Search | GET |
| `token/meta/info` | Token Profile | GET |
| `token/dynamic/info` | Token Profile | GET |
| `k line/candles` | DEX Chart | GET |

## Derivatives Skills (28 to 38)

### Binance Futures Exclusive APIs
| Endpoint | Panels Using It | Exclusive? |
|----------|----------------|------------|
| `/fapi/v1/ticker/24hr` | Taker Pressure, OI Surge, Spread Monitor, Smart Money Radar, Intelligence Feed, + 8 more | No |
| `/fapi/v1/premiumIndex` | Funding Scanner, Funding Heatmap, Smart Money Radar, Intelligence Feed, + 5 more | Partial |
| `/fapi/v1/ticker/bookTicker` | Spread Monitor, Microstructure Health, Anomaly Composite, Intelligence Feed | No |
| `/futures/data/globalLongShortAccountRatio` | Trader Divergence, Sentiment Convergence, Smart Money Radar, Intelligence Feed | **BINANCE ONLY** |
| `/futures/data/topLongShortAccountRatio` | Trader Divergence, Sentiment Convergence, Smart Money Radar, Intelligence Feed | **BINANCE ONLY** |
| `/futures/data/topLongShortPositionRatio` | Trader Divergence, Sentiment Convergence, Smart Money Radar, Intelligence Feed | **BINANCE ONLY** |
| `/futures/data/takerlongshortRatio` | Taker Pressure, Sentiment Convergence, Smart Money Radar, Intelligence Feed | **BINANCE ONLY** |
| `/futures/data/openInterestHist` | OI Surge, Anomaly Composite, Microstructure Health, Smart Money Radar, Intelligence Feed | Partial |
| `/fapi/v1/fundingInfo` | Funding Scanner | No |
| `/fapi/v1/indexInfo` | Index Composition | Partial |
| `/fapi/v1/constituents` | Cross Exchange Arb | **BINANCE ONLY** |
| `/futures/data/basis` | Basis Spread, Term Structure | **BINANCE ONLY** |
| `/futures/data/delivery price` | Term Structure | Partial |

## Convergence Intelligence (39 to 44)

### Skill 39: Cross Exchange Arb
Uses `/fapi/v1/constituents` — 8 exchange composite weights for price comparison.

### Skill 40: Sentiment Convergence
Combines 6 sources: retail L/S, top account L/S, top position L/S, taker B/S, funding rate, OI change.

### Skill 41: Term Structure Analyzer
Uses basis history + delivery prices + exchange info for contango backwardation analysis.

### Skill 42: Anomaly Composite
6 anomaly signals: VWAP deviation, large move, funding extreme, OI spike, spot futures gap, taker flow.

### Skill 43: Momentum Cascade
Uses `api/v3/ticker` with custom `windowSize` (1h, 4h). Underutilized Binance API feature.

### Skill 44: Microstructure Health
5 metrics → single health score (0-100): spread, spot futures gap, funding, taker balance, OI stability.

## Flagship Intelligence (45 to 47)

### Skill 45: Smart Money Radar
**6 factor model using Binance exclusive data:**
1. Smart Money Direction (`topLongShortPositionRatio`) **BINANCE ONLY**
2. Retail Contrarian (`globalLongShortAccountRatio`)
3. Smart vs Retail Divergence (computed)
4. Taker Pressure (`takerlongshortRatio`) **BINANCE ONLY**
5. Funding Signal (`premiumIndex`, contrarian)
6. OI Momentum (`openInterestHist`)

**Output:** Smart Money Score (0-100), Direction (LONG/SHORT/NEUTRAL), Market Regime (ACCUMULATION/DISTRIBUTION/POSITIONING/NEUTRAL)

### Skill 46: AI Intelligence Feed
**Synthesizes all engines into natural language events:**
- Smart Money alerts (score + direction + factor analysis)
- Anomaly detection (multi signal firing)
- Divergence alerts (smart vs retail disagreement)
- Funding extremes (contrarian signals)
- OI surges (position buildup detection)
- Microstructure stress (execution environment warnings)

**Output:** Prioritized, timestamped, severity ranked intelligence feed with human readable market analysis.

### Skill 47: AI Market Assistant (Speak to Binance)
**Interactive conversational AI using 9 Binance API endpoints per query:**
- `/fapi/v1/ticker/24hr`: Price, volume, 24h metrics
- `/fapi/v1/premiumIndex`: Funding rate, mark/index price
- `/fapi/v1/ticker/bookTicker`: Bid/ask spread
- `/futures/data/globalLongShortAccountRatio` — Retail positioning. **BINANCE ONLY**
- `/futures/data/topLongShortAccountRatio` — Top account positioning. **BINANCE ONLY**
- `/futures/data/topLongShortPositionRatio` — Smart money positioning. **BINANCE ONLY**
- `/futures/data/takerlongshortRatio` — Taker flow. **BINANCE ONLY**
- `/futures/data/openInterestHist`: OI change
- `/api/v3/ticker/bookTicker`: Spot price for basis

**Commands:** analyze, compare, summary, risk, opportunities, funding, health, portfolio, dca, whale, momentum, divergence, learn, help
**Output:** Natural language analysis with Smart Money Score, Health Grade, Regime, Anomaly Flags, and actionable verdict.

## Insider Intelligence (48 to 50)

### Skill 48: Whale Footprint
| Endpoint | Panel | Method |
|----------|-------|--------|
| `/api/v3/aggTrades` (x10 pairs, 500 each) | Whale Footprint | GET |

Real-time large trade detection ($50K+) across 10 top pairs. Trades classified as Dolphin ($50K+), Whale ($250K+), Mega ($1M+). Live feed with net buy/sell pressure, 15s refresh.

### Skill 49: Market Impact Simulator
| Endpoint | Panel | Method |
|----------|-------|--------|
| `/api/v3/depth` (limit 1000) | Market Impact Simulator | GET |

Order book walk-through simulator. User enters symbol, amount (USDT), side → calculates levels consumed, avg/worst fill price, slippage %, and dollar impact cost. Visual cumulative depth bars.

### Skill 50: Smart Accumulation Detector
| Endpoint | Panel | Method |
|----------|-------|--------|
| `/api/v3/klines` (4h, 30 bars) | Smart Accumulation | GET |
| `/futures/data/openInterestHist` (4h, 30 bars) | Smart Accumulation | GET |
| `/fapi/v1/premiumIndex` | Smart Accumulation | GET |
| `/futures/data/takerlongshortRatio` (4h) | Smart Accumulation | GET |

4-factor composite scoring (0-100) across 12 pairs: Volume Surge, OI Buildup, Stealth Mode (price stability + near-zero funding), Buyer Aggression (taker ratio). Detects institutional accumulation before price moves.

## Content Skills (60)

### Skill 60: Square Content Intelligence
| Endpoint | Panel | Method |
|----------|-------|--------|
| `/bapi/composite/v1/public/pgc/openApi/content/add` | Content Studio | POST |
| `/api/v3/ticker/24hr` | Content Studio | GET |
| `/futures/data/topLongShortPositionRatio` | Content Studio | GET |
| `/fapi/v1/premiumIndex` | Content Studio | GET |
| Smart Money Radar (internal) | Content Studio | GET |
| Funding Rate Scanner (internal) | Content Studio | GET |
| Regime Detection (internal) | Content Studio | GET |
| Accumulation Scanner (internal) | Content Studio | GET |

Data-driven content creation for Binance Square. 7 content templates (Market Brief, Smart Money Alert, Funding Snapshot, Sector Rotation, Regime Change, Accumulation Watchlist, Custom Analysis) populated with live data from 8 endpoints. Preview, edit, post, and track history.

## Meta Skills

### Auto Scanner (All 7 Core Skills)
Pipeline: Skill 2 → Skill 6 → Skill 5.3 → Skill 4 → Skill 7.3 → Composite Score

### Smart Flow (Skill 4 + 5)
Hybrid smart money + market ranking analysis.

### Alpha Radar (Skill 8.1)
5 source convergence scoring across smart money, social, trending, meme, and inflow data.
