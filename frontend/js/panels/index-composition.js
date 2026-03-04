// Index Composition Tracker — View Binance composite index weights (BTCDOM, DEFI)
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class IndexCompositionPanel extends BasePanel {
  static skill = 'Skill 33';
  static defaultTitle = 'Index Composition';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._selectedIndex = 0;
    this._sortKey = 'weight';
    this._sortDir = 'desc';
  }

  async fetchData() {
    return await window.mefaiApi.futures.indexInfo();
  }

  renderContent(data) {
    if (!data || (!Array.isArray(data) && !data?.length)) return '<div class="panel-loading">Unable to load index data</div>';

    const indices = Array.isArray(data) ? data : [];
    if (!indices.length) return '<div class="panel-loading">No index data available</div>';

    // Index tabs
    let h = '<style scoped>';
    h += '.ic-tabs{display:flex;gap:4px;padding:0 0 8px;flex-wrap:wrap}';
    h += '.ic-tab{padding:4px 8px;border-radius:4px;font-size:10px;font-weight:600;cursor:pointer;background:var(--bg-secondary);color:var(--text-muted);border:none}';
    h += '.ic-tab.active{background:var(--accent);color:#000}';
    h += '.ic-info{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.ic-card{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.ic-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.ic-card-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.ic-weight-bar{width:60px;height:8px;border-radius:4px;background:var(--bg-secondary);overflow:hidden;display:inline-block;vertical-align:middle}';
    h += '.ic-weight-fill{height:100%;border-radius:4px;background:var(--accent)}';
    h += '</style>';

    h += '<div class="ic-tabs">';
    indices.forEach((idx, i) => {
      const name = idx.symbol?.replace('USDT', '') || `Index ${i}`;
      h += `<button class="ic-tab${i === this._selectedIndex ? ' active' : ''}" data-idx="${i}">${name}</button>`;
    });
    h += '</div>';

    const selected = indices[this._selectedIndex] || indices[0];
    const assets = selected.baseAssetList || [];

    // Compute weights
    let rows = assets.map(a => ({
      asset: a.baseAsset || a.quoteAsset || '?',
      weight: parseFloat(a.weightInPercentage || 0) * 100,
      quantity: parseFloat(a.weightInQuantity || 0),
    }));

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'asset') return a.asset.localeCompare(b.asset) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    h += '<div class="ic-info">';
    h += `<div class="ic-card"><div class="ic-card-label">Index</div><div class="ic-card-value">${selected.symbol || '—'}</div></div>`;
    h += `<div class="ic-card"><div class="ic-card-label">Components</div><div class="ic-card-value">${assets.length}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const maxWeight = Math.max(...rows.map(r => r.weight), 1);
    const cols = [
      { key: 'asset', label: 'Asset', width: '60px' },
      { key: 'weight', label: 'Weight', align: 'right', render: v => {
        const pct = Math.min(100, (v / maxWeight) * 100);
        return `<div class="ic-weight-bar"><div class="ic-weight-fill" style="width:${pct}%"></div></div> ${v.toFixed(3)}%`;
      }},
      { key: 'quantity', label: 'Qty Factor', align: 'right', render: v => v.toFixed(6) },
    ];
    h += renderTable(cols, rows.slice(0, 50), { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;

    body.querySelectorAll('.ic-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._selectedIndex = parseInt(btn.dataset.idx);
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
customElements.define('index-composition-panel', IndexCompositionPanel);
export default IndexCompositionPanel;
