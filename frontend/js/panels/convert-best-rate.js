// MEFAI Convert Best Rate — Compare Spot vs P2P pricing
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatPrice } = window.mefaiUtils;

const FIATS = ['TRY','USD','EUR','GBP','BRL','NGN','INR'];
const ASSETS = ['USDT','BTC','ETH','BNB'];

export class ConvertBestRatePanel extends BasePanel {
  static skill = 'Skill 19';
  static defaultTitle = 'Convert Best Rate';

  constructor() {
    super();
    this._refreshRate = 0;
    this._asset = 'USDT';
    this._fiat = 'TRY';
    this._amount = 1000;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    this.refresh();
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
        <input type="number" class="cvt-amount form-input" value="${this._amount}" min="1" style="width:80px" placeholder="Amount">
        <select class="cvt-asset form-select">${ASSETS.map(a => `<option value="${a}"${a===this._asset?' selected':''}>${a}</option>`).join('')}</select>
        <span style="color:var(--text-muted);font-size:11px">to</span>
        <select class="cvt-fiat form-select">${FIATS.map(f => `<option value="${f}"${f===this._fiat?' selected':''}>${f}</option>`).join('')}</select>
        <button class="btn cvt-go-btn">Compare</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Loading rates...</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.cvt-go-btn')?.addEventListener('click', () => this._doCompare());
  }

  _doCompare() {
    this._amount = parseFloat(this.querySelector('.cvt-amount')?.value) || 1000;
    this._asset = this.querySelector('.cvt-asset')?.value || 'USDT';
    this._fiat = this.querySelector('.cvt-fiat')?.value || 'TRY';
    this.refresh();
  }

  async fetchData() {
    // Fetch spot price + P2P best price in parallel
    const [p2pBuy, p2pSell] = await Promise.all([
      window.mefaiApi.p2p.search({ fiat: this._fiat, asset: this._asset, tradeType: 'BUY', rows: 5, page: 1 }),
      window.mefaiApi.p2p.search({ fiat: this._fiat, asset: this._asset, tradeType: 'SELL', rows: 5, page: 1 }),
    ]);

    return { p2pBuy, p2pSell };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading rates...</div>';

    const buyAds = data.p2pBuy?.data || [];
    const sellAds = data.p2pSell?.data || [];
    const bestBuy = buyAds.length ? parseFloat(buyAds[0]?.adv?.price || 0) : 0;
    const bestSell = sellAds.length ? parseFloat(sellAds[0]?.adv?.price || 0) : 0;
    const spread = bestBuy && bestSell ? ((bestBuy - bestSell) / bestSell * 100) : 0;

    let h = '<style scoped>';
    h += '.cvt-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 0}';
    h += '.cvt-card{background:var(--bg-secondary);border-radius:6px;padding:12px;text-align:center}';
    h += '.cvt-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.cvt-val{font-size:18px;font-weight:700;margin:4px 0}';
    h += '.cvt-sub{font-size:10px;color:var(--text-muted)}';
    h += '.cvt-spread{text-align:center;padding:10px 0;border-top:1px solid var(--border);border-bottom:1px solid var(--border)}';
    h += '.cvt-reco{padding:8px;background:var(--bg-secondary);border-radius:6px;margin-top:8px;font-size:11px}';
    h += '.cvt-note{font-size:10px;color:var(--text-muted);margin-top:8px;padding:6px;background:rgba(240,185,11,.08);border-radius:4px}';
    h += '</style>';

    h += '<div class="cvt-cards">';
    h += `<div class="cvt-card"><div class="cvt-label">P2P Buy Price</div><div class="cvt-val val-up">${bestBuy ? bestBuy.toFixed(2) : '—'}</div><div class="cvt-sub">${escapeHtml(this._fiat)} per ${escapeHtml(this._asset)}</div></div>`;
    h += `<div class="cvt-card"><div class="cvt-label">P2P Sell Price</div><div class="cvt-val val-down">${bestSell ? bestSell.toFixed(2) : '—'}</div><div class="cvt-sub">${escapeHtml(this._fiat)} per ${escapeHtml(this._asset)}</div></div>`;
    h += '</div>';

    if (bestBuy && bestSell) {
      h += '<div class="cvt-spread">';
      h += `<div style="font-size:10px;color:var(--text-muted)">Buy/Sell Spread</div>`;
      h += `<div style="font-size:22px;font-weight:700;color:#f0b90b">${spread.toFixed(2)}%</div>`;
      h += '</div>';

      const recAmount = this._amount * bestSell;
      h += '<div class="cvt-reco">';
      h += `<div><strong>${this._amount} ${escapeHtml(this._asset)}</strong> = <strong style="color:#0ecb81">${recAmount.toFixed(2)} ${escapeHtml(this._fiat)}</strong> (best P2P sell)</div>`;
      h += '</div>';
    }

    h += '<div class="cvt-note">Add API key for Binance Convert quote comparison</div>';

    return h;
  }
}
customElements.define('convert-best-rate-panel', ConvertBestRatePanel);
export default ConvertBestRatePanel;
