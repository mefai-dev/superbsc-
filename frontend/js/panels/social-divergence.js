// MEFAI Social-Smart Divergence — ORIGINAL SKILL
// Problem: Retail follows social hype, smart money acts independently.
// When hype is HIGH but SM is SELLING → distribution (trap for retail).
// When hype is LOW but SM is BUYING → accumulation (smart money loading before pump).
// This divergence signal is one of the strongest alpha indicators.
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, escapeHtml } = window.mefaiUtils;

export class SocialDivergencePanel extends BasePanel {
  static skill = 'Skill 9.2';
  static defaultTitle = 'Smart Divergence';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sort = 'divScore';
    this._dir = 'desc';
  }

  async fetchData() {
    const [socialRes, smRes] = await Promise.allSettled([
      window.mefaiApi.rank.socialHype(),
      window.mefaiApi.signals.smartMoney(),
    ]);

    // Parse social hype
    const socialMap = new Map();
    const socialList = socialRes.status === 'fulfilled' && socialRes.value?.code === '000000'
      ? (socialRes.value.data?.leaderBoardList || []) : [];
    for (const item of socialList) {
      const meta = item.metaInfo || {};
      const hype = item.socialHypeInfo || {};
      const market = item.marketInfo || {};
      const sym = (meta.symbol || '').toUpperCase();
      if (sym) socialMap.set(sym, {
        hypeScore: parseInt(hype.socialHype || 0),
        sentiment: hype.sentiment || '',
        mcap: parseFloat(market.marketCap || 0),
        change: parseFloat(market.priceChange || 0),
        logo: meta.logo || '',
        address: meta.contractAddress || '',
        chain: meta.chainId || '56',
      });
    }

    // Parse SM signals — aggregate by symbol
    const smMap = new Map();
    const smData = smRes.status === 'fulfilled' && smRes.value?.code === '000000' ? (smRes.value.data || []) : [];
    for (const s of (Array.isArray(smData) ? smData : [])) {
      const sym = (s.ticker || '').toUpperCase();
      if (!sym) continue;
      const dir = (s.signalDirection || s.direction || '').toLowerCase();
      const count = parseInt(s.smartMoneyCount || s.signalCount || 0);
      const existing = smMap.get(sym);
      if (!existing) {
        smMap.set(sym, {
          direction: dir,
          smCount: count,
          buys: dir === 'buy' ? count : 0,
          sells: dir === 'sell' ? count : 0,
          logo: s.logoUrl || '',
          address: s.contractAddress || '',
          chain: s.chainId || '56',
          alertPrice: parseFloat(s.alertPrice || 0),
          currentPrice: parseFloat(s.currentPrice || 0),
        });
      } else {
        existing.smCount += count;
        if (dir === 'buy') existing.buys += count;
        if (dir === 'sell') existing.sells += count;
        // Dominant direction
        existing.direction = existing.buys > existing.sells ? 'buy' : existing.sells > existing.buys ? 'sell' : existing.direction;
      }
    }

    // Find divergences
    const results = [];
    const allSymbols = new Set([...socialMap.keys(), ...smMap.keys()]);

    for (const sym of allSymbols) {
      const social = socialMap.get(sym);
      const sm = smMap.get(sym);

      if (!social && !sm) continue;

      const hypeScore = social?.hypeScore || 0;
      const smDir = sm?.direction || '';
      const smCount = sm?.smCount || 0;

      let divType = '';
      let divScore = 0;

      // ACCUMULATION: Low/no hype + SM buying
      if (hypeScore < 30 && smDir === 'buy' && smCount >= 2) {
        divType = 'ACCUM';
        divScore = smCount * 10 + (30 - hypeScore);
      }
      // DISTRIBUTION: High hype + SM selling
      else if (hypeScore > 50 && smDir === 'sell' && smCount >= 2) {
        divType = 'DISTRIB';
        divScore = smCount * 10 + hypeScore;
      }
      // CONFIRM BULL: High hype + SM buying (aligned, not divergence but useful)
      else if (hypeScore > 50 && smDir === 'buy' && smCount >= 2) {
        divType = 'CONFIRM↑';
        divScore = (smCount * 5) + (hypeScore / 2);
      }
      // CONFIRM BEAR: Low hype + SM selling (aligned bearish)
      else if (hypeScore < 20 && smDir === 'sell' && smCount >= 2) {
        divType = 'CONFIRM↓';
        divScore = (smCount * 5) + (20 - hypeScore);
      }

      if (!divType) continue;

      const ref = sm || social;
      const logo = sm?.logo || social?.logo || '';
      const address = sm?.address || social?.address || '';
      const chain = sm?.chain || social?.chain || '56';
      const price = sm?.currentPrice || 0;

      results.push({
        symbol: sym,
        hypeScore,
        sentiment: social?.sentiment || '—',
        smDir,
        smCount,
        divType,
        divScore: parseFloat(divScore.toFixed(1)),
        price,
        change: social?.change || 0,
        mcap: social?.mcap || 0,
        logo, address, chain,
      });
    }

    return results;
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('div.noSignals')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    const divColors = {
      ACCUM: '#0ecb81', DISTRIB: '#f6465d',
      'CONFIRM↑': '#f0b90b', 'CONFIRM↓': '#a855f7',
    };
    const divLabels = {
      ACCUM: '🟢 ACCUMULATION', DISTRIB: '🔴 DISTRIBUTION',
      'CONFIRM↑': '🟡 ALIGNED BULL', 'CONFIRM↓': '🟣 ALIGNED BEAR',
    };

    let h = '<style scoped>';
    h += `.div-badge{font-size:9px;font-weight:700;padding:2px 6px;border-radius:3px;display:inline-block;white-space:nowrap}`;
    h += `.hype-bar{height:4px;background:var(--border);border-radius:2px;width:50px;display:inline-block;vertical-align:middle;margin-left:4px}`;
    h += `.hype-fill{height:100%;border-radius:2px}`;
    h += '</style>';

    h += '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="divScore">${_t('div.signal')}</th>`;
    h += `<th data-k="hypeScore">${_t('col.hype')}</th>`;
    h += `<th>${_t('div.smAction')}</th>`;
    h += `<th data-k="price">${_t('col.price')}</th>`;
    h += `<th data-k="change">${_t('col.change24h')}</th>`;
    h += '</tr></thead><tbody>';

    for (const r of sorted) {
      const iconUrl = window.mefaiUtils.tokenIcon(r.logo);
      const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const divColor = divColors[r.divType] || 'var(--text-muted)';
      const smCls = r.smDir === 'buy' ? 'val-up' : r.smDir === 'sell' ? 'val-down' : '';
      const hypePct = Math.min(100, r.hypeScore);
      const hypeColor = r.hypeScore > 70 ? '#f6465d' : r.hypeScore > 40 ? '#f0b90b' : '#0ecb81';
      const cls = r.change >= 0 ? 'val-up' : 'val-down';

      h += `<tr data-a="${r.address}" data-c="${r.chain}">`;
      h += `<td>${icon}<span style="font-weight:600">${escapeHtml(r.symbol)}</span></td>`;
      h += `<td><span class="div-badge" style="color:${divColor};border:1px solid ${divColor}">${divLabels[r.divType] || r.divType}</span></td>`;
      h += `<td class="val-num">${r.hypeScore}<span class="hype-bar"><span class="hype-fill" style="width:${hypePct}%;background:${hypeColor}"></span></span></td>`;
      h += `<td class="${smCls}" style="font-weight:700">${r.smDir === 'buy' ? 'BUY↑' : r.smDir === 'sell' ? 'SELL↓' : '—'} (${r.smCount})</td>`;
      h += `<td class="val-num">${r.price ? '$' + formatPrice(r.price) : '—'}</td>`;
      h += `<td class="${cls}">${r.change ? (r.change >= 0 ? '↑' : '↓') + Math.abs(r.change).toFixed(2) + '%' : '—'}</td>`;
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
customElements.define('social-divergence-panel', SocialDivergencePanel);
export default SocialDivergencePanel;
