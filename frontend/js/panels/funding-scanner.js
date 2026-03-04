// Funding Arbitrage Scanner — Find extreme funding rates for arbitrage opportunities
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class FundingScannerPanel extends BasePanel {
  static skill = 'Skill 34';
  static defaultTitle = 'Funding Scanner';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._sortKey = 'rate';
    this._sortDir = 'desc';
    this._filter = 'all'; // all, positive, negative
  }

  async fetchData() {
    const [fundingInfo, premium] = await Promise.all([
      window.mefaiApi.futures.fundingInfo(),
      window.mefaiApi.futures.premiumIndex(),
    ]);
    return { fundingInfo, premium };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Unable to load funding data</div>';

    const info = Array.isArray(data.fundingInfo) ? data.fundingInfo : [];
    const premium = Array.isArray(data.premium) ? data.premium : [];

    // Build premium map
    const premMap = {};
    for (const p of premium) {
      premMap[p.symbol] = p;
    }

    let rows = [];
    for (const fi of info) {
      const sym = fi.symbol;
      if (!sym?.endsWith('USDT')) continue;
      const short = sym.replace('USDT', '');

      const p = premMap[sym];
      if (!p) continue;

      const rate = parseFloat(p.lastFundingRate || 0) * 100;
      const markPrice = parseFloat(p.markPrice || 0);
      const indexPrice = parseFloat(p.indexPrice || 0);
      const premium8h = markPrice > 0 && indexPrice > 0 ? ((markPrice - indexPrice) / indexPrice) * 100 : 0;

      const fundingCap = parseFloat(fi.fundingRateCap || 0.03) * 100;
      const fundingFloor = parseFloat(fi.fundingRateFloor || -0.03) * 100;
      const interval = parseInt(fi.fundingIntervalHours || 8);

      // Annualized rate
      const annualized = rate * (24 / interval) * 365;

      rows.push({
        symbol: short, rate, annualized, markPrice, premium8h,
        fundingCap, fundingFloor, interval,
      });
    }

    // Filter
    if (this._filter === 'positive') rows = rows.filter(r => r.rate > 0);
    else if (this._filter === 'negative') rows = rows.filter(r => r.rate < 0);

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const extremePos = rows.filter(r => r.rate > 0.05).length;
    const extremeNeg = rows.filter(r => r.rate < -0.02).length;
    const avgRate = rows.length ? rows.reduce((s, r) => s + r.rate, 0) / rows.length : 0;

    let h = '<style scoped>';
    h += '.fs-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.fs-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.fs-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.fs-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.fs-filters{display:flex;gap:4px;padding:0 0 6px}';
    h += '.fs-fbtn{padding:3px 8px;border-radius:4px;font-size:10px;cursor:pointer;background:var(--bg-secondary);color:var(--text-muted);border:none;font-weight:600}';
    h += '.fs-fbtn.active{background:var(--accent);color:#000}';
    h += '</style>';

    h += '<div class="fs-stats">';
    h += `<div class="fs-stat"><div class="fs-stat-label">High Positive</div><div class="fs-stat-value val-up">${extremePos}</div></div>`;
    h += `<div class="fs-stat"><div class="fs-stat-label">Avg Rate</div><div class="fs-stat-value">${avgRate.toFixed(4)}%</div></div>`;
    h += `<div class="fs-stat"><div class="fs-stat-label">Negative</div><div class="fs-stat-value val-down">${extremeNeg}</div></div>`;
    h += '</div>';

    h += '<div class="fs-filters">';
    h += `<button class="fs-fbtn${this._filter === 'all' ? ' active' : ''}" data-f="all">All (${rows.length})</button>`;
    h += `<button class="fs-fbtn${this._filter === 'positive' ? ' active' : ''}" data-f="positive">Long Pay</button>`;
    h += `<button class="fs-fbtn${this._filter === 'negative' ? ' active' : ''}" data-f="negative">Short Pay</button>`;
    h += '</div>';

    const top40 = rows.slice(0, 40);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px' },
      { key: 'rate', label: 'Rate%', align: 'right', render: v => {
        const cls = v > 0.03 ? 'val-up' : v < -0.01 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(4)}%</span>`;
      }},
      { key: 'annualized', label: 'APR', align: 'right', render: v => {
        const cls = v > 20 ? 'val-up' : v < -10 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(1)}%</span>`;
      }},
      { key: 'premium8h', label: 'Premium', align: 'right', render: v => {
        const cls = v > 0.05 ? 'val-up' : v < -0.05 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(3)}%</span>`;
      }},
      { key: 'interval', label: 'Intv', align: 'right', render: v => v + 'h' },
    ];
    h += renderTable(cols, top40, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;

    body.querySelectorAll('.fs-fbtn').forEach(btn => {
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
customElements.define('funding-scanner-panel', FundingScannerPanel);
export default FundingScannerPanel;
