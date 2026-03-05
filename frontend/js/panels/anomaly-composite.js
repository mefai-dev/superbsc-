// Composite Anomaly Detector — 6 independent anomaly signals fused into one alert system
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class AnomalyCompositePanel extends BasePanel {
  static skill = 'Skill 42';
  static defaultTitle = 'Anomaly Composite';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'anomalyCount';
    this._sortDir = 'desc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT'];
  }

  async fetchData() {
    const [fTickers, premium, fBook, sBook, ...perSym] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      window.mefaiApi.futures.premiumIndex(),
      window.mefaiApi.futures.bookTicker(),
      window.mefaiApi.spot.bookTicker(),
      ...this._symbols.flatMap(sym => [
        window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),
        window.mefaiApi.futures.openInterestHist(sym, '1h', 3),
      ]),
    ]);
    const ftMap = {}, pmMap = {}, fbMap = {}, sbMap = {};
    if (Array.isArray(fTickers)) fTickers.forEach(t => { ftMap[t.symbol] = t; });
    if (Array.isArray(premium)) premium.forEach(p => { pmMap[p.symbol] = p; });
    if (Array.isArray(fBook)) fBook.forEach(b => { fbMap[b.symbol] = b; });
    if (Array.isArray(sBook)) sBook.forEach(b => { sbMap[b.symbol] = b; });
    return this._symbols.map((sym, i) => ({
      symbol: sym,
      ticker: ftMap[sym] || {},
      premium: pmMap[sym] || {},
      fBook: fbMap[sym] || {},
      sBook: sbMap[sym] || {},
      taker: perSym[i * 2],
      oiHist: perSym[i * 2 + 1],
    }));
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Loading anomaly data...</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const tk = item.ticker;
      const pm = item.premium;
      const fb = item.fBook;
      const sb = item.sBook;
      const taker = Array.isArray(item.taker) ? item.taker[0] : item.taker;
      const oiArr = Array.isArray(item.oiHist) ? item.oiHist : [];

      const anomalies = [];

      // 1. VWAP Deviation
      const price = parseFloat(tk.lastPrice || 0);
      const vwap = parseFloat(tk.weightedAvgPrice || price);
      const vwapDev = vwap > 0 ? ((price - vwap) / vwap) * 100 : 0;
      if (Math.abs(vwapDev) > 1.5) anomalies.push({ type: 'VWAP', value: vwapDev, dir: vwapDev > 0 ? 'up' : 'down' });

      // 2. Volume Anomaly (trade count as proxy for unusual activity)
      const change24h = parseFloat(tk.priceChangePercent || 0);
      const volume = parseFloat(tk.quoteVolume || 0);
      if (Math.abs(change24h) > 8) anomalies.push({ type: 'MOVE', value: change24h, dir: change24h > 0 ? 'up' : 'down' });

      // 3. Funding Rate Anomaly
      const funding = parseFloat(pm.lastFundingRate || 0);
      const fundingBps = funding * 10000;
      if (Math.abs(fundingBps) > 10) anomalies.push({ type: 'FUND', value: fundingBps, dir: funding > 0 ? 'up' : 'down' });

      // 4. OI Spike
      let oiChange = 0;
      if (oiArr.length >= 2) {
        const latest = parseFloat(oiArr[oiArr.length - 1]?.sumOpenInterestValue || 0);
        const prev = parseFloat(oiArr[0]?.sumOpenInterestValue || 0);
        if (prev > 0) oiChange = ((latest - prev) / prev) * 100;
      }
      if (Math.abs(oiChange) > 3) anomalies.push({ type: 'OI', value: oiChange, dir: oiChange > 0 ? 'up' : 'down' });

      // 5. Spread Anomaly (futures vs spot price gap)
      const spotMid = sb.bidPrice && sb.askPrice ? (parseFloat(sb.bidPrice) + parseFloat(sb.askPrice)) / 2 : 0;
      const futMid = fb.bidPrice && fb.askPrice ? (parseFloat(fb.bidPrice) + parseFloat(fb.askPrice)) / 2 : 0;
      const sfGap = spotMid > 0 ? ((futMid - spotMid) / spotMid) * 10000 : 0;
      if (Math.abs(sfGap) > 15) anomalies.push({ type: 'SPREAD', value: sfGap, dir: sfGap > 0 ? 'up' : 'down' });

      // 6. Taker Flow Anomaly
      const takerRatio = parseFloat(taker?.buySellRatio || 1);
      if (takerRatio > 1.4 || takerRatio < 0.7) anomalies.push({ type: 'FLOW', value: (takerRatio - 1) * 100, dir: takerRatio > 1 ? 'up' : 'down' });

      const anomalyCount = anomalies.length;
      const severity = anomalyCount >= 4 ? 'CRITICAL' : anomalyCount >= 3 ? 'HIGH' : anomalyCount >= 2 ? 'MEDIUM' : anomalyCount >= 1 ? 'LOW' : 'NORMAL';

      rows.push({ symbol: sym, anomalies, anomalyCount, severity, change24h, price, volume, vwapDev, fundingBps, oiChange, takerRatio, sfGap });
    }

    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    const critical = rows.filter(r => r.anomalyCount >= 4).length;
    const high = rows.filter(r => r.anomalyCount === 3).length;
    const totalAnomalies = rows.reduce((s, r) => s + r.anomalyCount, 0);

    let h = '<style scoped>';
    h += '.ac-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.ac-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.ac-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.ac-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.ac-tags{display:flex;flex-wrap:wrap;gap:2px}';
    h += '.ac-tag{display:inline-block;padding:1px 4px;border-radius:3px;font-size:7px;font-weight:700;line-height:1.4}';
    h += '.ac-tag-up{background:#0ecb8133;color:#0ecb81}';
    h += '.ac-tag-down{background:#f6465d33;color:#f6465d}';
    h += '.ac-sev{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px}';
    h += '.ac-CRITICAL{background:#f6465d33;color:#f6465d}';
    h += '.ac-HIGH{background:#f0b90b33;color:#f0b90b}';
    h += '.ac-MEDIUM{background:#3b82f633;color:#3b82f6}';
    h += '.ac-LOW{background:#33333366;color:var(--text-muted)}';
    h += '.ac-NORMAL{background:#0ecb8122;color:#0ecb81}';
    h += '</style>';

    h += '<div class="ac-stats">';
    h += `<div class="ac-stat"><div class="ac-stat-label">Critical</div><div class="ac-stat-value" style="color:#f6465d">${critical}</div></div>`;
    h += `<div class="ac-stat"><div class="ac-stat-label">High Alert</div><div class="ac-stat-value" style="color:#f0b90b">${high}</div></div>`;
    h += `<div class="ac-stat"><div class="ac-stat-label">Total Anomalies</div><div class="ac-stat-value">${totalAnomalies}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '50px' },
      { key: 'severity', label: 'Level', align: 'center', render: v => `<span class="ac-sev ac-${v}">${v}</span>` },
      { key: 'anomalyCount', label: 'Signals', align: 'center', width: '120px', render: (v, row) => {
        if (!row.anomalies.length) return '<span style="color:var(--text-muted)">Normal</span>';
        let tags = '<div class="ac-tags">';
        for (const a of row.anomalies) {
          tags += `<span class="ac-tag ac-tag-${a.dir}">${a.type}</span>`;
        }
        tags += '</div>';
        return tags;
      }},
      { key: 'change24h', label: '24h%', align: 'right', render: v => formatPercent(v) },
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
customElements.define('anomaly-composite-panel', AnomalyCompositePanel);
export default AnomalyCompositePanel;
