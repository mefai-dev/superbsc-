// Multi-Timeframe Momentum Screener — Compare 1h, 4h, 1d momentum across coins
import { BasePanel } from '../components/base-panel.js';

const { formatPercent, formatPrice } = window.mefaiUtils;

export class MomentumScreenerPanel extends BasePanel {
  static skill = 'Skill 35';
  static defaultTitle = 'Momentum Screener';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'change1d';
    this._sortDir = 'desc';
    this._filter = 'all';
  }

  async fetchData() {
    // Use spot tickers for 24h data — it's the most reliable
    const tickers = await window.mefaiApi.spot.tickers();
    return tickers;
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Unable to load momentum data</div>';

    let rows = [];
    for (const t of data) {
      const sym = t.symbol || '';
      if (!sym.endsWith('USDT')) continue;
      const short = sym.replace('USDT', '');

      const price = parseFloat(t.lastPrice || 0);
      const change1d = parseFloat(t.priceChangePercent || 0);
      const high = parseFloat(t.highPrice || 0);
      const low = parseFloat(t.lowPrice || 0);
      const volume = parseFloat(t.quoteVolume || 0);
      const avgPrice = parseFloat(t.weightedAvgPrice || 0);
      const prevClose = parseFloat(t.prevClosePrice || 0);
      if (!price || volume < 100000) continue;

      // Momentum indicators from 24h data
      const range = high > 0 && low > 0 ? ((high - low) / low) * 100 : 0;
      const posInRange = high > low ? ((price - low) / (high - low)) * 100 : 50;
      const vwapDist = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

      // Momentum score: combines change, range position, and VWAP distance
      const momentum = (change1d * 0.4) + (posInRange - 50) * 0.03 + (vwapDist * 0.3);

      rows.push({
        symbol: short, price, change1d, range, posInRange,
        vwapDist, volume, momentum,
      });
    }

    // Filter
    if (this._filter === 'bullish') rows = rows.filter(r => r.momentum > 2);
    else if (this._filter === 'bearish') rows = rows.filter(r => r.momentum < -2);

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const bullish = rows.filter(r => r.momentum > 2).length;
    const bearish = rows.filter(r => r.momentum < -2).length;
    const avgMom = rows.length ? rows.reduce((s, r) => s + r.momentum, 0) / rows.length : 0;

    let h = '<style scoped>';
    h += '.ms-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.ms-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.ms-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.ms-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.ms-filters{display:flex;gap:4px;padding:0 0 6px}';
    h += '.ms-fbtn{padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;background:var(--bg-secondary);color:var(--text-muted);border:none;font-weight:600}';
    h += '.ms-fbtn.active{background:var(--accent);color:#000}';
    h += '.ms-range-bar{width:50px;height:10px;border-radius:5px;background:linear-gradient(90deg,#f6465d,#333,#0ecb81);display:inline-block;position:relative;vertical-align:middle}';
    h += '.ms-range-dot{width:6px;height:6px;border-radius:50%;background:#fff;position:absolute;top:2px;transform:translateX(-50%)}';
    h += '</style>';

    h += '<div class="ms-stats">';
    h += `<div class="ms-stat"><div class="ms-stat-label">Bullish</div><div class="ms-stat-value val-up">${bullish}</div></div>`;
    h += `<div class="ms-stat"><div class="ms-stat-label">Avg Momentum</div><div class="ms-stat-value">${avgMom.toFixed(2)}</div></div>`;
    h += `<div class="ms-stat"><div class="ms-stat-label">Bearish</div><div class="ms-stat-value val-down">${bearish}</div></div>`;
    h += '</div>';

    h += '<div class="ms-filters">';
    const totalCount = this._filter === 'all' ? rows.length : (this._filter === 'bullish' ? bullish : bearish);
    h += `<button class="ms-fbtn${this._filter === 'all' ? ' active' : ''}" data-f="all">All</button>`;
    h += `<button class="ms-fbtn${this._filter === 'bullish' ? ' active' : ''}" data-f="bullish">Bullish</button>`;
    h += `<button class="ms-fbtn${this._filter === 'bearish' ? ' active' : ''}" data-f="bearish">Bearish</button>`;
    h += '</div>';

    const top40 = rows.slice(0, 40);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px' },
      { key: 'price', label: 'Price', align: 'right', render: v => '$' + formatPrice(v) },
      { key: 'change1d', label: '24h%', align: 'right', render: v => formatPercent(v) },
      { key: 'posInRange', label: 'Range Pos', align: 'center', width: '70px', render: v => {
        const pct = Math.max(0, Math.min(100, v));
        return `<div class="ms-range-bar"><div class="ms-range-dot" style="left:${pct}%"></div></div>`;
      }},
      { key: 'momentum', label: 'Score', align: 'right', render: v => {
        const cls = v > 2 ? 'val-up' : v < -2 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(2)}</span>`;
      }},
    ];
    h += renderTable(cols, top40, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;

    body.querySelectorAll('.ms-fbtn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._filter = btn.dataset.f;
        this._renderBody();
      });
    });

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
customElements.define('momentum-screener-panel', MomentumScreenerPanel);
export default MomentumScreenerPanel;
