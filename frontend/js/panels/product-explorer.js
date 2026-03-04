// Binance Product Explorer — All trading products with live data
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatPrice, formatCurrency, formatPercent } = window.mefaiUtils;

export class ProductExplorerPanel extends BasePanel {
  static skill = 'Skill 27';
  static defaultTitle = 'Product Explorer';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sortKey = 'cs';
    this._sortDir = 'desc';
    this._search = '';
    this._filter = 'all'; // all, spot, margin, futures
  }

  async fetchData() {
    const res = await window.mefaiApi.products.list();
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load products</div>';

    const list = data?.data || data;
    if (!Array.isArray(list) || !list.length) return '<div class="panel-loading">No product data</div>';

    let rows = [];
    for (const item of list) {
      const symbol = item.s || '';
      const base = item.b || symbol;
      const quote = item.q || 'USDT';
      if (!symbol) continue;
      const price = parseFloat(item.c || 0);
      const change = parseFloat(item.o ? ((price - parseFloat(item.o)) / parseFloat(item.o) * 100) : 0);
      const volume = parseFloat(item.qv || 0);
      const cs = parseFloat(item.cs || 0);
      const tags = item.tags || [];
      const isMargin = item.pm === 'MARGIN' || tags.includes('margin');
      const isFutures = item.pm === 'FUTURES';

      if (this._filter === 'spot' && (isMargin || isFutures)) continue;
      if (this._filter === 'margin' && !isMargin) continue;

      rows.push({ symbol, base, quote, price, change, volume, cs, tags, isMargin });
    }

    // Search filter
    if (this._search) {
      const q = this._search.toLowerCase();
      rows = rows.filter(r => r.symbol.toLowerCase().includes(q) || r.base.toLowerCase().includes(q));
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    const top30 = rows.slice(0, 30);

    let h = '<style scoped>';
    h += '.pe-bar{display:flex;gap:6px;padding:0 0 6px;align-items:center;flex-wrap:wrap}';
    h += '.pe-bar input{font-size:11px}';
    h += '.pe-tag{display:inline-block;padding:0 4px;border-radius:2px;font-size:8px;background:var(--bg-secondary);margin-left:4px}';
    h += '</style>';

    h += '<div class="pe-bar">';
    h += `<input type="text" class="pe-search form-input" placeholder="Search..." value="${escapeHtml(this._search)}" style="width:100px">`;
    h += '<select class="pe-filter form-select">';
    h += `<option value="all"${this._filter === 'all' ? ' selected' : ''}>All</option>`;
    h += `<option value="spot"${this._filter === 'spot' ? ' selected' : ''}>Spot Only</option>`;
    h += `<option value="margin"${this._filter === 'margin' ? ' selected' : ''}>Margin</option>`;
    h += '</select>';
    h += `<span style="font-size:10px;color:var(--text-muted)">${rows.length} pairs</span>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Pair', width: '90px', render: (v, row) => {
        let s = `<span style="font-weight:600">${escapeHtml(row.base)}</span><span style="color:var(--text-muted)">/${row.quote}</span>`;
        if (row.isMargin) s += '<span class="pe-tag">M</span>';
        return s;
      }},
      { key: 'price', label: 'Price', align: 'right', render: v => formatPrice(v) },
      { key: 'change', label: '24h%', align: 'right', render: v => formatPercent(v) },
      { key: 'volume', label: 'Volume', align: 'right', render: v => formatCurrency(v) },
      { key: 'cs', label: 'Circ. Supply', align: 'right', render: v => {
        if (v >= 1e9) return (v / 1e9).toFixed(1) + 'B';
        if (v >= 1e6) return (v / 1e6).toFixed(1) + 'M';
        if (v >= 1e3) return (v / 1e3).toFixed(1) + 'K';
        return v.toLocaleString();
      }},
    ];
    h += renderTable(cols, top30, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    body.querySelector('.pe-search')?.addEventListener('input', e => {
      this._search = e.target.value;
      this._renderBody();
    });
    body.querySelector('.pe-filter')?.addEventListener('change', e => {
      this._filter = e.target.value;
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
    if (body && this._lastData) body.innerHTML = this.renderContent(this._lastData);
    this.afterRender();
  }
}
customElements.define('product-explorer-panel', ProductExplorerPanel);
export default ProductExplorerPanel;
