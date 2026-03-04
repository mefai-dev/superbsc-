// Taker Pressure Scanner — Buy/sell volume pressure across top futures pairs
import { BasePanel } from '../components/base-panel.js';

const { formatPercent, formatCurrency } = window.mefaiUtils;

export class TakerPressurePanel extends BasePanel {
  static skill = 'Skill 30';
  static defaultTitle = 'Taker Pressure';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'ratio';
    this._sortDir = 'desc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT','OPUSDT','SUIUSDT','INJUSDT','NEARUSDT'];
  }

  async fetchData() {
    const results = await Promise.all(
      this._symbols.map(async sym => {
        const [taker, ticker] = await Promise.all([
          window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),
          window.mefaiApi.futures.ticker24hr(sym),
        ]);
        return { symbol: sym, taker, ticker };
      })
    );
    return results;
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Unable to load taker data</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const t = Array.isArray(item.taker) ? item.taker[0] : item.taker;
      const tk = Array.isArray(item.ticker) ? item.ticker[0] : item.ticker;
      const ratio = parseFloat(t?.buySellRatio || 1);
      const buyVol = parseFloat(t?.buyVol || 0);
      const sellVol = parseFloat(t?.sellVol || 0);
      const price = parseFloat(tk?.lastPrice || 0);
      const change = parseFloat(tk?.priceChangePercent || 0);
      const volume = parseFloat(tk?.quoteVolume || 0);
      const buyPct = buyVol + sellVol > 0 ? (buyVol / (buyVol + sellVol)) * 100 : 50;

      rows.push({ symbol: sym, ratio, buyVol, sellVol, buyPct, price, change, volume });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const bullish = rows.filter(r => r.ratio > 1.1).length;
    const bearish = rows.filter(r => r.ratio < 0.9).length;
    const avgRatio = rows.length ? rows.reduce((s, r) => s + r.ratio, 0) / rows.length : 1;

    let h = '<style scoped>';
    h += '.tp-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.tp-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.tp-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.tp-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.tp-bar{display:flex;height:14px;border-radius:3px;overflow:hidden}';
    h += '.tp-bar-buy{background:#0ecb81;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:600}';
    h += '.tp-bar-sell{background:#f6465d;display:flex;align-items:center;justify-content:center;font-size:8px;color:#fff;font-weight:600}';
    h += '</style>';

    h += '<div class="tp-stats">';
    h += `<div class="tp-stat"><div class="tp-stat-label">Buy Dominant</div><div class="tp-stat-value val-up">${bullish}</div></div>`;
    h += `<div class="tp-stat"><div class="tp-stat-label">Avg B/S Ratio</div><div class="tp-stat-value">${avgRatio.toFixed(3)}</div></div>`;
    h += `<div class="tp-stat"><div class="tp-stat-label">Sell Dominant</div><div class="tp-stat-value val-down">${bearish}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px' },
      { key: 'ratio', label: 'B/S Ratio', align: 'right', render: v => {
        const cls = v > 1.05 ? 'val-up' : v < 0.95 ? 'val-down' : '';
        return `<span class="${cls}">${v.toFixed(3)}</span>`;
      }},
      { key: 'buyPct', label: 'Buy/Sell', align: 'center', width: '100px', render: v => {
        return `<div class="tp-bar"><div class="tp-bar-buy" style="width:${v}%">${v.toFixed(0)}%</div><div class="tp-bar-sell" style="width:${100-v}%">${(100-v).toFixed(0)}%</div></div>`;
      }},
      { key: 'volume', label: 'Volume', align: 'right', render: v => formatCurrency(v) },
      { key: 'change', label: '24h%', align: 'right', render: v => formatPercent(v) },
    ];
    h += renderTable(cols, rows, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    const { bindTableEvents } = window.mefaiTable;
    bindTableEvents(body, [], [], {
      onSort: key => {
        if (this._sortKey === key) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        else { this._sortKey = key; this._sortDir = 'desc'; }
        this._renderBody();
      }
    });
  }

  _renderBody() {
    const body = this.querySelector('.panel-body');
    if (body && this._lastData) body.innerHTML = this.renderContent(this._lastData);
    this.afterRender();
  }
}
customElements.define('taker-pressure-panel', TakerPressurePanel);
export default TakerPressurePanel;
