// MEFAI Token Launch Safety Scanner — DexScreener boosts + GoPlus security
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatPrice, escapeHtml } = window.mefaiUtils;

export class LaunchScannerPanel extends BasePanel {
  static skill = 'Skill 10';
  static defaultTitle = 'Launch Scanner';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sort = 'safetyScore';
    this._dir = 'desc';
  }

  async fetchData() {
    const boostsRes = await window.mefaiApi.dex.topBoosts();
    if (boostsRes?.error) return { tokens: [] };

    const raw = Array.isArray(boostsRes) ? boostsRes : (boostsRes?.data || []);
    // Deduplicate by tokenAddress (same token can appear multiple times)
    const seen = new Set();
    const boosts = raw.filter(t => {
      if (!t.tokenAddress || seen.has(t.tokenAddress)) return false;
      seen.add(t.tokenAddress);
      return true;
    });
    const top = boosts.slice(0, 12);

    // Batch GoPlus security checks for each token
    const securityResults = await Promise.allSettled(
      top.map(t => {
        if (!t.tokenAddress) return Promise.resolve(null);
        const chainMap = { ethereum: '1', bsc: '56', polygon: '137', arbitrum: '42161', base: '8453', solana: 'solana' };
        const chainId = chainMap[t.chainId] || '56';
        return window.mefaiApi.goplus.tokenSecurity(t.tokenAddress, chainId);
      })
    );

    const tokens = top.map((t, i) => {
      let safetyScore = 0;
      let risks = [];
      let name = t.description?.split(' ')?.[0] || '?';

      const secRes = securityResults[i];
      if (secRes?.status === 'fulfilled' && secRes.value && !secRes.value?.error) {
        const result = secRes.value?.result || secRes.value;
        const addr = t.tokenAddress?.toLowerCase();
        const info = result?.[addr] || Object.values(result || {})[0] || {};

        name = info.token_name || name;
        let score = 100;
        const flagChecks = [
          ['is_honeypot', 'Honeypot', 30],
          ['is_mintable', 'Mintable', 15],
          ['can_take_back_ownership', 'Ownership Risk', 15],
          ['is_proxy', 'Proxy Contract', 10],
          ['is_blacklisted', 'Blacklist', 10],
          ['external_call', 'External Call', 10],
          ['hidden_owner', 'Hidden Owner', 20],
          ['selfdestruct', 'Self Destruct', 20],
          ['transfer_pausable', 'Pausable', 10],
        ];
        for (const [key, label, penalty] of flagChecks) {
          if (info[key] === '1' || info[key] === 1) {
            score -= penalty;
            risks.push(label);
          }
        }
        const buyTax = parseFloat(info.buy_tax || 0) * 100;
        const sellTax = parseFloat(info.sell_tax || 0) * 100;
        if (buyTax > 10) { score -= 10; risks.push(`Buy Tax ${buyTax.toFixed(0)}%`); }
        if (sellTax > 10) { score -= 10; risks.push(`Sell Tax ${sellTax.toFixed(0)}%`); }
        safetyScore = Math.max(0, score);
      }

      return {
        name,
        symbol: t.tokenAddress ? (t.tokenAddress.slice(0, 6) + '...' + t.tokenAddress.slice(-4)) : '?',
        chain: (t.chainId || '').toUpperCase(),
        address: t.tokenAddress || '',
        amount: t.totalAmount || t.amount || 0,
        icon: t.icon || '',
        url: t.url || '',
        safetyScore,
        risks,
        riskLevel: safetyScore >= 70 ? 'low' : safetyScore >= 40 ? 'medium' : 'high',
      };
    });

    return { tokens };
  }

  renderContent(data) {
    if (!data?.tokens?.length) return '<div class="panel-loading">No boosted tokens found</div>';

    let h = '<style scoped>';
    h += '.ls-score{font-weight:700;font-size:12px}';
    h += '.ls-safe{color:var(--up)}.ls-caution{color:#f39c12}.ls-danger{color:var(--down)}';
    h += '.ls-risk{font-size:8px;padding:1px 4px;border-radius:3px;margin:1px 2px;display:inline-block}';
    h += '.ls-risk-high{background:rgba(246,70,93,0.12);color:var(--down)}';
    h += '.ls-risk-med{background:rgba(243,156,18,0.12);color:#f39c12}';
    h += '.ls-risk-low{background:rgba(14,203,129,0.12);color:var(--up)}';
    h += '.ls-chain{font-size:8px;padding:1px 4px;border-radius:3px;background:var(--border);color:var(--text-muted)}';
    h += '</style>';

    const sorted = [...data.tokens].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    h += '<table class="data-table"><thead><tr>';
    h += '<th>Token</th>';
    h += '<th>Chain</th>';
    h += `<th data-k="amount" style="text-align:right">Boost</th>`;
    h += `<th data-k="safetyScore" style="text-align:right">Safety</th>`;
    h += '<th>Risks</th>';
    h += '</tr></thead><tbody>';

    for (const t of sorted) {
      const scoreCls = t.riskLevel === 'low' ? 'ls-safe' : t.riskLevel === 'medium' ? 'ls-caution' : 'ls-danger';
      const riskCls = t.riskLevel === 'low' ? 'ls-risk-low' : t.riskLevel === 'medium' ? 'ls-risk-med' : 'ls-risk-high';
      const iconHtml = t.icon ? `<img src="${t.icon}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';

      h += `<tr data-a="${t.address}" data-c="${t.chain.toLowerCase()}">`;
      h += `<td>${iconHtml}<span style="font-weight:600">${escapeHtml(t.name)}</span><br><span style="font-size:9px;color:var(--text-muted)">${t.symbol}</span></td>`;
      h += `<td><span class="ls-chain">${escapeHtml(t.chain)}</span></td>`;
      h += `<td style="text-align:right">${t.amount || '—'}</td>`;
      h += `<td style="text-align:right"><span class="ls-score ${scoreCls}">${t.safetyScore}/100</span></td>`;
      h += `<td>${t.risks.length ? t.risks.slice(0, 3).map(r => `<span class="ls-risk ${riskCls}">${escapeHtml(r)}</span>`).join('') : '<span class="ls-risk ls-risk-low">CLEAN</span>'}</td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('launch-scanner-panel', LaunchScannerPanel);
export default LaunchScannerPanel;
