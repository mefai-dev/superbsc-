// MEFAI Alpha Radar — 5-source convergence scoring
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatCurrency, escapeHtml } = window.mefaiUtils;

export class AlphaRadarPanel extends BasePanel {
  static skill = 'Skill 8.1';
  static defaultTitle = 'Alpha Radar';

  constructor() {
    super();
    this._refreshRate = 20000;
    this._sort = 'alphaScore';
    this._dir = 'desc';
  }

  async fetchData() {
    const [smRes, socialRes, trendRes, memeRes, inflowRes] = await Promise.allSettled([
      window.mefaiApi.signals.smartMoney(),
      window.mefaiApi.rank.socialHype(),
      window.mefaiApi.rank.trending(),
      window.mefaiApi.rank.memeRank(),
      window.mefaiApi.rank.smartInflow(),
    ]);

    // --- Smart Money (keyed by symbol) ---
    const smMap = new Map();
    const smData = smRes.status === 'fulfilled' && smRes.value?.code === '000000' ? smRes.value.data : [];
    for (const s of (Array.isArray(smData) ? smData : [])) {
      const sym = (s.ticker || '').toUpperCase();
      if (!sym) continue;
      const existing = smMap.get(sym);
      if (!existing) {
        smMap.set(sym, {
          direction: (s.signalDirection || s.direction || '').toLowerCase(),
          smCount: parseInt(s.smartMoneyCount || s.signalCount || 0),
          alertPrice: parseFloat(s.alertPrice || 0),
          currentPrice: parseFloat(s.currentPrice || 0),
          logo: s.logoUrl || '',
          address: s.contractAddress || '',
          chain: s.chainId || '56',
        });
      } else {
        existing.smCount += parseInt(s.smartMoneyCount || s.signalCount || 0);
      }
    }

    // --- Social Hype (keyed by symbol) ---
    const socialMap = new Map();
    const socialList = socialRes.status === 'fulfilled' && socialRes.value?.code === '000000'
      ? (socialRes.value.data?.leaderBoardList || []) : [];
    for (const item of socialList) {
      const meta = item.metaInfo || {};
      const hype = item.socialHypeInfo || {};
      const sym = (meta.symbol || '').toUpperCase();
      if (sym) socialMap.set(sym, {
        hypeScore: parseInt(hype.socialHype || 0),
        logo: meta.logo || '',
        address: meta.contractAddress || '',
        chain: meta.chainId || '56',
      });
    }

    // --- Trending (keyed by symbol) ---
    const trendSet = new Map();
    const trendData = trendRes.status === 'fulfilled' ? trendRes.value : null;
    const trendItems = trendData?.data?.tokens || trendData?.data || (Array.isArray(trendData) ? trendData : []);
    for (const item of (Array.isArray(trendItems) ? trendItems : [])) {
      const sym = (item.symbol || '').toUpperCase();
      if (sym) trendSet.set(sym, {
        price: parseFloat(item.price || 0),
        change24h: parseFloat(item.percentChange24h || 0),
        logo: item.icon || '',
        address: item.contractAddress || '',
        chain: item.chainId || '',
      });
    }

    // --- Meme Rank (keyed by symbol) ---
    const memeMap = new Map();
    const memeData = memeRes.status === 'fulfilled' ? memeRes.value : null;
    const memeItems = memeData?.data?.tokens || memeData?.data || (Array.isArray(memeData) ? memeData : []);
    for (const item of (Array.isArray(memeItems) ? memeItems : [])) {
      const sym = (item.symbol || '').toUpperCase();
      if (sym) memeMap.set(sym, {
        score: parseFloat(item.score || 0),
        address: item.contractAddress || '',
        chain: item.chainId || '',
      });
    }

    // --- Smart Inflow (keyed by symbol) ---
    const inflowSet = new Map();
    const inflowData = inflowRes.status === 'fulfilled' && inflowRes.value?.code === '000000'
      ? (inflowRes.value.data || []) : [];
    for (const t of (Array.isArray(inflowData) ? inflowData : [])) {
      const sym = (t.tokenName || '').toUpperCase();
      if (sym) inflowSet.set(sym, {
        address: t.ca || '',
        chain: 'SOL',
      });
    }

    // --- Merge all symbols ---
    const allSymbols = new Set([
      ...smMap.keys(), ...socialMap.keys(), ...trendSet.keys(),
      ...memeMap.keys(), ...inflowSet.keys(),
    ]);

    const results = [];
    for (const sym of allSymbols) {
      let score = 0;
      let sources = 0;
      const badges = [];

      const sm = smMap.get(sym);
      const social = socialMap.get(sym);
      const trend = trendSet.get(sym);
      const meme = memeMap.get(sym);
      const inflow = inflowSet.get(sym);

      // Smart Money BUY: +25
      if (sm && sm.direction === 'buy') {
        score += 25; sources++; badges.push('SM');
      }

      // Social Hype: 0-20 scaled
      if (social) {
        const pts = Math.min(20, Math.round((social.hypeScore / 100) * 20));
        if (pts > 0) { score += pts; sources++; badges.push('SO'); }
      }

      // Trending: +20
      if (trend) {
        score += 20; sources++; badges.push('TR');
      }

      // Meme Rank: 0-15 scaled (score is 0-5)
      if (meme) {
        const pts = Math.min(15, Math.round((meme.score / 5) * 15));
        if (pts > 0) { score += pts; sources++; badges.push('ME'); }
      }

      // Smart Inflow: +20
      if (inflow) {
        score += 20; sources++; badges.push('IN');
      }

      // Filter: at least 2 converging sources
      if (sources < 2) continue;

      // Pick best metadata (logo, price, address, chain)
      const logo = sm?.logo || social?.logo || trend?.logo || '';
      const address = sm?.address || social?.address || trend?.address || meme?.address || inflow?.address || '';
      const chain = sm?.chain || social?.chain || trend?.chain || meme?.chain || inflow?.chain || '56';
      const price = sm?.currentPrice || trend?.price || 0;
      const change24h = trend?.change24h || 0;
      const smCount = sm?.smCount || 0;

      results.push({ symbol: sym, alphaScore: score, sources, badges, logo, address, chain, price, change24h, smCount });
    }

    results.sort((a, b) => b.alphaScore - a.alphaScore);
    return results;
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('msg.noAlpha')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    const badgeColors = { SM: '#0ecb81', SO: '#1e90ff', TR: '#f0b90b', ME: '#a855f7', IN: '#22d3ee' };

    let h = '<style scoped>';
    h += `.alpha-bar{height:8px;background:var(--border);border-radius:4px;width:80px;display:inline-block;vertical-align:middle;margin-left:6px;overflow:hidden}`;
    h += `.alpha-fill{height:100%;border-radius:4px;transition:width .3s;box-shadow:0 0 4px currentColor}`;
    h += `.alpha-gold{color:#f0b90b;text-shadow:0 0 8px rgba(240,185,11,0.5)}`;
    h += `.alpha-green{color:#0ecb81}`;
    h += `.alpha-yellow{color:#f0b90b}`;
    h += `.alpha-gray{color:#f6465d}`;
    h += `.src-badge{display:inline-block;font-size:9px;font-weight:700;padding:1px 4px;border-radius:3px;margin-right:2px;color:#0b0e11}`;
    h += '</style>';

    h += '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="alphaScore">${_t('col.alphaScore')}</th>`;
    h += `<th>${_t('col.sources')}</th>`;
    h += `<th data-k="price">${_t('col.price')}</th>`;
    h += `<th data-k="change24h">${_t('col.change24h')}</th>`;
    h += `<th data-k="smCount">${_t('col.smCount')}</th>`;
    h += '</tr></thead><tbody>';

    for (const r of sorted) {
      const iconUrl = window.mefaiUtils.tokenIcon(r.logo);
      const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';

      const tierCls = r.alphaScore >= 80 ? 'alpha-gold' : r.alphaScore >= 60 ? 'alpha-green' : r.alphaScore >= 40 ? 'alpha-yellow' : 'alpha-gray';
      const barColor = r.alphaScore >= 80 ? '#f0b90b' : r.alphaScore >= 60 ? '#0ecb81' : r.alphaScore >= 40 ? '#e8a317' : '#474d57';
      const barGlow = r.alphaScore >= 80 ? 'box-shadow:0 0 8px rgba(240,185,11,.6)' : r.alphaScore >= 60 ? 'box-shadow:0 0 6px rgba(14,203,129,.4)' : '';
      const pct = Math.min(100, r.alphaScore);

      const badgesHtml = r.badges.map(b =>
        `<span class="src-badge" style="background:${badgeColors[b]}">${b}</span>`
      ).join('');

      const cls24 = r.change24h >= 0 ? 'val-up' : 'val-down';

      h += `<tr data-a="${r.address}" data-c="${r.chain}">`;
      h += `<td>${icon}<span style="font-weight:600">${escapeHtml(r.symbol)}</span></td>`;
      h += `<td class="${tierCls}" style="font-weight:700">${r.alphaScore}<span class="alpha-bar"><span class="alpha-fill" style="width:${pct}%;background:${barColor};${barGlow}"></span></span></td>`;
      h += `<td>${badgesHtml}</td>`;
      h += `<td class="val-num">${r.price ? '$' + formatPrice(r.price) : '—'}</td>`;
      h += `<td class="${cls24}">${r.change24h ? (r.change24h >= 0 ? '↑' : '↓') + Math.abs(r.change24h).toFixed(1) + '%' : '—'}</td>`;
      h += `<td class="val-num">${r.smCount || '—'}</td>`;
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
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('alpha-radar-panel', AlphaRadarPanel);
export default AlphaRadarPanel;
