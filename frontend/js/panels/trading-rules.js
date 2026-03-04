// Trading Rules Validator — Check symbol filters, lot sizes, notional limits
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatPrice } = window.mefaiUtils;

export class TradingRulesPanel extends BasePanel {
  static skill = 'Skill 23';
  static defaultTitle = 'Trading Rules';

  constructor() {
    super();
    this._refreshRate = 0;
    this._symbol = '';
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
  }

  render() {
    const title = this.getAttribute('title') || this.constructor.defaultTitle;
    const skill = this.constructor.skill;
    this.innerHTML = `
      <div class="panel-header">
        <div><span class="panel-title">${title}</span>${skill ? `<span class="panel-skill">${skill}</span>` : ''}</div>
        <div class="panel-actions"><button class="panel-refresh" title="Refresh">&#8635;</button></div>
      </div>
      <div class="filter-bar">
        <input type="text" class="tr-symbol form-input" placeholder="e.g. BTCUSDT" value="${escapeHtml(this._symbol)}" style="width:140px">
        <button class="btn tr-check-btn">Check Rules</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Enter a trading pair to check rules and filters</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.tr-check-btn')?.addEventListener('click', () => this._doCheck());
    this.querySelector('.tr-symbol')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._doCheck(); });
  }

  _doCheck() {
    this._symbol = (this.querySelector('.tr-symbol')?.value?.trim() || '').toUpperCase();
    if (!this._symbol) return;
    this.refresh();
  }

  async fetchData() {
    if (!this._symbol) return null;
    const res = await window.mefaiApi.spot.exchangeInfo(this._symbol);
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Enter a trading pair to check rules and filters</div>';
    if (data?._fetchError) return '<div class="panel-loading">Unable to load exchange info</div>';

    const symbols = data?.symbols || [];
    const info = symbols[0];
    if (!info) return '<div class="panel-loading">Symbol not found</div>';

    let h = '<style scoped>';
    h += '.tr-section{padding:6px 0;border-bottom:1px solid var(--border)}';
    h += '.tr-section:last-child{border:none}';
    h += '.tr-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 4px;letter-spacing:.5px}';
    h += '.tr-row{display:flex;justify-content:space-between;padding:2px 0;font-size:11px}';
    h += '.tr-row span:last-child{font-weight:600}';
    h += '.tr-badge{display:inline-block;padding:1px 6px;border-radius:3px;font-size:9px;font-weight:600}';
    h += '.tr-active{background:rgba(14,203,129,.15);color:#0ecb81}';
    h += '.tr-inactive{background:rgba(246,70,93,.15);color:#f6465d}';
    h += '.tr-filter-list{display:flex;flex-wrap:wrap;gap:4px;margin:4px 0}';
    h += '.tr-filter-tag{background:var(--bg-secondary);padding:2px 6px;border-radius:3px;font-size:10px}';
    h += '</style>';

    // General info
    h += '<div class="tr-section"><h4>General</h4>';
    h += `<div class="tr-row"><span>Symbol</span><span>${escapeHtml(info.symbol)}</span></div>`;
    h += `<div class="tr-row"><span>Status</span><span class="tr-badge ${info.status === 'TRADING' ? 'tr-active' : 'tr-inactive'}">${escapeHtml(info.status)}</span></div>`;
    h += `<div class="tr-row"><span>Base Asset</span><span>${escapeHtml(info.baseAsset)}</span></div>`;
    h += `<div class="tr-row"><span>Quote Asset</span><span>${escapeHtml(info.quoteAsset)}</span></div>`;
    h += `<div class="tr-row"><span>Base Precision</span><span>${info.baseAssetPrecision}</span></div>`;
    h += `<div class="tr-row"><span>Quote Precision</span><span>${info.quotePrecision}</span></div>`;
    h += '</div>';

    // Order types
    h += '<div class="tr-section"><h4>Allowed Order Types</h4><div class="tr-filter-list">';
    for (const ot of (info.orderTypes || [])) {
      h += `<span class="tr-filter-tag">${escapeHtml(ot)}</span>`;
    }
    h += '</div></div>';

    // Filters
    const filters = info.filters || [];
    h += '<div class="tr-section"><h4>Trading Filters</h4>';
    for (const f of filters) {
      const type = f.filterType || '';
      if (type === 'PRICE_FILTER') {
        h += `<div class="tr-row"><span>Min Price</span><span>${f.minPrice}</span></div>`;
        h += `<div class="tr-row"><span>Max Price</span><span>${f.maxPrice}</span></div>`;
        h += `<div class="tr-row"><span>Tick Size</span><span>${f.tickSize}</span></div>`;
      } else if (type === 'LOT_SIZE') {
        h += `<div class="tr-row"><span>Min Qty</span><span>${f.minQty}</span></div>`;
        h += `<div class="tr-row"><span>Max Qty</span><span>${f.maxQty}</span></div>`;
        h += `<div class="tr-row"><span>Step Size</span><span>${f.stepSize}</span></div>`;
      } else if (type === 'NOTIONAL' || type === 'MIN_NOTIONAL') {
        h += `<div class="tr-row"><span>Min Notional</span><span>$${f.minNotional || f.notional || '—'}</span></div>`;
      } else if (type === 'PERCENT_PRICE_BY_SIDE') {
        h += `<div class="tr-row"><span>Bid Multiplier Up</span><span>${f.bidMultiplierUp}</span></div>`;
        h += `<div class="tr-row"><span>Ask Multiplier Down</span><span>${f.askMultiplierDown}</span></div>`;
      }
    }
    h += '</div>';

    // Permissions
    h += '<div class="tr-section"><h4>Permissions</h4><div class="tr-filter-list">';
    for (const p of (info.permissions || info.permissionSets?.[0] || [])) {
      h += `<span class="tr-filter-tag">${escapeHtml(p)}</span>`;
    }
    h += '</div></div>';

    return h;
  }
}
customElements.define('trading-rules-panel', TradingRulesPanel);
export default TradingRulesPanel;
