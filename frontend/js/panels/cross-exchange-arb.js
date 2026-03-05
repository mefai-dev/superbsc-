// Cross-Exchange Price Arbitrage Monitor — Compare prices across 8 exchanges feeding Binance's index
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent } = window.mefaiUtils;

export class CrossExchangeArbPanel extends BasePanel {
  static skill = 'Skill 39';
  static defaultTitle = 'Cross Exchange Arb';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sortKey = 'maxDev';
    this._sortDir = 'desc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT'];
  }

  async fetchData() {
    const results = await Promise.allSettled(
      this._symbols.map(sym => window.mefaiApi.futures.constituents(sym))
    );
    return results.map((r, i) => ({
      symbol: this._symbols[i],
      data: r.status === 'fulfilled' ? r.value : null,
    }));
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Loading exchange data...</div>';

    let rows = [];
    let allExchanges = new Set();

    for (const item of data) {
      const d = item.data;
      if (!d || !d.constituents || !d.constituents.length) continue;

      const sym = item.symbol.replace('USDT', '');
      const constituents = d.constituents;
      const prices = {};
      let indexPrice = 0;

      // Calculate weighted index
      for (const c of constituents) {
        const p = parseFloat(c.price || 0);
        const w = parseFloat(c.weight || 0);
        const exch = c.exchange;
        prices[exch] = { price: p, weight: w };
        indexPrice += p * w;
        allExchanges.add(exch);
      }

      // Calculate deviations
      let maxDev = 0;
      let maxDevExchange = '';
      let minDev = 0;
      let minDevExchange = '';
      const deviations = {};

      for (const [exch, { price }] of Object.entries(prices)) {
        if (indexPrice > 0) {
          const dev = ((price - indexPrice) / indexPrice) * 10000; // in bps
          deviations[exch] = dev;
          if (dev > maxDev) { maxDev = dev; maxDevExchange = exch; }
          if (dev < minDev) { minDev = dev; minDevExchange = exch; }
        }
      }

      const spread = maxDev - minDev;

      rows.push({
        symbol: sym, indexPrice, prices, deviations,
        maxDev: Math.abs(maxDev) > Math.abs(minDev) ? maxDev : minDev,
        spread, maxDevExchange, minDevExchange,
      });
    }

    if (!rows.length) return '<div class="panel-loading">Loading exchange data...</div>';

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((Math.abs(a[this._sortKey]) || 0) - (Math.abs(b[this._sortKey]) || 0)) * dir;
    });

    // Stats
    const avgSpread = rows.length ? rows.reduce((s, r) => s + r.spread, 0) / rows.length : 0;
    const maxSpreadRow = rows.reduce((max, r) => r.spread > (max?.spread || 0) ? r : max, rows[0]);
    const arbOpps = rows.filter(r => r.spread > 5).length; // >5 bps = significant

    let h = '<style scoped>';
    h += '.cea-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.cea-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.cea-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.cea-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.cea-dev{font-size:10px;font-weight:600}';
    h += '.cea-exch{font-size:8px;color:var(--text-muted)}';
    h += '.cea-bar{width:50px;height:8px;border-radius:4px;background:var(--bg-secondary);display:inline-block;position:relative;vertical-align:middle;overflow:hidden}';
    h += '.cea-bar-fill{height:100%;border-radius:4px;position:absolute;top:0}';
    h += '</style>';

    h += '<div class="cea-stats">';
    h += `<div class="cea-stat"><div class="cea-stat-label">Arb Opps >5bps</div><div class="cea-stat-value" style="color:#f0b90b">${arbOpps}</div></div>`;
    h += `<div class="cea-stat"><div class="cea-stat-label">Avg Spread</div><div class="cea-stat-value">${avgSpread.toFixed(1)} bps</div></div>`;
    h += `<div class="cea-stat"><div class="cea-stat-label">Max Spread</div><div class="cea-stat-value val-up">${maxSpreadRow?.symbol || '—'} ${maxSpreadRow?.spread?.toFixed(1) || 0}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Pair', width: '50px' },
      { key: 'indexPrice', label: 'Index $', align: 'right', render: v => formatPrice(v) },
      { key: 'spread', label: 'Spread', align: 'right', render: v => {
        const cls = v > 5 ? 'val-up' : v > 2 ? '' : 'val-down';
        return `<span class="${cls}">${v.toFixed(1)} bps</span>`;
      }},
      { key: 'maxDev', label: 'Max Dev', align: 'center', width: '100px', render: (v, row) => {
        const pct = Math.min(100, Math.abs(v) * 5);
        const color = v > 0 ? '#0ecb81' : '#f6465d';
        const exch = v > 0 ? row.maxDevExchange : row.minDevExchange;
        return `<div class="cea-bar"><div class="cea-bar-fill" style="width:${pct}%;background:${color};left:${v > 0 ? 50 : 50 - pct}%"></div></div> <span class="cea-dev" style="color:${color}">${v > 0 ? '+' : ''}${v.toFixed(1)}</span> <span class="cea-exch">${exch}</span>`;
      }},
      { key: 'minDevExchange', label: 'Cheapest', align: 'center', render: (v, row) => {
        return `<span class="cea-exch">${v || '—'}</span>`;
      }},
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
    if (body && this._data) body.innerHTML = this.renderContent(this._data);
    this.afterRender();
  }
}
customElements.define('cross-exchange-arb-panel', CrossExchangeArbPanel);
export default CrossExchangeArbPanel;
