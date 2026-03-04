// MEFAI Funding Arbitrage Scanner — ORIGINAL SKILL
// Problem: When funding rates are extreme AND smart money disagrees → contrarian alpha.
// Extreme positive funding = crowded longs. If SM is selling → high prob reversal signal.
// Extreme negative funding = crowded shorts. If SM is buying → high prob bounce signal.
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, escapeHtml } = window.mefaiUtils;

export class FundingArbPanel extends BasePanel {
  static skill = 'Skill 9.1';
  static defaultTitle = 'Funding Arb';

  constructor() {
    super();
    this._refreshRate = 20000;
    this._sort = 'arbScore';
    this._dir = 'desc';
  }

  _apiBase() {
    const base = document.baseURI || window.location.href;
    return new URL('.', base).href.replace(/\/$/, '');
  }

  async fetchData() {
    const [fundingRes, smRes] = await Promise.allSettled([
      fetch(this._apiBase() + '/api/futures/premiumIndex').then(r => r.json()),
      window.mefaiApi.signals.smartMoney(),
    ]);

    // Parse funding rates
    const fundingMap = new Map();
    const fundingData = fundingRes.status === 'fulfilled' && Array.isArray(fundingRes.value) ? fundingRes.value : [];
    for (const f of fundingData) {
      const sym = (f.symbol || '').replace('USDT', '').toUpperCase();
      if (!sym) continue;
      fundingMap.set(sym, {
        fundingRate: parseFloat(f.lastFundingRate || 0) * 100,
        markPrice: parseFloat(f.markPrice || 0),
        nextFunding: parseInt(f.nextFundingTime || 0),
      });
    }

    // Parse SM signals
    const smMap = new Map();
    const smData = smRes.status === 'fulfilled' && smRes.value?.code === '000000' ? (smRes.value.data || []) : [];
    for (const s of (Array.isArray(smData) ? smData : [])) {
      const sym = (s.ticker || '').toUpperCase();
      if (!sym) continue;
      const existing = smMap.get(sym);
      const dir = (s.signalDirection || s.direction || '').toLowerCase();
      const count = parseInt(s.smartMoneyCount || s.signalCount || 0);
      if (!existing) {
        smMap.set(sym, { direction: dir, smCount: count, logo: s.logoUrl || '', address: s.contractAddress || '' });
      } else {
        existing.smCount += count;
      }
    }

    // Cross-reference: find extreme funding + SM divergence
    const results = [];

    for (const [sym, fund] of fundingMap) {
      const sm = smMap.get(sym);
      const absRate = Math.abs(fund.fundingRate);

      // Only consider extreme funding (>0.03% = 3 basis points)
      if (absRate < 0.03) continue;

      let signal = 'NEUTRAL';
      let arbScore = 0;

      if (fund.fundingRate > 0 && sm?.direction === 'sell') {
        // Crowded longs + SM selling = SHORT opportunity
        signal = 'SHORT';
        arbScore = absRate * 100 + sm.smCount * 5;
      } else if (fund.fundingRate < 0 && sm?.direction === 'buy') {
        // Crowded shorts + SM buying = LONG opportunity
        signal = 'LONG';
        arbScore = absRate * 100 + sm.smCount * 5;
      } else if (absRate > 0.05) {
        // Very extreme funding without SM confirmation — still notable
        signal = fund.fundingRate > 0 ? 'CROWD-L' : 'CROWD-S';
        arbScore = absRate * 50;
      }

      if (signal === 'NEUTRAL') continue;

      const minsToFunding = fund.nextFunding > 0 ? Math.max(0, Math.round((fund.nextFunding - Date.now()) / 60000)) : 0;

      results.push({
        symbol: sym,
        fundingRate: fund.fundingRate,
        absRate,
        markPrice: fund.markPrice,
        smDir: sm?.direction || '—',
        smCount: sm?.smCount || 0,
        signal,
        arbScore: parseFloat(arbScore.toFixed(1)),
        logo: sm?.logo || '',
        address: sm?.address || '',
        minsToFunding,
      });
    }

    return results;
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('arb.noSignals')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    const sigColors = {
      SHORT: '#f6465d', LONG: '#0ecb81',
      'CROWD-L': '#f0b90b', 'CROWD-S': '#1e90ff',
    };

    let h = '<style scoped>';
    h += `.arb-signal{font-size:10px;font-weight:700;padding:2px 6px;border-radius:3px;display:inline-block}`;
    h += `.arb-score{font-weight:700}`;
    h += '</style>';

    h += '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="arbScore">${_t('arb.score')}</th>`;
    h += `<th>${_t('arb.signal')}</th>`;
    h += `<th data-k="fundingRate">${_t('futures.funding')}</th>`;
    h += `<th>${_t('arb.smDir')}</th>`;
    h += `<th data-k="markPrice">${_t('col.price')}</th>`;
    h += '</tr></thead><tbody>';

    for (const r of sorted) {
      const iconUrl = window.mefaiUtils.tokenIcon(r.logo);
      const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const sigColor = sigColors[r.signal] || 'var(--text-muted)';
      const rateCls = r.fundingRate > 0 ? 'color:#f6465d' : 'color:#1e90ff';
      const smCls = r.smDir === 'buy' ? 'val-up' : r.smDir === 'sell' ? 'val-down' : '';
      const timer = r.minsToFunding > 0 ? ` <span style="font-size:9px;color:var(--text-muted)">${Math.floor(r.minsToFunding / 60)}h${r.minsToFunding % 60}m</span>` : '';

      h += `<tr data-a="${r.address}">`;
      h += `<td>${icon}<span style="font-weight:600">${escapeHtml(r.symbol)}</span></td>`;
      h += `<td class="arb-score" style="color:${sigColor}">${r.arbScore}</td>`;
      h += `<td><span class="arb-signal" style="color:${sigColor};border:1px solid ${sigColor}">${r.signal}</span></td>`;
      h += `<td style="${rateCls};font-weight:700">${r.fundingRate >= 0 ? '+' : ''}${r.fundingRate.toFixed(4)}%${timer}</td>`;
      h += `<td class="${smCls}" style="font-weight:700">${r.smDir === 'buy' ? 'BUY↑' : r.smDir === 'sell' ? 'SELL↓' : '—'} <span style="color:var(--text-muted);font-weight:400">(${r.smCount})</span></td>`;
      h += `<td class="val-num">$${formatPrice(r.markPrice)}</td>`;
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
      this.emitTokenFocus({ address: tr.dataset.a });
    }));
  }
}
customElements.define('funding-arb-panel', FundingArbPanel);
export default FundingArbPanel;
