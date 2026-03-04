// MEFAI DeFi Yield Radar — BSC yield pools from DefiLlama
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class YieldRadarPanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'Yield Radar';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sort = 'apy';
    this._dir = 'desc';
    this._filter = 'all'; // all | stable | il-free
  }

  async fetchData() {
    const res = await window.mefaiApi.defillama.yields();
    if (res?.error) return { pools: [] };
    const allPools = res?.data || res || [];
    // Filter BSC pools with meaningful TVL
    const pools = (Array.isArray(allPools) ? allPools : [])
      .filter(p => p.chain === 'BSC' && p.tvlUsd > 10000)
      .map(p => ({
        project: p.project || '?',
        symbol: p.symbol || '?',
        apy: p.apy || 0,
        apyBase: p.apyBase || 0,
        apyReward: p.apyReward || 0,
        tvl: p.tvlUsd || 0,
        ilRisk: p.ilRisk || 'no',
        stablecoin: p.stablecoin || false,
        exposure: p.exposure || '',
        pool: p.pool || '',
      }));
    return { pools };
  }

  renderContent(data) {
    if (!data?.pools?.length) return '<div class="panel-loading">No BSC yield pools found</div>';

    let filtered = data.pools;
    if (this._filter === 'stable') filtered = filtered.filter(p => p.stablecoin);
    if (this._filter === 'il-free') filtered = filtered.filter(p => p.ilRisk === 'no');

    const sorted = [...filtered].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    ).slice(0, 50);

    let h = '<style scoped>';
    h += '.yr-filters{display:flex;gap:4px;margin-bottom:8px}';
    h += '.yr-f{padding:3px 8px;font-size:10px;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer}';
    h += '.yr-f.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.yr-stable{font-size:8px;padding:1px 4px;border-radius:3px;background:rgba(14,203,129,0.15);color:var(--up)}';
    h += '.yr-il{font-size:8px;padding:1px 4px;border-radius:3px}';
    h += '.yr-il-no{background:rgba(14,203,129,0.1);color:var(--up)}';
    h += '.yr-il-yes{background:rgba(246,70,93,0.1);color:var(--down)}';
    h += '</style>';

    h += '<div class="yr-filters">';
    h += `<button class="yr-f ${this._filter === 'all' ? 'active' : ''}" data-f="all">All (${data.pools.length})</button>`;
    h += `<button class="yr-f ${this._filter === 'stable' ? 'active' : ''}" data-f="stable">Stablecoin</button>`;
    h += `<button class="yr-f ${this._filter === 'il-free' ? 'active' : ''}" data-f="il-free">No IL</button>`;
    h += '</div>';

    h += '<table class="data-table"><thead><tr>';
    h += '<th>Project</th>';
    h += '<th>Pool</th>';
    h += `<th data-k="apy" style="text-align:right">APY%</th>`;
    h += `<th data-k="tvl" style="text-align:right">TVL</th>`;
    h += '<th>IL</th>';
    h += '<th>Type</th>';
    h += '</tr></thead><tbody>';

    for (const p of sorted) {
      const apyCls = p.apy >= 20 ? 'val-up' : '';
      const ilCls = p.ilRisk === 'no' ? 'yr-il-no' : 'yr-il-yes';
      h += '<tr>';
      h += `<td style="font-weight:600">${escapeHtml(p.project)}</td>`;
      h += `<td>${escapeHtml(p.symbol)}</td>`;
      h += `<td style="text-align:right" class="${apyCls}">${p.apy.toFixed(2)}%</td>`;
      h += `<td style="text-align:right">${formatCurrency(p.tvl)}</td>`;
      h += `<td><span class="yr-il ${ilCls}">${p.ilRisk === 'no' ? 'NONE' : 'YES'}</span></td>`;
      h += `<td>${p.stablecoin ? '<span class="yr-stable">STABLE</span>' : '—'}</td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.yr-f').forEach(btn => btn.addEventListener('click', () => {
      this._filter = btn.dataset.f;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('yield-radar-panel', YieldRadarPanel);
export default YieldRadarPanel;
