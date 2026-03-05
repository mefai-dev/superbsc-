// MEFAI TX Explorer — BSC Transaction & Block Explorer
import { BasePanel } from '../components/base-panel.js';

const { formatNumber, escapeHtml } = window.mefaiUtils;

export class TxExplorerPanel extends BasePanel {
  static skill = 'Skill 20';
  static defaultTitle = 'TX Explorer';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._tab = 'block';
    this._txHash = '';
    this._searchResult = null;
  }

  async fetchData() {
    const [blockNumRes, gasPriceRes] = await Promise.allSettled([
      window.mefaiApi.bnbchain.blockNumber(),
      window.mefaiApi.bnbchain.gasPrice(),
    ]);

    const blockNum = blockNumRes.status === 'fulfilled' && blockNumRes.value?.result
      ? parseInt(blockNumRes.value.result, 16) : 0;
    const gasPrice = gasPriceRes.status === 'fulfilled' && gasPriceRes.value?.result
      ? parseInt(gasPriceRes.value.result, 16) / 1e9 : 0;

    // Fetch latest block details
    let block = null;
    if (blockNum > 0) {
      const hex = '0x' + blockNum.toString(16);
      const blockRes = await window.mefaiApi.bnbchain.block(hex);
      if (blockRes?.result) {
        const b = blockRes.result;
        block = {
          number: parseInt(b.number, 16),
          timestamp: new Date(parseInt(b.timestamp, 16) * 1000),
          txCount: b.transactions ? b.transactions.length : 0,
          gasUsed: parseInt(b.gasUsed, 16),
          gasLimit: parseInt(b.gasLimit, 16),
          miner: b.miner,
          hash: b.hash,
        };
      }
    }

    return { blockNum, gasPrice, block, searchResult: this._searchResult };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">No data</div>';

    let h = '<style scoped>';
    h += '.txe-tabs{display:flex;gap:4px;margin-bottom:8px}';
    h += '.txe-tab{padding:3px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase}';
    h += '.txe-tab.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.txe-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.txe-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.txe-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.txe-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.txe-sub{font-size:9px;margin-top:1px;color:var(--text-muted)}';
    h += '.txe-search{display:flex;gap:4px;margin-bottom:10px}';
    h += '.txe-input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:6px 8px;font-size:11px;color:var(--text);font-family:inherit}';
    h += '.txe-btn{padding:6px 12px;background:var(--accent);color:#0b0e11;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;text-transform:uppercase}';
    h += '.txe-detail{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px;font-size:11px;word-break:break-all}';
    h += '.txe-row{display:flex;justify-content:space-between;padding:4px 0;border-bottom:1px solid var(--border)}';
    h += '.txe-row:last-child{border-bottom:none}';
    h += '.txe-key{color:var(--text-muted);font-size:10px;min-width:80px}';
    h += '.txe-value{color:var(--text);font-size:10px;text-align:right;max-width:65%;overflow:hidden;text-overflow:ellipsis}';
    h += '.txe-hash{font-family:monospace;font-size:9px;color:var(--accent);cursor:pointer}';
    h += '</style>';

    // Stats cards
    h += '<div class="txe-cards">';
    h += `<div class="txe-card"><div class="txe-label">Block</div><div class="txe-val">${formatNumber(data.blockNum)}</div></div>`;
    h += `<div class="txe-card"><div class="txe-label">Gas Price</div><div class="txe-val">${data.gasPrice.toFixed(1)}</div><div class="txe-sub">Gwei</div></div>`;
    h += `<div class="txe-card"><div class="txe-label">TXs</div><div class="txe-val">${data.block ? data.block.txCount : '—'}</div><div class="txe-sub">in block</div></div>`;
    h += '</div>';

    // Tabs
    h += '<div class="txe-tabs">';
    h += `<button class="txe-tab ${this._tab === 'block' ? 'active' : ''}" data-tab="block">Block</button>`;
    h += `<button class="txe-tab ${this._tab === 'tx' ? 'active' : ''}" data-tab="tx">TX Lookup</button>`;
    h += `<button class="txe-tab ${this._tab === 'balance' ? 'active' : ''}" data-tab="balance">Balance</button>`;
    h += '</div>';

    if (this._tab === 'block') {
      h += this._renderBlock(data);
    } else if (this._tab === 'tx') {
      h += this._renderTxSearch(data);
    } else {
      h += this._renderBalance(data);
    }

    return h;
  }

  _renderBlock(data) {
    if (!data.block) return '<div class="txe-detail">Loading block data...</div>';
    const b = data.block;
    const gasUtil = b.gasLimit > 0 ? (b.gasUsed / b.gasLimit * 100).toFixed(1) : 0;
    let h = '<div class="txe-detail">';
    h += `<div class="txe-row"><span class="txe-key">Block #</span><span class="txe-value">${formatNumber(b.number)}</span></div>`;
    h += `<div class="txe-row"><span class="txe-key">Time</span><span class="txe-value">${b.timestamp.toLocaleTimeString()}</span></div>`;
    h += `<div class="txe-row"><span class="txe-key">Transactions</span><span class="txe-value">${b.txCount}</span></div>`;
    h += `<div class="txe-row"><span class="txe-key">Gas Used</span><span class="txe-value">${formatNumber(b.gasUsed)} (${gasUtil}%)</span></div>`;
    h += `<div class="txe-row"><span class="txe-key">Validator</span><span class="txe-value txe-hash">${b.miner}</span></div>`;
    h += `<div class="txe-row"><span class="txe-key">Hash</span><span class="txe-value txe-hash">${b.hash}</span></div>`;
    h += '</div>';
    return h;
  }

  _renderTxSearch(data) {
    let h = '<div class="txe-search">';
    h += '<input class="txe-input" id="txe-hash-input" placeholder="Enter TX hash (0x...)" value="' + escapeHtml(this._txHash) + '">';
    h += '<button class="txe-btn" id="txe-search-btn">Search</button>';
    h += '</div>';

    if (data.searchResult) {
      const r = data.searchResult;
      if (r.error) {
        h += `<div class="txe-detail" style="color:var(--text-muted)">Transaction not found</div>`;
      } else {
        const val = r.value ? (parseInt(r.value, 16) / 1e18).toFixed(6) : '0';
        const gasP = r.gasPrice ? (parseInt(r.gasPrice, 16) / 1e9).toFixed(2) : '—';
        const status = r._receipt?.status === '0x1' ? '<span class="val-up">Success</span>' : r._receipt?.status === '0x0' ? '<span class="val-down">Failed</span>' : 'Pending';
        const gasUsed = r._receipt?.gasUsed ? formatNumber(parseInt(r._receipt.gasUsed, 16)) : '—';
        h += '<div class="txe-detail">';
        h += `<div class="txe-row"><span class="txe-key">Status</span><span class="txe-value">${status}</span></div>`;
        h += `<div class="txe-row"><span class="txe-key">From</span><span class="txe-value txe-hash">${r.from || '—'}</span></div>`;
        h += `<div class="txe-row"><span class="txe-key">To</span><span class="txe-value txe-hash">${r.to || 'Contract Creation'}</span></div>`;
        h += `<div class="txe-row"><span class="txe-key">Value</span><span class="txe-value">${val} BNB</span></div>`;
        h += `<div class="txe-row"><span class="txe-key">Gas Price</span><span class="txe-value">${gasP} Gwei</span></div>`;
        h += `<div class="txe-row"><span class="txe-key">Gas Used</span><span class="txe-value">${gasUsed}</span></div>`;
        h += `<div class="txe-row"><span class="txe-key">Block</span><span class="txe-value">${r.blockNumber ? formatNumber(parseInt(r.blockNumber, 16)) : 'Pending'}</span></div>`;
        h += '</div>';
      }
    }
    return h;
  }

  _renderBalance(data) {
    let h = '<div class="txe-search">';
    h += '<input class="txe-input" id="txe-addr-input" placeholder="Enter BSC address (0x...)">';
    h += '<button class="txe-btn" id="txe-balance-btn">Check</button>';
    h += '</div>';
    h += '<div id="txe-balance-result"></div>';
    return h;
  }

  async _searchTx(hash) {
    if (!hash || hash.length !== 66) return;
    this._txHash = hash;
    try {
      const [txRes, receiptRes] = await Promise.allSettled([
        window.mefaiApi.bnbchain.tx(hash),
        window.mefaiApi.bnbchain.receipt(hash),
      ]);
      const tx = txRes.status === 'fulfilled' && txRes.value?.result ? txRes.value.result : null;
      if (tx) {
        const receipt = receiptRes.status === 'fulfilled' && receiptRes.value?.result ? receiptRes.value.result : null;
        if (receipt) tx._receipt = receipt;
        this._searchResult = tx;
      } else {
        this._searchResult = { error: true };
      }
    } catch {
      this._searchResult = { error: true };
    }
    const body = this.querySelector('.panel-body');
    if (body) {
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }
  }

  async _checkBalance(address) {
    if (!address || address.length !== 42) return;
    const resultDiv = this.querySelector('#txe-balance-result');
    if (!resultDiv) return;
    try {
      const res = await window.mefaiApi.bnbchain.balance(address);
      if (res?.result) {
        const bal = (parseInt(res.result, 16) / 1e18).toFixed(6);
        resultDiv.innerHTML = `<div class="txe-detail">
          <div class="txe-row"><span class="txe-key">Address</span><span class="txe-value txe-hash">${escapeHtml(address)}</span></div>
          <div class="txe-row"><span class="txe-key">BNB Balance</span><span class="txe-value" style="font-weight:700;color:var(--accent)">${bal} BNB</span></div>
        </div>`;
      } else {
        resultDiv.innerHTML = '<div class="txe-detail" style="color:var(--text-muted)">Unable to fetch balance</div>';
      }
    } catch {
      resultDiv.innerHTML = '<div class="txe-detail" style="color:var(--text-muted)">Error fetching balance</div>';
    }
  }

  afterRender(body) {
    body.querySelectorAll('.txe-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = tab.dataset.tab;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));

    const searchBtn = body.querySelector('#txe-search-btn');
    const hashInput = body.querySelector('#txe-hash-input');
    if (searchBtn && hashInput) {
      searchBtn.addEventListener('click', () => this._searchTx(hashInput.value.trim()));
      hashInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._searchTx(hashInput.value.trim()); });
    }

    const balBtn = body.querySelector('#txe-balance-btn');
    const addrInput = body.querySelector('#txe-addr-input');
    if (balBtn && addrInput) {
      balBtn.addEventListener('click', () => this._checkBalance(addrInput.value.trim()));
      addrInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._checkBalance(addrInput.value.trim()); });
    }
  }
}
customElements.define('tx-explorer-panel', TxExplorerPanel);
export default TxExplorerPanel;
