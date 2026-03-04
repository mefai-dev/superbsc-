// MEFAI GoPlus Security Scanner — Third-party token security analysis
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

export class GoplusScannerPanel extends BasePanel {
  static skill = 'Skill 14';
  static defaultTitle = 'GoPlus Security';

  constructor() {
    super();
    this._refreshRate = 0; // manual refresh only
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
        const addrInput = this.querySelector('.gp-address');
        const chainSelect = this.querySelector('.gp-chain');
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
        <input type="text" class="gp-address form-input" placeholder="${_t('audit.placeholder')}" value="${escapeHtml(this._address)}" style="flex:1">
        <select class="gp-chain form-select">
          <option value="56"${this._chain === '56' ? ' selected' : ''}>BSC</option>
          <option value="1"${this._chain === '1' ? ' selected' : ''}>ETH</option>
          <option value="solana"${this._chain === 'solana' ? ' selected' : ''}>SOL</option>
          <option value="8453"${this._chain === '8453' ? ' selected' : ''}>BASE</option>
          <option value="42161"${this._chain === '42161' ? ' selected' : ''}>ARB</option>
          <option value="43114"${this._chain === '43114' ? ' selected' : ''}>AVAX</option>
          <option value="137"${this._chain === '137' ? ' selected' : ''}>MATIC</option>
        </select>
        <button class="btn gp-scan-btn">${_t('gp.scan')}</button>
      </div>
      <div class="panel-body">
        <div class="panel-loading">${_t('gp.enterAddress')}</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.gp-scan-btn')?.addEventListener('click', () => {
      this._address = this.querySelector('.gp-address')?.value?.trim() || '';
      this._chain = this.querySelector('.gp-chain')?.value || '56';
      if (this._address) this.refresh();
    });
    this.querySelector('.gp-address')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._address = e.target.value.trim();
        this._chain = this.querySelector('.gp-chain')?.value || '56';
        if (this._address) this.refresh();
      }
    });
  }

  async fetchData() {
    if (!this._address) return null;
    const res = await window.mefaiApi.goplus.tokenSecurity(this._address, this._chain);
    if (!res || res?.error) return { _fetchError: true };
    // GoPlus returns { code: 1, result: { "0x...": {...} } }
    const result = res?.result || {};
    const tokenData = Object.values(result)[0] || null;
    return tokenData;
  }

  renderContent(data) {
    if (!data) return `<div class="panel-loading">${_t('gp.enterAddress')}</div>`;
    if (data?._fetchError) return `<div class="panel-loading">${_t('gp.error')}</div>`;

    // Compute safety score (0-100)
    let score = 100;
    const risks = [];
    const warnings = [];
    const passes = [];

    // Critical risks (-30 each)
    if (data.is_honeypot === '1') { score -= 30; risks.push('Honeypot detected'); }
    if (data.is_blacklisted === '1') { score -= 30; risks.push('Blacklisted'); }
    if (data.is_proxy === '1') { score -= 20; risks.push('Proxy contract (upgradeable)'); }
    if (data.cannot_sell_all === '1') { score -= 25; risks.push('Cannot sell all tokens'); }
    if (data.trading_cooldown === '1') { score -= 15; risks.push('Trading cooldown enabled'); }
    if (data.hidden_owner === '1') { score -= 15; risks.push('Hidden owner'); }

    // Warnings (-5 to -10 each)
    if (data.is_mintable === '1') { score -= 10; warnings.push('Mintable'); }
    if (data.can_take_back_ownership === '1') { score -= 10; warnings.push('Can take back ownership'); }
    if (data.owner_change_balance === '1') { score -= 10; warnings.push('Owner can change balance'); }
    if (data.external_call === '1') { score -= 5; warnings.push('External call risk'); }
    if (data.selfdestruct === '1') { score -= 15; warnings.push('Self-destruct function'); }

    // Tax check
    const buyTax = parseFloat(data.buy_tax || 0) * 100;
    const sellTax = parseFloat(data.sell_tax || 0) * 100;
    if (buyTax > 10) { score -= 10; warnings.push(`High buy tax: ${buyTax.toFixed(1)}%`); }
    if (sellTax > 10) { score -= 10; warnings.push(`High sell tax: ${sellTax.toFixed(1)}%`); }

    // Positive signals
    if (data.is_open_source === '1') passes.push('Open source');
    if (data.is_in_dex === '1') passes.push('Listed on DEX');
    if (data.is_anti_whale === '1') passes.push('Anti-whale protection');

    score = Math.max(0, Math.min(100, score));

    // Render
    const scoreCls = score >= 80 ? 'val-up' : score >= 50 ? '' : 'val-down';
    const scoreColor = score >= 80 ? '#0ecb81' : score >= 50 ? '#f0b90b' : '#f6465d';
    const scoreLabel = score >= 80 ? 'SAFE' : score >= 50 ? 'CAUTION' : 'DANGER';

    let h = '<style scoped>';
    h += `.gp-score{text-align:center;padding:12px 0}`;
    h += `.gp-score-ring{width:60px;height:60px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:22px;font-weight:700;margin-bottom:4px}`;
    h += `.gp-section{padding:6px 0;border-bottom:1px solid var(--border)}`;
    h += `.gp-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 4px;letter-spacing:.5px}`;
    h += `.gp-item{font-size:11px;padding:2px 0;display:flex;align-items:center;gap:6px}`;
    h += `.gp-badge{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;min-width:36px;text-align:center;display:inline-block}`;
    h += `.gp-risk{background:rgba(246,70,93,.15);color:#f6465d}`;
    h += `.gp-warn{background:rgba(240,185,11,.15);color:#f0b90b}`;
    h += `.gp-pass{background:rgba(14,203,129,.15);color:#0ecb81}`;
    h += `.gp-taxes{display:flex;gap:12px;justify-content:center;margin:8px 0}`;
    h += `.gp-tax{text-align:center}`;
    h += `.gp-tax-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}`;
    h += `.gp-tax-value{font-size:14px;font-weight:700}`;
    h += '</style>';

    // Score circle
    h += '<div class="gp-score">';
    h += `<div class="gp-score-ring" style="border:3px solid ${scoreColor};color:${scoreColor}">${score}</div>`;
    h += `<div style="font-size:11px;font-weight:700;color:${scoreColor}">${scoreLabel}</div>`;
    h += `<div style="font-size:9px;color:var(--text-muted)">${_t('gp.safetyScore')}</div>`;
    h += '</div>';

    // Taxes
    h += '<div class="gp-taxes">';
    h += `<div class="gp-tax"><div class="gp-tax-label">${_t('audit.buyTax')}</div><div class="gp-tax-value ${buyTax > 10 ? 'val-down' : ''}">${buyTax.toFixed(1)}%</div></div>`;
    h += `<div class="gp-tax"><div class="gp-tax-label">${_t('audit.sellTax')}</div><div class="gp-tax-value ${sellTax > 10 ? 'val-down' : ''}">${sellTax.toFixed(1)}%</div></div>`;
    h += '</div>';

    // Risks
    if (risks.length) {
      h += '<div class="gp-section"><h4>Risks (' + risks.length + ')</h4>';
      risks.forEach(r => {
        h += `<div class="gp-item"><span class="gp-badge gp-risk">RISK</span>${escapeHtml(r)}</div>`;
      });
      h += '</div>';
    }

    // Warnings
    if (warnings.length) {
      h += '<div class="gp-section"><h4>Warnings (' + warnings.length + ')</h4>';
      warnings.forEach(w => {
        h += `<div class="gp-item"><span class="gp-badge gp-warn">WARN</span>${escapeHtml(w)}</div>`;
      });
      h += '</div>';
    }

    // Passes
    if (passes.length) {
      h += '<div class="gp-section"><h4>Passed (' + passes.length + ')</h4>';
      passes.forEach(p => {
        h += `<div class="gp-item"><span class="gp-badge gp-pass">PASS</span>${escapeHtml(p)}</div>`;
      });
      h += '</div>';
    }

    // Token info
    const holders = parseInt(data.holder_count || 0);
    const lpHolders = parseInt(data.lp_holder_count || 0);
    if (holders || lpHolders) {
      h += '<div class="gp-section"><h4>Token Info</h4>';
      h += `<div class="gp-item"><span style="color:var(--text-muted);min-width:80px">${_t('col.holders')}</span>${holders.toLocaleString()}</div>`;
      h += `<div class="gp-item"><span style="color:var(--text-muted);min-width:80px">LP Holders</span>${lpHolders.toLocaleString()}</div>`;
      if (data.token_name) h += `<div class="gp-item"><span style="color:var(--text-muted);min-width:80px">Name</span>${escapeHtml(data.token_name)}</div>`;
      if (data.token_symbol) h += `<div class="gp-item"><span style="color:var(--text-muted);min-width:80px">Symbol</span>${escapeHtml(data.token_symbol)}</div>`;
      h += '</div>';
    }

    return h;
  }
}
customElements.define('goplus-scanner-panel', GoplusScannerPanel);
export default GoplusScannerPanel;
