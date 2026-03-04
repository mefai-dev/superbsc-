// Whale Activity Tracker — Detect large trades and unusual order book depth
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatCurrency } = window.mefaiUtils;

export class WhaleTrackerPanel extends BasePanel {
  static skill = 'Skill 38';
  static defaultTitle = 'Whale Tracker';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sortKey = 'depthImbalance';
    this._sortDir = 'desc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','APTUSDT','ARBUSDT','SUIUSDT'];
  }

  async fetchData() {
    const results = await Promise.all(
      this._symbols.map(async sym => {
        const [depth, ticker] = await Promise.all([
          window.mefaiApi.spot.depth(sym, 20),
          window.mefaiApi.spot.ticker(sym),
        ]);
        return { symbol: sym, depth, ticker };
      })
    );
    return results;
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Unable to load whale data</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const depth = item.depth;
      const tk = item.ticker;

      if (!depth?.bids?.length || !depth?.asks?.length) continue;

      const price = parseFloat(tk?.price || tk?.lastPrice || 0);

      // Calculate bid/ask depth in USDT
      let bidDepth = 0, askDepth = 0;
      let bidWalls = 0, askWalls = 0;
      const avgBid = depth.bids.reduce((s, b) => s + parseFloat(b[1] || 0), 0) / depth.bids.length;
      const avgAsk = depth.asks.reduce((s, a) => s + parseFloat(a[1] || 0), 0) / depth.asks.length;

      for (const [p, q] of depth.bids) {
        const val = parseFloat(p) * parseFloat(q);
        bidDepth += val;
        if (parseFloat(q) > avgBid * 3) bidWalls++;
      }
      for (const [p, q] of depth.asks) {
        const val = parseFloat(p) * parseFloat(q);
        askDepth += val;
        if (parseFloat(q) > avgAsk * 3) askWalls++;
      }

      const totalDepth = bidDepth + askDepth;
      const depthImbalance = totalDepth > 0 ? ((bidDepth - askDepth) / totalDepth) * 100 : 0;
      const bidAskRatio = askDepth > 0 ? bidDepth / askDepth : 1;

      // Spread
      const bestBid = parseFloat(depth.bids[0][0]);
      const bestAsk = parseFloat(depth.asks[0][0]);
      const spreadBps = bestAsk > 0 ? ((bestAsk - bestBid) / bestAsk) * 10000 : 0;

      rows.push({
        symbol: sym, price, bidDepth, askDepth, totalDepth,
        depthImbalance, bidAskRatio, spreadBps, bidWalls, askWalls,
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const bidDom = rows.filter(r => r.depthImbalance > 10).length;
    const askDom = rows.filter(r => r.depthImbalance < -10).length;
    const wallAlerts = rows.filter(r => r.bidWalls + r.askWalls > 2).length;

    let h = '<style scoped>';
    h += '.wt-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.wt-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.wt-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.wt-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.wt-imb-bar{width:60px;height:10px;border-radius:5px;background:linear-gradient(90deg,#f6465d,#333,#0ecb81);display:inline-block;position:relative;vertical-align:middle}';
    h += '.wt-imb-dot{width:6px;height:6px;border-radius:50%;background:#fff;position:absolute;top:2px;transform:translateX(-50%)}';
    h += '.wt-wall{display:inline-block;padding:1px 4px;border-radius:3px;font-size:8px;font-weight:600;margin-left:2px}';
    h += '.wt-wall-bid{background:#0ecb8133;color:#0ecb81}';
    h += '.wt-wall-ask{background:#f6465d33;color:#f6465d}';
    h += '</style>';

    h += '<div class="wt-stats">';
    h += `<div class="wt-stat"><div class="wt-stat-label">Bid Dominant</div><div class="wt-stat-value val-up">${bidDom}</div></div>`;
    h += `<div class="wt-stat"><div class="wt-stat-label">Wall Alerts</div><div class="wt-stat-value" style="color:#f0b90b">${wallAlerts}</div></div>`;
    h += `<div class="wt-stat"><div class="wt-stat-label">Ask Dominant</div><div class="wt-stat-value val-down">${askDom}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px' },
      { key: 'totalDepth', label: 'Book Depth', align: 'right', render: v => formatCurrency(v) },
      { key: 'depthImbalance', label: 'Imbalance', align: 'center', width: '90px', render: v => {
        const pct = Math.max(0, Math.min(100, (v + 50)));
        const cls = v > 10 ? 'val-up' : v < -10 ? 'val-down' : '';
        return `<div class="wt-imb-bar"><div class="wt-imb-dot" style="left:${pct}%"></div></div> <span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(0)}%</span>`;
      }},
      { key: 'bidWalls', label: 'Walls', align: 'center', render: (v, row) => {
        let s = '';
        if (v > 0) s += `<span class="wt-wall wt-wall-bid">${v}B</span>`;
        if (row.askWalls > 0) s += `<span class="wt-wall wt-wall-ask">${row.askWalls}A</span>`;
        return s || '—';
      }},
      { key: 'spreadBps', label: 'Spread', align: 'right', render: v => v.toFixed(1) + ' bps' },
    ];
    h += renderTable(cols, rows, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    const { bindTableEvents } = window.mefaiTable;
    bindTableEvents(body, [], [], {
      onSort: key => {
        if (this._sortKey === key) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        else { this._sortKey = key; this._sortDir = 'desc'; }
        this._renderBody();
      }
    });
  }

  _renderBody() {
    const body = this.querySelector('.panel-body');
    if (body && this._lastData) body.innerHTML = this.renderContent(this._lastData);
    this.afterRender();
  }
}
customElements.define('whale-tracker-panel', WhaleTrackerPanel);
export default WhaleTrackerPanel;
