import { BasePanel } from '../components/base-panel.js';

export class TopTradersPanel extends BasePanel {
  static skill = 'Skill 5.5';
  static defaultTitle = 'Top Traders';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._sort = 'pnl';
    this._dir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.rank.topTraders();
    if (!res || res?.error || res?.code === '000002') return [];
    // Response: {code, data: {data: [...]}}
    const items = res?.data?.data || res?.data || [];
    return (Array.isArray(items) ? items : []).map(t => ({
      address: t.address || '',
      label: t.addressLabel || '',
      pnl: parseFloat(t.realizedPnl || 0),
      pnlPct: parseFloat(t.realizedPnlPercent || 0),
      balance: parseFloat(t.balance || 0),
      tags: t.tags || '',
    }));
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">Loading trader data...</div>';
    const u = window.mefaiUtils;
    const sorted = [...data].sort((a, b) => this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]);
    let h = '<table class="data-table"><thead><tr>';
    h += '<th>#</th><th data-k="address">Address</th><th data-k="pnl">PnL</th>';
    h += '<th data-k="pnlPct">PnL%</th><th data-k="balance">Balance</th></tr></thead><tbody>';
    sorted.forEach((t, i) => {
      const cls = t.pnl >= 0 ? 'val-up' : 'val-down';
      const ar = t.pnl >= 0 ? '↑' : '↓';
      h += `<tr data-a="${t.address}"><td>${i + 1}</td>`;
      h += `<td style="font-weight:600">${u.formatAddress(t.address)}${t.label ? ` <span style="color:var(--text-muted);font-size:9px">${u.escapeHtml(t.label)}</span>` : ''}</td>`;
      h += `<td class="${cls}">${ar}${u.formatCurrency(Math.abs(t.pnl))}</td>`;
      h += `<td class="${cls}">${ar}${(t.pnlPct * 100).toFixed(1)}%</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.balance)}</td></tr>`;
    });
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitWalletFocus({ address: tr.dataset.a, chain: '56' });
    }));
  }
}
customElements.define('top-traders-panel', TopTradersPanel);
