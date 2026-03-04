// MEFAI Contract Mutation Monitor — Proxy detection + Trust Decay Score
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

const DANGEROUS_SIGS = {
  'mint': 'CRITICAL', 'blacklist': 'CRITICAL', 'addBlacklist': 'CRITICAL',
  'setTax': 'HIGH', 'setFee': 'HIGH', 'updateFee': 'HIGH',
  'pause': 'HIGH', 'selfdestruct': 'CRITICAL',
  'upgradeTo': 'HIGH', 'upgradeToAndCall': 'HIGH',
  'setMaxTx': 'MEDIUM', 'setMaxWallet': 'MEDIUM',
  'excludeFromFee': 'MEDIUM', 'transferOwnership': 'MEDIUM',
};

export class ContractMutationPanel extends BasePanel {
  static skill = 'Skill 17';
  static defaultTitle = 'Contract Mutation';

  constructor() {
    super();
    this._refreshRate = 0;
    this._address = '';
    this._chain = '56';
    this._unsub = null;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    this._unsub = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.address) {
        this._address = token.address;
        this._chain = token.chain || '56';
        const addrInput = this.querySelector('.cm-address');
        const chainSelect = this.querySelector('.cm-chain');
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
        <input type="text" class="cm-address form-input" placeholder="${_t('audit.placeholder')}" value="${escapeHtml(this._address)}" style="flex:1">
        <select class="cm-chain form-select">
          <option value="56"${this._chain === '56' ? ' selected' : ''}>BSC</option>
          <option value="1"${this._chain === '1' ? ' selected' : ''}>ETH</option>
          <option value="8453"${this._chain === '8453' ? ' selected' : ''}>BASE</option>
          <option value="42161"${this._chain === '42161' ? ' selected' : ''}>ARB</option>
          <option value="137"${this._chain === '137' ? ' selected' : ''}>MATIC</option>
          <option value="43114"${this._chain === '43114' ? ' selected' : ''}>AVAX</option>
          <option value="10"${this._chain === '10' ? ' selected' : ''}>OP</option>
        </select>
        <button class="btn cm-scan-btn">${_t('gp.scan')}</button>
      </div>
      <div class="panel-body">
        <div class="panel-loading">${_t('gp.enterAddress')}</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.cm-scan-btn')?.addEventListener('click', () => {
      this._address = this.querySelector('.cm-address')?.value?.trim() || '';
      this._chain = this.querySelector('.cm-chain')?.value || '56';
      if (this._address) this.refresh();
    });
    this.querySelector('.cm-address')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._address = e.target.value.trim();
        this._chain = this.querySelector('.cm-chain')?.value || '56';
        if (this._address) this.refresh();
      }
    });
  }

  async fetchData() {
    if (!this._address) return null;

    // Fetch GoPlus + Etherscan in parallel
    const [gpRes, esRes] = await Promise.allSettled([
      window.mefaiApi.goplus.tokenSecurity(this._address, this._chain),
      window.mefaiApi.etherscan.sourceCode(this._address, this._chain),
    ]);

    const gp = gpRes.status === 'fulfilled' ? gpRes.value : null;
    const es = esRes.status === 'fulfilled' ? esRes.value : null;

    const gpData = gp?.result ? Object.values(gp.result)[0] || null : null;

    // Parse Etherscan response
    let esData = null;
    let abi = [];
    if (es?.status === '1' && es?.result?.[0]) {
      esData = es.result[0];
      try { abi = JSON.parse(esData.ABI || '[]'); } catch { abi = []; }
    }

    if (!gpData && !esData) return { _fetchError: true };
    return { gp: gpData, es: esData, abi };
  }

  _scanAbi(abi) {
    const findings = [];
    if (!Array.isArray(abi)) return findings;
    for (const item of abi) {
      if (item.type !== 'function') continue;
      const name = item.name || '';
      for (const [sig, level] of Object.entries(DANGEROUS_SIGS)) {
        if (name.toLowerCase().includes(sig.toLowerCase())) {
          findings.push({
            name,
            risk: level,
            inputs: (item.inputs || []).map(i => i.type).join(', '),
          });
          break;
        }
      }
    }
    return findings;
  }

  renderContent(data) {
    if (!data) return `<div class="panel-loading">${_t('gp.enterAddress')}</div>`;
    if (data?._fetchError) return `<div class="panel-loading">${_t('gp.error')}</div>`;

    const { gp, es, abi } = data;

    // Trust Decay Score (start at 100)
    let score = 100;
    const deductions = [];

    // From GoPlus
    if (gp?.is_proxy === '1') { score -= 15; deductions.push({ reason: 'Proxy (upgradeable)', pts: -15 }); }
    if (gp?.is_mintable === '1') { score -= 15; deductions.push({ reason: 'Mintable', pts: -15 }); }
    if (gp?.is_blacklisted === '1') { score -= 15; deductions.push({ reason: 'Blacklist function', pts: -15 }); }
    if (gp?.transfer_pausable === '1') { score -= 10; deductions.push({ reason: 'Pausable transfers', pts: -10 }); }
    if (gp?.selfdestruct === '1') { score -= 20; deductions.push({ reason: 'Self-destruct', pts: -20 }); }
    if (gp?.owner_change_balance === '1') { score -= 15; deductions.push({ reason: 'Owner can change balance', pts: -15 }); }
    if (gp?.can_take_back_ownership === '1') { score -= 10; deductions.push({ reason: 'Can reclaim ownership', pts: -10 }); }
    if (gp?.hidden_owner === '1') { score -= 10; deductions.push({ reason: 'Hidden owner', pts: -10 }); }
    if (gp?.external_call === '1') { score -= 5; deductions.push({ reason: 'External calls', pts: -5 }); }
    if (gp?.is_open_source === '0') { score -= 20; deductions.push({ reason: 'Source not verified', pts: -20 }); }
    if (gp?.slippage_modifiable === '1') { score -= 10; deductions.push({ reason: 'Slippage modifiable', pts: -10 }); }

    const buyTax = parseFloat(gp?.buy_tax || 0) * 100;
    const sellTax = parseFloat(gp?.sell_tax || 0) * 100;
    if (buyTax > 5) { score -= 5; deductions.push({ reason: `Buy tax ${buyTax.toFixed(1)}%`, pts: -5 }); }
    if (sellTax > 5) { score -= 5; deductions.push({ reason: `Sell tax ${sellTax.toFixed(1)}%`, pts: -5 }); }

    score = Math.max(0, score);

    // ABI scan
    const abiFindings = this._scanAbi(abi);

    // Proxy info from Etherscan
    const isProxy = es?.Proxy === '1';
    const implAddr = es?.Implementation || '';

    const scoreColor = score >= 80 ? '#0ecb81' : score >= 50 ? '#f0b90b' : score >= 20 ? '#f6465d' : '#ff0000';
    const tier = score >= 80 ? 'TRUSTED' : score >= 50 ? 'MODERATE' : score >= 20 ? 'RISKY' : 'DANGEROUS';

    let h = '<style scoped>';
    h += `.cm-score{text-align:center;padding:10px 0}`;
    h += `.cm-ring{width:58px;height:58px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin-bottom:3px}`;
    h += `.cm-section{padding:6px 0;border-bottom:1px solid var(--border)}`;
    h += `.cm-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 4px;letter-spacing:.5px}`;
    h += `.cm-row{font-size:11px;padding:2px 0;display:flex;justify-content:space-between;align-items:center}`;
    h += `.cm-badge{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;min-width:44px;text-align:center;display:inline-block}`;
    h += `.cm-critical{background:rgba(255,0,0,.15);color:#ff4444}`;
    h += `.cm-high{background:rgba(246,70,93,.15);color:#f6465d}`;
    h += `.cm-medium{background:rgba(240,185,11,.15);color:#f0b90b}`;
    h += `.cm-info{display:flex;gap:8px;justify-content:center;margin:6px 0;flex-wrap:wrap}`;
    h += `.cm-info-item{text-align:center;min-width:60px}`;
    h += `.cm-info-label{font-size:8px;color:var(--text-muted);text-transform:uppercase}`;
    h += `.cm-info-val{font-size:12px;font-weight:700}`;
    h += '.cm-proxy-tag{font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px}';
    h += '</style>';

    // Score ring
    h += '<div class="cm-score">';
    h += `<div class="cm-ring" style="border:3px solid ${scoreColor};color:${scoreColor}">${score}</div>`;
    h += `<div style="font-size:11px;font-weight:700;color:${scoreColor}">${tier}</div>`;
    h += `<div style="font-size:9px;color:var(--text-muted)">Trust Decay Score</div>`;
    h += '</div>';

    // Contract info
    h += '<div class="cm-info">';
    const proxyTag = (gp?.is_proxy === '1' || isProxy)
      ? '<span class="cm-proxy-tag" style="background:rgba(246,70,93,.15);color:#f6465d">PROXY</span>'
      : '<span class="cm-proxy-tag" style="background:rgba(14,203,129,.15);color:#0ecb81">IMMUTABLE</span>';
    h += `<div class="cm-info-item"><div class="cm-info-label">Contract</div><div class="cm-info-val">${proxyTag}</div></div>`;
    if (gp?.is_open_source === '1') {
      h += `<div class="cm-info-item"><div class="cm-info-label">Source</div><div class="cm-info-val" style="color:#0ecb81">Verified</div></div>`;
    } else {
      h += `<div class="cm-info-item"><div class="cm-info-label">Source</div><div class="cm-info-val" style="color:#f6465d">Unverified</div></div>`;
    }
    if (es?.ContractName) {
      h += `<div class="cm-info-item"><div class="cm-info-label">Name</div><div class="cm-info-val">${escapeHtml(es.ContractName)}</div></div>`;
    }
    h += '</div>';

    // Implementation address
    if (isProxy && implAddr) {
      h += '<div class="cm-section"><h4>Implementation</h4>';
      h += `<div class="cm-row"><span style="font-family:monospace;font-size:10px;word-break:break-all">${escapeHtml(implAddr)}</span></div>`;
      h += '</div>';
    }

    // ABI Dangerous Functions
    if (abiFindings.length) {
      h += '<div class="cm-section"><h4>Dangerous Functions (' + abiFindings.length + ')</h4>';
      abiFindings.forEach(f => {
        const cls = f.risk === 'CRITICAL' ? 'cm-critical' : f.risk === 'HIGH' ? 'cm-high' : 'cm-medium';
        h += `<div class="cm-row"><span>${escapeHtml(f.name)}(${escapeHtml(f.inputs)})</span><span class="cm-badge ${cls}">${f.risk}</span></div>`;
      });
      h += '</div>';
    }

    // Trust Deductions
    if (deductions.length) {
      h += '<div class="cm-section"><h4>Trust Deductions</h4>';
      deductions.forEach(d => {
        h += `<div class="cm-row"><span>${escapeHtml(d.reason)}</span><span style="color:#f6465d;font-weight:700">${d.pts}</span></div>`;
      });
      h += '</div>';
    }

    // Owner info
    if (gp?.owner_address) {
      h += '<div class="cm-section"><h4>Owner</h4>';
      const ownerShort = gp.owner_address.slice(0, 10) + '...' + gp.owner_address.slice(-6);
      h += `<div class="cm-row"><span style="font-family:monospace;font-size:10px">${escapeHtml(ownerShort)}</span></div>`;
      h += '</div>';
    }

    return h;
  }
}
customElements.define('contract-mutation-panel', ContractMutationPanel);
export default ContractMutationPanel;
