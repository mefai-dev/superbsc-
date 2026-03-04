// MEFAI API v5 — Stale-while-revalidate proxy client. Instant loads.

const BASE_URI = document.baseURI || window.location.href;

// ── Client Cache — serves stale data instantly, refreshes in background ──
const _c = new Map();

// Get cached data — if stale=true, returns even expired data
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
}

function _url(path, params = {}) {
  const u = new URL(path.replace(/^\//, ''), BASE_URI);
  for (const [k, v] of Object.entries(params))
    if (v !== undefined && v !== null && v !== '') u.searchParams.set(k, v);
  return u.href;
}

// In-flight request dedup
const _inflight = new Map();

// SWR callbacks — panels register to receive background updates
const _swrCallbacks = new Map();

async function get(path, params = {}, ttl = 30000) {
  const url = _url(path, params);
  const fresh = _cg(url, ttl, false);
  if (fresh) return fresh;

  // Return stale data immediately, trigger background refresh
  const stale = _cg(url, ttl * 10, true);
  if (stale) {
    // Background refresh (don't await)
    if (!_inflight.has(url)) {
      const p = _fetchGet(url);
      _inflight.set(url, p);
      p.then(d => { if (d && !d.error) _notifySWR(url, d); }).catch(() => {});
    }
    return stale;
  }

  // No cache at all — must wait
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

  // Return stale data immediately, trigger background refresh
  const stale = _cg(key, ttl * 10, true);
  if (stale) {
    if (!_inflight.has(key)) {
      const p = _fetchPost(url, body, key);
      _inflight.set(key, p);
      p.then(d => { if (d && !d.error) _notifySWR(key, d); }).catch(() => {});
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

// SWR notification — panels can subscribe to background data updates
function _notifySWR(key, data) {
  const cbs = _swrCallbacks.get(key);
  if (cbs) cbs.forEach(cb => { try { cb(data); } catch(e) { console.warn('SWR cb error:', e); } });
}

function onSWRUpdate(key, cb) {
  if (!_swrCallbacks.has(key)) _swrCallbacks.set(key, new Set());
  _swrCallbacks.get(key).add(cb);
  return () => { _swrCallbacks.get(key)?.delete(cb); };
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
