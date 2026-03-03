# MEFAI Architecture

## System Overview

```
┌──────────────────────────────────────────────────────┐
│                     Browser                           │
│                                                      │
│  ┌─────────────┐ ┌──────────┐ ┌──────────────────┐  │
│  │  App Engine  │ │  Store   │ │  Panel Registry  │  │
│  │  (app.js)    │ │(pub/sub) │ │  (18 panels)     │  │
│  └──────┬───────┘ └────┬─────┘ └────────┬─────────┘  │
│         │              │                │             │
│  ┌──────┴──────────────┴────────────────┴─────────┐  │
│  │              API Client (api.js)                │  │
│  └──────────────────────┬─────────────────────────┘  │
└─────────────────────────┼────────────────────────────┘
                          │ HTTP
┌─────────────────────────┼────────────────────────────┐
│              FastAPI Proxy (proxy/)                    │
│  ┌──────┐ ┌──────┐ ┌──────────┐ ┌─────────────────┐ │
│  │ CORS │ │Cache │ │  Routes  │ │ Scanner Engine  │ │
│  └──────┘ └──────┘ └────┬─────┘ └────────┬────────┘ │
└──────────────────────────┼────────────────┼──────────┘
                           │                │
                    ┌──────┴────────────────┴──────┐
                    │   Binance Skills Hub APIs     │
                    │  ┌─────┐ ┌─────┐ ┌─────┐    │
                    │  │Sk 1 │ │Sk 2 │ │Sk 3 │    │
                    │  ├─────┤ ├─────┤ ├─────┤    │
                    │  │Sk 4 │ │Sk 5 │ │Sk 6 │    │
                    │  ├─────┤ └─────┘ └─────┘    │
                    │  │Sk 7 │                     │
                    │  └─────┘                     │
                    └──────────────────────────────┘
```

## Frontend Architecture

### Store (Pub/Sub)
- Central state: theme, layout, focusedToken, focusedWallet, scannerStatus
- Panels subscribe to state changes for cross-panel intelligence
- ~50 lines, zero dependencies

### Panels (Web Components)
- Each panel extends `BasePanel` (HTMLElement)
- Lifecycle: `connectedCallback → render → fetchData → renderContent → afterRender`
- Auto-refresh on configurable interval
- Cross-panel communication via store events

### Layout Engine
- CSS Grid with preset configurations
- 6 layouts: Overview, Meme Hunter, Whale Watcher, Deep Dive, Trader, Scanner
- Dynamic panel creation/destruction on layout switch
- Keyboard shortcuts for instant switching (1-6)

## Backend Architecture

### Proxy Layer
- Thin FastAPI proxy — no business logic
- CORS middleware for browser access
- In-memory TTL cache (default 5s)
- httpx async client for upstream requests
- HMAC signing for authenticated Spot endpoints

### Scanner Engine
- Background asyncio task
- Polls Meme Rush every N seconds (default 30)
- Scores tokens using multi-API pipeline
- Maintains sorted results in memory
- Exposed via REST endpoints

## Cross-Panel Intelligence

When a user clicks a token in any panel:
1. Panel calls `store.focusToken({ symbol, address, chain })`
2. Store notifies all subscribers
3. Token Profile loads meta + dynamic data
4. Token Audit runs security check
5. DEX Chart loads price history
6. Wallet Tracker can track related wallets

This creates a unified research workflow without explicit navigation.

## Plugin Architecture

Adding a panel requires ONE file:
1. Create `frontend/js/panels/my-panel.js`
2. Extend `BasePanel`, implement `fetchData()` and `renderContent()`
3. Register with `customElements.define()`
4. Add to panel registry in `app.js`

No build step. No config changes. Works immediately.
