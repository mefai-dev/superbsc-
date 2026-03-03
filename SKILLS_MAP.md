# MEFAI Skills Map

Complete mapping of Binance Skills Hub APIs to MEFAI panels.

## Skill 1: Binance Spot CEX API

| Endpoint | Panel | Method |
|----------|-------|--------|
| `/api/v3/ticker/24hr` | Market Overview | GET |
| `/api/v3/ticker/price` | Market Overview | GET |
| `/api/v3/depth` | Order Book | GET |
| `/api/v3/klines` | Price Chart | GET |
| `/api/v3/order` | Spot Trading | POST |
| `/api/v3/openOrders` | Spot Trading | GET |
| `/api/v3/account` | Spot Trading | GET |

## Skill 2: Meme Rush + Topic Rush

| Endpoint | Panel | Method |
|----------|-------|--------|
| `pulse/rank/list` | Meme Rush Board | POST |
| `social-rush/rank/list` | Topic Rush | GET |

## Skill 3: Query Address Info

| Endpoint | Panel | Method |
|----------|-------|--------|
| `active-position-list` | Wallet Tracker | GET |

## Skill 4: Trading Signal

| Endpoint | Panel | Method |
|----------|-------|--------|
| `signal/smart-money` | Smart Money Signals | POST |

## Skill 5: Market Rankings (5 sub-APIs)

| Endpoint | Panel | Method |
|----------|-------|--------|
| `social/hype/rank/leaderboard` | Social Hype | GET |
| `unified/rank/list` | Trending Tokens | POST |
| `token/inflow/rank/query` | Smart Money Inflow | POST |
| `exclusive/rank/list` | Meme Rank | GET |
| `leaderboard/query` | Top Traders | GET |

## Skill 6: Token Security Audit

| Endpoint | Panel | Method |
|----------|-------|--------|
| `security/token/audit` | Token Audit | POST |

## Skill 7: Token Info (4 sub-APIs)

| Endpoint | Panel | Method |
|----------|-------|--------|
| `token/search` | Token Search | GET |
| `token/meta/info` | Token Profile | GET |
| `token/dynamic/info` | Token Profile | GET |
| `k-line/candles` | DEX Chart | GET |

## Auto-Scanner (ALL 7 SKILLS)

The Auto-Scanner is MEFAI's unique feature. It uses ALL 7 skills in a pipeline:

1. **Skill 2** — Pull new tokens from Meme Rush
2. **Skill 6** — Audit each token for security
3. **Skill 5.3** — Check smart money inflow
4. **Skill 4** — Check for trading signals
5. **Skill 7.3** — Get dynamic market data
6. Compute composite opportunity score
7. Surface top opportunities with all data pre-loaded
