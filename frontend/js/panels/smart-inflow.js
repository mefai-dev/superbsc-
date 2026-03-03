import { BasePanel } from '../components/base-panel.js';

export class SmartInflowPanel extends BasePanel {
  static skill = 'Skill 5.3';
  static defaultTitle = 'Smart Money Inflow';

  constructor() {
    super();
    this._refreshRate = 30000;
  }

  async fetchData() {
    const res = await window.mefaiApi.rank.smartInflow({ chainId: 'CT_501', tagType: 2 });
    if (!res || res?.error || res?.code !== '000000') return [];
    const items = res?.data || [];
    return (Array.isArray(items) ? items : []).map(t => ({
      symbol: t.tokenName || t.symbol || '',
      icon: t.tokenIconUrl || '',
      address: t.ca || t.contractAddress || '',
      chain: t.chainId || 'CT_501',
      price: parseFloat(t.price || 0),
      netInflow: parseFloat(t.netInflow || t.smartMoneyNetInflow || 0),
      smCount: parseInt(t.smartMoneyCount || t.smTraders || 0),
      mcap: parseFloat(t.marketCap || 0),
      volume: parseFloat(t.volume24h || t.volume || 0),
    }));
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">Loading inflow data...</div>';
    const u = window.mefaiUtils;
    let h = '<table class="data-table"><thead><tr>';
    h += '<th>Token</th><th>Net Inflow</th><th>SM#</th><th>Price</th><th>MCap</th>';
    h += '</tr></thead><tbody>';
    for (const t of data) {
      const cls = t.netInflow >= 0 ? 'val-up' : 'val-down';
      const ar = t.netInflow >= 0 ? '↑' : '↓';
      h += `<tr data-a="${t.address}" data-c="${t.chain}">`;
      h += `<td style="font-weight:600">${u.escapeHtml(t.symbol)}</td>`;
      h += `<td class="${cls}">${ar}${u.formatCurrency(Math.abs(t.netInflow))}</td>`;
      h += `<td class="val-num">${t.smCount || '—'}</td>`;
      h += `<td class="val-num">${u.formatPrice(t.price)}</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.mcap)}</td></tr>`;
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('smart-inflow-panel', SmartInflowPanel);
