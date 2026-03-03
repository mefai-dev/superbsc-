import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, escapeHtml } = window.mefaiUtils;

export class SmartSignalsPanel extends BasePanel {
  static skill = 'Skill 4';
  static defaultTitle = 'Smart Signals';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sort = 'maxGain';
    this._dir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.signals.smartMoney();
    if (!res || res?.error || res?.code !== '000000') return [];
    const items = res?.data || [];
    return (Array.isArray(items) ? items : []).map(s => ({
      symbol: s.ticker || '',
      logo: s.logoUrl || '',
      chain: s.chainId || '56',
      address: s.contractAddress || '',
      direction: (s.direction || '').toLowerCase(),
      smCount: parseInt(s.smartMoneyCount || s.signalCount || 0),
      alertPrice: parseFloat(s.alertPrice || 0),
      currentPrice: parseFloat(s.currentPrice || 0),
      maxGain: parseFloat(s.maxGain || 0),
      status: s.status || '',
      platform: s.launchPlatform || '',
    }));
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">Loading signals...</div>';
    const sorted = [...data].sort((a, b) => this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]);

    let h = '<table class="data-table"><thead><tr>';
    h += '<th data-k="symbol">Token</th><th data-k="direction">Dir</th>';
    h += '<th data-k="smCount">SM#</th><th data-k="alertPrice">Signal $</th>';
    h += '<th data-k="currentPrice">Now $</th><th data-k="maxGain">Gain%</th>';
    h += '<th data-k="status">Status</th></tr></thead><tbody>';

    for (const s of sorted) {
      const icon = s.logo ? `<img src="${s.logo.startsWith('http') ? s.logo : 'https://bin.bnbstatic.com' + s.logo}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const dirCls = s.direction === 'buy' ? 'val-up' : s.direction === 'sell' ? 'val-down' : '';
      const dirText = s.direction === 'buy' ? 'BUY ↑' : s.direction === 'sell' ? 'SELL ↓' : '—';
      const gainCls = s.maxGain > 0 ? 'val-up' : s.maxGain < 0 ? 'val-down' : '';
      const statusCls = s.status === 'active' ? 'color:var(--up);font-weight:700' : 'color:var(--text-muted)';

      h += `<tr data-a="${s.address}" data-c="${s.chain}">`;
      h += `<td>${icon}<span style="font-weight:600">${escapeHtml(s.symbol)}</span></td>`;
      h += `<td class="${dirCls}" style="font-weight:700">${dirText}</td>`;
      h += `<td class="val-num">${s.smCount}</td>`;
      h += `<td class="val-num">$${formatPrice(s.alertPrice)}</td>`;
      h += `<td class="val-num">$${formatPrice(s.currentPrice)}</td>`;
      h += `<td class="${gainCls}">${s.maxGain > 0 ? '+' : ''}${s.maxGain.toFixed(1)}%</td>`;
      h += `<td style="${statusCls};font-size:10px;text-transform:uppercase">${escapeHtml(s.status || '—')}</td>`;
      h += '</tr>';
    }
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
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('smart-signals-panel', SmartSignalsPanel);
