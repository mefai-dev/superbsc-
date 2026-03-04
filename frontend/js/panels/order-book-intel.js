// MEFAI Order Book Intelligence — Market microstructure analysis
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class OrderBookIntelPanel extends BasePanel {
  static skill = 'Skill 12';
  static defaultTitle = 'OB Intelligence';

  constructor() {
    super();
    this._refreshRate = 5000;
    this._symbol = 'BTCUSDT';
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsub = window.addEventListener?.call(window, 'tokenFocus', (e) => {
      const sym = e.detail?.symbol;
      if (sym && sym.endsWith('USDT')) {
        this._symbol = sym;
        this.refresh();
      }
    });
  }

  async fetchData() {
    const [depthRes, tradesRes] = await Promise.allSettled([
      window.mefaiApi.spot.depth(this._symbol, 100),
      window.mefaiApi.spot.trades(this._symbol, 100),
    ]);

    const depth = depthRes.status === 'fulfilled' ? depthRes.value : null;
    const trades = tradesRes.status === 'fulfilled' ? tradesRes.value : null;

    if (!depth?.bids?.length || !depth?.asks?.length) return null;

    const bids = depth.bids.map(([p, q]) => [parseFloat(p), parseFloat(q)]);
    const asks = depth.asks.map(([p, q]) => [parseFloat(p), parseFloat(q)]);

    // Bid/Ask Imbalance
    const bidTotal = bids.reduce((s, [, q]) => s + q, 0);
    const askTotal = asks.reduce((s, [, q]) => s + q, 0);
    const imbalance = bidTotal + askTotal > 0 ? ((bidTotal - askTotal) / (bidTotal + askTotal)) * 100 : 0;

    // Whale walls — orders > 3x average
    const avgBid = bidTotal / bids.length;
    const avgAsk = askTotal / asks.length;
    const bidWalls = bids.filter(([, q]) => q > avgBid * 3).sort((a, b) => b[1] - a[1]).slice(0, 5);
    const askWalls = asks.filter(([, q]) => q > avgAsk * 3).sort((a, b) => b[1] - a[1]).slice(0, 5);

    // Cumulative depth (top 10 levels)
    const cumBids = [];
    const cumAsks = [];
    let cb = 0, ca = 0;
    for (let i = 0; i < Math.min(10, bids.length); i++) { cb += bids[i][1]; cumBids.push({ price: bids[i][0], cum: cb }); }
    for (let i = 0; i < Math.min(10, asks.length); i++) { ca += asks[i][1]; cumAsks.push({ price: asks[i][0], cum: ca }); }

    // Spread
    const bestBid = bids[0][0];
    const bestAsk = asks[0][0];
    const spread = bestAsk - bestBid;
    const spreadPct = (spread / bestAsk) * 100;

    // Trade flow analysis (from recent trades)
    let buyVol = 0, sellVol = 0, buyCount = 0, sellCount = 0;
    let largestTrade = 0;
    const tradeList = Array.isArray(trades) ? trades : [];
    for (const t of tradeList) {
      const qty = parseFloat(t.qty || 0);
      const price = parseFloat(t.price || 0);
      const vol = qty * price;
      if (t.isBuyerMaker) { sellVol += vol; sellCount++; }
      else { buyVol += vol; buyCount++; }
      if (vol > largestTrade) largestTrade = vol;
    }
    const flowRatio = buyVol + sellVol > 0 ? (buyVol / (buyVol + sellVol)) * 100 : 50;

    // VWAP
    let vwapNum = 0, vwapDen = 0;
    for (const t of tradeList) {
      const p = parseFloat(t.price || 0);
      const q = parseFloat(t.qty || 0);
      vwapNum += p * q;
      vwapDen += q;
    }
    const vwap = vwapDen > 0 ? vwapNum / vwapDen : 0;

    return {
      symbol: this._symbol,
      bestBid, bestAsk, spread, spreadPct,
      imbalance, bidTotal, askTotal,
      bidWalls, askWalls,
      cumBids, cumAsks,
      buyVol, sellVol, flowRatio,
      buyCount, sellCount,
      largestTrade, vwap,
      totalTrades: tradeList.length,
    };
  }

  renderContent(data) {
    if (!data) return `<div class="panel-loading">${_t('ob.noData')}</div>`;

    const imbCls = data.imbalance > 10 ? 'val-up' : data.imbalance < -10 ? 'val-down' : '';
    const imbLabel = data.imbalance > 10 ? 'BUY PRESSURE' : data.imbalance < -10 ? 'SELL PRESSURE' : 'NEUTRAL';
    const flowCls = data.flowRatio > 55 ? 'val-up' : data.flowRatio < 45 ? 'val-down' : '';

    let h = '<style scoped>';
    h += `.obi-cards{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}`;
    h += `.obi-card{flex:1;min-width:70px;background:var(--panel-bg);border:1px solid var(--border);border-radius:6px;padding:5px 7px;text-align:center}`;
    h += `.obi-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}`;
    h += `.obi-val{font-size:12px;font-weight:700;margin-top:2px}`;
    h += `.obi-bar{height:8px;background:var(--border);border-radius:4px;margin:6px 0;display:flex;overflow:hidden}`;
    h += `.obi-bar-bid{background:#0ecb81;transition:width .3s}.obi-bar-ask{background:#f6465d;transition:width .3s}`;
    h += `.obi-section{margin:6px 0;font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase}`;
    h += `.wall-row{display:flex;justify-content:space-between;padding:2px 0;font-size:11px;border-bottom:1px solid var(--border)}`;
    h += `.wall-price{font-weight:600}.wall-qty{color:var(--text-muted)}`;
    h += '</style>';

    // Symbol header
    h += `<div style="text-align:center;margin-bottom:6px;font-weight:700;font-size:13px">${escapeHtml(data.symbol.replace('USDT', '/USDT'))}</div>`;

    // Summary cards
    h += '<div class="obi-cards">';
    h += `<div class="obi-card"><div class="obi-label">${_t('ob.imbalance')}</div><div class="obi-val ${imbCls}">${data.imbalance >= 0 ? '+' : ''}${data.imbalance.toFixed(1)}%</div><div style="font-size:8px;color:var(--text-muted)">${imbLabel}</div></div>`;
    h += `<div class="obi-card"><div class="obi-label">${_t('ob.spread')}</div><div class="obi-val">$${formatPrice(data.spread)}</div><div style="font-size:8px;color:var(--text-muted)">${data.spreadPct.toFixed(3)}%</div></div>`;
    h += `<div class="obi-card"><div class="obi-label">${_t('ob.flow')}</div><div class="obi-val ${flowCls}">${data.flowRatio.toFixed(0)}% Buy</div></div>`;
    h += `<div class="obi-card"><div class="obi-label">VWAP</div><div class="obi-val">$${formatPrice(data.vwap)}</div></div>`;
    h += '</div>';

    // Buy/Sell flow bar
    h += '<div class="obi-bar">';
    h += `<div class="obi-bar-bid" style="width:${data.flowRatio}%"></div>`;
    h += `<div class="obi-bar-ask" style="width:${100 - data.flowRatio}%"></div>`;
    h += '</div>';
    h += `<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px">`;
    h += `<span class="val-up">Buy: ${formatCurrency(data.buyVol)} (${data.buyCount})</span>`;
    h += `<span class="val-down">Sell: ${formatCurrency(data.sellVol)} (${data.sellCount})</span>`;
    h += '</div>';

    // Bid depth bar
    const maxDepth = Math.max(data.bidTotal, data.askTotal);
    const bidPct = maxDepth > 0 ? (data.bidTotal / maxDepth) * 100 : 50;
    const askPct = maxDepth > 0 ? (data.askTotal / maxDepth) * 100 : 50;
    h += `<div class="obi-section">${_t('ob.depthBalance')}</div>`;
    h += '<div class="obi-bar">';
    h += `<div class="obi-bar-bid" style="width:${bidPct}%"></div>`;
    h += `<div class="obi-bar-ask" style="width:${askPct}%"></div>`;
    h += '</div>';
    h += `<div style="display:flex;justify-content:space-between;font-size:10px;margin-bottom:6px">`;
    h += `<span class="val-up">Bids: ${formatNumber(data.bidTotal)}</span>`;
    h += `<span class="val-down">Asks: ${formatNumber(data.askTotal)}</span>`;
    h += '</div>';

    // Whale walls
    if (data.bidWalls.length || data.askWalls.length) {
      h += `<div class="obi-section">${_t('ob.whaleWalls')}</div>`;
      for (const [price, qty] of data.bidWalls) {
        h += `<div class="wall-row"><span class="wall-price val-up">$${formatPrice(price)}</span><span class="wall-qty">${formatNumber(qty)} (BID)</span></div>`;
      }
      for (const [price, qty] of data.askWalls) {
        h += `<div class="wall-row"><span class="wall-price val-down">$${formatPrice(price)}</span><span class="wall-qty">${formatNumber(qty)} (ASK)</span></div>`;
      }
    }

    // Largest trade
    if (data.largestTrade > 0) {
      h += `<div style="margin-top:6px;font-size:10px;color:var(--text-muted)">Largest trade: ${formatCurrency(data.largestTrade)} | Trades: ${data.totalTrades}</div>`;
    }

    return h;
  }

  afterRender() {}
}
customElements.define('order-book-intel-panel', OrderBookIntelPanel);
export default OrderBookIntelPanel;
