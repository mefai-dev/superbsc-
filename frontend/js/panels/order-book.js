// MEFAI Order Book — Professional Binance-style depth view
import { BasePanel } from '../components/base-panel.js';

export class OrderBookPanel extends BasePanel {
  static skill = 'Skill 1';
  static defaultTitle = 'Order Book';

  constructor() {
    super();
    this._refreshRate = 1500;
    this._symbol = 'BTCUSDT';
    this._unsubscribe = null;
    this._precision = 2;
    this._depth = 20; // 1, 10, 20 (100 mapped to 20 in API but shows more rows)
  }

  connectedCallback() {
    this.classList.add('panel');
    this._renderShell();
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
    this.startAutoRefresh();
  }

  disconnectedCallback() {
    this.stopAutoRefresh();
    if (this._unsubscribe) this._unsubscribe();
  }

  _renderShell() {
    const u = window.mefaiUtils;
    this.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="panel-title">Order Book</span>
          <span class="panel-skill">Skill 1</span>
        </div>
        <div class="panel-actions" style="display:flex;gap:4px;align-items:center">
          <span style="font-size:9px;color:var(--text-muted)">Depth:</span>
          ${[5, 10, 20].map(d => `<button class="btn ob-depth-btn${this._depth === d ? ' btn-primary' : ''}" data-d="${d}" style="font-size:9px;padding:1px 6px">${d}</button>`).join('')}
          <button class="panel-refresh" title="Refresh">↻</button>
        </div>
      </div>
      <div class="panel-body" style="padding:0">
        ${this._skeletonHTML()}
      </div>`;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.ob-depth-btn').forEach(b => b.addEventListener('click', () => {
      this._depth = parseInt(b.dataset.d);
      this.querySelectorAll('.ob-depth-btn').forEach(x => x.classList.remove('btn-primary'));
      b.classList.add('btn-primary');
      this.refresh();
    }));
    this.refresh();
  }

  async fetchData() {
    const limit = this._depth;
    const res = await window.mefaiApi.spot.depth(this._symbol, limit);
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

    const rows = this._depth;
    const bids = data.bids.slice(0, rows).map(b => ({ p: parseFloat(b[0]), q: parseFloat(b[1]) }));
    const asks = data.asks.slice(0, rows).map(a => ({ p: parseFloat(a[0]), q: parseFloat(a[1]) }));

    if (bids[0]) {
      const ps = bids[0].p.toString();
      const dot = ps.indexOf('.');
      this._precision = dot >= 0 ? ps.length - dot - 1 : 2;
    }

    let ct = 0; bids.forEach(b => { ct += b.q; b.t = ct; });
    ct = 0; asks.forEach(a => { ct += a.q; a.t = ct; });
    const maxT = Math.max(bids[bids.length - 1]?.t || 1, asks[asks.length - 1]?.t || 1);

    const bp = bids[0]?.p || 0, ap = asks[0]?.p || 0;
    const mid = bp && ap ? (bp + ap) / 2 : bp || ap;
    const spr = bp && ap ? ap - bp : 0;
    const sprP = mid ? (spr / mid * 100) : 0;
    const sym = data.symbol.replace('USDT', '');

    const askHTML = asks.slice().reverse().map(a => {
      const w = (a.t / maxT * 100).toFixed(1);
      return `<tr class="ob-row">
        <td class="ob-bg"><div class="ob-depth ob-depth-ask" style="width:${w}%"></div></td>
        <td class="ob-price ask-price">${this._fmtPrice(a.p)}</td>
        <td class="ob-qty">${this._fmtQty(a.q)}</td>
        <td class="ob-total">${this._fmtQty(a.t)}</td>
      </tr>`;
    }).join('');

    const bidHTML = bids.map(b => {
      const w = (b.t / maxT * 100).toFixed(1);
      return `<tr class="ob-row">
        <td class="ob-bg"><div class="ob-depth ob-depth-bid" style="width:${w}%"></div></td>
        <td class="ob-price bid-price">${this._fmtPrice(b.p)}</td>
        <td class="ob-qty">${this._fmtQty(b.q)}</td>
        <td class="ob-total">${this._fmtQty(b.t)}</td>
      </tr>`;
    }).join('');

    const midDir = bp >= mid;
    const midColor = midDir ? '#0ecb81' : '#f6465d';
    const midArrow = midDir ? '▲' : '▼';

    return `<style>
.ob-wrap{display:flex;flex-direction:column;height:100%;overflow:hidden;font-variant-numeric:tabular-nums;font-size:11px}
.ob-cols{display:grid;grid-template-columns:1fr 1fr 1fr;padding:3px 10px;font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.3px;font-weight:700;border-bottom:1px solid var(--border);flex-shrink:0}
.ob-cols span:nth-child(2),.ob-cols span:nth-child(3){text-align:right}
.ob-scroll{flex:1;overflow-y:auto;overflow-x:hidden;min-height:0}
.ob-tbl{width:100%;border-collapse:collapse;table-layout:fixed}
.ob-row{position:relative;height:20px;transition:background .1s}
.ob-row:hover{background:rgba(255,255,255,.03)}
.ob-bg{position:absolute;inset:0;padding:0;z-index:0;pointer-events:none;width:100%;border:none}
.ob-price,.ob-qty,.ob-total{padding:0 10px;line-height:20px;position:relative;z-index:1;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.ob-price{font-weight:700;width:35%}
.ob-qty{text-align:right;width:30%;color:var(--text-secondary)}
.ob-total{text-align:right;width:25%;color:var(--text-muted);font-size:10px}
.ask-price{color:#f6465d}
.bid-price{color:#0ecb81}
.ob-depth{position:absolute;top:0;right:0;height:100%;pointer-events:none;z-index:0;transition:width .3s ease}
.ob-depth-ask{background:rgba(246,70,93,.12)}
.ob-depth-bid{background:rgba(14,203,129,.12)}
.ob-mid{display:flex;justify-content:space-between;align-items:center;padding:6px 10px;border-top:1px solid var(--border);border-bottom:1px solid var(--border);flex-shrink:0}
.ob-mid-price{font-size:18px;font-weight:900;letter-spacing:.5px;display:flex;align-items:center;gap:6px}
.ob-mid-spread{font-size:9px;color:var(--text-muted)}
.ob-mid-usd{font-size:9px;color:var(--text-secondary)}
</style>
<div class="ob-wrap">
  <div class="ob-cols"><span>Price(USDT)</span><span>Amount(${u.escapeHtml(sym)})</span><span>Total</span></div>
  <div class="ob-scroll">
    <table class="ob-tbl"><tbody>${askHTML}</tbody></table>
  </div>
  <div class="ob-mid">
    <span class="ob-mid-price">
      <span style="color:${midColor};font-size:14px">${midArrow}</span>
      <span style="color:${midColor}">${u.formatPrice(mid)}</span>
    </span>
    <div style="display:flex;flex-direction:column;align-items:flex-end">
      <span class="ob-mid-usd">≈ $${u.formatPrice(mid)}</span>
      <span class="ob-mid-spread">Spread: ${u.formatPrice(spr)} (${sprP.toFixed(3)}%)</span>
    </div>
  </div>
  <div class="ob-scroll">
    <table class="ob-tbl"><tbody>${bidHTML}</tbody></table>
  </div>
</div>`;
  }

  _fmtPrice(n) {
    return n.toFixed(this._precision);
  }

  _fmtQty(n) {
    if (n >= 1000000) return (n / 1000000).toFixed(2) + 'M';
    if (n >= 1000) return (n / 1000).toFixed(2) + 'K';
    if (n >= 1) return n.toFixed(4);
    return n.toFixed(6);
  }
}

customElements.define('order-book-panel', OrderBookPanel);
export default OrderBookPanel;
