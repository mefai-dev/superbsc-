// ATH Distance Tracker — How far each coin is from its all-time high/low
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatPercent, escapeHtml } = window.mefaiUtils;

export class AthTrackerPanel extends BasePanel {
  static skill = 'Skill 29';
  static defaultTitle = 'ATH Tracker';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sortKey = 'athDist';
    this._sortDir = 'asc';
    this._search = '';
    this._view = 'ath'; // ath | atl
  }

  async fetchData() {
    const res = await window.mefaiApi.products.symbols();
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load ATH data</div>';

    const list = data?.data || data;
    if (!Array.isArray(list) || !list.length) return '<div class="panel-loading">No ATH data available</div>';

    let rows = [];
    for (const item of list) {
      const symbol = item.symbol || item.name || '';
      if (!symbol) continue;
      const price = parseFloat(item.price || item.lastPrice || 0);
      const ath = parseFloat(item.allTimeHigh || item.athPrice || 0);
      const atl = parseFloat(item.allTimeLow || item.atlPrice || 0);
      const mcap = parseFloat(item.marketCap || item.circulatingMarketCap || 0);
      if (!price || !ath) continue;

      const athDist = ((price - ath) / ath) * 100; // negative = below ATH
      const atlDist = atl > 0 ? ((price - atl) / atl) * 100 : 0; // positive = above ATL

      rows.push({ symbol, price, ath, atl, athDist, atlDist, mcap });
    }

    // Search
    if (this._search) {
      const q = this._search.toLowerCase();
      rows = rows.filter(r => r.symbol.toLowerCase().includes(q));
    }

    // Sort
    const sortKey = this._view === 'atl' ? 'atlDist' : this._sortKey;
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[sortKey] || 0) - (b[sortKey] || 0)) * dir;
    });

    // Stats
    const nearATH = rows.filter(r => r.athDist > -10).length;
    const crashed = rows.filter(r => r.athDist < -90).length;
    const avgDist = rows.length ? rows.reduce((s, r) => s + r.athDist, 0) / rows.length : 0;

    let h = '<style scoped>';
    h += '.at-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.at-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.at-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.at-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.at-bar{display:flex;gap:6px;padding:0 0 6px;align-items:center}';
    h += '.at-dist-bar{width:60px;height:8px;border-radius:4px;background:var(--bg-secondary);overflow:hidden;display:inline-block;vertical-align:middle}';
    h += '.at-dist-fill{height:100%;border-radius:4px}';
    h += '</style>';

    h += '<div class="at-stats">';
    h += `<div class="at-stat"><div class="at-stat-label">Near ATH (&lt;10%)</div><div class="at-stat-value val-up">${nearATH}</div></div>`;
    h += `<div class="at-stat"><div class="at-stat-label">Avg Distance</div><div class="at-stat-value val-down">${avgDist.toFixed(1)}%</div></div>`;
    h += `<div class="at-stat"><div class="at-stat-label">Crashed (&gt;90%)</div><div class="at-stat-value val-down">${crashed}</div></div>`;
    h += '</div>';

    h += '<div class="at-bar">';
    h += `<input type="text" class="at-search form-input" placeholder="Filter..." value="${escapeHtml(this._search)}" style="width:100px">`;
    h += '<select class="at-view form-select">';
    h += `<option value="ath"${this._view === 'ath' ? ' selected' : ''}>From ATH</option>`;
    h += `<option value="atl"${this._view === 'atl' ? ' selected' : ''}>From ATL</option>`;
    h += '</select>';
    h += `<span style="font-size:10px;color:var(--text-muted)">${rows.length} coins</span>`;
    h += '</div>';

    const top30 = rows.slice(0, 30);
    const { renderTable } = window.mefaiTable;

    const cols = this._view === 'atl' ? [
      { key: 'symbol', label: 'Symbol', width: '60px' },
      { key: 'price', label: 'Price', align: 'right', render: v => '$' + formatPrice(v) },
      { key: 'atl', label: 'ATL', align: 'right', render: v => v > 0 ? '$' + formatPrice(v) : '—' },
      { key: 'atlDist', label: 'From ATL', align: 'right', render: v => {
        return `<span class="val-up">+${v.toFixed(1)}%</span>`;
      }},
    ] : [
      { key: 'symbol', label: 'Symbol', width: '60px' },
      { key: 'price', label: 'Price', align: 'right', render: v => '$' + formatPrice(v) },
      { key: 'ath', label: 'ATH', align: 'right', render: v => '$' + formatPrice(v) },
      { key: 'athDist', label: 'From ATH', align: 'right', render: v => {
        const pct = Math.abs(v);
        const fillPct = Math.min(100, 100 - pct);
        const color = pct < 20 ? '#0ecb81' : pct < 50 ? '#f0b90b' : '#f6465d';
        return `<div class="at-dist-bar"><div class="at-dist-fill" style="width:${fillPct}%;background:${color}"></div></div> <span class="val-down">${v.toFixed(1)}%</span>`;
      }},
    ];
    h += renderTable(cols, top30, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    body.querySelector('.at-search')?.addEventListener('input', e => {
      this._search = e.target.value;
      this._renderBody();
    });
    body.querySelector('.at-view')?.addEventListener('change', e => {
      this._view = e.target.value;
      this._renderBody();
    });
    const { bindTableEvents } = window.mefaiTable;
    bindTableEvents(body, [], [], {
      onSort: key => {
        if (this._sortKey === key) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        else { this._sortKey = key; this._sortDir = 'asc'; }
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
customElements.define('ath-tracker-panel', AthTrackerPanel);
export default AthTrackerPanel;
