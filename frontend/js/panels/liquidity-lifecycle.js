// MEFAI Liquidity Lifecycle — LP lock status, holder concentration, DEX distribution
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, fmtUsd, fmtNum } = window.mefaiUtils;

export class LiquidityLifecyclePanel extends BasePanel {
  static skill = 'Skill 15';
  static defaultTitle = 'Liquidity Lifecycle';

  constructor() {
    super();
    this._refreshRate = 0;
    this._address = '';
    this._chain = '56';
    this._dexChain = 'bsc';
    this._unsub = null;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    this._unsub = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.address) {
        this._address = token.address;
        this._chain = token.chain || '56';
        this._dexChain = this._chainToDex(this._chain);
        const addrInput = this.querySelector('.ll-address');
        const chainSelect = this.querySelector('.ll-chain');
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

  _chainToDex(c) {
    const map = { '56': 'bsc', '1': 'ethereum', 'solana': 'solana', '8453': 'base', '42161': 'arbitrum', '137': 'polygon', '43114': 'avalanche' };
    return map[c] || 'bsc';
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
        <input type="text" class="ll-address form-input" placeholder="${_t('audit.placeholder')}" value="${escapeHtml(this._address)}" style="flex:1">
        <select class="ll-chain form-select">
          <option value="56"${this._chain === '56' ? ' selected' : ''}>BSC</option>
          <option value="1"${this._chain === '1' ? ' selected' : ''}>ETH</option>
          <option value="solana"${this._chain === 'solana' ? ' selected' : ''}>SOL</option>
          <option value="8453"${this._chain === '8453' ? ' selected' : ''}>BASE</option>
          <option value="42161"${this._chain === '42161' ? ' selected' : ''}>ARB</option>
          <option value="137"${this._chain === '137' ? ' selected' : ''}>MATIC</option>
        </select>
        <button class="btn ll-scan-btn">${_t('gp.scan')}</button>
      </div>
      <div class="panel-body">
        <div class="panel-loading">${_t('gp.enterAddress')}</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.ll-scan-btn')?.addEventListener('click', () => {
      this._address = this.querySelector('.ll-address')?.value?.trim() || '';
      this._chain = this.querySelector('.ll-chain')?.value || '56';
      this._dexChain = this._chainToDex(this._chain);
      if (this._address) this.refresh();
    });
    this.querySelector('.ll-address')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._address = e.target.value.trim();
        this._chain = this.querySelector('.ll-chain')?.value || '56';
        this._dexChain = this._chainToDex(this._chain);
        if (this._address) this.refresh();
      }
    });
  }

  async fetchData() {
    if (!this._address) return null;
    const [gpRes, dexRes] = await Promise.allSettled([
      window.mefaiApi.goplus.tokenSecurity(this._address, this._chain),
      window.mefaiApi.dex.tokenChain(this._dexChain, this._address),
    ]);

    const gp = gpRes.status === 'fulfilled' ? gpRes.value : null;
    const dex = dexRes.status === 'fulfilled' ? dexRes.value : null;

    // Extract GoPlus token data
    const gpData = gp?.result ? Object.values(gp.result)[0] || null : null;

    // Extract DexScreener pairs
    let pairs = [];
    if (Array.isArray(dex)) pairs = dex;
    else if (dex?.pairs) pairs = dex.pairs;

    if (!gpData && !pairs.length) return { _fetchError: true };
    return { gp: gpData, pairs };
  }

  renderContent(data) {
    if (!data) return `<div class="panel-loading">${_t('gp.enterAddress')}</div>`;
    if (data?._fetchError) return `<div class="panel-loading">${_t('gp.error')}</div>`;

    const { gp, pairs } = data;
    const lpHolders = gp?.lp_holders || [];
    const dexList = gp?.dex || [];

    // Calculate Liquidity Health Score
    let score = 0;

    // LP Lock (0-30 pts)
    const lockedPercent = lpHolders.reduce((s, h) => s + (h.is_locked === 1 ? parseFloat(h.percent || 0) : 0), 0);
    score += Math.min(30, Math.round(lockedPercent * 30));

    // LP Concentration (0-20 pts)
    const topLpPercent = lpHolders.length ? parseFloat(lpHolders[0]?.percent || 0) : 1;
    if (topLpPercent < 0.5) score += 20;
    else if (topLpPercent < 0.8) score += 10;

    // Liquidity Depth from DexScreener (0-20 pts)
    const totalLiq = pairs.reduce((s, p) => s + (p?.liquidity?.usd || 0), 0);
    if (totalLiq > 100000) score += 20;
    else if (totalLiq > 10000) score += 10;
    else if (totalLiq > 1000) score += 5;

    // Pair Age (0-15 pts)
    const oldestPair = pairs.reduce((oldest, p) => {
      const created = p?.pairCreatedAt || Date.now();
      return created < oldest ? created : oldest;
    }, Date.now());
    const ageDays = (Date.now() - oldestPair) / 86400000;
    if (ageDays > 30) score += 15;
    else if (ageDays > 7) score += 10;
    else if (ageDays > 1) score += 5;

    // Holder Count (0-15 pts)
    const holderCount = parseInt(gp?.holder_count || 0);
    if (holderCount > 1000) score += 15;
    else if (holderCount > 100) score += 10;
    else if (holderCount > 10) score += 5;

    score = Math.min(100, score);
    const scoreColor = score >= 80 ? '#0ecb81' : score >= 50 ? '#f0b90b' : '#f6465d';
    const scoreLabel = score >= 80 ? 'SAFE' : score >= 50 ? 'CAUTION' : 'DANGER';

    let h = '<style scoped>';
    h += `.ll-score{text-align:center;padding:10px 0}`;
    h += `.ll-ring{width:54px;height:54px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center;font-size:20px;font-weight:700;margin-bottom:3px}`;
    h += `.ll-section{padding:6px 0;border-bottom:1px solid var(--border)}`;
    h += `.ll-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 4px;letter-spacing:.5px}`;
    h += `.ll-row{font-size:11px;padding:2px 0;display:flex;justify-content:space-between;align-items:center}`;
    h += `.ll-bar{height:6px;border-radius:3px;margin-top:4px}`;
    h += `.ll-bar-fill{height:100%;border-radius:3px}`;
    h += `.ll-badge{font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px}`;
    h += `.ll-locked{background:rgba(14,203,129,.15);color:#0ecb81}`;
    h += `.ll-unlocked{background:rgba(246,70,93,.15);color:#f6465d}`;
    h += `.ll-stats{display:flex;gap:8px;justify-content:center;margin:6px 0;flex-wrap:wrap}`;
    h += `.ll-stat{text-align:center;min-width:60px}`;
    h += `.ll-stat-label{font-size:8px;color:var(--text-muted);text-transform:uppercase}`;
    h += `.ll-stat-val{font-size:13px;font-weight:700}`;
    h += '</style>';

    // Score ring
    h += '<div class="ll-score">';
    h += `<div class="ll-ring" style="border:3px solid ${scoreColor};color:${scoreColor}">${score}</div>`;
    h += `<div style="font-size:11px;font-weight:700;color:${scoreColor}">${scoreLabel}</div>`;
    h += `<div style="font-size:9px;color:var(--text-muted)">Liquidity Health</div>`;
    h += '</div>';

    // Summary stats
    h += '<div class="ll-stats">';
    h += `<div class="ll-stat"><div class="ll-stat-label">Locked</div><div class="ll-stat-val" style="color:${lockedPercent > 0.5 ? '#0ecb81' : '#f6465d'}">${(lockedPercent * 100).toFixed(1)}%</div></div>`;
    h += `<div class="ll-stat"><div class="ll-stat-label">Liquidity</div><div class="ll-stat-val">${fmtUsd(totalLiq)}</div></div>`;
    h += `<div class="ll-stat"><div class="ll-stat-label">Holders</div><div class="ll-stat-val">${fmtNum(holderCount)}</div></div>`;
    h += `<div class="ll-stat"><div class="ll-stat-label">Age</div><div class="ll-stat-val">${ageDays >= 1 ? Math.floor(ageDays) + 'd' : '<1d'}</div></div>`;
    h += '</div>';

    // Lock bar
    h += '<div class="ll-section">';
    h += '<h4>LP Lock Status</h4>';
    h += `<div class="ll-bar" style="background:rgba(246,70,93,.2)"><div class="ll-bar-fill" style="width:${(lockedPercent * 100).toFixed(1)}%;background:#0ecb81"></div></div>`;
    h += '</div>';

    // Top LP Holders
    if (lpHolders.length) {
      h += '<div class="ll-section"><h4>Top LP Holders</h4>';
      lpHolders.slice(0, 5).forEach(lp => {
        const pct = (parseFloat(lp.percent || 0) * 100).toFixed(1);
        const addr = lp.address || '';
        const short = addr.slice(0, 6) + '...' + addr.slice(-4);
        const lockBadge = lp.is_locked === 1
          ? '<span class="ll-badge ll-locked">LOCKED</span>'
          : '<span class="ll-badge ll-unlocked">UNLOCKED</span>';
        const typeBadge = lp.is_contract === 1 ? ' <span style="color:var(--text-muted);font-size:8px">CONTRACT</span>' : '';
        h += `<div class="ll-row"><span>${escapeHtml(short)}${typeBadge}</span><span>${pct}% ${lockBadge}</span></div>`;
      });
      h += '</div>';
    }

    // DEX Distribution (from GoPlus)
    if (dexList.length) {
      h += '<div class="ll-section"><h4>DEX Distribution</h4>';
      dexList.slice(0, 5).forEach(d => {
        h += `<div class="ll-row"><span>${escapeHtml(d.name || 'Unknown')}</span><span>${fmtUsd(parseFloat(d.liquidity || 0))}</span></div>`;
      });
      h += '</div>';
    }

    // DexScreener Pairs
    if (pairs.length) {
      h += `<div class="ll-section"><h4>Trading Pairs (${pairs.length})</h4>`;
      pairs.slice(0, 5).forEach(p => {
        const vol = p?.volume?.h24 || 0;
        const liq = p?.liquidity?.usd || 0;
        const label = `${p?.baseToken?.symbol || '?'}/${p?.quoteToken?.symbol || '?'}`;
        h += `<div class="ll-row"><span>${escapeHtml(label)}</span><span>L:${fmtUsd(liq)} V:${fmtUsd(vol)}</span></div>`;
      });
      h += '</div>';
    }

    // Rug warnings
    const rugFlags = [];
    if (gp?.is_honeypot === '1') rugFlags.push('Honeypot detected');
    if (gp?.owner_change_balance === '1') rugFlags.push('Owner can change balances');
    if (gp?.can_take_back_ownership === '1') rugFlags.push('Can reclaim ownership');
    if (gp?.hidden_owner === '1') rugFlags.push('Hidden owner');
    const buyTax = parseFloat(gp?.buy_tax || 0) * 100;
    const sellTax = parseFloat(gp?.sell_tax || 0) * 100;
    if (buyTax > 10) rugFlags.push(`Buy tax: ${buyTax.toFixed(1)}%`);
    if (sellTax > 10) rugFlags.push(`Sell tax: ${sellTax.toFixed(1)}%`);

    if (rugFlags.length) {
      h += '<div class="ll-section"><h4>Rug Warnings</h4>';
      rugFlags.forEach(f => {
        h += `<div class="ll-row" style="color:#f6465d"><span>${escapeHtml(f)}</span></div>`;
      });
      h += '</div>';
    }

    return h;
  }
}
customElements.define('liquidity-lifecycle-panel', LiquidityLifecyclePanel);
export default LiquidityLifecyclePanel;
