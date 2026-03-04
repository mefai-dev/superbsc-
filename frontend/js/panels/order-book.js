// MEFAI Order Book Panel — Binance-style depth view with full-width colored bars
import { BasePanel } from '../components/base-panel.js';

export class OrderBookPanel extends BasePanel {
  static skill = 'Skill 1';
  static defaultTitle = 'Order Book';

  constructor() {
    super();
    this._refreshRate = 2000;
    this._symbol = 'BTCUSDT';
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.symbol && token.platform === 'spot') {
        const sym = token.symbol.endsWith('USDT') ? token.symbol : token.symbol + 'USDT';
        if (sym !== this._symbol) { this._symbol = sym; this.refresh(); }
      }
    });
    const cur = window.mefaiStore?.get('focusedToken');
    if (cur?.symbol && cur.platform === 'spot') {
      this._symbol = cur.symbol.endsWith('USDT') ? cur.symbol : cur.symbol + 'USDT';
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) this._unsubscribe();
  }

  async fetchData() {
    const res = await window.mefaiApi.spot.depth(this._symbol, 20);
    if (!res || res?.error) return { bids: [], asks: [], symbol: this._symbol };
    const raw = res?.data || res;
    return {
      symbol: this._symbol,
      bids: Array.isArray(raw?.bids) ? raw.bids : [],
      asks: Array.isArray(raw?.asks) ? raw.asks : [],
    };
  }

  renderContent(data) {
    const u = window.mefaiUtils;
    if (!data || (!data.bids?.length && !data.asks?.length)) {
      return `<div class="panel-loading">Waiting for ${u.escapeHtml(this._symbol)} depth…</div>`;
    }

    const bids = data.bids.slice(0, 18).map(b => ({ p: parseFloat(b[0]), q: parseFloat(b[1]) }));
    const asks = data.asks.slice(0, 18).map(a => ({ p: parseFloat(a[0]), q: parseFloat(a[1]) }));

    // Cumulative totals
    let ct = 0; bids.forEach(b => { ct += b.q; b.t = ct; });
    ct = 0; asks.forEach(a => { ct += a.q; a.t = ct; });
    const maxT = Math.max(bids[bids.length - 1]?.t || 1, asks[asks.length - 1]?.t || 1);

    const bp = bids[0]?.p || 0, ap = asks[0]?.p || 0;
    const mid = bp && ap ? (bp + ap) / 2 : bp || ap;
    const spr = bp && ap ? ap - bp : 0;
    const sprP = mid ? (spr / mid * 100) : 0;
    const sym = data.symbol.replace('USDT', '');

    // Ask rows — reversed so lowest ask is nearest to spread
    const askHTML = asks.slice().reverse().map(a => {
      const w = (a.t / maxT * 100).toFixed(1);
      return `<tr class="ob-r">
        <td class="ob-c ob-bg"><div class="ob-bar ob-bar-ask" style="width:${w}%"></div></td>
        <td class="ob-c ob-p ask-c">${u.formatPrice(a.p)}</td>
        <td class="ob-c ob-q">${this._fmtQty(a.q)}</td>
        <td class="ob-c ob-t">${this._fmtQty(a.t)}</td>
      </tr>`;
    }).join('');

    // Bid rows
    const bidHTML = bids.map(b => {
      const w = (b.t / maxT * 100).toFixed(1);
      return `<tr class="ob-r">
        <td class="ob-c ob-bg"><div class="ob-bar ob-bar-bid" style="width:${w}%"></div></td>
        <td class="ob-c ob-p bid-c">${u.formatPrice(b.p)}</td>
        <td class="ob-c ob-q">${this._fmtQty(b.q)}</td>
        <td class="ob-c ob-t">${this._fmtQty(b.t)}</td>
      </tr>`;
    }).join('');

    return `<style>
.ob-wrap{display:flex;flex-direction:column;height:100%;overflow:hidden;font-variant-numeric:tabular-nums}
.ob-head{display:flex;justify-content:space-between;padding:4px 8px;font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px;border-bottom:1px solid var(--border);flex-shrink:0}
.ob-cols{display:flex;padding:2px 8px;font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.3px;font-weight:600;border-bottom:1px solid var(--border);flex-shrink:0}
.ob-cols span{flex:1;text-align:right}.ob-cols span:first-child{text-align:left}
.ob-scroll{flex:1;overflow-y:auto;overflow-x:hidden}
.ob-tbl{width:100%;border-collapse:collapse;table-layout:fixed}
.ob-r{position:relative;height:22px}
.ob-r:hover{background:rgba(255,255,255,.04)}
.ob-c{padding:0 8px;font-size:11px;line-height:22px;text-align:right;position:relative;z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ob-bg{position:absolute;inset:0;padding:0;z-index:0;pointer-events:none;width:100%}
.ob-bar{position:absolute;top:0;right:0;height:100%;pointer-events:none}
.ob-bar-ask{background:rgba(246,70,93,.15)}
.ob-bar-bid{background:rgba(14,203,129,.15)}
.ob-p{font-weight:600;width:35%}
.ob-q{width:25%;color:var(--text-secondary)}
.ob-t{width:25%;color:var(--text-muted);font-size:10px}
.ask-c{color:#f6465d}
.bid-c{color:#0ecb81}
.ob-mid{display:flex;justify-content:space-between;align-items:center;padding:8px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);background:var(--bg);flex-shrink:0}
.ob-mid-p{font-size:16px;font-weight:800;letter-spacing:.5px}
.ob-mid-s{font-size:10px;color:var(--text-muted)}
.ob-mid-arr{font-size:12px;margin-right:4px}
</style>
<div class="ob-wrap">
  <div class="ob-head">
    <span>${u.escapeHtml(sym)}/USDT Order Book</span>
    <span style="color:#0ecb81">● Live</span>
  </div>
  <div class="ob-cols"><span>Price</span><span>Amount</span><span>Total</span></div>
  <div class="ob-scroll">
    <table class="ob-tbl"><tbody>${askHTML}</tbody></table>
  </div>
  <div class="ob-mid">
    <span class="ob-mid-p"><span class="ob-mid-arr" style="color:${bp >= mid ? '#0ecb81' : '#f6465d'}">${bp >= mid ? '▲' : '▼'}</span>${u.formatPrice(mid)}</span>
    <span class="ob-mid-s">Spread ${u.formatPrice(spr)} (${sprP.toFixed(3)}%)</span>
  </div>
  <div class="ob-scroll">
    <table class="ob-tbl"><tbody>${bidHTML}</tbody></table>
  </div>
</div>`;
  }

  _fmtQty(n) {
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  }
}

customElements.define('order-book-panel', OrderBookPanel);
export default OrderBookPanel;
