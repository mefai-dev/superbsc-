// MEFAI WebSocket Stream — Real-time Binance price updates
// Uses data-stream.binance.vision (no geo-restriction)

const WS_BASE = 'wss://data-stream.binance.vision/ws';

class BinanceStream {
  constructor() {
    this._ws = null;
    this._subs = new Map();     // stream → Set of callbacks
    this._prices = new Map();   // symbol → {price, change, volume, high, low}
    this._reconnectTimer = null;
    this._connected = false;
  }

  // Subscribe to a ticker stream
  subscribe(symbol, callback) {
    const stream = symbol.toLowerCase() + '@ticker';
    if (!this._subs.has(stream)) this._subs.set(stream, new Set());
    this._subs.get(stream).add(callback);

    // Return cached price immediately if available
    if (this._prices.has(symbol.toUpperCase())) {
      callback(this._prices.get(symbol.toUpperCase()));
    }

    this._ensureConnection();
    return () => {
      this._subs.get(stream)?.delete(callback);
      if (this._subs.get(stream)?.size === 0) this._subs.delete(stream);
    };
  }

  // Subscribe to mini ticker for all symbols (overview panel)
  subscribeAll(callback) {
    const stream = '!miniTicker@arr';
    if (!this._subs.has(stream)) this._subs.set(stream, new Set());
    this._subs.get(stream).add(callback);
    this._ensureConnection();
    return () => {
      this._subs.get(stream)?.delete(callback);
      if (this._subs.get(stream)?.size === 0) this._subs.delete(stream);
    };
  }

  // Get cached price
  getPrice(symbol) {
    return this._prices.get(symbol.toUpperCase()) || null;
  }

  // Get all cached prices
  getAllPrices() {
    return this._prices;
  }

  _ensureConnection() {
    if (this._ws && this._ws.readyState === WebSocket.CONNECTING) return;
    // Reconnect if new streams were added after initial connection
    if (this._ws && this._ws.readyState === WebSocket.OPEN) {
      const current = new Set(this._ws.url.split('/ws/')[1]?.split('/') || []);
      const needed = Array.from(this._subs.keys());
      if (needed.every(s => current.has(s))) return;
      this._ws.close();
    }
    this._connect();
  }

  _connect() {
    const streams = Array.from(this._subs.keys());
    if (!streams.length) return;

    const url = `${WS_BASE}/${streams.join('/')}`;

    try {
      this._ws = new WebSocket(url);
    } catch (e) {
      console.warn('[WS] Connection failed:', e.message);
      this._scheduleReconnect();
      return;
    }

    this._ws.onopen = () => {
      this._connected = true;
      console.info('[WS] Connected to Binance stream');
    };

    this._ws.onmessage = (e) => {
      try {
        const data = JSON.parse(e.data);
        if (Array.isArray(data)) {
          // Mini ticker array
          for (const t of data) this._processTicker(t);
          const cbs = this._subs.get('!miniTicker@arr');
          if (cbs) cbs.forEach(cb => cb(this._prices));
        } else if (data.e === '24hrTicker') {
          this._processTicker(data);
          const stream = data.s.toLowerCase() + '@ticker';
          const cbs = this._subs.get(stream);
          if (cbs) cbs.forEach(cb => cb(this._prices.get(data.s)));
        }
      } catch {}
    };

    this._ws.onclose = () => {
      this._connected = false;
      this._scheduleReconnect();
    };

    this._ws.onerror = () => {
      this._connected = false;
    };
  }

  _processTicker(t) {
    const sym = t.s;
    if (!sym) return;
    this._prices.set(sym, {
      symbol: sym,
      price: t.c || t.lastPrice,
      change: t.P || t.priceChangePercent || null,  // null if mini ticker (no P field)
      volume: t.q || t.quoteVolume,
      high: t.h || t.highPrice,
      low: t.l || t.lowPrice,
      ts: Date.now(),
    });
  }

  _scheduleReconnect() {
    if (this._reconnectTimer) return;
    this._reconnectTimer = setTimeout(() => {
      this._reconnectTimer = null;
      if (this._subs.size > 0) this._connect();
    }, 3000);
  }

  disconnect() {
    if (this._ws) {
      this._ws.close();
      this._ws = null;
    }
    this._connected = false;
    if (this._reconnectTimer) {
      clearTimeout(this._reconnectTimer);
      this._reconnectTimer = null;
    }
  }

  get connected() { return this._connected; }
}

// Singleton
const stream = new BinanceStream();
window.mefaiStream = stream;
export default stream;
