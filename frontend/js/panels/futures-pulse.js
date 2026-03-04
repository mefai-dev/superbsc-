// MEFAI Futures Pulse — Funding rates, OI, Long/Short ratios (PR #5)
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, escapeHtml } = window.mefaiUtils;

// Top futures pairs to track
const PAIRS = [
  'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT',
  'ADAUSDT','AVAXUSDT','DOTUSDT','LINKUSDT','MATICUSDT','LTCUSDT',
  'UNIUSDT','ARBUSDT','OPUSDT','PEPEUSDT','SHIBUSDT','SUIUSDT',
  'APTUSDT','NEARUSDT',
];

export class FuturesPulsePanel extends BasePanel {
  static skill = 'Skill 8.3';
  static defaultTitle = 'Futures Pulse';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sort = 'absRate';
    this._dir = 'desc';
  }

  async fetchData() {
    // Fetch all premium indices (funding + mark price) in one call
    const [indexRes, tickerRes] = await Promise.allSettled([
      fetch(this._apiBase() + '/api/futures/premiumIndex').then(r => r.json()),
      fetch(this._apiBase() + '/api/futures/ticker24hr').then(r => r.json()),
    ]);

    const indices = indexRes.status === 'fulfilled' && Array.isArray(indexRes.value) ? indexRes.value : [];
    const tickers = tickerRes.status === 'fulfilled' && Array.isArray(tickerRes.value) ? tickerRes.value : [];

    // Build ticker map
    const tickerMap = new Map();
    for (const t of tickers) tickerMap.set(t.symbol, t);

    const pairSet = new Set(PAIRS);
    const results = [];

    for (const idx of indices) {
      if (!pairSet.has(idx.symbol)) continue;
      const t = tickerMap.get(idx.symbol) || {};
      const rate = parseFloat(idx.lastFundingRate || 0) * 100;
      const nextTime = parseInt(idx.nextFundingTime || 0);
      const minsToFunding = nextTime > 0 ? Math.max(0, Math.round((nextTime - Date.now()) / 60000)) : 0;

      results.push({
        symbol: idx.symbol.replace('USDT', ''),
        pair: idx.symbol,
        markPrice: parseFloat(idx.markPrice || 0),
        fundingRate: rate,
        absRate: Math.abs(rate),
        minsToFunding,
        price: parseFloat(t.lastPrice || idx.markPrice || 0),
        change24h: parseFloat(t.priceChangePercent || 0),
        volume24h: parseFloat(t.quoteVolume || 0),
        highPrice: parseFloat(t.highPrice || 0),
        lowPrice: parseFloat(t.lowPrice || 0),
      });
    }

    return results;
  }

  _apiBase() {
    const base = document.baseURI || window.location.href;
    return new URL('.', base).href.replace(/\/$/, '');
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('msg.loadingSignals')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    let h = '<style scoped>';
    h += `.fr-extreme{color:#f6465d;font-weight:700}.fr-high{color:#f0b90b;font-weight:700}.fr-normal{color:#0ecb81}`;
    h += `.fr-neg{color:#1e90ff}`;
    h += `.fund-timer{font-size:9px;color:var(--text-muted)}`;
    h += '</style>';

    h += '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="fundingRate">${_t('futures.funding')}</th>`;
    h += `<th data-k="markPrice">${_t('col.price')}</th>`;
    h += `<th data-k="change24h">${_t('col.change24h')}</th>`;
    h += `<th data-k="volume24h">${_t('col.volume')}</th>`;
    h += '</tr></thead><tbody>';

    for (const r of sorted) {
      // Funding rate color: >0.1% extreme red, >0.03% high yellow, <0 blue, else green
      const rateCls = r.fundingRate > 0.1 ? 'fr-extreme' : r.fundingRate > 0.03 ? 'fr-high' : r.fundingRate < 0 ? 'fr-neg' : 'fr-normal';
      const cls24 = r.change24h >= 0 ? 'val-up' : 'val-down';
      const timer = r.minsToFunding > 0 ? ` <span class="fund-timer">${Math.floor(r.minsToFunding / 60)}h${r.minsToFunding % 60}m</span>` : '';

      h += '<tr>';
      h += `<td><span style="font-weight:600">${escapeHtml(r.symbol)}</span></td>`;
      h += `<td class="${rateCls}">${r.fundingRate >= 0 ? '+' : ''}${r.fundingRate.toFixed(4)}%${timer}</td>`;
      h += `<td class="val-num">$${formatPrice(r.markPrice)}</td>`;
      h += `<td class="${cls24}">${r.change24h >= 0 ? '↑' : '↓'}${Math.abs(r.change24h).toFixed(2)}%</td>`;
      h += `<td class="val-num">${formatCurrency(r.volume24h)}</td>`;
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
customElements.define('futures-pulse-panel', FuturesPulsePanel);
export default FuturesPulsePanel;
