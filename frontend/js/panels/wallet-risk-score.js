// MEFAI Wallet Risk Score — GoPlus address security analysis
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

const RISK_FLAGS = [
  { key: 'cybercrime', label: 'Cybercrime', weight: 15 },
  { key: 'money_laundering', label: 'Money Laundering', weight: 15 },
  { key: 'number_of_malicious_contracts_created', label: 'Malicious Contracts', weight: 12 },
  { key: 'financial_crime', label: 'Financial Crime', weight: 12 },
  { key: 'darkweb_transactions', label: 'Darkweb Activity', weight: 12 },
  { key: 'phishing_activities', label: 'Phishing', weight: 10 },
  { key: 'fake_kyc', label: 'Fake KYC', weight: 8 },
  { key: 'blacklist_doubt', label: 'Blacklist Suspected', weight: 8 },
  { key: 'stealing_attack', label: 'Stealing Attack', weight: 10 },
  { key: 'blackmail_activities', label: 'Blackmail', weight: 10 },
  { key: 'sanctioned', label: 'Sanctioned', weight: 15 },
  { key: 'malicious_mining_activities', label: 'Malicious Mining', weight: 8 },
  { key: 'mixer_usage', label: 'Mixer Usage', weight: 6 },
  { key: 'honeypot_related_address', label: 'Honeypot Related', weight: 10 },
  { key: 'fake_standard_interface', label: 'Fake Interface', weight: 6 },
  { key: 'gas_abuse', label: 'Gas Abuse', weight: 4 },
  { key: 'reinit', label: 'Re-initialization', weight: 5 },
  { key: 'contract_address', label: 'Is Contract', weight: 0 },
  { key: 'fake_token', label: 'Fake Token Creator', weight: 8 },
  { key: 'data_source', label: 'Source', weight: 0 },
];

export class WalletRiskScorePanel extends BasePanel {
  static skill = 'Skill 16';
  static defaultTitle = 'Wallet Risk Score';

  constructor() {
    super();
    this._refreshRate = 0;
    this._address = '';
    this._chain = '56';
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
        <input type="text" class="wr-address form-input" placeholder="Wallet address (0x...)" value="${escapeHtml(this._address)}" style="flex:1">
        <select class="wr-chain form-select">
          <option value="56"${this._chain==='56'?' selected':''}>BSC</option>
          <option value="1"${this._chain==='1'?' selected':''}>ETH</option>
          <option value="137"${this._chain==='137'?' selected':''}>MATIC</option>
          <option value="42161"${this._chain==='42161'?' selected':''}>ARB</option>
          <option value="8453"${this._chain==='8453'?' selected':''}>BASE</option>
        </select>
        <button class="btn wr-scan-btn">Scan</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Enter a wallet address to check risk</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.wr-scan-btn')?.addEventListener('click', () => this._doScan());
    this.querySelector('.wr-address')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._doScan(); });
  }

  _doScan() {
    this._address = this.querySelector('.wr-address')?.value?.trim() || '';
    this._chain = this.querySelector('.wr-chain')?.value || '56';
    if (this._address) this.refresh();
  }

  async fetchData() {
    if (!this._address) return null;
    const res = await window.mefaiApi.goplus.addressSecurity(this._address, this._chain);
    if (!res || res?.error) return { _fetchError: true };
    return res?.result || {};
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Enter a wallet address to check risk</div>';
    if (data?._fetchError) return '<div class="panel-loading">Unable to check address security</div>';

    let score = 100;
    const redFlags = [];
    const cleanFlags = [];

    RISK_FLAGS.forEach(f => {
      const val = data[f.key];
      if (val === '1' || (f.key === 'number_of_malicious_contracts_created' && parseInt(val) > 0)) {
        score -= f.weight;
        redFlags.push(f.label);
      } else if (f.weight > 0) {
        cleanFlags.push(f.label);
      }
    });

    score = Math.max(0, Math.min(100, score));

    const scoreColor = score >= 80 ? '#0ecb81' : score >= 50 ? '#f0b90b' : '#f6465d';
    const scoreLabel = score >= 80 ? 'LOW RISK' : score >= 50 ? 'MEDIUM RISK' : 'HIGH RISK';

    let h = '<style scoped>';
    h += '.wr-score{text-align:center;padding:16px 0}';
    h += '.wr-ring{width:72px;height:72px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:26px;font-weight:700;margin-bottom:6px}';
    h += '.wr-section{padding:6px 0;border-bottom:1px solid var(--border)}';
    h += '.wr-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 4px;letter-spacing:.5px}';
    h += '.wr-item{font-size:11px;padding:2px 0;display:flex;align-items:center;gap:6px}';
    h += '.wr-badge{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;min-width:36px;text-align:center;display:inline-block}';
    h += '.wr-red{background:rgba(246,70,93,.15);color:#f6465d}';
    h += '.wr-green{background:rgba(14,203,129,.15);color:#0ecb81}';
    h += '</style>';

    h += '<div class="wr-score">';
    h += `<div class="wr-ring" style="border:3px solid ${scoreColor};color:${scoreColor}">${score}</div>`;
    h += `<div style="font-size:12px;font-weight:700;color:${scoreColor}">${scoreLabel}</div>`;
    h += `<div style="font-size:9px;color:var(--text-muted)">Safety Score</div>`;
    h += '</div>';

    if (redFlags.length) {
      h += '<div class="wr-section"><h4>Risk Flags (' + redFlags.length + ')</h4>';
      redFlags.forEach(f => { h += `<div class="wr-item"><span class="wr-badge wr-red">RISK</span>${escapeHtml(f)}</div>`; });
      h += '</div>';
    }

    if (cleanFlags.length) {
      h += '<div class="wr-section"><h4>Clean (' + cleanFlags.length + ')</h4>';
      cleanFlags.forEach(f => { h += `<div class="wr-item"><span class="wr-badge wr-green">PASS</span>${escapeHtml(f)}</div>`; });
      h += '</div>';
    }

    return h;
  }
}
customElements.define('wallet-risk-score-panel', WalletRiskScorePanel);
export default WalletRiskScorePanel;
