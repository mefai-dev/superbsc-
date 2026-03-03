# Showcase: MEFAI — Crypto Intelligence Terminal

## What is MEFAI?

MEFAI is an open-source, Bloomberg Terminal-inspired crypto intelligence terminal that uses **all 7 Binance Skills Hub APIs** in a unified, keyboard-driven interface.

## Why This Matters

- **First project to use ALL 7 Skills Hub APIs** in a single application
- **Cross-skill intelligence pipeline** — tokens flow through audit, signals, rankings, and profile in one workflow
- **Auto-Scanner** — continuously discovers and scores new tokens using multi-API analysis
- **Zero framework** — pure vanilla JS + Web Components, no build step
- **Plugin architecture** — add a panel in one file, under 100 lines

## Skills Map

| Panel | Skill | What It Does |
|-------|-------|-------------|
| Market Overview | 1 | Real-time CEX tickers |
| Order Book | 1 | Depth visualization |
| Price Chart | 1+7 | Candlestick charts |
| Spot Trading | 1 | Order entry (authenticated) |
| Meme Rush | 2 | New meme token discovery |
| Topic Rush | 2 | AI trending topics |
| Wallet Tracker | 3 | Portfolio viewer |
| Smart Signals | 4 | Smart money signal feed |
| Social Hype | 5 | Sentiment leaderboard |
| Trending Tokens | 5 | Unified rankings |
| Smart Inflow | 5 | Money flow analysis |
| Meme Rank | 5 | Breakout scoring |
| Top Traders | 5 | PnL leaderboard |
| Token Audit | 6 | Security report |
| Token Search | 7 | Global search |
| Token Profile | 7 | Full token view |
| DEX Chart | 7 | DEX candlestick |
| **Auto-Scanner** | **ALL 7** | **Automated intelligence** |

## Quick Start

```bash
git clone https://github.com/mefaidev/mefai.git
cd mefai
docker compose up
# Open http://localhost:8000
```

## Links

- GitHub: https://github.com/mefaidev/mefai
- License: MIT
- Contributing: See CONTRIBUTING.md
