// MEFAI Greenfield Explorer — BNB Greenfield Decentralized Storage Browser
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

export class GreenfieldExplorerPanel extends BasePanel {
  static skill = 'Skill 22';
  static defaultTitle = 'Greenfield Explorer';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._tab = 'overview';
    this._address = '';
    this._bucketData = null;
  }

  async fetchData() {
    let status = null;
    try {
      const res = await window.mefaiApi.bnbchain.greenfieldStatus();
      if (res && !res.error) status = res;
    } catch { /* Greenfield SP may not be reachable */ }

    return { status, bucketData: this._bucketData, address: this._address };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">No data</div>';

    let h = '<style scoped>';
    h += '.gf-tabs{display:flex;gap:4px;margin-bottom:8px}';
    h += '.gf-tab{padding:3px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase}';
    h += '.gf-tab.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.gf-cards{display:grid;grid-template-columns:repeat(2,1fr);gap:6px;margin-bottom:10px}';
    h += '.gf-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:10px;text-align:center}';
    h += '.gf-card-wide{grid-column:span 2}';
    h += '.gf-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.gf-val{font-size:16px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.gf-sub{font-size:9px;margin-top:2px;color:var(--text-muted)}';
    h += '.gf-search{display:flex;gap:4px;margin-bottom:10px}';
    h += '.gf-input{flex:1;background:var(--bg);border:1px solid var(--border);border-radius:4px;padding:6px 8px;font-size:11px;color:var(--text);font-family:inherit}';
    h += '.gf-btn{padding:6px 12px;background:var(--accent);color:#0b0e11;border:none;border-radius:4px;font-size:10px;font-weight:700;cursor:pointer;text-transform:uppercase}';
    h += '.gf-info{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:12px;font-size:11px;line-height:1.6}';
    h += '.gf-feature{display:flex;align-items:flex-start;gap:8px;padding:6px 0;border-bottom:1px solid var(--border)}';
    h += '.gf-feature:last-child{border-bottom:none}';
    h += '.gf-icon{font-size:14px;min-width:20px;text-align:center}';
    h += '.gf-feat-title{font-weight:700;font-size:11px;color:var(--text)}';
    h += '.gf-feat-desc{font-size:9px;color:var(--text-muted);margin-top:1px}';
    h += '.gf-badge{display:inline-block;padding:2px 6px;border-radius:3px;font-size:8px;font-weight:700;text-transform:uppercase}';
    h += '.gf-badge-active{background:rgba(0,200,83,.15);color:#00c853}';
    h += '.gf-badge-info{background:rgba(240,185,11,.15);color:#f0b90b}';
    h += '</style>';

    // Tabs
    h += '<div class="gf-tabs">';
    h += `<button class="gf-tab ${this._tab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>`;
    h += `<button class="gf-tab ${this._tab === 'browse' ? 'active' : ''}" data-tab="browse">Browse</button>`;
    h += `<button class="gf-tab ${this._tab === 'features' ? 'active' : ''}" data-tab="features">Features</button>`;
    h += '</div>';

    if (this._tab === 'overview') {
      h += this._renderOverview(data);
    } else if (this._tab === 'browse') {
      h += this._renderBrowse(data);
    } else {
      h += this._renderFeatures();
    }

    return h;
  }

  _renderOverview(data) {
    let h = '';

    // Status cards
    h += '<div class="gf-cards">';
    h += `<div class="gf-card"><div class="gf-label">Network</div><div class="gf-val">BNB Greenfield</div><div class="gf-sub">Decentralized Storage</div></div>`;

    if (data.status) {
      const version = data.status.node_info?.version || data.status.version || 'Active';
      h += `<div class="gf-card"><div class="gf-label">Status</div><div class="gf-val"><span class="gf-badge gf-badge-active">Online</span></div><div class="gf-sub">v${escapeHtml(String(version))}</div></div>`;
    } else {
      h += `<div class="gf-card"><div class="gf-label">Status</div><div class="gf-val"><span class="gf-badge gf-badge-info">Checking</span></div><div class="gf-sub">SP endpoint</div></div>`;
    }
    h += '</div>';

    // Info block
    h += '<div class="gf-info">';
    h += '<div style="font-weight:700;margin-bottom:6px;color:var(--accent)">BNB Greenfield</div>';
    h += '<div style="color:var(--text-muted);font-size:10px;margin-bottom:8px">Decentralized data storage infrastructure for the BNB ecosystem. Greenfield enables users and dApps to create, store, and manage data with full ownership while connecting seamlessly with BNB Smart Chain for DeFi operations.</div>';
    h += '<div class="gf-cards" style="margin-top:8px">';
    h += '<div class="gf-card"><div class="gf-label">Storage</div><div class="gf-val" style="font-size:12px">Decentralized</div><div class="gf-sub">Reed-Solomon EC</div></div>';
    h += '<div class="gf-card"><div class="gf-label">Consensus</div><div class="gf-val" style="font-size:12px">Tendermint</div><div class="gf-sub">PoS Validators</div></div>';
    h += '</div>';
    h += '</div>';
    return h;
  }

  _renderBrowse(data) {
    let h = '<div class="gf-search">';
    h += `<input class="gf-input" id="gf-addr" placeholder="Enter Greenfield account address (0x...)" value="${escapeHtml(this._address)}">`;
    h += '<button class="gf-btn" id="gf-browse-btn">Browse</button>';
    h += '</div>';

    if (this._bucketData) {
      if (this._bucketData.error) {
        h += '<div class="gf-info" style="text-align:center;color:var(--text-muted)">No buckets found for this address or SP not reachable</div>';
      } else if (Array.isArray(this._bucketData) && this._bucketData.length > 0) {
        h += '<div class="gf-info">';
        h += `<div style="font-weight:700;margin-bottom:6px">${this._bucketData.length} Bucket(s) Found</div>`;
        this._bucketData.forEach(b => {
          const name = b.bucket_info?.bucket_name || b.BucketName || b.name || 'Unknown';
          h += `<div class="gf-feature">`;
          h += `<div class="gf-icon">-</div>`;
          h += `<div><div class="gf-feat-title">${escapeHtml(String(name))}</div></div>`;
          h += '</div>';
        });
        h += '</div>';
      } else {
        h += '<div class="gf-info" style="text-align:center;color:var(--text-muted)">No buckets found for this address</div>';
      }
    } else {
      h += '<div class="gf-info" style="text-align:center;color:var(--text-muted)">Enter a Greenfield address to browse storage buckets</div>';
    }

    return h;
  }

  _renderFeatures() {
    const features = [
      { title: 'Decentralized Object Storage', desc: 'Store files, images, videos with full ownership. Data is erasure-coded across multiple SPs.' },
      { title: 'Cross-Chain Programmability', desc: 'Mirror storage objects to BSC smart contracts. Manage data via DeFi and dApps.' },
      { title: 'Permission & Access Control', desc: 'Fine-grained bucket/object permissions. Group-based access control for collaboration.' },
      { title: 'High Performance', desc: 'Fast data retrieval via Storage Provider network. Low-latency reads for dApp frontends.' },
      { title: 'Data Marketplace', desc: 'Monetize data by listing on-chain. Buy/sell datasets, models, and digital assets.' },
      { title: 'BNB Ecosystem Integration', desc: 'Tight integration with BSC, opBNB, and BNB Beacon Chain. Pay storage fees with BNB.' },
    ];

    let h = '<div class="gf-info">';
    features.forEach(f => {
      h += `<div class="gf-feature">`;
      h += `<div><div class="gf-feat-title">${f.title}</div><div class="gf-feat-desc">${f.desc}</div></div>`;
      h += '</div>';
    });
    h += '</div>';
    return h;
  }

  async _browseBuckets(address) {
    if (!address || address.length < 42) return;
    this._address = address;
    this._bucketData = null;

    const body = this.querySelector('.panel-body');
    if (body) {
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }

    try {
      const res = await window.mefaiApi.bnbchain.greenfieldBuckets(address);
      if (res && !res.error) {
        this._bucketData = Array.isArray(res) ? res : (res.buckets || res.GfSpGetUserBucketsResponse?.Buckets || []);
      } else {
        this._bucketData = { error: true };
      }
    } catch {
      this._bucketData = { error: true };
    }

    if (body) {
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }
  }

  afterRender(body) {
    body.querySelectorAll('.gf-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = tab.dataset.tab;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));

    const browseBtn = body.querySelector('#gf-browse-btn');
    const addrInput = body.querySelector('#gf-addr');
    if (browseBtn && addrInput) {
      browseBtn.addEventListener('click', () => this._browseBuckets(addrInput.value.trim()));
      addrInput.addEventListener('keydown', (e) => { if (e.key === 'Enter') this._browseBuckets(addrInput.value.trim()); });
    }
  }
}
customElements.define('greenfield-explorer-panel', GreenfieldExplorerPanel);
export default GreenfieldExplorerPanel;
