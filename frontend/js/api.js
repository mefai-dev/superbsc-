// MEFAI API v6 — Persistent cache + stale-while-revalidate. Instant page loads.

const BASE_URI = document.baseURI || window.location.href;
const CACHE_KEY = 'mefai-api-cache';
const CACHE_MAX_AGE = 300000; // 5 min max localStorage staleness

// ── Persistent Cache — survives page reload ──────────────────────────
const _c = new Map();

// Restore cache from localStorage on load
try {
  const stored = localStorage.getItem(CACHE_KEY);
  if (stored) {
    const entries = JSON.parse(stored);
    const now = Date.now();
    for (const [k, v] of entries) {
      if (now - v.t < CACHE_MAX_AGE) _c.set(k, v);
    }
  }
} catch(e) { /* ignore corrupt cache */ }

// Persist cache to localStorage (debounced)
let _saveTimer = null;
function _persistCache() {
  if (_saveTimer) return;
  _saveTimer = setTimeout(() => {
    _saveTimer = null;
    try {
      const entries = [];
      const now = Date.now();
      for (const [k, v] of _c) {
        if (now - v.t < CACHE_MAX_AGE) entries.push([k, v]);
      }
      localStorage.setItem(CACHE_KEY, JSON.stringify(entries.slice(-100)));
    } catch(e) { /* localStorage full — ignore */ }
  }, 1000);
}

function _cg(k, ttl, stale) {
  const e = _c.get(k);
  if (!e) return null;
  if (Date.now() - e.t < ttl) return e.d; // fresh
  return stale ? e.d : null; // stale fallback
}

function _cs(k, d) {
  _c.set(k, { d, t: Date.now() });
  if (_c.size > 300) {
    const now = Date.now();
    for (const [ek, ev] of _c) { if (now - ev.t > 60000) { _c.delete(ek); if (_c.size <= 250) break; } }
    if (_c.size > 300) _c.delete(_c.keys().next().value);
  }
  _persistCache();
}

function _url(path, params = {}) {
  const u = new URL(path.replace(/^\//, ''), BASE_URI);
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  return u.href;
}

// In-flight request dedup
const _inflight = new Map();

async function get(path, params = {}, ttl = 30000) {
  const url = _url(path, params);
  const fresh = _cg(url, ttl, false);
  if (fresh) return fresh;

  // Return stale data immediately (from localStorage or memory), refresh in background
  const stale = _cg(url, CACHE_MAX_AGE, true);
  if (stale) {
    if (!_inflight.has(url)) {
      const p = _fetchGet(url);
      _inflight.set(url, p);
      p.catch(() => {});
    }
    return stale;
  }

  // No cache — must wait
  if (_inflight.has(url)) return _inflight.get(url);
  const p = _fetchGet(url);
  _inflight.set(url, p);
  return p;
}

async function _fetchGet(url) {
  try {
    const r = await fetch(url);
    let d;
    try { d = await r.json(); } catch { return { error: true, status: r.status }; }
    if (r.ok && !d?.error) _cs(url, d);
    return d;
  } finally { _inflight.delete(url); }
}

async function post(path, body = {}, ttl = 30000) {
  const url = _url(path);
  const key = url + JSON.stringify(body);
  const fresh = _cg(key, ttl, false);
  if (fresh) return fresh;

  const stale = _cg(key, CACHE_MAX_AGE, true);
  if (stale) {
    if (!_inflight.has(key)) {
      const p = _fetchPost(url, body, key);
      _inflight.set(key, p);
      p.catch(() => {});
    }
    return stale;
  }

  if (_inflight.has(key)) return _inflight.get(key);
  const p = _fetchPost(url, body, key);
  _inflight.set(key, p);
  return p;
}

async function _fetchPost(url, body, key) {
  try {
    const r = await fetch(url, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    let d;
    try { d = await r.json(); } catch { return { error: true, status: r.status }; }
    if (r.ok && !d?.error) _cs(key, d);
    return d;
  } finally { _inflight.delete(key); }
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
    trades: (s, l) => get('/api/spot/trades', { symbol: s, limit: l || 50 }, 5000),
    aggTrades: (s, l) => get('/api/spot/aggTrades', { symbol: s, limit: l || 50 }, 5000),
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
  // Skill 8: Futures (public, no auth)
  futures: {
    premiumIndex: (s) => get('/api/futures/premiumIndex', s ? { symbol: s } : {}, 15000),
    ticker24hr: (s) => get('/api/futures/ticker24hr', s ? { symbol: s } : {}, 15000),
    openInterest: (s) => get('/api/futures/openInterest', { symbol: s || 'BTCUSDT' }, 30000),
    longShortRatio: (s, p) => get('/api/futures/longShortRatio', { symbol: s || 'BTCUSDT', period: p || '1h', limit: 1 }, 60000),
    fundingHistory: (s, l) => get('/api/futures/fundingHistory', { symbol: s || 'BTCUSDT', limit: l || 10 }, 60000),
  },
  // Skill 9: GoPlus Security
  goplus: {
    tokenSecurity: (addr, chain) => get('/api/goplus/token-security', { address: addr, chainId: chain || '56' }, 120000),
  },
  // Skill 10: DexScreener
  dex: {
    latestProfiles: () => get('/api/dex/latest-profiles', {}, 30000),
    search: (q, chain) => get('/api/dex/search', { q, chainIds: chain || 'bsc' }, 30000),
    token: (addr) => get('/api/dex/token', { address: addr }, 30000),
    tokenChain: (chain, addr) => get('/api/dex/token-chain', { chain, address: addr }, 30000),
    topBoosts: () => get('/api/dex/top-boosts', {}, 30000),
  },
  // Skill 11: CoinGecko
  coingecko: {
    categories: (order) => get('/api/coingecko/categories', { order: order || 'market_cap_desc' }, 120000),
    categoryCoins: (cat, n) => get('/api/coingecko/category-coins', { category: cat, per_page: n || 20 }, 120000),
    global: () => get('/api/coingecko/global', {}, 60000),
    globalDefi: () => get('/api/coingecko/global-defi', {}, 60000),
  },
  // Skill 13: DefiLlama
  defillama: {
    yields: () => get('/api/defillama/yields', {}, 120000),
    protocols: () => get('/api/defillama/protocols', {}, 300000),
    stablecoins: () => get('/api/defillama/stablecoins', {}, 300000),
    stablecoinChains: () => get('/api/defillama/stablecoin-chains', {}, 300000),
  },
  // Skill 12: Etherscan
  etherscan: {
    sourceCode: (addr, chain) => get('/api/etherscan/sourcecode', { address: addr, chainId: chain || '56' }, 300000),
    abi: (addr, chain) => get('/api/etherscan/abi', { address: addr, chainId: chain || '56' }, 300000),
  },
  health: () => get('/health', {}, 30000),
};

window.mefaiApi = api;
export default api;
