// MEFAI P2P Market Scanner — Binance P2P ad search
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatNumber } = window.mefaiUtils;

const FIATS = ['TRY','USD','EUR','GBP','NGN','BRL','INR','VND','RUB','ARS'];
const ASSETS = ['USDT','BTC','ETH','BNB','FDUSD'];

export class P2pScannerPanel extends BasePanel {
  static skill = 'Skill 14';
  static defaultTitle = 'P2P Scanner';

  constructor() {
    super();
    this._refreshRate = 0;
    this._fiat = 'TRY';
    this._asset = 'USDT';
    this._side = 'BUY';
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
        <select class="p2p-fiat form-select">${FIATS.map(f => `<option value="${f}"${f===this._fiat?' selected':''}>${f}</option>`).join('')}</select>
        <select class="p2p-asset form-select">${ASSETS.map(a => `<option value="${a}"${a===this._asset?' selected':''}>${a}</option>`).join('')}</select>
        <button class="btn p2p-buy${this._side==='BUY'?' active':''}" data-side="BUY">Buy</button>
        <button class="btn p2p-sell${this._side==='SELL'?' active':''}" data-side="SELL">Sell</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Select filters and refresh</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.p2p-fiat')?.addEventListener('change', e => { this._fiat = e.target.value; this.refresh(); });
    this.querySelector('.p2p-asset')?.addEventListener('change', e => { this._asset = e.target.value; this.refresh(); });
    this.querySelectorAll('[data-side]').forEach(btn => btn.addEventListener('click', e => {
      this._side = e.target.dataset.side;
      this.querySelectorAll('[data-side]').forEach(b => b.classList.toggle('active', b.dataset.side === this._side));
      this.refresh();
    }));
    this.refresh();
  }

  async fetchData() {
    const res = await window.mefaiApi.p2p.search({ fiat: this._fiat, asset: this._asset, tradeType: this._side, rows: 20, page: 1 });
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading P2P ads...</div>';
    if (data?._fetchError) return '<div class="panel-loading">Unable to load P2P data</div>';

    const ads = data?.data || [];
    if (!ads.length) return '<div class="panel-loading">No P2P ads found for this pair</div>';

    let h = '<style scoped>';
    h += '.p2p-row{display:grid;grid-template-columns:1fr 90px 90px 1fr;gap:6px;padding:6px 0;border-bottom:1px solid var(--border);font-size:11px;align-items:center}';
    h += '.p2p-hdr{font-size:9px;color:var(--text-muted);text-transform:uppercase;font-weight:600}';
    h += '.p2p-price{font-weight:700;color:#0ecb81;font-size:13px}';
    h += '.p2p-merchant{display:flex;align-items:center;gap:4px}';
    h += '.p2p-dot{width:6px;height:6px;border-radius:50%;display:inline-block}';
    h += '.p2p-methods{display:flex;flex-wrap:wrap;gap:2px}';
    h += '.p2p-badge{font-size:8px;padding:1px 4px;border-radius:3px;background:var(--bg-secondary);color:var(--text-muted)}';
    h += '</style>';

    h += '<div class="p2p-row p2p-hdr"><span>Merchant</span><span>Price</span><span>Available</span><span>Limit</span></div>';

    ads.forEach(ad => {
      const adv = ad.adv || {};
      const advertiser = ad.advertiser || {};
      const price = parseFloat(adv.price || 0);
      const available = parseFloat(adv.surplusAmount || 0);
      const minLimit = parseFloat(adv.minSingleTransAmount || 0);
      const maxLimit = parseFloat(adv.dynamicMaxSingleTransAmount || adv.maxSingleTransAmount || 0);
      const completion = parseFloat(advertiser.monthFinishRate || 0) * 100;
      const orders = advertiser.monthOrderCount || 0;
      const nick = escapeHtml(advertiser.nickName || 'Unknown');

      // Merchant quality dot
      let dotColor = '#0ecb81'; // green
      if (completion < 90) dotColor = '#f0b90b'; // yellow
      if (completion < 80) dotColor = '#f6465d'; // red

      const methods = (adv.tradeMethods || []).map(m => `<span class="p2p-badge">${escapeHtml(m.tradeMethodShortName || m.identifier || '')}</span>`).join('');

      h += `<div class="p2p-row">
        <div class="p2p-merchant"><span class="p2p-dot" style="background:${dotColor}"></span><span>${nick}</span><span style="font-size:9px;color:var(--text-muted)">${completion.toFixed(0)}% | ${orders}</span></div>
        <span class="p2p-price">${price.toFixed(2)}</span>
        <span>${formatNumber(available)} ${escapeHtml(adv.asset || '')}</span>
        <div><span style="color:var(--text-muted)">${formatNumber(minLimit)} - ${formatNumber(maxLimit)} ${escapeHtml(adv.fiatUnit || '')}</span><div class="p2p-methods">${methods}</div></div>
      </div>`;
    });

    return h;
  }
}
customElements.define('p2p-scanner-panel', P2pScannerPanel);
export default P2pScannerPanel;
