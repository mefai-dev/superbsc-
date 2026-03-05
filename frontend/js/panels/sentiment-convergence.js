// Derivatives Sentiment Convergence Engine — 6-source sentiment composite score
import { BasePanel } from '../components/base-panel.js';

const { formatPercent, formatCurrency } = window.mefaiUtils;

export class SentimentConvergencePanel extends BasePanel {
  static skill = 'Skill 40';
  static defaultTitle = 'Sentiment Convergence';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'convergence';
    this._sortDir = 'desc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT'];
  }

  async fetchData() {
    const [tickers, ...rest] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      ...this._symbols.flatMap(sym => [
        window.mefaiApi.futures.longShortRatio(sym, '1h', 1),
        window.mefaiApi.futures.topLongShortAccount(sym, '1h', 1),
        window.mefaiApi.futures.topLongShortPosition(sym, '1h', 1),
        window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),
        window.mefaiApi.futures.openInterestHist(sym, '1h', 2),
      ]),
    ]);

    const tickerMap = {};
    if (Array.isArray(tickers)) tickers.forEach(t => { tickerMap[t.symbol] = t; });

    return this._symbols.map((sym, i) => {
      const base = i * 5;
      return {
        symbol: sym,
        ticker: tickerMap[sym] || {},
        retailLS: rest[base],
        topAccount: rest[base + 1],
        topPosition: rest[base + 2],
        takerRatio: rest[base + 3],
        oiHist: rest[base + 4],
      };
    });
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Loading sentiment data...</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');

      // Extract signals (each normalized to -1..+1: positive=bullish)
      const retailRaw = Array.isArray(item.retailLS) ? item.retailLS[0] : item.retailLS;
      const topAcct = Array.isArray(item.topAccount) ? item.topAccount[0] : item.topAccount;
      const topPos = Array.isArray(item.topPosition) ? item.topPosition[0] : item.topPosition;
      const taker = Array.isArray(item.takerRatio) ? item.takerRatio[0] : item.takerRatio;
      const oiArr = Array.isArray(item.oiHist) ? item.oiHist : [];

      // 1. Retail sentiment: longShortRatio >1 = long, <1 = short
      const retailRatio = parseFloat(retailRaw?.longShortRatio || 1);
      const retailSignal = Math.max(-1, Math.min(1, (retailRatio - 1) * 5));

      // 2. Top trader accounts
      const topAcctRatio = parseFloat(topAcct?.longShortRatio || 1);
      const topAcctSignal = Math.max(-1, Math.min(1, (topAcctRatio - 1) * 5));

      // 3. Top trader positions (weighted by size)
      const topPosRatio = parseFloat(topPos?.longShortRatio || 1);
      const topPosSignal = Math.max(-1, Math.min(1, (topPosRatio - 1) * 5));

      // 4. Taker buy/sell: >1 = buyers aggressive, <1 = sellers
      const takerRatio = parseFloat(taker?.buySellRatio || 1);
      const takerSignal = Math.max(-1, Math.min(1, (takerRatio - 1) * 5));

      // 5. Funding rate: positive = longs paying, market is long
      const tk = item.ticker;
      const funding = parseFloat(tk?.lastFundingRate || 0);
      const fundingSignal = Math.max(-1, Math.min(1, funding * 10000));

      // 6. OI change: growing OI = conviction, shrinking = unwinding
      let oiSignal = 0;
      if (oiArr.length >= 2) {
        const latest = parseFloat(oiArr[oiArr.length - 1]?.sumOpenInterestValue || 0);
        const prev = parseFloat(oiArr[oiArr.length - 2]?.sumOpenInterestValue || 0);
        if (prev > 0) oiSignal = Math.max(-1, Math.min(1, ((latest / prev) - 1) * 50));
      }

      // Composite convergence score: average of all 6 signals
      const signals = [retailSignal, topAcctSignal, topPosSignal, takerSignal, fundingSignal, oiSignal];
      const avgSignal = signals.reduce((s, v) => s + v, 0) / signals.length;

      // Divergence: do smart money (topAcct + topPos) and retail agree?
      const smartAvg = (topAcctSignal + topPosSignal) / 2;
      const divergence = smartAvg - retailSignal;

      // Agreement: how many signals agree on direction?
      const bullCount = signals.filter(s => s > 0.05).length;
      const bearCount = signals.filter(s => s < -0.05).length;
      const agreement = Math.max(bullCount, bearCount);
      const convergence = Math.abs(avgSignal) * (agreement / 6);

      const change = parseFloat(tk?.priceChangePercent || 0);

      rows.push({
        symbol: sym, convergence,
        direction: avgSignal > 0.05 ? 'BULL' : avgSignal < -0.05 ? 'BEAR' : 'NEUTRAL',
        avgSignal, divergence, agreement, bullCount, bearCount,
        retailSignal, topAcctSignal, topPosSignal, takerSignal, fundingSignal, oiSignal,
        change,
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      if (this._sortKey === 'direction') return a.direction.localeCompare(b.direction) * dir;
      return ((Math.abs(a[this._sortKey]) || 0) - (Math.abs(b[this._sortKey]) || 0)) * dir;
    });

    const strongBull = rows.filter(r => r.convergence > 0.3 && r.avgSignal > 0).length;
    const strongBear = rows.filter(r => r.convergence > 0.3 && r.avgSignal < 0).length;
    const divergences = rows.filter(r => Math.abs(r.divergence) > 0.5).length;

    let h = '<style scoped>';
    h += '.sc-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.sc-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.sc-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.sc-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.sc-dots{display:inline-flex;gap:2px;vertical-align:middle}';
    h += '.sc-dot{width:8px;height:8px;border-radius:50%}';
    h += '.sc-badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:9px;font-weight:700}';
    h += '.sc-bull{background:#0ecb8133;color:#0ecb81}';
    h += '.sc-bear{background:#f6465d33;color:#f6465d}';
    h += '.sc-neutral{background:#33333366;color:var(--text-muted)}';
    h += '</style>';

    h += '<div class="sc-stats">';
    h += `<div class="sc-stat"><div class="sc-stat-label">Strong Bull</div><div class="sc-stat-value val-up">${strongBull}</div></div>`;
    h += `<div class="sc-stat"><div class="sc-stat-label">Divergences</div><div class="sc-stat-value" style="color:#f0b90b">${divergences}</div></div>`;
    h += `<div class="sc-stat"><div class="sc-stat-label">Strong Bear</div><div class="sc-stat-value val-down">${strongBear}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '50px' },
      { key: 'direction', label: 'Signal', align: 'center', render: v => {
        const cls = v === 'BULL' ? 'sc-bull' : v === 'BEAR' ? 'sc-bear' : 'sc-neutral';
        return `<span class="sc-badge ${cls}">${v}</span>`;
      }},
      { key: 'convergence', label: 'Strength', align: 'center', width: '90px', render: (v, row) => {
        // 6 dots showing each signal
        const sigs = [row.retailSignal, row.topAcctSignal, row.topPosSignal, row.takerSignal, row.fundingSignal, row.oiSignal];
        let dots = '<div class="sc-dots">';
        for (const s of sigs) {
          const c = s > 0.05 ? '#0ecb81' : s < -0.05 ? '#f6465d' : '#f0b90b';
          dots += `<div class="sc-dot" style="background:${c}" title="${s.toFixed(2)}"></div>`;
        }
        dots += '</div>';
        return `${dots} <span style="font-size:10px;font-weight:600">${(v * 100).toFixed(0)}%</span>`;
      }},
      { key: 'divergence', label: 'Smart/Retail', align: 'right', render: v => {
        if (Math.abs(v) < 0.1) return '<span style="color:var(--text-muted)">Aligned</span>';
        const cls = v > 0 ? 'val-up' : 'val-down';
        const label = v > 0 ? 'Smart Bull' : 'Smart Bear';
        return `<span class="${cls}" style="font-size:10px">${label}</span>`;
      }},
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
    if (body && this._data) body.innerHTML = this.renderContent(this._data);
    this.afterRender();
  }
}
customElements.define('sentiment-convergence-panel', SentimentConvergencePanel);
export default SentimentConvergencePanel;
