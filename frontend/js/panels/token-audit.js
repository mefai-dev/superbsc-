// MEFAI Token Audit Panel — audit.check() data
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, riskClass } = window.mefaiUtils;
const renderRiskBadge = window.mefaiRiskBadge;

export class TokenAuditPanel extends BasePanel {
  static skill = 'Skill 6';
  static defaultTitle = 'Token Audit';

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
    // Listen to focused token changes
    this._unsub = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.address) {
        this._address = token.address;
        this._chain = token.chain || '56';
        const addrInput = this.querySelector('.audit-address');
        const chainSelect = this.querySelector('.audit-chain');
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
        <input type="text" class="audit-address form-input" placeholder="Contract address" value="${escapeHtml(this._address)}" style="flex:1">
        <select class="audit-chain form-select">
          <option value="56"${this._chain === '56' ? ' selected' : ''}>BSC</option>
          <option value="1"${this._chain === '1' ? ' selected' : ''}>ETH</option>
          <option value="sol"${this._chain === 'sol' ? ' selected' : ''}>SOL</option>
          <option value="8453"${this._chain === '8453' ? ' selected' : ''}>BASE</option>
          <option value="42161"${this._chain === '42161' ? ' selected' : ''}>ARB</option>
        </select>
        <button class="btn audit-btn">Audit</button>
      </div>
      <div class="panel-body">
        <div class="panel-loading">Enter a contract address to audit</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.audit-btn')?.addEventListener('click', () => {
      this._address = this.querySelector('.audit-address')?.value?.trim() || '';
      this._chain = this.querySelector('.audit-chain')?.value || '56';
      if (this._address) this.refresh();
    });
    this.querySelector('.audit-address')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._address = e.target.value.trim();
        this._chain = this.querySelector('.audit-chain')?.value || '56';
        if (this._address) this.refresh();
      }
    });
  }

  async fetchData() {
    if (!this._address) return null;
    const res = await window.mefaiApi.audit.check({
      address: this._address,
      chain: this._chain,
    });
    if (!res || res?.error || res?.code === '000002') return { _fetchError: true };
    // audit.check() returns {code, data: {...}}
    return res?.data || res || null;
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Enter a contract address to audit</div>';
    if (data?._fetchError) return '<div class="panel-loading">Unable to audit token. Please try again.</div>';

    const risk = data.riskLevel ?? data.risk ?? 0;
    const hasResult = data.hasResult;
    const extra = data.extraInfo || {};
    const buyTax = extra.buyTax ?? null;
    const sellTax = extra.sellTax ?? null;
    const verified = extra.isVerified ?? null;
    const riskItems = data.riskItems || [];

    let html = `<div style="text-align:center;padding:16px 0">`;
    html += `<div style="font-size:24px;margin-bottom:8px">${renderRiskBadge(risk)}</div>`;
    html += `<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">Risk Level</div>`;
    if (hasResult === false) {
      html += `<div style="font-size:10px;color:var(--text-muted);margin-top:4px">No audit data available for this contract</div>`;
    }
    html += `</div>`;

    html += `<div class="profile-section">`;
    html += `<h3>Tax &amp; Fees</h3>`;
    html += `<div class="profile-grid">`;
    html += `<span class="profile-label">Buy Tax</span><span class="profile-value">${buyTax !== null ? buyTax + '%' : '--'}</span>`;
    html += `<span class="profile-label">Sell Tax</span><span class="profile-value">${sellTax !== null ? sellTax + '%' : '--'}</span>`;
    html += `</div></div>`;

    html += `<div class="profile-section">`;
    html += `<h3>Verification</h3>`;
    html += `<div class="profile-grid">`;
    html += `<span class="profile-label">Verified</span><span class="profile-value">${this._boolDisplay(verified)}</span>`;
    html += `</div></div>`;

    if (riskItems.length) {
      html += `<div class="profile-section">`;
      html += `<h3>Security Checks</h3>`;
      html += `<div style="font-size:11px">`;
      riskItems.forEach(cat => {
        const catName = cat.name || cat.id || 'Unknown';
        const details = cat.details || [];
        if (!details.length) return;
        const hits = details.filter(d => d.isHit);
        html += `<div style="padding:4px 0 2px;font-weight:700;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px">${escapeHtml(catName)} (${hits.length}/${details.length})</div>`;
        details.forEach(d => {
          const hit = d.isHit;
          const isRisk = d.riskType === 'RISK';
          let badge, cls;
          if (hit) {
            badge = isRisk ? 'RISK' : 'WARN';
            cls = isRisk ? 'risk-high' : 'risk-medium';
          } else {
            badge = 'PASS';
            cls = 'risk-low';
          }
          const title = d.title || 'Unknown';
          html += `<div style="padding:2px 0;border-bottom:1px solid var(--border);opacity:${hit ? 1 : 0.6}">`;
          html += `<span class="${cls}" style="font-weight:700;margin-right:6px;font-size:9px;padding:1px 4px;border:1px solid;display:inline-block;min-width:32px;text-align:center">${badge}</span>`;
          html += `${escapeHtml(title)}`;
          html += `</div>`;
        });
      });
      html += `</div></div>`;
    }

    return html;
  }

  _boolDisplay(val, invert = false) {
    if (val === null || val === undefined) return '<span style="color:var(--text-muted)">--</span>';
    const isTrue = val === true || val === 1 || val === '1' || val === 'true';
    if (invert) {
      return isTrue
        ? '<span style="color:var(--risk-high);font-weight:700">YES</span>'
        : '<span style="font-weight:700">NO</span>';
    }
    return isTrue
      ? '<span style="font-weight:700">YES</span>'
      : '<span style="color:var(--text-muted)">NO</span>';
  }
}

customElements.define('token-audit-panel', TokenAuditPanel);
export default TokenAuditPanel;
