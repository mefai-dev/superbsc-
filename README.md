# SuperBSC

**The first open-source crypto intelligence terminal powered by all 7 Binance Skills Hub APIs.**

A Bloomberg Terminal-inspired, keyboard-driven, multi-panel interface that unifies every Binance Skills Hub skill into one coherent workflow. Dark mode. Zero framework. One command deploy.

```
+-----------------------+----------------------+---------------------+
| MARKET OVERVIEW       | SMART SIGNALS        | TOKEN PROFILE       |
| BTC   68,520  +2.1%  | BUY  PEPE   SM:12   | BNB                 |
| ETH    1,986  -0.3%  | SELL DOGE   SM:8    | MCap: $86.8B        |
| BNB      634  +1.2%  | BUY  WIF    SM:24   | Risk: SAFE          |
+-----------------------+----------------------+---------------------+
| TRENDING TOKENS                              | MEME RUSH           |
| #1 QUQ    $0.0019  +342%                    | AI gent   $0.012    |
| #2 BTW    $0.0102  +128%                    | GIRAFFES  $0.008    |
| #3 PUMP   $0.0019  +89%                     | 龙虾       $0.003    |
+-----------------------+----------------------+---------------------+
```

## Why SuperBSC

**Cross-Skill Intelligence Pipeline** — No other project connects all 7 APIs into a single workflow:

```
New token detected (Skill 2) -> Audit security (Skill 6) -> Check smart money (Skill 5)
-> View full profile (Skill 7) -> Track signals (Skill 4) -> Monitor wallet (Skill 3)
-> Execute trade (Skill 1)
```

**Auto-Scanner Engine** — A background process that continuously pulls new tokens, audits them, checks smart money flow, and surfaces the most promising opportunities. Automated multi-API intelligence that no other tool offers.

**Terminal-First UX** — Every action has a keyboard shortcut. Command palette, global search, layout presets. No mouse required for power users.

## Skills Hub Integration

Every panel maps directly to a Binance Skills Hub API. Full attribution throughout.

| Panel | Skill | API Endpoint |
|-------|-------|-------------|
| Market Overview | Skill 1: Spot CEX | `GET /api/v3/ticker/24hr` |
| Order Book | Skill 1: Spot CEX | `GET /api/v3/depth` |
| Price Chart | Skill 1: Spot CEX | `GET /api/v3/klines` |
| Spot Trading | Skill 1: Spot CEX | `POST /api/v3/order` |
| Meme Rush | Skill 2: Meme Rush | `POST pulse/rank/list` |
| Topic Rush | Skill 2: Topic Rush | `GET social-rush/rank/list` |
| Wallet Tracker | Skill 3: Address Info | `GET active-position-list` |
| Smart Signals | Skill 4: Trading Signal | `POST signal/smart-money` |
| Social Hype | Skill 5.1: Social Rank | `GET social/hype/rank/leaderboard` |
| Trending Tokens | Skill 5.2: Unified Rank | `POST unified/rank/list` |
| Smart Inflow | Skill 5.3: Inflow Rank | `POST inflow/rank/query` |
| Meme Rank | Skill 5.4: Exclusive Rank | `GET exclusive/rank/list` |
| Top Traders | Skill 5.5: Leaderboard | `GET leaderboard/query` |
| Token Audit | Skill 6: Security Audit | `POST security/token/audit` |
| Token Search | Skill 7.1: Search | `GET token/search` |
| Token Profile | Skill 7.2+3: Meta+Dynamic | `GET token/meta/info` + `dynamic/info` |
| DEX Chart | Skill 7.4: K-Line | `GET k-line/candles` |
| **Auto-Scanner** | **All 7 Skills** | **Automated pipeline** |

## Quick Start

```bash
# Clone
git clone https://github.com/mefai-dev/superbsc-.git
cd superbsc-

# Option 1: Docker (recommended)
docker compose up

# Option 2: Manual
pip install fastapi uvicorn httpx python-dotenv
make dev
```

Open `http://localhost:8000`

## 18 Panels

### Skill 1: Spot CEX
- **Market Overview** — Real-time ticker table for all USDT pairs. Price, 24h change, volume. Sortable columns, auto-refresh.
- **Order Book** — Bid/ask depth visualization with green/red depth bars. Mid-price and spread display.
- **Price Chart** — Candlestick chart powered by TradingView lightweight-charts. Multiple timeframes (1m to 1d).
- **Spot Trading** — Order entry form with market/limit orders. Requires Binance API key.

### Skill 2: Meme Rush
- **Meme Rush Board** — Live meme token launches. Three tabs: New, Finalizing, Migrated. BSC and Solana chains.
- **Topic Rush** — AI-detected trending crypto topics with associated tokens. Latest, Rising, Viral tabs.

### Skill 3: Address Info
- **Wallet Tracker** — Portfolio viewer for any wallet address. Token holdings with price, value, and 24h changes.

### Skill 4: Trading Signal
- **Smart Signals** — Real-time smart money signal feed. Buy/sell direction, signal price, max gain percentage.

