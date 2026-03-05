// Market Microstructure Health Index — 5 metrics fused into a single health score per pair
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class MicrostructureHealthPanel extends BasePanel {
  static skill = 'Skill 44';
  static defaultTitle = 'Microstructure Health';

  constructor() {
    super();
    this._refreshRate = 20000;
    this._sortKey = 'healthScore';
    this._sortDir = 'asc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT'];
  }

  async fetchData() {
    const [fTickers, fBook, sBook, premium, ...perSym] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      window.mefaiApi.futures.bookTicker(),
      window.mefaiApi.spot.bookTicker(),
      window.mefaiApi.futures.premiumIndex(),
      ...this._symbols.flatMap(sym => [
        window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),
        window.mefaiApi.futures.openInterestHist(sym, '1h', 3),
      ]),
    ]);
    const ftMap = {}, fbMap = {}, sbMap = {}, pmMap = {};
    if (Array.isArray(fTickers)) fTickers.forEach(t => { ftMap[t.symbol] = t; });
    if (Array.isArray(fBook)) fBook.forEach(b => { fbMap[b.symbol] = b; });
    if (Array.isArray(sBook)) sBook.forEach(b => { sbMap[b.symbol] = b; });
    if (Array.isArray(premium)) premium.forEach(p => { pmMap[p.symbol] = p; });
    return this._symbols.map((sym, i) => ({
      symbol: sym,
      ticker: ftMap[sym] || {},
      fBook: fbMap[sym] || {},
      sBook: sbMap[sym] || {},
      premium: pmMap[sym] || {},
      taker: perSym[i * 2],
      oiHist: perSym[i * 2 + 1],
    }));
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Loading health data...</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const fb = item.fBook;
      const sb = item.sBook;
      const pm = item.premium;
      const tk = item.ticker;
      const taker = Array.isArray(item.taker) ? item.taker[0] : item.taker;
      const oiArr = Array.isArray(item.oiHist) ? item.oiHist : [];

      const metrics = {};
      let healthScore = 100;

      // 1. Spread Quality (0-100, tighter = healthier)
      const fBid = parseFloat(fb.bidPrice || 0);
      const fAsk = parseFloat(fb.askPrice || 0);
      const fMid = (fBid + fAsk) / 2;
      const fSpreadBps = fMid > 0 ? ((fAsk - fBid) / fMid) * 10000 : 0;
      metrics.spreadBps = fSpreadBps;
      const spreadPenalty = Math.min(30, fSpreadBps * 3);
      healthScore -= spreadPenalty;

      // 2. Spot-Futures Alignment (low gap = healthy)
      const sBid = parseFloat(sb.bidPrice || 0);
      const sAsk = parseFloat(sb.askPrice || 0);
      const sMid = (sBid + sAsk) / 2;
      const sfGap = sMid > 0 ? Math.abs((fMid - sMid) / sMid) * 10000 : 0;
      metrics.sfGap = sfGap;
      const gapPenalty = Math.min(20, sfGap * 0.5);
      healthScore -= gapPenalty;

      // 3. Funding Stability (close to 0 = healthy)
      const funding = parseFloat(pm.lastFundingRate || 0);
      const fundingBps = Math.abs(funding * 10000);
      metrics.fundingBps = fundingBps;
      const fundingPenalty = Math.min(20, fundingBps * 1.5);
      healthScore -= fundingPenalty;

      // 4. Taker Balance (close to 1.0 = healthy, extreme = stressed)
      const takerRatio = parseFloat(taker?.buySellRatio || 1);
      const takerDeviation = Math.abs(takerRatio - 1);
      metrics.takerRatio = takerRatio;
      const takerPenalty = Math.min(15, takerDeviation * 30);
      healthScore -= takerPenalty;

      // 5. OI Stability (stable = healthy, rapid change = stressed)
      let oiVolatility = 0;
      if (oiArr.length >= 2) {
        const vals = oiArr.map(o => parseFloat(o?.sumOpenInterestValue || 0));
        const changes = [];
        for (let i = 1; i < vals.length; i++) {
          if (vals[i - 1] > 0) changes.push(Math.abs((vals[i] - vals[i - 1]) / vals[i - 1]) * 100);
        }
        oiVolatility = changes.length ? changes.reduce((s, v) => s + v, 0) / changes.length : 0;
      }
      metrics.oiVolatility = oiVolatility;
      const oiPenalty = Math.min(15, oiVolatility * 3);
      healthScore -= oiPenalty;

      healthScore = Math.max(0, Math.round(healthScore));
      const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : healthScore >= 20 ? 'D' : 'F';
      const change = parseFloat(tk.priceChangePercent || 0);

      rows.push({ symbol: sym, healthScore, grade, change, ...metrics, spreadPenalty, gapPenalty, fundingPenalty, takerPenalty, oiPenalty });
    }

    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      if (this._sortKey === 'grade') return a.grade.localeCompare(b.grade) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    const avgHealth = rows.length ? Math.round(rows.reduce((s, r) => s + r.healthScore, 0) / rows.length) : 0;
    const stressed = rows.filter(r => r.healthScore < 50).length;
    const healthy = rows.filter(r => r.healthScore >= 80).length;

    let h = '<style scoped>';
    h += '.mh-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.mh-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.mh-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.mh-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.mh-grade{font-size:12px;font-weight:800;width:22px;height:22px;border-radius:50%;display:inline-flex;align-items:center;justify-content:center}';
    h += '.mh-A{background:#0ecb8133;color:#0ecb81}';
    h += '.mh-B{background:#3b82f633;color:#3b82f6}';
    h += '.mh-C{background:#f0b90b33;color:#f0b90b}';
    h += '.mh-D{background:#f6465d33;color:#f6465d}';
    h += '.mh-F{background:#f6465d55;color:#f6465d}';
    h += '.mh-bar{width:60px;height:8px;border-radius:4px;background:var(--bg-secondary);overflow:hidden;display:inline-block;vertical-align:middle;margin-right:4px}';
    h += '.mh-bar-fill{height:100%;border-radius:4px}';
    h += '.mh-metrics{display:flex;gap:2px;flex-wrap:wrap}';
    h += '.mh-metric{font-size:7px;padding:0 3px;border-radius:2px;background:var(--bg-secondary);color:var(--text-muted)}';
    h += '.mh-metric-bad{background:#f6465d22;color:#f6465d}';
    h += '</style>';

    h += '<div class="mh-stats">';
    h += `<div class="mh-stat"><div class="mh-stat-label">Healthy</div><div class="mh-stat-value val-up">${healthy}</div></div>`;
    h += `<div class="mh-stat"><div class="mh-stat-label">Avg Score</div><div class="mh-stat-value">${avgHealth}</div></div>`;
    h += `<div class="mh-stat"><div class="mh-stat-label">Stressed</div><div class="mh-stat-value val-down">${stressed}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '50px' },
      { key: 'grade', label: '', align: 'center', width: '30px', render: v => `<span class="mh-grade mh-${v}">${v}</span>` },
      { key: 'healthScore', label: 'Health', align: 'center', width: '90px', render: v => {
        const color = v >= 80 ? '#0ecb81' : v >= 60 ? '#3b82f6' : v >= 40 ? '#f0b90b' : '#f6465d';
        return `<div class="mh-bar"><div class="mh-bar-fill" style="width:${v}%;background:${color}"></div></div><span style="font-size:10px;font-weight:700;color:${color}">${v}</span>`;
      }},
      { key: 'spreadBps', label: 'Penalties', align: 'left', width: '130px', render: (v, row) => {
        let m = '<div class="mh-metrics">';
        const items = [
          ['SPR', row.spreadPenalty], ['GAP', row.gapPenalty],
          ['FND', row.fundingPenalty], ['TKR', row.takerPenalty], ['OI', row.oiPenalty]
        ];
        for (const [label, penalty] of items) {
          const cls = penalty > 5 ? 'mh-metric-bad' : 'mh-metric';
          m += `<span class="${cls}">${label}${penalty > 0 ? '-' + Math.round(penalty) : ''}</span>`;
        }
        m += '</div>';
        return m;
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
customElements.define('microstructure-health-panel', MicrostructureHealthPanel);
export default MicrostructureHealthPanel;
