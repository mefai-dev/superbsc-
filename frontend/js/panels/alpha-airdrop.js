// MEFAI Alpha Airdrop Claimer — Token discovery + Binance Alpha program overview
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatAge, formatCurrency } = window.mefaiUtils;

export class AlphaAirdropPanel extends BasePanel {
  static skill = 'Skill 23';
  static defaultTitle = 'Alpha Airdrop';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._tab = 'discover';
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
        <button class="btn aa-tab${this._tab==='discover'?' active':''}" data-tab="discover">Discover</button>
        <button class="btn aa-tab${this._tab==='guide'?' active':''}" data-tab="guide">Claim Guide</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Loading Alpha tokens...</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.aa-tab').forEach(btn => btn.addEventListener('click', e => {
      this._tab = e.target.dataset.tab;
      this.querySelectorAll('.aa-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === this._tab));
      this.refresh();
    }));
  }

  async fetchData() {
    if (this._tab === 'guide') return { _guide: true };
    // Use DexScreener latest profiles + top boosts for token discovery
    const [profiles, boosts] = await Promise.all([
      window.mefaiApi.dex.latestProfiles(),
      window.mefaiApi.dex.topBoosts(),
    ]);
    return { profiles, boosts };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading Alpha tokens...</div>';
    if (data?._guide) return this._renderGuide();

    const profiles = Array.isArray(data.profiles) ? data.profiles.slice(0, 15) : [];
    const boosts = Array.isArray(data.boosts) ? data.boosts.slice(0, 10) : [];

    let h = '<style scoped>';
    h += '.aa-section{padding:6px 0;border-bottom:1px solid var(--border)}';
    h += '.aa-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 6px;letter-spacing:.5px}';
    h += '.aa-token{display:flex;align-items:center;gap:8px;padding:4px 0;font-size:11px}';
    h += '.aa-name{font-weight:600;min-width:60px}';
    h += '.aa-chain{font-size:8px;padding:1px 4px;border-radius:3px;background:var(--bg-secondary);color:var(--text-muted)}';
    h += '.aa-desc{color:var(--text-muted);flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}';
    h += '</style>';

    if (boosts.length) {
      h += '<div class="aa-section"><h4>Top Boosted Tokens</h4>';
      boosts.forEach(b => {
        const name = escapeHtml(b.tokenAddress?.slice(0, 8) || b.description || '');
        const chain = escapeHtml(b.chainId || '');
        const amount = b.amount || 0;
        h += `<div class="aa-token"><span class="aa-name">${name}</span><span class="aa-chain">${chain}</span><span style="color:#f0b90b">${amount} boosts</span></div>`;
      });
      h += '</div>';
    }

    if (profiles.length) {
      h += '<div class="aa-section"><h4>Latest Token Profiles</h4>';
      profiles.forEach(p => {
        const name = escapeHtml(p.name || p.symbol || '');
        const chain = escapeHtml(p.chainId || '');
        const desc = escapeHtml(p.description || '').slice(0, 60);
        h += `<div class="aa-token"><span class="aa-name">${name}</span><span class="aa-chain">${chain}</span><span class="aa-desc">${desc}</span></div>`;
      });
      h += '</div>';
    }

    if (!boosts.length && !profiles.length) {
      h += '<div class="panel-loading">No token data available</div>';
    }

    return h;
  }

  _renderGuide() {
    let h = '<style scoped>';
    h += '.aa-guide{padding:12px}';
    h += '.aa-guide-title{font-size:14px;font-weight:700;margin-bottom:8px;text-align:center}';
    h += '.aa-guide-desc{font-size:11px;color:var(--text-muted);margin-bottom:12px;text-align:center;line-height:1.5}';
    h += '.aa-step{display:flex;gap:8px;padding:6px 0;font-size:11px;align-items:flex-start}';
    h += '.aa-step-num{width:20px;height:20px;border-radius:50%;background:rgba(240,185,11,.15);color:#f0b90b;display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}';
    h += '.aa-overview{background:var(--bg-secondary);border-radius:6px;padding:10px;margin-top:12px}';
    h += '.aa-overview h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 6px}';
    h += '.aa-ov-item{font-size:11px;padding:3px 0;display:flex;justify-content:space-between}';
    h += '</style>';

    h += '<div class="aa-guide">';
    h += '<div class="aa-guide-title">Binance Alpha Airdrop Program</div>';
    h += '<div class="aa-guide-desc">Early access to promising tokens via Binance Alpha. Complete tasks to earn token airdrops.</div>';

    const steps = [
      'Check Binance Alpha section for eligible tokens',
      'Complete required trading volume or holding period',
      'Verify eligibility through Binance wallet',
      'Claim airdrop when distribution window opens',
      'Monitor vesting schedule for locked tokens',
    ];
    steps.forEach((s, i) => { h += `<div class="aa-step"><span class="aa-step-num">${i+1}</span><span>${s}</span></div>`; });

    h += '<div class="aa-overview"><h4>Program Overview</h4>';
    h += '<div class="aa-ov-item"><span>Distribution</span><span>Token airdrops</span></div>';
    h += '<div class="aa-ov-item"><span>Eligibility</span><span>Volume + Holding</span></div>';
    h += '<div class="aa-ov-item"><span>Frequency</span><span>Weekly batches</span></div>';
    h += '<div class="aa-ov-item"><span>Chains</span><span>BNB Chain, ETH, SOL</span></div>';
    h += '</div></div>';

    return h;
  }
}
customElements.define('alpha-airdrop-panel', AlphaAirdropPanel);
export default AlphaAirdropPanel;
