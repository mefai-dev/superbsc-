import { BasePanel } from '../components/base-panel.js';
const { escapeHtml } = window.mefaiUtils;

export class MarketOverviewPanel extends BasePanel {
  static skill = 'Skill 1: Spot CEX';
  static defaultTitle = 'Market Overview';

  constructor() {
    super();
    this._refreshRate = 30000; // REST fallback every 30s (WS handles real-time)
    this._sort = 'volume';
    this._dir = 'desc';
    this._wsUnsub = null;
  }

  connectedCallback() {
    super.connectedCallback();
    // Subscribe to WebSocket for real-time updates
    if (window.mefaiStream) {
      this._wsUnsub = window.mefaiStream.subscribeAll((prices) => {
        this._updatePricesFromWS(prices);
      });
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._wsUnsub) this._wsUnsub();
  }

  _updatePricesFromWS(prices) {
    if (!this._data?.length) return;
    const body = this.querySelector('.panel-body');
    if (!body) return;

    // Update prices in-place (DOM update, no full re-render)
    for (const row of body.querySelectorAll('tr[data-s]')) {
      const sym = row.dataset.s;
      const ws = prices.get(sym);
      if (!ws) continue;

      const cells = row.querySelectorAll('td');
      if (cells.length < 4) continue;

      const newPrice = parseFloat(ws.price);
      const newChange = parseFloat(ws.change);
      const u = window.mefaiUtils;

      // Update price cell
      cells[1].textContent = u.formatPrice(newPrice);

      // Update change cell with color
      const cls = newChange >= 0 ? 'val-up' : 'val-down';
      const ar = newChange >= 0 ? '↑' : '↓';
      cells[2].className = cls;
      cells[2].textContent = `${ar}${Math.abs(newChange).toFixed(2)}%`;

      // Also update internal data
      const item = this._data.find(d => d.fullSymbol === sym);
      if (item) {
        item.price = newPrice;
        item.change = newChange;
        item.volume = parseFloat(ws.volume || item.volume);
      }
    }
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
    const ws = window.mefaiStream?.connected;
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
      h += `<tr data-s="${escapeHtml(t.fullSymbol)}"><td style="font-weight:600">${escapeHtml(t.symbol)}</td>`;
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
