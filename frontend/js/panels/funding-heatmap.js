// Funding Rate Heatmap — All futures symbols funding rates at a glance
import { BasePanel } from '../components/base-panel.js';

const { formatPrice } = window.mefaiUtils;

export class FundingHeatmapPanel extends BasePanel {
  static skill = 'Skill 28';
  static defaultTitle = 'Funding Heatmap';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'fundingRate';
    this._sortDir = 'desc';
    this._search = '';
  }

  async fetchData() {
    const res = await window.mefaiApi.futures.premiumIndex();
    if (!res || res?.error || !Array.isArray(res)) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load funding data</div>';
    if (!Array.isArray(data) || !data.length) return '<div class="panel-loading">No funding data</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol || '';
      if (!sym.endsWith('USDT')) continue;
      const short = sym.replace('USDT', '');
      const fundingRate = parseFloat(item.lastFundingRate || 0) * 100;
      const markPrice = parseFloat(item.markPrice || 0);
      const indexPrice = parseFloat(item.indexPrice || 0);
      const nextFunding = item.nextFundingTime || 0;
      const annualized = fundingRate * 3 * 365;
      rows.push({ symbol: short, fundingRate, markPrice, indexPrice, nextFunding, annualized });
    }

    // Search
    if (this._search) {
      const q = this._search.toLowerCase();
      rows = rows.filter(r => r.symbol.toLowerCase().includes(q));
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const positive = rows.filter(r => r.fundingRate > 0);
    const negative = rows.filter(r => r.fundingRate < 0);
    const avgRate = rows.length ? rows.reduce((s, r) => s + r.fundingRate, 0) / rows.length : 0;
    const maxRate = rows.length ? rows.reduce((m, r) => r.fundingRate > m.fundingRate ? r : m, rows[0]) : null;
    const minRate = rows.length ? rows.reduce((m, r) => r.fundingRate < m.fundingRate ? r : m, rows[0]) : null;

    let h = '<style scoped>';
    h += '.fh-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.fh-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.fh-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.fh-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.fh-bar{display:flex;gap:6px;padding:0 0 6px;align-items:center}';
    h += '.fh-cell{display:inline-block;padding:2px 6px;border-radius:3px;font-size:10px;font-weight:600}';
    h += '</style>';

    h += '<div class="fh-stats">';
    h += `<div class="fh-stat"><div class="fh-stat-label">Avg Rate</div><div class="fh-stat-value ${avgRate >= 0 ? 'val-up' : 'val-down'}">${avgRate.toFixed(4)}%</div></div>`;
    h += `<div class="fh-stat"><div class="fh-stat-label">Positive</div><div class="fh-stat-value val-up">${positive.length}</div></div>`;
    h += `<div class="fh-stat"><div class="fh-stat-label">Negative</div><div class="fh-stat-value val-down">${negative.length}</div></div>`;
    h += '</div>';

    h += '<div class="fh-bar">';
    h += `<input type="text" class="fh-search form-input" placeholder="Filter..." value="${this._search}" style="width:100px">`;
    h += `<span style="font-size:10px;color:var(--text-muted)">${rows.length} perps</span>`;
    h += '</div>';

    const top30 = rows.slice(0, 30);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '60px' },
      { key: 'fundingRate', label: 'Rate%', align: 'right', render: v => {
        const cls = v >= 0 ? 'val-up' : 'val-down';
        // Color intensity
        const intensity = Math.min(1, Math.abs(v) / 0.1);
        const bg = v >= 0 ? `rgba(14,203,129,${intensity * 0.3})` : `rgba(246,70,93,${intensity * 0.3})`;
        return `<span class="fh-cell ${cls}" style="background:${bg}">${v >= 0 ? '+' : ''}${v.toFixed(4)}%</span>`;
      }},
      { key: 'annualized', label: 'Annual%', align: 'right', render: v => {
        const cls = v >= 0 ? 'val-up' : 'val-down';
        return `<span class="${cls}">${v >= 0 ? '+' : ''}${v.toFixed(1)}%</span>`;
      }},
      { key: 'markPrice', label: 'Mark', align: 'right', render: v => formatPrice(v) },
    ];
    h += renderTable(cols, top30, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    body.querySelector('.fh-search')?.addEventListener('input', e => {
      this._search = e.target.value;
      this._renderBody();
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
    if (body && this._data) body.innerHTML = this.renderContent(this._data);
    this.afterRender();
  }
}
customElements.define('funding-heatmap-panel', FundingHeatmapPanel);
export default FundingHeatmapPanel;
