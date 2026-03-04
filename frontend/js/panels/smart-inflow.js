import { BasePanel } from '../components/base-panel.js';

export class SmartInflowPanel extends BasePanel {
  static skill = 'Skill 5.3';
  static defaultTitle = 'Smart Money Inflow';

  constructor() {
    super();
    this._refreshRate = 30000;
  }

  async fetchData() {
    const res = await window.mefaiApi.rank.smartInflow();
    if (!res || res?.error || res?.code !== '000000') return [];
    const items = res?.data || [];
    return (Array.isArray(items) ? items : []).map(t => ({
      symbol: t.tokenName || '',
      icon: t.tokenIconUrl || '',
      address: t.ca || '',
      chain: 'SOL',
      price: parseFloat(t.price || 0),
      mcap: parseFloat(t.marketCap || 0),
      volume: parseFloat(t.volume || 0),
      change: parseFloat(t.priceChangeRate || 0),
      risk: t.tokenRiskLevel || 0,
    }));
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('msg.loadingInflow')}</div>`;
    const u = window.mefaiUtils;
    let h = '<table class="data-table"><thead><tr>';
    h += `<th>${_t('col.token')}</th><th>${_t('col.price')}</th><th>${_t('col.mcap')}</th><th>${_t('col.volume')}</th><th>${_t('col.change24h')}</th>`;
    h += '</tr></thead><tbody>';
    for (const t of data) {
      const iconUrl = u.tokenIcon(t.icon);
      const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const cls = t.change >= 0 ? 'val-up' : 'val-down';
      h += `<tr data-a="${t.address}">`;
      h += `<td>${icon}<span style="font-weight:600">${u.escapeHtml(t.symbol)}</span></td>`;
      h += `<td class="val-num">$${u.formatPrice(t.price)}</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.mcap)}</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.volume)}</td>`;
      h += `<td class="${cls}">${t.change >= 0 ? '↑' : '↓'}${Math.abs(t.change).toFixed(1)}%</td></tr>`;
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: 'SOL' });
    }));
  }
}
customElements.define('smart-inflow-panel', SmartInflowPanel);
