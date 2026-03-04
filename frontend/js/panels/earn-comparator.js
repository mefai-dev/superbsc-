// MEFAI Earn Product Comparator — Binance Simple Earn (auth required)
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

export class EarnComparatorPanel extends BasePanel {
  static skill = 'Skill 17';
  static defaultTitle = 'Earn Comparator';

  constructor() {
    super();
    this._refreshRate = 0;
    this._tab = 'flexible';
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
        <button class="btn earn-tab${this._tab==='flexible'?' active':''}" data-tab="flexible">Flexible</button>
        <button class="btn earn-tab${this._tab==='locked'?' active':''}" data-tab="locked">Locked</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Loading earn products...</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.earn-tab').forEach(btn => btn.addEventListener('click', e => {
      this._tab = e.target.dataset.tab;
      this.querySelectorAll('.earn-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === this._tab));
      this.refresh();
    }));
  }

  async fetchData() {
    try {
      const res = this._tab === 'flexible'
        ? await window.mefaiApi.earn.flexibleList()
        : await window.mefaiApi.earn.lockedList();
      if (!res || res?.error || res?.status === 403 || res?.detail) return { _authRequired: true };
      return res;
    } catch (e) {
      return { _authRequired: true };
    }
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading earn products...</div>';
    if (data?._authRequired || data?._fetchError || data?.detail) return this._renderAuthCard();

    const rows = data?.rows || [];
    if (!rows.length) return this._renderAuthCard();

    let h = '<style scoped>';
    h += '.earn-row{display:grid;grid-template-columns:60px 70px 60px 60px 1fr;gap:4px;padding:5px 0;border-bottom:1px solid var(--border);font-size:11px;align-items:center}';
    h += '.earn-hdr{font-size:9px;color:var(--text-muted);text-transform:uppercase;font-weight:600}';
    h += '.earn-apy{font-weight:700;color:#0ecb81}';
    h += '</style>';

    h += '<div class="earn-row earn-hdr"><span>Asset</span><span>Type</span><span>APY</span><span>Duration</span><span>Min</span></div>';

    rows.slice(0, 30).forEach(p => {
      const asset = escapeHtml(p.asset || '');
      const apy = parseFloat(p.latestAnnualPercentageRate || p.annualPercentageRate || 0) * 100;
      const duration = p.duration ? p.duration + 'd' : 'Flex';
      const minAmt = p.minPurchaseAmount || '—';
      h += `<div class="earn-row"><span style="font-weight:600">${asset}</span><span>${this._tab}</span><span class="earn-apy">${apy.toFixed(2)}%</span><span>${duration}</span><span>${minAmt}</span></div>`;
    });

    return h;
  }

  _renderAuthCard() {
    let h = '<style scoped>';
    h += '.earn-auth{text-align:center;padding:20px}';
    h += '.earn-auth-icon{font-size:36px;margin-bottom:8px}';
    h += '.earn-auth-title{font-size:14px;font-weight:700;margin-bottom:6px}';
    h += '.earn-auth-desc{font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.5}';
    h += '.earn-preview{background:var(--bg-secondary);border-radius:6px;padding:12px;margin-top:12px;text-align:left}';
    h += '.earn-preview h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 8px}';
    h += '.earn-preview-item{font-size:11px;padding:3px 0;display:flex;justify-content:space-between}';
    h += '</style>';

    h += '<div class="earn-auth">';
    h += '<div class="earn-auth-icon">&#128274;</div>';
    h += '<div class="earn-auth-title">Configure Binance API Key</div>';
    h += '<div class="earn-auth-desc">This skill requires a Binance API key with read-only permissions to access Simple Earn product data.</div>';
    h += '<div class="earn-preview"><h4>Feature Preview</h4>';
    h += '<div class="earn-preview-item"><span>Flexible Savings APY</span><span style="color:#0ecb81">Up to 5%+</span></div>';
    h += '<div class="earn-preview-item"><span>Locked Staking APY</span><span style="color:#0ecb81">Up to 15%+</span></div>';
    h += '<div class="earn-preview-item"><span>Side-by-side Comparison</span><span>Flex vs Locked</span></div>';
    h += '<div class="earn-preview-item"><span>Auto-sort by APY</span><span>Highest first</span></div>';
    h += '</div></div>';

    return h;
  }
}
customElements.define('earn-comparator-panel', EarnComparatorPanel);
export default EarnComparatorPanel;
