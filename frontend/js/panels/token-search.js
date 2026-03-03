// MEFAI Token Search Panel — token.search() data
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatAddress, escapeHtml } = window.mefaiUtils;
const debounce = window.mefaiUtils.debounce;

export class TokenSearchPanel extends BasePanel {
  static skill = 'Skill 7.1';
  static defaultTitle = 'Token Search';

  constructor() {
    super();
    this._refreshRate = 0; // no auto-refresh, search is manual
    this._query = '';
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
        <input type="text" class="search-query form-input" placeholder="Search token name or symbol..." style="flex:1">
      </div>
      <div class="panel-body">
        <div class="panel-loading">Type to search tokens</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => {
      if (this._query) this.refresh();
    });

    const debouncedSearch = debounce ? debounce(() => this._doSearch(), 400) : (() => {
      clearTimeout(this._debounceTimer);
      this._debounceTimer = setTimeout(() => this._doSearch(), 400);
    });

    this.querySelector('.search-query')?.addEventListener('input', (e) => {
      this._query = e.target.value.trim();
      if (this._query.length >= 2) {
        debouncedSearch();
      } else if (this._query.length === 0) {
        const body = this.querySelector('.panel-body');
        if (body) body.innerHTML = '<div class="panel-loading">Type to search tokens</div>';
      }
    });
  }

  _doSearch() {
    this.refresh();
  }

  async fetchData() {
    if (!this._query || this._query.length < 2) return [];
    const res = await window.mefaiApi.token.search(this._query);
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(items)) return [];
    return items.map(item => ({
      name: item.name || '',
      symbol: item.symbol || '',
      chainId: item.chainId || '',
      contractAddress: item.contractAddress || '',
      icon: item.icon || '',
      price: parseFloat(item.price || 0),
      change24h: parseFloat(item.percentChange24h || 0),
    }));
  }

  renderContent(data) {
    if (!data || !data.length) {
      if (this._query && this._query.length >= 2) {
        return '<div class="panel-loading">No results found</div>';
      }
      return '<div class="panel-loading">Type to search tokens</div>';
    }

    let html = '<div class="search-results-list">';
    data.forEach((item, i) => {
      const changeHtml = item.change24h ? ` ${formatPercent(item.change24h)}` : '';
      html += `<div class="search-result" data-index="${i}" style="display:flex;justify-content:space-between;align-items:center;padding:6px 8px;border-bottom:1px solid var(--border);cursor:pointer">`;
      html += `<div style="display:flex;align-items:center;gap:6px">`;
      if (item.icon) {
        html += `<img src="${((u) => u && u.startsWith("http") ? u : "https://bin.bnbstatic.com" + (u || ""))(item.icon)}" style="width:18px;height:18px;border-radius:50%" onerror="this.style.display='none'">`;
      }
      html += `<div>`;
      html += `<span style="font-weight:600">${escapeHtml(item.name)}</span>`;
      html += ` <span style="color:var(--text-muted)">${escapeHtml(item.symbol)}</span>`;
      if (item.chainId) {
        html += ` <span class="chain-badge">${escapeHtml(String(item.chainId))}</span>`;
      }
      if (item.contractAddress) {
        html += `<br><span style="font-size:10px;color:var(--text-muted)">${formatAddress(item.contractAddress)}</span>`;
      }
      html += `</div>`;
      html += `</div>`;
      html += `<div style="text-align:right">`;
      if (item.price) {
        html += `<span style="font-variant-numeric:tabular-nums">$${formatPrice(item.price)}</span>`;
      }
      html += changeHtml;
      html += `</div>`;
      html += `</div>`;
    });
    html += '</div>';
    return html;
  }

  afterRender(body) {
    const data = this._data;
    if (!data || !data.length) return;

    body.querySelectorAll('.search-result').forEach(el => {
      el.addEventListener('click', () => {
        const idx = parseInt(el.dataset.index);
        const item = data[idx];
        if (item) {
          this.emitTokenFocus({
            symbol: item.symbol,
            address: item.contractAddress,
            chain: item.chainId,
            platform: 'dex',
          });
        }
      });
    });
  }
}

customElements.define('token-search-panel', TokenSearchPanel);
export default TokenSearchPanel;
