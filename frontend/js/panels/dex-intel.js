// MEFAI DexScreener Intelligence — DEX token discovery & analysis
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class DexIntelPanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'DEX Intel';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sort = 'volume';
    this._dir = 'desc';
    this._tab = 'boosted';
  }

  async fetchData() {
    const [profilesRes, searchRes] = await Promise.allSettled([
      window.mefaiApi.dex.latestProfiles(),
      window.mefaiApi.dex.search('trending'),
    ]);

    // Boosted tokens (latest profiles)
    const profiles = profilesRes.status === 'fulfilled' && !profilesRes.value?.error
      ? (Array.isArray(profilesRes.value) ? profilesRes.value : profilesRes.value?.data || [])
      : [];

    // Search results (trending)
    const searchData = searchRes.status === 'fulfilled' && !searchRes.value?.error
      ? searchRes.value : null;
    const pairs = searchData?.pairs || [];

    // Enrich boosted profiles with token details (fetch top 10 in parallel)
    const topProfiles = profiles.slice(0, 15);
    const detailResults = await Promise.allSettled(
      topProfiles.map(p => p.tokenAddress ? window.mefaiApi.dex.token(p.tokenAddress) : Promise.resolve(null))
    );

    const boosted = topProfiles.map((p, i) => {
      let symbol = '?', name = '', price = 0, volume = 0, change24h = 0, liquidity = 0;
      if (detailResults[i]?.status === 'fulfilled') {
        const detailPairs = detailResults[i].value?.pairs || [];
        if (detailPairs.length) {
          const dp = detailPairs[0];
          const bt = dp.baseToken || {};
          symbol = bt.symbol || '?';
          name = bt.name || '';
          price = parseFloat(dp.priceUsd || 0);
          volume = parseFloat(dp.volume?.h24 || 0);
          change24h = parseFloat(dp.priceChange?.h24 || 0);
          liquidity = parseFloat(dp.liquidity?.usd || 0);
        }
      }
      return {
        symbol, name,
        chain: p.chainId || '',
        address: p.tokenAddress || '',
        url: p.url || '',
        icon: p.icon || '',
        description: (p.description || '').slice(0, 80),
        price, volume, change24h, liquidity,
      };
    });

    const trending = pairs.slice(0, 30).map(p => {
      const base = p.baseToken || {};
      return {
        symbol: base.symbol || '?',
        name: base.name || '',
        chain: p.chainId || '',
        address: base.address || '',
        dex: p.dexId || '',
        price: parseFloat(p.priceUsd || 0),
        change24h: parseFloat(p.priceChange?.h24 || 0),
        change1h: parseFloat(p.priceChange?.h1 || 0),
        volume: parseFloat(p.volume?.h24 || 0),
        liquidity: parseFloat(p.liquidity?.usd || 0),
        mcap: parseFloat(p.marketCap || p.fdv || 0),
        txns24h: (p.txns?.h24?.buys || 0) + (p.txns?.h24?.sells || 0),
        buys24h: p.txns?.h24?.buys || 0,
        sells24h: p.txns?.h24?.sells || 0,
        pairAddress: p.pairAddress || '',
      };
    });

    return { boosted, trending };
  }

  renderContent(data) {
    if (!data) return `<div class="panel-loading">${_t('dex.noData')}</div>`;

    let h = '<style scoped>';
    h += `.dex-tabs{display:flex;gap:4px;margin-bottom:8px}`;
    h += `.dex-tab{padding:4px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase}`;
    h += `.dex-tab.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}`;
    h += `.dex-chain{font-size:8px;padding:1px 4px;border-radius:3px;background:var(--border);color:var(--text-muted);margin-left:3px}`;
    h += `.dex-desc{font-size:9px;color:var(--text-muted);max-width:150px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
    h += `.dex-txn{font-size:9px}`;
    h += `.dex-buy{color:#0ecb81}.dex-sell{color:#f6465d}`;
    h += '</style>';

    h += '<div class="dex-tabs">';
    h += `<button class="dex-tab ${this._tab === 'boosted' ? 'active' : ''}" data-tab="boosted">${_t('dex.boosted')}</button>`;
    h += `<button class="dex-tab ${this._tab === 'trending' ? 'active' : ''}" data-tab="trending">${_t('dex.trending')}</button>`;
    h += '</div>';

    if (this._tab === 'boosted') {
      h += this._renderBoosted(data.boosted || []);
    } else {
      h += this._renderTrending(data.trending || []);
    }
    return h;
  }

  _renderBoosted(items) {
    if (!items.length) return `<div class="panel-loading">${_t('dex.noProfiles')}</div>`;

    let h = '<table class="data-table"><thead><tr>';
    h += `<th>${_t('col.token')}</th>`;
    h += `<th>${_t('dex.chain')}</th>`;
    h += `<th>${_t('col.price')}</th>`;
    h += `<th>${_t('col.change24h')}</th>`;
    h += `<th>${_t('col.volume')}</th>`;
    h += '</tr></thead><tbody>';

    for (const t of items) {
      const iconHtml = t.icon ? `<img src="${t.icon}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const cls24 = t.change24h >= 0 ? 'val-up' : 'val-down';
      h += `<tr data-a="${t.address}" data-c="${t.chain}">`;
      h += `<td>${iconHtml}<span style="font-weight:600">${escapeHtml(t.symbol)}</span><br><span style="font-size:9px;color:var(--text-muted)">${escapeHtml(t.name)}</span></td>`;
      h += `<td><span class="dex-chain">${escapeHtml((t.chain || '').toUpperCase())}</span></td>`;
      h += `<td class="val-num">${t.price ? '$' + formatPrice(t.price) : '—'}</td>`;
      h += `<td class="${cls24}">${t.change24h ? (t.change24h >= 0 ? '↑' : '↓') + Math.abs(t.change24h).toFixed(1) + '%' : '—'}</td>`;
      h += `<td class="val-num">${t.volume ? formatCurrency(t.volume) : '—'}</td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  _renderTrending(items) {
    if (!items.length) return `<div class="panel-loading">${_t('dex.noTrending')}</div>`;

    const sorted = [...items].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    let h = '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="price">${_t('col.price')}</th>`;
    h += `<th data-k="change24h">${_t('col.change24h')}</th>`;
    h += `<th data-k="volume">${_t('col.volume')}</th>`;
    h += `<th data-k="liquidity">${_t('col.liquidity')}</th>`;
    h += `<th>${_t('dex.txns')}</th>`;
    h += '</tr></thead><tbody>';

    for (const t of sorted) {
      const cls24 = t.change24h >= 0 ? 'val-up' : 'val-down';
      h += `<tr data-a="${t.address}" data-c="${t.chain}">`;
      h += `<td><span style="font-weight:600">${escapeHtml(t.symbol)}</span><span class="dex-chain">${escapeHtml(t.chain)}</span></td>`;
      h += `<td class="val-num">${t.price ? '$' + formatPrice(t.price) : '—'}</td>`;
      h += `<td class="${cls24}">${t.change24h >= 0 ? '↑' : '↓'}${Math.abs(t.change24h).toFixed(1)}%</td>`;
      h += `<td class="val-num">${formatCurrency(t.volume)}</td>`;
      h += `<td class="val-num">${formatCurrency(t.liquidity)}</td>`;
      h += `<td class="dex-txn"><span class="dex-buy">${t.buys24h}B</span>/<span class="dex-sell">${t.sells24h}S</span></td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    // Tab switching
    body.querySelectorAll('.dex-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = tab.dataset.tab;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));

    // Sort headers
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = k === 'symbol' ? 'asc' : 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));

    // Row click → focusToken
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('dex-intel-panel', DexIntelPanel);
export default DexIntelPanel;
