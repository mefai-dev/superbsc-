// MEFAI Order Book Panel — spot.depth() data. Green bids, red asks.
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatNumber, escapeHtml } = window.mefaiUtils;

export class OrderBookPanel extends BasePanel {
  static skill = 'Skill 1';
  static defaultTitle = 'Order Book';

  constructor() {
    super();
    this._refreshRate = 3000;
    this._symbol = 'BTCUSDT';
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.symbol && token.platform === 'spot' && token.symbol !== this._symbol) {
        this._symbol = token.symbol;
        this.refresh();
      }
    });
    const current = window.mefaiStore?.get('focusedToken');
    if (current?.symbol && current.platform === 'spot') {
      this._symbol = current.symbol;
      this.refresh();
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) this._unsubscribe();
  }

  async fetchData() {
    const res = await window.mefaiApi.spot.depth(this._symbol, 20);
    if (!res || res?.error || res?.code === '000002') return { bids: [], asks: [], symbol: this._symbol };
    // spot.depth() returns {bids: [[price,qty]], asks: [[price,qty]]}
    const raw = res?.data || res;
    return {
      symbol: this._symbol,
      bids: Array.isArray(raw?.bids) ? raw.bids : [],
      asks: Array.isArray(raw?.asks) ? raw.asks : [],
    };
  }

  renderContent(data) {
    if (!data || (!data.bids?.length && !data.asks?.length)) {
      return `<div class="panel-loading" style="flex-direction:column;gap:4px;text-align:center">
        <div>No depth data for ${escapeHtml(this._symbol || 'selected pair')}</div>
        <div style="font-size:10px;color:var(--text-muted)">Select a trading pair to view the order book</div>
      </div>`;
    }

    const bids = data.bids.slice(0, 15).map(b => ({
      price: parseFloat(b[0] || 0),
      qty: parseFloat(b[1] || 0),
    }));
    const asks = data.asks.slice(0, 15).map(a => ({
      price: parseFloat(a[0] || 0),
      qty: parseFloat(a[1] || 0),
    }));

    const maxBidQty = Math.max(...bids.map(b => b.qty), 1);
    const maxAskQty = Math.max(...asks.map(a => a.qty), 1);

    const bestBid = bids.length ? bids[0].price : 0;
    const bestAsk = asks.length ? asks[0].price : 0;
    const midPrice = bestBid && bestAsk ? (bestBid + bestAsk) / 2 : bestBid || bestAsk;
    const spread = bestBid && bestAsk ? bestAsk - bestBid : 0;
    const spreadPct = midPrice ? (spread / midPrice * 100) : 0;

    const askRows = asks.slice().reverse().map(a => {
      const pct = (a.qty / maxAskQty * 100).toFixed(1);
      return `<tr class="depth-row">
        <td style="text-align:right">${formatNumber(a.qty)}</td>
        <td style="text-align:right" class="val-down">${formatPrice(a.price)}</td>
        <td style="position:relative;width:60px"><div class="depth-bar depth-ask" style="width:${pct}%"></div></td>
      </tr>`;
    }).join('');

    const bidRows = bids.map(b => {
      const pct = (b.qty / maxBidQty * 100).toFixed(1);
      return `<tr class="depth-row">
        <td style="text-align:right">${formatNumber(b.qty)}</td>
        <td style="text-align:right" class="val-up">${formatPrice(b.price)}</td>
        <td style="position:relative;width:60px"><div class="depth-bar depth-bid" style="width:${pct}%"></div></td>
      </tr>`;
    }).join('');

    return `
      <div style="font-size:10px;padding:4px 0;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px;">
        ${escapeHtml(data.symbol)}
      </div>
      <table class="data-table" style="margin-bottom:0">
        <thead><tr>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Ask</th>
          <th>Depth</th>
        </tr></thead>
        <tbody>${askRows}</tbody>
      </table>
      <div style="padding:6px 8px;border:1px solid var(--border);border-left:none;border-right:none;font-size:11px;display:flex;justify-content:space-between">
        <span style="font-weight:700">${formatPrice(midPrice)}</span>
        <span style="color:var(--text-muted)">Spread: ${formatPrice(spread)} (${spreadPct.toFixed(3)}%)</span>
      </div>
      <table class="data-table" style="margin-top:0">
        <thead><tr>
          <th style="text-align:right">Qty</th>
          <th style="text-align:right">Bid</th>
          <th>Depth</th>
        </tr></thead>
        <tbody>${bidRows}</tbody>
      </table>
    `;
  }
}

customElements.define('order-book-panel', OrderBookPanel);
export default OrderBookPanel;
