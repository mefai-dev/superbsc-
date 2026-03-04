// Margin Interest Rate Optimizer — Compare rates across VIP tiers
import { BasePanel } from '../components/base-panel.js';

const { formatPrice } = window.mefaiUtils;

export class MarginOptimizerPanel extends BasePanel {
  static skill = 'Skill 20';
  static defaultTitle = 'Margin Rates';

  constructor() {
    super();
    this._refreshRate = 300000;
    this._sortKey = 'dailyRate';
    this._sortDir = 'asc';
    this._search = '';
    this._vipTier = '0';
  }

  async fetchData() {
    const res = await window.mefaiApi.margin.vipRates();
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load margin rates</div>';

    const list = data?.data || data;
    if (!Array.isArray(list) || !list.length) return '<div class="panel-loading">No margin rate data</div>';

    // Parse assets and their rates
    let rows = [];
    for (const item of list) {
      const asset = item.assetName || item.asset || '';
      if (!asset) continue;
      const specs = item.specs || [];
      // Find the VIP tier
      const tierSpec = specs.find(s => String(s.vipLevel) === this._vipTier) || specs[0];
      if (!tierSpec) continue;
      const dailyRate = parseFloat(tierSpec.dailyInterestRate || 0);
      const yearlyRate = parseFloat(tierSpec.yearlyInterestRate || dailyRate * 365);
      const borrowable = tierSpec.borrowable !== false;
      rows.push({ asset, dailyRate, yearlyRate, borrowable, tiers: specs.length });
    }

    // Filter by search
    if (this._search) {
      const q = this._search.toLowerCase();
      rows = rows.filter(r => r.asset.toLowerCase().includes(q));
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'asset') return a.asset.localeCompare(b.asset) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    const top30 = rows.slice(0, 30);

    let h = '<style scoped>';
    h += '.mo-bar{display:flex;gap:6px;padding:0 0 6px;align-items:center}';
    h += '.mo-bar input,.mo-bar select{font-size:11px}';
    h += '</style>';
    h += '<div class="mo-bar">';
    h += `<input type="text" class="mo-search form-input" placeholder="Filter asset..." value="${this._search}" style="width:100px">`;
    h += '<select class="mo-vip form-select">';
    for (let i = 0; i <= 9; i++) {
      h += `<option value="${i}"${this._vipTier === String(i) ? ' selected' : ''}>VIP ${i}</option>`;
    }
    h += '</select>';
    h += `<span style="font-size:10px;color:var(--text-muted)">${rows.length} assets</span>`;
    h += '</div>';

    const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;
    const cols = [
      { key: 'asset', label: 'Asset', width: '70px' },
      { key: 'dailyRate', label: 'Daily %', align: 'right', render: v => (v * 100).toFixed(4) + '%' },
      { key: 'yearlyRate', label: 'Yearly %', align: 'right', render: v => {
        const pct = v * 100;
        const cls = pct > 10 ? 'val-down' : pct < 3 ? 'val-up' : '';
        return `<span class="${cls}">${pct.toFixed(2)}%</span>`;
      }},
      { key: 'borrowable', label: 'Borrow', width: '50px', render: v => v ? '<span class="val-up">Yes</span>' : '<span class="val-down">No</span>' },
    ];
    h += renderTable(cols, top30, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    body.querySelector('.mo-search')?.addEventListener('input', e => {
      this._search = e.target.value;
      this._renderBody();
    });
    body.querySelector('.mo-vip')?.addEventListener('change', e => {
      this._vipTier = e.target.value;
      this.refresh();
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
customElements.define('margin-optimizer-panel', MarginOptimizerPanel);
export default MarginOptimizerPanel;
