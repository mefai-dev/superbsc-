// MEFAI NFT Portfolio — BNB Chain NFT Balance & Collection Viewer
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

// Popular BSC NFT collections
const BSC_COLLECTIONS = [
  { name: 'Pancake Bunnies', contract: '0xDf7952B35f24aCF7fC0487D01c8d5690a60DBa07', symbol: 'PB' },
  { name: 'Pancake Squad', contract: '0x0a8901b0E25DEb55A87524f0cC164E9644020EBA', symbol: 'PS' },
  { name: 'BNB Heroes', contract: '0x4cd0Ce1D5e10AFbCAa565a0FE2A810eF0eB9B7E2', symbol: 'BNBH' },
  { name: 'Mobox Avatar', contract: '0x3906c6Db62E530e2eF480716Da752FDCd1f8c06c', symbol: 'MOMO' },
  { name: 'BinaryX Hero', contract: '0x4Cd104ED2B4F5Ca059E91d49a2A5b08f92d6E357', symbol: 'BXH' },
];

export class NftPortfolioPanel extends BasePanel {
  static skill = 'Skill 21';
  static defaultTitle = 'NFT Portfolio';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._address = '';
    this._nftData = null;
    this._loading = false;
  }

  async fetchData() {
    return { collections: BSC_COLLECTIONS, nftData: this._nftData, address: this._address };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">No data</div>';

    let h = '<style scoped>';
    h += '.nft-search{display:flex;gap:4px;margin-bottom:10px}';
    h += '.nft-input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:6px 8px;font-size:11px;color:var(--text);font-family:inherit}';
    h += '.nft-btn{padding:6px 12px;background:var(--accent);color:#0b0e11;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;text-transform:uppercase}';
    h += '.nft-collections{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:10px}';
    h += '.nft-col{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px;cursor:pointer;transition:border-color .2s}';
    h += '.nft-col:hover{border-color:var(--accent)}';
    h += '.nft-name{font-size:11px;font-weight:700;color:var(--text)}';
    h += '.nft-symbol{font-size:9px;color:var(--accent);margin-left:4px}';
    h += '.nft-addr{font-size:8px;color:var(--text-muted);font-family:monospace;margin-top:2px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
    h += '.nft-result{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px}';
    h += '.nft-balance-card{text-align:center;padding:12px}';
    h += '.nft-balance-val{font-size:28px;font-weight:700;color:var(--accent)}';
    h += '.nft-balance-label{font-size:10px;color:var(--text-muted);margin-top:4px;text-transform:uppercase}';
    h += '.nft-token-grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(60px,1fr));gap:4px;margin-top:8px}';
    h += '.nft-token-item{background:var(--card-bg);border:1px solid var(--border);border-radius:4px;padding:6px;text-align:center;font-size:9px;font-family:monospace;color:var(--text)}';
    h += '.nft-info{font-size:10px;color:var(--text-muted);text-align:center;padding:16px}';
    h += '.nft-row{display:flex;justify-content:space-between;align-items:center;padding:6px 0;border-bottom:1px solid var(--border)}';
    h += '.nft-row:last-child{border-bottom:none}';
    h += '</style>';

    // Address input
    h += '<div class="nft-search">';
    h += `<input class="nft-input" id="nft-addr" placeholder="Enter BSC wallet address (0x...)" value="${escapeHtml(this._address)}">`;
    h += '<button class="nft-btn" id="nft-scan-btn">Scan</button>';
    h += '</div>';

    if (this._nftData) {
      h += this._renderResults(this._nftData);
    } else if (this._address) {
      h += '<div class="nft-info">Scanning NFT collections...</div>';
    } else {
      h += '<div class="nft-info" style="margin-bottom:10px">Enter a BSC address to check NFT holdings across popular collections</div>';
      h += '<div style="font-size:10px;color:var(--text-muted);margin-bottom:6px;font-weight:600">Popular BSC Collections</div>';
      h += '<div class="nft-collections">';
      data.collections.forEach(c => {
        h += `<div class="nft-col" data-contract="${c.contract}">`;
        h += `<div><span class="nft-name">${escapeHtml(c.name)}</span><span class="nft-symbol">${c.symbol}</span></div>`;
        h += `<div class="nft-addr">${c.contract}</div>`;
        h += '</div>';
      });
      h += '</div>';
    }

    return h;
  }

  _renderResults(data) {
    let h = '';
    const totalNfts = data.reduce((s, c) => s + c.balance, 0);

    h += '<div class="nft-balance-card">';
    h += `<div class="nft-balance-val">${totalNfts}</div>`;
    h += '<div class="nft-balance-label">Total NFTs Found</div>';
    h += '</div>';

    h += '<div class="nft-result" style="margin-top:8px">';
    data.forEach(c => {
      if (c.balance > 0) {
        h += `<div class="nft-row">`;
        h += `<div><span class="nft-name">${escapeHtml(c.name)}</span><span class="nft-symbol">${c.symbol}</span></div>`;
        h += `<div style="font-weight:700;color:var(--accent)">${c.balance}</div>`;
        h += '</div>';
        if (c.tokens && c.tokens.length > 0) {
          h += '<div class="nft-token-grid">';
          c.tokens.forEach(t => {
            const id = parseInt(t.tokenId, 16);
            h += `<div class="nft-token-item">#${id}</div>`;
          });
          h += '</div>';
        }
      }
    });

    const empty = data.filter(c => c.balance === 0);
    if (empty.length > 0) {
      h += '<div style="margin-top:8px;font-size:9px;color:var(--text-muted)">';
      h += `No NFTs found in: ${empty.map(c => c.name).join(', ')}`;
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  async _scanNfts(address) {
    if (!address || address.length !== 42) return;
    this._address = address;
    this._nftData = null;

    // Re-render to show loading
    const body = this.querySelector('.panel-body');
    if (body) {
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }

    const results = [];
    for (const col of BSC_COLLECTIONS) {
      try {
        const res = await window.mefaiApi.bnbchain.nftBalance(address, col.contract);
        const balance = res?.result ? parseInt(res.result, 16) : 0;
        const entry = { name: col.name, symbol: col.symbol, contract: col.contract, balance, tokens: [] };

        // If balance > 0, try to get token IDs
        if (balance > 0 && balance <= 20) {
          try {
            const tokRes = await window.mefaiApi.bnbchain.nftTokens(address, col.contract, Math.min(balance, 10));
            if (tokRes?.tokens) entry.tokens = tokRes.tokens;
          } catch { /* enumeration not supported */ }
        }
        results.push(entry);
      } catch {
        results.push({ name: col.name, symbol: col.symbol, contract: col.contract, balance: 0, tokens: [] });
      }
    }

    this._nftData = results;
    if (body) {
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }
  }

  afterRender(body) {
    const scanBtn = body.querySelector('#nft-scan-btn');
    const addrInput = body.querySelector('#nft-addr');
    if (scanBtn && addrInput) {
      scanBtn.addEventListener('click', () => this._scanNfts(addrInput.value.trim()));
      addrInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._scanNfts(addrInput.value.trim()); });
    }

    // Click collection to copy contract
    body.querySelectorAll('.nft-col').forEach(el => {
      el.addEventListener('click', () => {
        const contract = el.dataset.contract;
        navigator.clipboard.writeText(contract).catch(() => {});
      });
    });
  }
}
customElements.define('nft-portfolio-panel', NftPortfolioPanel);
export default NftPortfolioPanel;
