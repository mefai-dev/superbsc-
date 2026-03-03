// MEFAI API v4 — Simple proxy client with cache. All data from proxy.

const BASE_URI = document.baseURI || window.location.href;

// ── Client Cache (avoids repeated requests) ──────────────────────────
const _c = new Map();
function _cg(k, ttl) { const e = _c.get(k); return e && Date.now() - e.t < ttl ? e.d : null; }
function _cs(k, d) { _c.set(k, { d, t: Date.now() }); if (_c.size > 300) _c.delete(_c.keys().next().value); }

function _url(path, params = {}) {
  const u = new URL(path.replace(/^\//, ''), BASE_URI);
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  return u.href;
}

async function get(path, params = {}, ttl = 30000) {
  const url = _url(path, params);
  const cached = _cg(url, ttl);
  if (cached) return cached;
  const r = await fetch(url);
  const d = await r.json();
  if (r.ok && !d?.error) _cs(url, d);
  return d;
}

async function post(path, body = {}, ttl = 30000) {
  const url = _url(path);
  const key = url + JSON.stringify(body);
  const cached = _cg(key, ttl);
  if (cached) return cached;
  const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  const d = await r.json();
  if (r.ok && !d?.error) _cs(key, d);
  return d;
}

// ── Public API ───────────────────────────────────────────────────────
export const api = {
  // Skill 1: Spot CEX
  spot: {
    tickers: (p) => get('/api/spot/tickers', p, 5000),
    ticker: (s) => get('/api/spot/ticker', { symbol: s }, 5000),
    depth: (s, l) => get('/api/spot/depth', { symbol: s, limit: l || 20 }, 3000),
    klines: (s, i, l) => get('/api/spot/klines', { symbol: s, interval: i || '1h', limit: l || 100 }, 10000),
    account: () => get('/api/spot/account', {}, 30000),
    openOrders: (s) => get('/api/spot/orders', s ? { symbol: s } : {}, 10000),
    placeOrder: (p) => post('/api/spot/order', p, 0),
  },
  // Skill 2: Meme Rush
  meme: {
    rushList: (p) => post('/api/meme/rush', p || { chainId: '56', rankType: 10, limit: 20 }, 30000),
    topicList: (p) => get('/api/meme/topics', p || { chainId: '56', rankType: 10, sort: 10 }, 30000),
  },
  // Skill 3: Address
  address: {
    positions: (p) => get('/api/address/positions', p, 30000),
  },
  // Skill 4: Signals
  signals: {
    smartMoney: (p) => post('/api/signals/smart-money', p || { page: 1, pageSize: 20, smartSignalType: '', chainId: '56' }, 15000),
  },
  // Skill 5: Rankings
  rank: {
    socialHype: (p) => get('/api/rank/social-hype', p || { chainId: '56', page: 1, size: 20, targetLanguage: 'en', timeRange: 1 }, 60000),
    trending: (p) => post('/api/rank/trending', p || { page: 1, size: 20 }, 30000),
    smartInflow: (p) => post('/api/rank/smart-inflow', p || { chainId: 'CT_501', tagType: 2 }, 30000),
    memeRank: (p) => get('/api/rank/meme', p || { page: 1, size: 50 }, 60000),
    topTraders: (p) => get('/api/rank/traders', p || { pageNo: 1, pageSize: 20 }, 60000),
  },
  // Skill 6: Audit
  audit: {
    check: (p) => post('/api/audit/check', p, 60000),
  },
  // Skill 7: Token Info
  token: {
    search: (q, chain) => get('/api/token/search', { keyword: q, chainIds: chain }, 15000),
    meta: (addr, chain) => get('/api/token/meta', { contractAddress: addr, chainId: chain || '56' }, 60000),
    dynamic: (addr, chain) => get('/api/token/dynamic', { contractAddress: addr, chainId: chain || '56' }, 30000),
    kline: (p) => get('/api/token/kline', p, 30000),
  },
  // Scanner
  scanner: {
    status: () => get('/api/scanner/status', {}, 5000),
    results: () => get('/api/scanner/results', {}, 5000),
    start: () => post('/api/scanner/start', {}, 0),
    stop: () => post('/api/scanner/stop', {}, 0),
  },
  health: () => get('/health', {}, 30000),
};

window.mefaiApi = api;
export default api;
