import { BasePanel } from '../components/base-panel.js';

export class MemeRushPanel extends BasePanel {
  static skill = 'Skill 2: Meme Rush';
  static defaultTitle = 'Meme Rush';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._tab = 10; // 10=New, 20=Finalizing, 30=Migrated
  }

  connectedCallback() {
    this.classList.add('panel');
    this._renderShell();
    this.startAutoRefresh();
  }

  _renderShell() {
    this.innerHTML = `
      <div class="panel-header">
        <div><span class="panel-title">${this.constructor.defaultTitle}</span>
        <span class="panel-skill">${this.constructor.skill}</span></div>
        <div class="panel-actions"><button class="panel-refresh">↻</button></div>
      </div>
      <div class="panel-tabs">
        <button class="panel-tab ${this._tab === 10 ? 'active' : ''}" data-t="10">New</button>
        <button class="panel-tab ${this._tab === 20 ? 'active' : ''}" data-t="20">Finalizing</button>
        <button class="panel-tab ${this._tab === 30 ? 'active' : ''}" data-t="30">Migrated</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Loading...</div></div>`;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.panel-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = parseInt(tab.dataset.t);
      this.querySelectorAll('.panel-tab').forEach(t => t.classList.toggle('active', t.dataset.t === String(this._tab)));
      this.refresh();
    }));
    this.refresh();
  }

  async fetchData() {
    const res = await window.mefaiApi.meme.rushList({ chainId: '56', rankType: this._tab, limit: 20 });
    if (!res || res?.error || res?.code !== '000000') return [];
    const items = res?.data || [];
    return (Array.isArray(items) ? items : []).map(t => ({
      symbol: t.symbol || t.name || '',
      name: t.name || t.symbol || '',
      icon: t.icon || '',
      chain: t.chainId || '56',
      address: t.contractAddress || '',
      price: parseFloat(t.price || 0),
      mcap: parseFloat(t.marketCap || 0),
      liquidity: parseFloat(t.liquidity || 0),
      holders: parseInt(t.holdersCount || t.holders || 0),
      age: t.createTime || t.launchTime || 0,
    }));
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">No meme tokens in this category</div>';
    const u = window.mefaiUtils;
    let h = '<table class="data-table"><thead><tr>';
    h += '<th>Token</th><th>Price</th><th>MCap</th><th>Liquidity</th><th>Holders</th><th>Age</th>';
    h += '</tr></thead><tbody>';
    for (const t of data) {
      h += `<tr data-a="${t.address}" data-c="${t.chain}">`;
      h += `<td style="font-weight:600">${u.escapeHtml(t.symbol)}</td>`;
      h += `<td class="val-num">$${u.formatPrice(t.price)}</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.mcap)}</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.liquidity)}</td>`;
      h += `<td class="val-num">${u.formatNumber(t.holders)}</td>`;
      h += `<td>${u.formatAge(t.age)}</td></tr>`;
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
customElements.define('meme-rush-panel', MemeRushPanel);
