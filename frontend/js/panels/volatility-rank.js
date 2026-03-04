// Volatility Rank — Rank coins by intraday volatility and range for day trading
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatCurrency } = window.mefaiUtils;

export class VolatilityRankPanel extends BasePanel {
  static skill = 'Skill 36';
  static defaultTitle = 'Volatility Rank';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'range';
    this._sortDir = 'desc';
    this._minVol = 500000;
  }

  async fetchData() {
    return await window.mefaiApi.spot.tickers();
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Unable to load volatility data</div>';

    let rows = [];
    for (const t of data) {
      const sym = t.symbol || '';
      if (!sym.endsWith('USDT')) continue;
      const short = sym.replace('USDT', '');

      const price = parseFloat(t.lastPrice || 0);
      const high = parseFloat(t.highPrice || 0);
      const low = parseFloat(t.lowPrice || 0);
      const open = parseFloat(t.openPrice || 0);
      const volume = parseFloat(t.quoteVolume || 0);
      const change = parseFloat(t.priceChangePercent || 0);
      const trades = parseInt(t.count || 0);

      if (!price || !high || !low || volume < this._minVol) continue;

      const range = ((high - low) / low) * 100;
      const bodySize = open > 0 ? Math.abs(((price - open) / open) * 100) : 0;
      const wickRatio = range > 0 ? (1 - bodySize / range) * 100 : 0;
      // Volatility score: range weighted by volume
      const volScore = range * Math.log10(Math.max(volume, 1));

      rows.push({
        symbol: short, price, high, low, range, change, volume,
        bodySize, wickRatio, volScore, trades,
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const highVol = rows.filter(r => r.range > 5).length;
    const avgRange = rows.length ? rows.reduce((s, r) => s + r.range, 0) / rows.length : 0;
    const topMover = rows.length ? rows.reduce((max, r) => Math.abs(r.change) > Math.abs(max.change) ? r : max, rows[0]) : null;

    let h = '<style scoped>';
    h += '.vr-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.vr-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.vr-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.vr-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.vr-heat{display:inline-block;width:8px;height:8px;border-radius:50%;margin-right:3px}';
    h += '</style>';

    h += '<div class="vr-stats">';
    h += `<div class="vr-stat"><div class="vr-stat-label">High Vol (>5%)</div><div class="vr-stat-value">${highVol}</div></div>`;
    h += `<div class="vr-stat"><div class="vr-stat-label">Avg Range</div><div class="vr-stat-value">${avgRange.toFixed(1)}%</div></div>`;
    h += `<div class="vr-stat"><div class="vr-stat-label">Top Mover</div><div class="vr-stat-value">${topMover ? topMover.symbol : '—'}</div></div>`;
    h += '</div>';

    const top30 = rows.slice(0, 30);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px', render: v => {
        const r = rows.find(x => x.symbol === v);
        const color = r && r.range > 8 ? '#f6465d' : r && r.range > 4 ? '#f0b90b' : '#0ecb81';
        return `<span class="vr-heat" style="background:${color}"></span>${v}`;
      }},
      { key: 'price', label: 'Price', align: 'right', render: v => '$' + formatPrice(v) },
      { key: 'range', label: '24h Range', align: 'right', render: v => {
        const cls = v > 8 ? 'val-down' : v > 4 ? '' : 'val-up';
        return `<span class="${cls}">${v.toFixed(2)}%</span>`;
      }},
      { key: 'change', label: '24h%', align: 'right', render: v => formatPercent(v) },
      { key: 'volume', label: 'Volume', align: 'right', render: v => formatCurrency(v) },
    ];
    h += renderTable(cols, top30, { sortKey: this._sortKey, sortDir: this._sortDir });
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
customElements.define('volatility-rank-panel', VolatilityRankPanel);
export default VolatilityRankPanel;
