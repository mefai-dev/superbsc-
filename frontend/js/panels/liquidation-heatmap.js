// MEFAI Liquidation Heatmap — Futures risk zones & crowding analysis
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, escapeHtml } = window.mefaiUtils;

const PAIRS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT',
  'ADAUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT','LTCUSDT',
  'UNIUSDT','ARBUSDT','OPUSDT','PEPEUSDT','SHIBUSDT','SUIUSDT',
  'APTUSDT','NEARUSDT',
];

export class LiquidationHeatmapPanel extends BasePanel {
  static skill = 'Skill 12';
  static defaultTitle = 'Liquidation Heatmap';

  constructor() {
    super();
    this._refreshRate = 20000;
    this._sort = 'riskScore';
    this._dir = 'desc';
  }

  async fetchData() {
    const [indexRes, tickerRes] = await Promise.allSettled([
      fetch(this._apiBase() + '/api/futures/premiumIndex').then(r => r.json()),
      fetch(this._apiBase() + '/api/futures/ticker24hr').then(r => r.json()),
    ]);

    const indices = indexRes.status === 'fulfilled' && Array.isArray(indexRes.value) ? indexRes.value : [];
    const tickers = tickerRes.status === 'fulfilled' && Array.isArray(tickerRes.value) ? tickerRes.value : [];

    const tickerMap = new Map();
    for (const t of tickers) tickerMap.set(t.symbol, t);

    const pairSet = new Set(PAIRS);
    const results = [];

    for (const idx of indices) {
      if (!pairSet.has(idx.symbol)) continue;
      const t = tickerMap.get(idx.symbol) || {};

      const rate = parseFloat(idx.lastFundingRate || 0) * 100;
      const markPrice = parseFloat(idx.markPrice || 0);
      const highPrice = parseFloat(t.highPrice || 0);
      const lowPrice = parseFloat(t.lowPrice || 0);
      const volume = parseFloat(t.quoteVolume || 0);
      const change24h = parseFloat(t.priceChangePercent || 0);

      // Funding Severity (0-40): how extreme is funding
      const absRate = Math.abs(rate);
      const fundingSeverity = Math.min(40, Math.round(absRate * 400));

      // Price Proximity to extremes (0-30): near 24h high/low = more risk
      let proximity = 0;
      if (highPrice > 0 && lowPrice > 0 && markPrice > 0) {
        const range = highPrice - lowPrice;
        if (range > 0) {
          const distHigh = (highPrice - markPrice) / range;
          const distLow = (markPrice - lowPrice) / range;
          const nearness = 1 - Math.min(distHigh, distLow); // 1 = at extreme, 0 = middle
          proximity = Math.min(30, Math.round(nearness * 30));
        }
      }

      // Crowding (0-30): based on funding direction + volume change
      const crowding = Math.min(30, Math.round(
        (absRate > 0.05 ? 15 : absRate > 0.02 ? 8 : 3) +
        (Math.abs(change24h) > 10 ? 15 : Math.abs(change24h) > 5 ? 10 : Math.abs(change24h) > 2 ? 5 : 2)
      ));

      const riskScore = fundingSeverity + proximity + crowding;

      // Estimate liquidation zones (simplified)
      const leverages = [5, 10, 25, 50];
      const liqZones = leverages.map(lev => {
        const longLiq = markPrice * (1 - 1 / lev);
        const shortLiq = markPrice * (1 + 1 / lev);
        return { lev, longLiq, shortLiq };
      });

      results.push({
        symbol: idx.symbol.replace('USDT', ''),
        pair: idx.symbol,
        markPrice,
        fundingRate: rate,
        fundingSeverity,
        proximity,
        crowding,
        riskScore,
        change24h,
        volume,
        direction: rate > 0 ? 'LONG' : rate < 0 ? 'SHORT' : 'NEUTRAL',
        liqZones,
      });
    }

    results.sort((a, b) => b.riskScore - a.riskScore);
    return results;
  }

  _apiBase() {
    const base = document.baseURI || window.location.href;
    return new URL('.', base).href.replace(/\/$/, '');
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('liq.noData')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    let h = '<style scoped>';
    h += `.liq-bar{height:8px;background:var(--border);border-radius:4px;width:70px;display:inline-block;vertical-align:middle;margin-left:4px}`;
    h += `.liq-fill{height:100%;border-radius:4px;transition:width .3s}`;
    h += `.liq-critical{color:#f6465d;font-weight:700;text-shadow:0 0 6px rgba(246,70,93,.4)}`;
    h += `.liq-high{color:#f0b90b;font-weight:700}`;
    h += `.liq-medium{color:#0ecb81}`;
    h += `.liq-low{color:var(--text-muted)}`;
    h += `.liq-dir{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px;display:inline-block}`;
    h += `.liq-long{background:rgba(14,203,129,.15);color:#0ecb81}`;
    h += `.liq-short{background:rgba(246,70,93,.15);color:#f6465d}`;
    h += `.liq-neutral{background:var(--border);color:var(--text-muted)}`;
    h += '</style>';

    h += '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="riskScore">${_t('liq.risk')}</th>`;
    h += `<th>${_t('liq.crowd')}</th>`;
    h += `<th data-k="fundingRate">${_t('futures.funding')}</th>`;
    h += `<th data-k="markPrice">${_t('col.price')}</th>`;
    h += `<th data-k="change24h">${_t('col.change24h')}</th>`;
    h += '</tr></thead><tbody>';

    for (const r of sorted) {
      const tierCls = r.riskScore >= 70 ? 'liq-critical' : r.riskScore >= 45 ? 'liq-high' : r.riskScore >= 25 ? 'liq-medium' : 'liq-low';
      const barColor = '#474d57';
      const pct = Math.min(100, r.riskScore);
      const dirCls = r.direction === 'LONG' ? 'liq-long' : r.direction === 'SHORT' ? 'liq-short' : 'liq-neutral';
      const rateCls = r.fundingRate > 0.05 ? 'liq-critical' : r.fundingRate > 0.02 ? 'liq-high' : r.fundingRate < 0 ? 'val-down' : 'liq-medium';
      const cls24 = r.change24h >= 0 ? 'val-up' : 'val-down';

      h += '<tr>';
      h += `<td><span style="font-weight:600">${escapeHtml(r.symbol)}</span></td>`;
      h += `<td class="${tierCls}">${r.riskScore}<span class="liq-bar"><span class="liq-fill" style="width:${pct}%;background:${barColor}"></span></span></td>`;
      h += `<td><span class="liq-dir ${dirCls}">${r.direction}</span></td>`;
      h += `<td class="${rateCls}">${r.fundingRate >= 0 ? '+' : ''}${r.fundingRate.toFixed(4)}%</td>`;
      h += `<td class="val-num">$${formatPrice(r.markPrice)}</td>`;
      h += `<td class="${cls24}">${r.change24h >= 0 ? '↑' : '↓'}${Math.abs(r.change24h).toFixed(2)}%</td>`;
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
      else { this._sort = k; this._dir = k === 'symbol' ? 'asc' : 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('liquidation-heatmap-panel', LiquidationHeatmapPanel);
export default LiquidationHeatmapPanel;
