// MEFAI Token Scout — New BSC token discovery via DexScreener + GoPlus (PR #2)
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, escapeHtml } = window.mefaiUtils;

export class TokenScoutPanel extends BasePanel {
  static skill = 'Skill 8.5';
  static defaultTitle = 'Token Scout';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sort = 'liquidity';
    this._dir = 'desc';
  }

  _apiBase() {
    const base = document.baseURI || window.location.href;
    return new URL('.', base).href.replace(/\/$/, '');
  }

  async fetchData() {
    // Fetch latest token profiles from DexScreener
    const res = await fetch(this._apiBase() + '/api/dex/latest-profiles').then(r => r.json());
    if (!Array.isArray(res)) return [];

    // Filter BSC tokens and parse
    const tokens = [];
    const seen = new Set();

    for (const t of res) {
      if (!t.chainId || t.chainId !== 'bsc') continue;
      if (seen.has(t.tokenAddress)) continue;
      seen.add(t.tokenAddress);

      tokens.push({
        symbol: t.header || t.description?.split(' ')[0] || '???',
        address: t.tokenAddress || '',
        icon: t.icon || '',
        url: t.url || '',
        chain: 'BSC',
        // Will be enriched from pair data if available
        price: 0,
        liquidity: 0,
        volume24h: 0,
        change1h: 0,
        change24h: 0,
        pairCount: 0,
        riskScore: -1,
      });
    }

    // Enrich top tokens with pair data (batch — only first 10 to avoid rate limits)
    const enrichPromises = tokens.slice(0, 15).map(async (tok) => {
      try {
        const pairRes = await fetch(this._apiBase() + '/api/dex/token?address=' + tok.address).then(r => r.json());
        const pairs = pairRes?.pairs || [];
        if (pairs.length > 0) {
          // Use the pair with highest liquidity
          const best = pairs.sort((a, b) => (parseFloat(b.liquidity?.usd) || 0) - (parseFloat(a.liquidity?.usd) || 0))[0];
          tok.price = parseFloat(best.priceUsd || 0);
          tok.liquidity = parseFloat(best.liquidity?.usd || 0);
          tok.volume24h = parseFloat(best.volume?.h24 || 0);
          tok.change1h = parseFloat(best.priceChange?.h1 || 0);
          tok.change24h = parseFloat(best.priceChange?.h24 || 0);
          tok.pairCount = pairs.length;
          tok.symbol = best.baseToken?.symbol || tok.symbol;
        }
      } catch (e) { /* skip enrichment on error */ }
      return tok;
    });

    await Promise.allSettled(enrichPromises);

    // Filter out tokens with no liquidity data
    return tokens.filter(t => t.liquidity > 0);
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('scout.noTokens')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    let h = '<style scoped>';
    h += `.scout-new{display:inline-block;font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;background:#f0b90b;color:#0b0e11;margin-left:4px}`;
    h += '</style>';

    h += '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="price">${_t('col.price')}</th>`;
    h += `<th data-k="liquidity">${_t('col.liquidity')}</th>`;
    h += `<th data-k="volume24h">${_t('col.volume')}</th>`;
    h += `<th data-k="change1h">${_t('col.change1h')}</th>`;
    h += `<th data-k="change24h">${_t('col.change24h')}</th>`;
    h += '</tr></thead><tbody>';

    for (const t of sorted) {
      const iconImg = t.icon ? `<img src="${t.icon}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const cls1 = t.change1h >= 0 ? 'val-up' : 'val-down';
      const cls24 = t.change24h >= 0 ? 'val-up' : 'val-down';

      h += `<tr data-a="${t.address}">`;
      h += `<td>${iconImg}<span style="font-weight:600">${escapeHtml(t.symbol)}</span><span class="scout-new">NEW</span></td>`;
      h += `<td class="val-num">$${formatPrice(t.price)}</td>`;
      h += `<td class="val-num">${formatCurrency(t.liquidity)}</td>`;
      h += `<td class="val-num">${formatCurrency(t.volume24h)}</td>`;
      h += `<td class="${cls1}">${t.change1h >= 0 ? '↑' : '↓'}${Math.abs(t.change1h).toFixed(1)}%</td>`;
      h += `<td class="${cls24}">${t.change24h >= 0 ? '↑' : '↓'}${Math.abs(t.change24h).toFixed(1)}%</td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: '56' });
    }));
  }
}
customElements.define('token-scout-panel', TokenScoutPanel);
export default TokenScoutPanel;
