// MEFAI Multi-Chain Portfolio — Cross-chain wallet tracking
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatAddress, escapeHtml } = window.mefaiUtils;

const CHAINS = [
  { id: '56', name: 'BSC', color: '#f0b90b' },
  { id: '1', name: 'ETH', color: '#627eea' },
  { id: 'sol', name: 'SOL', color: '#9945ff' },
];

export class MultiChainWalletPanel extends BasePanel {
  static skill = 'Skill 15';
  static defaultTitle = 'Multi-Chain Wallet';

  constructor() {
    super();
    this._refreshRate = 0; // manual only
    this._address = '';
    this._unsub = null;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    this._unsub = window.mefaiStore?.subscribe('walletFocus', (w) => {
      if (w?.address) {
        this._address = w.address;
        const addrInput = this.querySelector('.mcw-address');
        if (addrInput) addrInput.value = this._address;
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
        <input type="text" class="mcw-address form-input" placeholder="${_t('common.walletAddress')}" value="${escapeHtml(this._address)}" style="flex:1">
        <button class="btn mcw-track-btn">${_t('btn.track')}</button>
      </div>
      <div class="panel-body">
        <div class="panel-loading">${_t('common.enterAddress')}</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.mcw-track-btn')?.addEventListener('click', () => {
      this._address = this.querySelector('.mcw-address')?.value?.trim() || '';
      if (this._address) this.refresh();
    });
    this.querySelector('.mcw-address')?.addEventListener('keydown', (e) => {
      if (e.key === 'Enter') {
        this._address = e.target.value.trim();
        if (this._address) this.refresh();
      }
    });
  }

  async fetchData() {
    if (!this._address) return null;

    // Fetch positions from all chains in parallel
    const results = await Promise.allSettled(
      CHAINS.map(chain =>
        window.mefaiApi.address.positions({
          address: this._address,
          chainId: chain.id,
        })
      )
    );

    const portfolio = [];
    let totalValue = 0;

    for (let i = 0; i < CHAINS.length; i++) {
      const chain = CHAINS[i];
      const res = results[i];
      if (res.status !== 'fulfilled' || res.value?.error || res.value?.code === '000002') continue;

      const positions = res.value?.data || [];
      if (!Array.isArray(positions)) continue;

      for (const pos of positions) {
        const value = parseFloat(pos.value || pos.tokenValue || 0);
        const amount = parseFloat(pos.amount || pos.tokenAmount || 0);
        const price = parseFloat(pos.price || pos.tokenPrice || 0);
        if (value <= 0 && amount <= 0) continue;

        totalValue += value;
        portfolio.push({
          chain: chain.name,
          chainColor: chain.color,
          symbol: pos.tokenSymbol || pos.symbol || '?',
          name: pos.tokenName || pos.name || '',
          amount,
          price,
          value,
          logo: pos.logo || pos.tokenLogo || '',
          address: pos.contractAddress || pos.tokenAddress || '',
        });
      }
    }

    // Sort by value descending
    portfolio.sort((a, b) => b.value - a.value);
    return { portfolio, totalValue };
  }

  renderContent(data) {
    if (!data) return `<div class="panel-loading">${_t('common.enterAddress')}</div>`;
    if (!data.portfolio?.length) return `<div class="panel-loading">${_t('msg.noPositions')}</div>`;

    const { portfolio, totalValue } = data;

    // Chain breakdown
    const chainTotals = {};
    for (const p of portfolio) {
      chainTotals[p.chain] = (chainTotals[p.chain] || 0) + p.value;
    }

    let h = '<style scoped>';
    h += `.mcw-summary{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}`;
    h += `.mcw-card{flex:1;min-width:70px;background:var(--panel-bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;text-align:center}`;
    h += `.mcw-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}`;
    h += `.mcw-card-value{font-size:13px;font-weight:700;margin-top:2px}`;
    h += `.mcw-chain-bar{display:flex;height:6px;border-radius:3px;overflow:hidden;margin-bottom:8px}`;
    h += `.mcw-chain-seg{height:100%;transition:width .3s}`;
    h += `.mcw-chain-badge{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;display:inline-block;color:#0b0e11}`;
    h += '</style>';

    // Total value + chain cards
    h += '<div class="mcw-summary">';
    h += `<div class="mcw-card"><div class="mcw-card-label">${_t('pnl.total')}</div><div class="mcw-card-value" style="color:var(--accent)">${formatCurrency(totalValue)}</div></div>`;
    for (const chain of CHAINS) {
      const val = chainTotals[chain.name] || 0;
      if (val <= 0) continue;
      h += `<div class="mcw-card"><div class="mcw-card-label" style="color:${chain.color}">${chain.name}</div><div class="mcw-card-value">${formatCurrency(val)}</div></div>`;
    }
    h += '</div>';

    // Chain distribution bar
    if (totalValue > 0) {
      h += '<div class="mcw-chain-bar">';
      for (const chain of CHAINS) {
        const pct = ((chainTotals[chain.name] || 0) / totalValue) * 100;
        if (pct > 0) {
          h += `<div class="mcw-chain-seg" style="width:${pct}%;background:${chain.color}" title="${chain.name}: ${pct.toFixed(1)}%"></div>`;
        }
      }
      h += '</div>';
    }

    // Token table
    h += '<table class="data-table"><thead><tr>';
    h += `<th>${_t('col.token')}</th>`;
    h += `<th>${_t('dex.chain')}</th>`;
    h += `<th>${_t('col.price')}</th>`;
    h += `<th>${_t('col.qty')}</th>`;
    h += `<th>${_t('col.value')}</th>`;
    h += '</tr></thead><tbody>';

    for (const p of portfolio.slice(0, 50)) {
      const iconUrl = window.mefaiUtils.tokenIcon(p.logo);
      const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const pctOfTotal = totalValue > 0 ? ((p.value / totalValue) * 100).toFixed(1) : '0';

      h += `<tr data-a="${p.address}" data-c="${p.chain}">`;
      h += `<td>${icon}<span style="font-weight:600">${escapeHtml(p.symbol)}</span></td>`;
      h += `<td><span class="mcw-chain-badge" style="background:${p.chainColor}">${p.chain}</span></td>`;
      h += `<td class="val-num">${p.price ? '$' + formatPrice(p.price) : '—'}</td>`;
      h += `<td class="val-num">${p.amount ? formatCurrency(p.amount).replace('$', '') : '—'}</td>`;
      h += `<td class="val-num">${formatCurrency(p.value)} <span style="color:var(--text-muted);font-size:9px">(${pctOfTotal}%)</span></td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('multi-chain-wallet-panel', MultiChainWalletPanel);
export default MultiChainWalletPanel;
