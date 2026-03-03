// MEFAI Wallet Tracker Panel — address.positions(), manual address input
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatPercent, formatNumber, formatAddress, escapeHtml } = window.mefaiUtils;
const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;

export class WalletTrackerPanel extends BasePanel {
  static skill = 'Skill 3';
  static defaultTitle = 'Wallet Tracker';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'value';
    this._sortDir = 'desc';
    this._address = '';
    this._chain = 'eth';
    this._unsub = null;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    // Listen to focused wallet changes
    this._unsub = window.mefaiStore?.subscribe('focusedWallet', (wallet) => {
      if (wallet?.address) {
        this._address = wallet.address;
        this._chain = wallet.chain || 'eth';
        const addrInput = this.querySelector('.wallet-address');
        const chainSelect = this.querySelector('.wallet-chain');
        if (addrInput) addrInput.value = this._address;
        if (chainSelect) chainSelect.value = this._chain;
        this.refresh();
      }
    });
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) this._unsub();
  }

  render() {
    const title = this.getAttribute('title') || this.constructor.defaultTitle;
    const skill = this.constructor.skill;
    this.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="panel-title">${title}</span>
          ${skill ? `<span class="panel-skill">${skill}</span>` : ''}
        </div>
        <div class="panel-actions">
          <button class="panel-refresh" title="Refresh">&#8635;</button>
        </div>
      </div>
      <div class="filter-bar">
        <input type="text" class="wallet-address form-input" placeholder="Wallet address" value="${escapeHtml(this._address)}" style="flex:1">
        <select class="wallet-chain form-select">
          <option value="eth"${this._chain === 'eth' ? ' selected' : ''}>ETH</option>
          <option value="bsc"${this._chain === 'bsc' ? ' selected' : ''}>BSC</option>
          <option value="sol"${this._chain === 'sol' ? ' selected' : ''}>SOL</option>
          <option value="base"${this._chain === 'base' ? ' selected' : ''}>BASE</option>
          <option value="arb"${this._chain === 'arb' ? ' selected' : ''}>ARB</option>
        </select>
        <button class="btn wallet-btn">Track</button>
      </div>
      <div class="panel-body">
        <div class="panel-loading">Enter a wallet address to track</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => {
      if (this._address) this.refresh();
    });
    this.querySelector('.wallet-btn')?.addEventListener('click', () => {
      this._address = this.querySelector('.wallet-address')?.value?.trim() || '';
      this._chain = this.querySelector('.wallet-chain')?.value || 'eth';
      if (this._address) this.refresh();
    });
    this.querySelector('.wallet-address')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._address = e.target.value.trim();
        this._chain = this.querySelector('.wallet-chain')?.value || 'eth';
        if (this._address) this.refresh();
      }
    });
  }

  async fetchData() {
    if (!this._address) return null;
    const res = await window.mefaiApi.address.positions({
      address: this._address,
      chain: this._chain,
    });
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      token: item.token || item.symbol || item.name || '',
      address: item.address || item.contract || item.tokenAddress || '',
      qty: parseFloat(item.qty || item.quantity || item.balance || item.amount || 0),
      price: parseFloat(item.price || item.currentPrice || 0),
      change24h: parseFloat(item.change24h || item.priceChange24h || item.change || 0),
      value: parseFloat(item.value || item.totalValue || 0),
    }));
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Enter a wallet address to track</div>';
    if (!data.length) return '<div class="panel-loading">No positions found for this wallet</div>';

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    // Total portfolio value
    const total = data.reduce((sum, row) => sum + (row.value || 0), 0);

    const columns = [
      {
        key: 'token',
        label: 'Token',
        render: (v) => `<span style="font-weight:600">${escapeHtml(v)}</span>`,
      },
      {
        key: 'qty',
        label: 'Qty',
        align: 'right',
        render: v => formatNumber(v),
      },
      { key: 'price', label: 'Price', align: 'right', render: v => `$${formatPrice(v)}` },
      { key: 'change24h', label: '24h%', align: 'right', render: v => formatPercent(v) },
      { key: 'value', label: 'Value', align: 'right', render: v => formatCurrency(v) },
    ];

    let html = `<div style="padding:0 0 8px;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">`;
    html += `${formatAddress(this._address)} &mdash; Total: <span style="color:var(--text);font-weight:700">${formatCurrency(total)}</span>`;
    html += `</div>`;
    html += renderTable(columns, sorted, {
      sortKey: this._sortKey,
      sortDir: this._sortDir,
    });

    return html;
  }

  afterRender(body) {
    const data = this._data;
    if (!data || !data.length) return;

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    bindTableEvents(body, null, sorted, {
      onSort: (key) => {
        if (this._sortKey === key) {
          this._sortDir = this._sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          this._sortKey = key;
          this._sortDir = 'desc';
        }
        body.innerHTML = this.renderContent(this._data);
        this.afterRender(body);
      },
      onRowClick: (row) => {
        this.emitTokenFocus({
          symbol: row.token,
          address: row.address,
          chain: this._chain,
          platform: 'dex',
        });
      },
    });
  }
}

customElements.define('wallet-tracker-panel', WalletTrackerPanel);
export default WalletTrackerPanel;
