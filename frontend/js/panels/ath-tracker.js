// ATH Tracker — Distance from 24h high/low + market cap recovery analysis
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatPercent, escapeHtml } = window.mefaiUtils;

export class AthTrackerPanel extends BasePanel {
  static skill = 'Skill 29';
  static defaultTitle = 'ATH Tracker';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'highDist';
    this._sortDir = 'asc';
    this._search = '';
  }

  async fetchData() {
    // Use spot tickers (24h high/low) + products symbols (market cap, issue price)
    const [tickers, symbols] = await Promise.all([
      window.mefaiApi.spot.tickers(),
      window.mefaiApi.products.symbols(),
    ]);
    if (!tickers || tickers?.error) return { _fetchError: true };
    return { tickers, symbols };
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load tracker data</div>';

    const tickerArr = Array.isArray(data.tickers) ? data.tickers : [];
    const symList = data.symbols?.data || [];

    // Build issue price map
    const issueMap = {};
    for (const s of symList) {
      if (s.issuePrice && s.name) issueMap[s.name] = parseFloat(s.issuePrice);
    }

    let rows = [];
    for (const t of tickerArr) {
      const sym = t.symbol || '';
      if (!sym.endsWith('USDT')) continue;
      const short = sym.replace('USDT', '');
      const price = parseFloat(t.lastPrice || 0);
      const high = parseFloat(t.highPrice || 0);
      const low = parseFloat(t.lowPrice || 0);
      const volume = parseFloat(t.quoteVolume || 0);
      const change = parseFloat(t.priceChangePercent || 0);
      if (!price || !high) continue;

      const highDist = ((price - high) / high) * 100;
      const lowDist = low > 0 ? ((price - low) / low) * 100 : 0;
      const range = high > 0 && low > 0 ? ((high - low) / low) * 100 : 0;
      const issuePrice = issueMap[short] || 0;
      const issueGain = issuePrice > 0 ? ((price - issuePrice) / issuePrice) * 100 : null;

      rows.push({ symbol: short, price, high, low, highDist, lowDist, range, change, volume, issueGain });
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
    const nearHigh = rows.filter(r => r.highDist > -1).length;
    const nearLow = rows.filter(r => r.lowDist < 1).length;
    const avgRange = rows.length ? rows.reduce((s, r) => s + r.range, 0) / rows.length : 0;

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
    h += `<div class="at-stat"><div class="at-stat-label">Near 24h High</div><div class="at-stat-value val-up">${nearHigh}</div></div>`;
    h += `<div class="at-stat"><div class="at-stat-label">Avg 24h Range</div><div class="at-stat-value">${avgRange.toFixed(1)}%</div></div>`;
    h += `<div class="at-stat"><div class="at-stat-label">Near 24h Low</div><div class="at-stat-value val-down">${nearLow}</div></div>`;
    h += '</div>';

    h += '<div class="at-bar">';
    h += `<input type="text" class="at-search form-input" placeholder="Filter..." value="${escapeHtml(this._search)}" style="width:100px">`;
    h += `<span style="font-size:10px;color:var(--text-muted)">${rows.length} coins</span>`;
    h += '</div>';

    const top30 = rows.slice(0, 30);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px' },
      { key: 'price', label: 'Price', align: 'right', render: v => '$' + formatPrice(v) },
      { key: 'highDist', label: 'From High', align: 'right', render: v => {
        const pct = Math.abs(v);
        const fillPct = Math.min(100, 100 - pct);
        const color = pct < 1 ? '#0ecb81' : pct < 3 ? '#f0b90b' : '#f6465d';
        return `<div class="at-dist-bar"><div class="at-dist-fill" style="width:${fillPct}%;background:${color}"></div></div> <span class="${v > -1 ? 'val-up' : 'val-down'}">${v.toFixed(2)}%</span>`;
      }},
      { key: 'range', label: '24h Range', align: 'right', render: v => v.toFixed(1) + '%' },
      { key: 'change', label: '24h%', align: 'right', render: v => formatPercent(v) },
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
