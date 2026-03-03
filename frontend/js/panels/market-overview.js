import { BasePanel } from '../components/base-panel.js';

export class MarketOverviewPanel extends BasePanel {
  static skill = 'Skill 1: Spot CEX';
  static defaultTitle = 'Market Overview';

  constructor() {
    super();
    this._refreshRate = 10000;
    this._sort = 'volume';
    this._dir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.spot.tickers();
    if (res?.error) return [];
    const arr = Array.isArray(res) ? res : [];
    return arr
      .filter(t => t.symbol?.endsWith('USDT') && parseFloat(t.quoteVolume) > 100000)
      .sort((a, b) => parseFloat(b.quoteVolume) - parseFloat(a.quoteVolume))
      .slice(0, 60)
      .map(t => ({
        symbol: t.symbol?.replace('USDT', ''),
        fullSymbol: t.symbol,
        price: parseFloat(t.lastPrice || 0),
        change: parseFloat(t.priceChangePercent || 0),
        volume: parseFloat(t.quoteVolume || 0),
        high: parseFloat(t.highPrice || 0),
        low: parseFloat(t.lowPrice || 0),
      }));
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">Loading market data...</div>';
    const u = window.mefaiUtils;
    const sorted = [...data].sort((a, b) => {
      const va = a[this._sort], vb = b[this._sort];
      return this._dir === 'desc' ? (vb > va ? 1 : -1) : (va > vb ? 1 : -1);
    });
    let h = '<table class="data-table"><thead><tr>';
    h += '<th data-k="symbol">Pair</th><th data-k="price">Price</th>';
    h += '<th data-k="change">24h%</th><th data-k="volume">Volume</th>';
    h += '</tr></thead><tbody>';
    for (const t of sorted) {
      const cls = t.change >= 0 ? 'val-up' : 'val-down';
      const ar = t.change >= 0 ? '↑' : '↓';
      h += `<tr data-s="${t.fullSymbol}"><td style="font-weight:600">${t.symbol}</td>`;
      h += `<td class="val-num">${u.formatPrice(t.price)}</td>`;
      h += `<td class="${cls}">${ar}${Math.abs(t.change).toFixed(2)}%</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.volume)}</td></tr>`;
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('th').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-s]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ symbol: tr.dataset.s, platform: 'spot' });
    }));
  }
}
customElements.define('market-overview-panel', MarketOverviewPanel);
