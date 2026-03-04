// MEFAI Protocol TVL Tracker — BSC protocol rankings from DefiLlama
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, escapeHtml } = window.mefaiUtils;

export class ProtocolTvlPanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'Protocol TVL';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sort = 'bscTvl';
    this._dir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.defillama.protocols();
    if (res?.error) return { protocols: [], totalBscTvl: 0 };
    const all = Array.isArray(res) ? res : [];

    // Filter protocols that have BSC/Binance chain TVL
    const protocols = all
      .filter(p => {
        const chains = p.chains || [];
        return chains.includes('Binance') || chains.includes('BSC');
      })
      .map(p => {
        // DefiLlama uses "Binance" not "BSC" in chainTvls
        const bscTvl = p.chainTvls?.Binance || p.chainTvls?.BSC || 0;
        const totalTvl = p.tvl || 0;
        return {
          name: p.name || '?',
          category: p.category || '—',
          bscTvl,
          totalTvl,
          bscPct: totalTvl > 0 ? (bscTvl / totalTvl * 100) : 0,
          change1d: p.change_1d || 0,
          change7d: p.change_7d || 0,
          logo: p.logo || '',
          url: p.url || '',
        };
      })
      .filter(p => p.bscTvl > 0)
      .sort((a, b) => b.bscTvl - a.bscTvl);

    const totalBscTvl = protocols.reduce((s, p) => s + p.bscTvl, 0);
    return { protocols, totalBscTvl };
  }

  renderContent(data) {
    if (!data?.protocols?.length) return '<div class="panel-loading">No BSC protocol data</div>';

    let h = '<style scoped>';
    h += '.pt-summary{display:flex;gap:12px;margin-bottom:10px;font-size:11px}';
    h += '.pt-stat{color:var(--text-muted)}.pt-stat b{color:var(--text);font-size:13px}';
    h += '</style>';

    h += '<div class="pt-summary">';
    h += `<span class="pt-stat">BSC TVL: <b>${formatCurrency(data.totalBscTvl)}</b></span>`;
    h += `<span class="pt-stat">Protocols: <b>${data.protocols.length}</b></span>`;
    h += '</div>';

    const sorted = [...data.protocols].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    ).slice(0, 50);

    h += '<table class="data-table"><thead><tr>';
    h += '<th>#</th>';
    h += '<th>Protocol</th>';
    h += '<th>Category</th>';
    h += `<th data-k="bscTvl" style="text-align:right">BSC TVL</th>`;
    h += `<th data-k="totalTvl" style="text-align:right">Total TVL</th>`;
    h += `<th data-k="bscPct" style="text-align:right">BSC%</th>`;
    h += `<th data-k="change1d" style="text-align:right">24h%</th>`;
    h += '</tr></thead><tbody>';

    sorted.forEach((p, i) => {
      const chgCls = p.change1d >= 0 ? 'val-up' : 'val-down';
      const chgArrow = p.change1d >= 0 ? '↑' : '↓';
      h += '<tr>';
      h += `<td style="color:var(--text-muted)">${i + 1}</td>`;
      h += `<td style="font-weight:600">${escapeHtml(p.name)}</td>`;
      h += `<td style="font-size:9px;color:var(--text-muted)">${escapeHtml(p.category)}</td>`;
      h += `<td style="text-align:right">${formatCurrency(p.bscTvl)}</td>`;
      h += `<td style="text-align:right">${formatCurrency(p.totalTvl)}</td>`;
      h += `<td style="text-align:right">${p.bscPct.toFixed(1)}%</td>`;
      h += `<td style="text-align:right" class="${chgCls}">${chgArrow}${Math.abs(p.change1d).toFixed(1)}%</td>`;
      h += '</tr>';
    });
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('protocol-tvl-panel', ProtocolTvlPanel);
export default ProtocolTvlPanel;
