// Momentum Cascade Tracker — Track how momentum propagates across assets in real-time
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class MomentumCascadePanel extends BasePanel {
  static skill = 'Skill 43';
  static defaultTitle = 'Momentum Cascade';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'cascadeScore';
    this._sortDir = 'desc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT','OPUSDT','SUIUSDT','INJUSDT','NEARUSDT'];
  }

  async fetchData() {
    const symParam = JSON.stringify(this._symbols);
    const [w1h, w4h, tickers] = await Promise.all([
      window.mefaiApi.spot.tickerWindow(symParam, '1h'),
      window.mefaiApi.spot.tickerWindow(symParam, '4h'),
      window.mefaiApi.futures.ticker24hr(),
    ]);
    return { w1h, w4h, tickers };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading cascade data...</div>';

    const w1hMap = {}, w4hMap = {}, tkMap = {};
    const w1h = Array.isArray(data.w1h) ? data.w1h : [];
    const w4h = Array.isArray(data.w4h) ? data.w4h : [];
    const tickers = Array.isArray(data.tickers) ? data.tickers : [];

    w1h.forEach(t => { w1hMap[t.symbol] = t; });
    w4h.forEach(t => { w4hMap[t.symbol] = t; });
    tickers.forEach(t => { tkMap[t.symbol] = t; });

    // BTC as reference
    const btc1h = parseFloat(w1hMap['BTCUSDT']?.priceChangePercent || 0);
    const btc4h = parseFloat(w4hMap['BTCUSDT']?.priceChangePercent || 0);
    const btc24h = parseFloat(tkMap['BTCUSDT']?.priceChangePercent || 0);
    const btcDir = btc1h > 0 ? 1 : btc1h < 0 ? -1 : 0;

    let rows = [];
    for (const sym of this._symbols) {
      const name = sym.replace('USDT', '');
      const h1 = parseFloat(w1hMap[sym]?.priceChangePercent || 0);
      const h4 = parseFloat(w4hMap[sym]?.priceChangePercent || 0);
      const d1 = parseFloat(tkMap[sym]?.priceChangePercent || 0);

      // Cascade analysis: compare timeframe momentum
      // "Following BTC" = moving in same direction
      const followsBtc1h = btcDir !== 0 && Math.sign(h1) === btcDir;
      const followsBtc4h = btcDir !== 0 && Math.sign(h4) === btcDir;

      // Lead/Lag detection:
      // If 1h move is larger relative to 4h than BTC's ratio, this coin is LEADING
      // If 1h move is smaller relative to 4h, this coin is LAGGING
      const btcRatio = btc4h !== 0 ? btc1h / btc4h : 0;
      const altRatio = h4 !== 0 ? h1 / h4 : 0;
      const leadLag = btcRatio !== 0 ? altRatio / btcRatio : 1;

      // Amplification: how much does this coin amplify BTC's moves?
      const amp1h = btc1h !== 0 ? h1 / btc1h : 1;
      const amp4h = btc4h !== 0 ? h4 / btc4h : 1;

      // Cascade score: combination of correlation + amplification + lead
      const correlation = (followsBtc1h ? 1 : -1) * 0.5 + (followsBtc4h ? 1 : -1) * 0.5;
      const cascadeScore = Math.abs(amp1h) * (leadLag > 1 ? 1.5 : 0.8) * (followsBtc1h ? 1 : 0.5);

      const role = sym === 'BTCUSDT' ? 'LEADER' :
        leadLag > 1.3 ? 'LEADING' :
        leadLag < 0.7 ? 'LAGGING' :
        followsBtc1h ? 'TRACKING' : 'DIVERGING';

      rows.push({
        symbol: name, h1, h4, d1, amp1h, amp4h, leadLag,
        cascadeScore, correlation, role, followsBtc1h,
      });
    }

    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      if (this._sortKey === 'role') return a.role.localeCompare(b.role) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    const leaders = rows.filter(r => r.role === 'LEADING').length;
    const laggers = rows.filter(r => r.role === 'LAGGING').length;
    const diverging = rows.filter(r => r.role === 'DIVERGING').length;

    let h = '<style scoped>';
    h += '.mc-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.mc-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.mc-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.mc-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.mc-role{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px;display:inline-block}';
    h += '.mc-LEADER{background:#f0b90b33;color:#f0b90b}';
    h += '.mc-LEADING{background:#0ecb8133;color:#0ecb81}';
    h += '.mc-TRACKING{background:#3b82f633;color:#3b82f6}';
    h += '.mc-LAGGING{background:#f6465d33;color:#f6465d}';
    h += '.mc-DIVERGING{background:#a855f733;color:#a855f7}';
    h += '.mc-amp{font-size:10px;font-weight:600}';
    h += '.mc-bar{display:flex;height:12px;border-radius:3px;overflow:hidden;background:var(--bg-secondary)}';
    h += '.mc-bar-fill{height:100%;min-width:1px}';
    h += '</style>';

    h += '<div class="mc-stats">';
    h += `<div class="mc-stat"><div class="mc-stat-label">Leading BTC</div><div class="mc-stat-value val-up">${leaders}</div></div>`;
    h += `<div class="mc-stat"><div class="mc-stat-label">BTC 1h</div><div class="mc-stat-value">${btc1h > 0 ? '+' : ''}${btc1h.toFixed(2)}%</div></div>`;
    h += `<div class="mc-stat"><div class="mc-stat-label">Diverging</div><div class="mc-stat-value" style="color:#a855f7">${diverging}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '50px' },
      { key: 'role', label: 'Role', align: 'center', render: v => `<span class="mc-role mc-${v}">${v}</span>` },
      { key: 'h1', label: '1h%', align: 'right', render: v => formatPercent(v) },
      { key: 'h4', label: '4h%', align: 'right', render: v => formatPercent(v) },
      { key: 'amp1h', label: 'Amp', align: 'right', render: v => {
        const cls = Math.abs(v) > 2 ? 'val-up' : Math.abs(v) > 1 ? '' : 'val-down';
        return `<span class="mc-amp ${cls}">${v.toFixed(1)}x</span>`;
      }},
      { key: 'd1', label: '24h%', align: 'right', render: v => formatPercent(v) },
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
customElements.define('momentum-cascade-panel', MomentumCascadePanel);
export default MomentumCascadePanel;