### Skill 5: Market Rankings
- **Social Hype** — Tokens ranked by social media hype with AI sentiment analysis.
- **Trending Tokens** — Unified ranking across multiple data sources.
- **Smart Money Inflow** — Tokens ranked by smart money net inflow amounts.
- **Meme Rank** — Top meme tokens scored by breakout potential algorithm.
- **Top Traders** — Wallet-level PnL leaderboard with win rates and volume.

### Skill 6: Token Security
- **Token Audit** — Security report card with risk level, buy/sell tax, verification status, and risk item breakdown.

### Skill 7: Token Info
- **Token Search** — Global search by name, symbol, or contract address across all chains.
- **Token Profile** — Comprehensive single-token view: metadata, price, market cap, supply, holders, embedded audit.
- **DEX Chart** — DEX candlestick chart for any token with multiple timeframes.

### All Skills Combined
- **Auto-Scanner** — The unique panel. Background engine that pulls new tokens, audits each one, checks smart money, cross-references signals, and surfaces top opportunities with composite scores.

## 6 Layout Presets

| # | Layout | Panels | Use Case |
|---|--------|--------|----------|
| 1 | Overview | Market + Trending + Signals + Profile | General monitoring |
| 2 | Meme Hunter | Meme Rush + Topics + Meme Rank + Scanner | Meme token discovery |
| 3 | Whale Watcher | Top Traders + Inflow + Signals + Wallet | Smart money tracking |
| 4 | Deep Dive | Profile + DEX Chart + Audit + Hype + Signals + Wallet | Token research |
| 5 | Trader | Market + Order Book + Chart + Trading | Active CEX trading |
| 6 | Scanner | Auto-Scanner + Audit + Profile + Signals | Automated intelligence |

Switch layouts with keyboard shortcuts `1` through `6`.

## Keyboard Shortcuts

| Key | Action |
|-----|--------|
| `Cmd+K` / `Ctrl+K` | Search tokens |
| `/` | Command palette |
| `1-6` | Switch layout |
| `d` | Toggle dark/light theme |
| `r` | Refresh all panels |
| `Esc` | Close overlay |
| `?` | Show all shortcuts |

## Architecture

```
Browser (Vanilla JS + Web Components)
    |
    v
FastAPI Proxy (Python, async, in-memory cache)
    |
    +-- Spot CEX: data-api.binance.vision
    +-- Web3 Skills: web3.binance.com/bapi/defi/
    +-- K-Line: dquery.sintral.io
    +-- Scanner Engine (background asyncio task)
```

- **Frontend**: Vanilla JS, Web Components, zero dependencies, no build step
- **Backend**: Python FastAPI with async httpx client and in-memory TTL cache
- **Charts**: TradingView lightweight-charts (vendored, MIT license)
- **Cache**: Server-side 60s TTL + client-side 30s TTL + startup warm-up
- **Deploy**: Docker Compose, single command

## Adding a Panel

Create one file in `frontend/js/panels/`:

```javascript
import { BasePanel } from '../components/base-panel.js';

export class MyPanel extends BasePanel {
  static skill = 'Skill X: Name';
  static defaultTitle = 'My Panel';

  async fetchData() {
    return window.mefaiApi.someEndpoint();
  }

  renderContent(data) {
    return `<div>${JSON.stringify(data)}</div>`;
  }
}

customElements.define('my-panel', MyPanel);
```

Register it in `app.js` panel registry. No build step needed.

See [CONTRIBUTING.md](CONTRIBUTING.md) for the full guide.

## Project Structure

```
superbsc/
├── proxy/                  # Python FastAPI proxy + cache + scanner
│   ├── main.py             # App entry, CORS, routes, cache warm-up
│   ├── cache.py            # In-memory TTL cache with httpx async client
│   ├── config.py           # Environment settings
│   ├── scanner.py          # Auto-scan engine (all 7 skills)
│   └── routes/             # 8 route modules (one per skill + scanner)
├── frontend/
│   ├── index.html          # Single page shell
│   ├── css/main.css        # All styles (~650 lines, responsive)
│   └── js/
│       ├── app.js          # Panel registry, layout engine, keyboard
│       ├── api.js           # API client with cache
│       ├── store.js        # Pub/sub state (cross-panel intelligence)
│       ├── components/     # 10 reusable Web Components
│       ├── panels/         # 18 panels (one file each)
│       └── layouts/        # 6 layout presets
├── Dockerfile + docker-compose.yml
├── Makefile
└── docs/                   # Submission materials
```

## Configuration

Copy `.env.example` to `.env`:

```bash
# Optional: Only needed for Spot Trading panel
BINANCE_API_KEY=
BINANCE_API_SECRET=

# Server
PROXY_PORT=8000
CACHE_TTL=60
SCANNER_INTERVAL=30
```

Without an API key, 17 of 18 panels work. The Spot Trading panel activates with a key.

## License

MIT

## Acknowledgments

Built on [Binance Skills Hub](https://github.com/binance/binance-skills-hub) — the open marketplace of crypto AI skills for developers.
