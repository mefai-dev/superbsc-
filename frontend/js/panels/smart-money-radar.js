// Smart Money Radar — Institutional vs Retail positioning intelligence using Binance-exclusive data
// Uses 6 signals ONLY available on Binance: topLongShortAccount, topLongShortPosition,
// globalLongShortAccount, takerBuySellRatio, openInterestHist, premiumIndex
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class SmartMoneyRadarPanel extends BasePanel {
  static skill = 'Skill 45';
  static defaultTitle = 'Smart Money Radar';

  constructor() {
    super();
    this._refreshRate = 25000;
    this._sortKey = 'smartScore';
    this._sortDir = 'desc';
    this._symbols = [
      'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT',
      'ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT',
    ];
  }

  async fetchData() {
    const [tickers, premium, ...perSym] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      window.mefaiApi.futures.premiumIndex(),
      ...this._symbols.flatMap(sym => [
        window.mefaiApi.futures.longShortRatio(sym, '1h', 1),        // global retail L/S
        window.mefaiApi.futures.topLongShortAccount(sym, '1h', 1),   // top trader acct L/S
        window.mefaiApi.futures.topLongShortPosition(sym, '1h', 1),  // top trader pos L/S
        window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),        // taker pressure
        window.mefaiApi.futures.openInterestHist(sym, '1h', 3),      // OI trend
      ]),
    ]);
    const tkMap = {}, pmMap = {};
    if (Array.isArray(tickers)) tickers.forEach(t => { tkMap[t.symbol] = t; });
    if (Array.isArray(premium)) premium.forEach(p => { pmMap[p.symbol] = p; });
    return this._symbols.map((sym, i) => ({
      symbol: sym,
      ticker: tkMap[sym] || {},
      premium: pmMap[sym] || {},
      retailLS:    perSym[i * 5],
      topAccount:  perSym[i * 5 + 1],
      topPosition: perSym[i * 5 + 2],
      taker:       perSym[i * 5 + 3],
      oiHist:      perSym[i * 5 + 4],
    }));
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Loading Smart Money data...</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const tk = item.ticker;
      const pm = item.premium;

      // --- Extract raw ratios ---
      const retailRaw = Array.isArray(item.retailLS) ? item.retailLS[0] : item.retailLS;
      const topAcctRaw = Array.isArray(item.topAccount) ? item.topAccount[0] : item.topAccount;
      const topPosRaw = Array.isArray(item.topPosition) ? item.topPosition[0] : item.topPosition;
      const takerRaw = Array.isArray(item.taker) ? item.taker[0] : item.taker;
      const oiArr = Array.isArray(item.oiHist) ? item.oiHist : [];

      const retailRatio = parseFloat(retailRaw?.longShortRatio || 1);
      const topAcctRatio = parseFloat(topAcctRaw?.longShortRatio || 1);
      const topPosRatio = parseFloat(topPosRaw?.longShortRatio || 1);
      const takerRatio = parseFloat(takerRaw?.buySellRatio || 1);
      const fundingRate = parseFloat(pm.lastFundingRate || 0);
      const fundingBps = fundingRate * 10000;

      // OI change %
      let oiChange = 0;
      if (oiArr.length >= 2) {
        const latest = parseFloat(oiArr[oiArr.length - 1]?.sumOpenInterestValue || 0);
        const prev = parseFloat(oiArr[0]?.sumOpenInterestValue || 0);
        if (prev > 0) oiChange = ((latest - prev) / prev) * 100;
      }

      // --- 6 Factor Signals (each -1 to +1) ---
      const factors = {};

      // 1. Smart Money Direction (top trader position ratio)
      // >1 = smart money long, <1 = smart money short
      factors.smartDir = Math.max(-1, Math.min(1, (topPosRatio - 1) * 5));

      // 2. Retail Contrarian (inverse of retail — when retail is short, it's bullish)
      // Retail long (>1) = bearish signal, Retail short (<1) = bullish signal
      factors.retailContra = Math.max(-1, Math.min(1, (1 - retailRatio) * 5));

      // 3. Smart vs Retail Divergence
      // When smart money and retail disagree → stronger signal
      const divergence = topPosRatio - retailRatio;
      factors.divergence = Math.max(-1, Math.min(1, divergence * 3));

      // 4. Taker Pressure
      // >1 = aggressive buying, <1 = aggressive selling
      factors.takerPressure = Math.max(-1, Math.min(1, (takerRatio - 1) * 5));

      // 5. Funding Signal (contrarian — negative funding = bullish, longs get paid)
      factors.fundingSignal = Math.max(-1, Math.min(1, -fundingBps * 0.1));

      // 6. OI Momentum (rising OI = conviction behind the move)
      factors.oiMomentum = Math.max(-1, Math.min(1, oiChange * 0.3));

      // --- Composite Smart Money Score (0-100) ---
      const factorValues = Object.values(factors);
      const avgSignal = factorValues.reduce((s, v) => s + v, 0) / factorValues.length;
      const agreeing = factorValues.filter(v => Math.sign(v) === Math.sign(avgSignal) && Math.abs(v) > 0.1).length;
      const confluence = agreeing / 6;

      // Smart Score: magnitude × confluence × 100
      const rawScore = Math.abs(avgSignal) * confluence * 100;
      const smartScore = Math.min(100, Math.round(rawScore * 2.5));

      // Direction
      const direction = avgSignal > 0.08 ? 'LONG' : avgSignal < -0.08 ? 'SHORT' : 'NEUTRAL';

      // Regime classification
      let regime;
      if (smartScore >= 60 && direction === 'LONG' && oiChange > 0) regime = 'ACCUMULATION';
      else if (smartScore >= 60 && direction === 'SHORT' && oiChange > 0) regime = 'DISTRIBUTION';
      else if (smartScore >= 40 && Math.abs(oiChange) < 1) regime = 'POSITIONING';
      else regime = 'NEUTRAL';

      // Signal strength label
      const strength = smartScore >= 75 ? 'STRONG' : smartScore >= 50 ? 'MODERATE' : smartScore >= 30 ? 'WEAK' : 'NONE';

      const change = parseFloat(tk.priceChangePercent || 0);
      const price = parseFloat(tk.lastPrice || 0);

      // Generate natural language brief
      let brief = '';
      if (smartScore >= 50) {
        const smartAction = direction === 'LONG' ? 'accumulating' : 'distributing';
        const retailAction = retailRatio > 1.05 ? 'going long' : retailRatio < 0.95 ? 'going short' : 'neutral';
        const fundingNote = fundingBps < -3 ? ', longs getting paid' : fundingBps > 3 ? ', shorts getting paid' : '';
        brief = `Smart money ${smartAction}. Retail ${retailAction}${fundingNote}.`;
      }

      rows.push({
        symbol: sym, smartScore, direction, regime, strength, change, price,
        factors, avgSignal, confluence, agreeing, brief,
        retailRatio, topPosRatio, topAcctRatio, takerRatio, fundingBps, oiChange,
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      if (this._sortKey === 'direction') return a.direction.localeCompare(b.direction) * dir;
      if (this._sortKey === 'regime') return a.regime.localeCompare(b.regime) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Summary stats
    const strongSignals = rows.filter(r => r.smartScore >= 60).length;
    const bullish = rows.filter(r => r.direction === 'LONG').length;
    const bearish = rows.filter(r => r.direction === 'SHORT').length;
    const topSignal = rows[0];

    // --- Build HTML ---
    let h = '<style scoped>';
    h += '.smr-hero{background:linear-gradient(135deg,var(--bg-secondary),#1a1a2e);border-radius:8px;padding:10px;margin-bottom:8px;position:relative;overflow:hidden}';
    h += '.smr-hero-glow{position:absolute;top:-30px;right:-30px;width:100px;height:100px;border-radius:50%;filter:blur(40px);opacity:0.3}';
    h += '.smr-hero-title{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px;margin-bottom:6px}';
    h += '.smr-hero-row{display:flex;align-items:center;gap:10px}';
    h += '.smr-hero-score{font-size:28px;font-weight:900;line-height:1}';
    h += '.smr-hero-meta{flex:1;font-size:10px;color:var(--text-muted);line-height:1.4}';
    h += '.smr-hero-brief{font-size:9px;color:var(--text-secondary);margin-top:6px;font-style:italic;line-height:1.3;padding:4px 6px;background:rgba(255,255,255,0.03);border-radius:4px}';

    h += '.smr-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.smr-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.smr-stat-label{font-size:8px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}';
    h += '.smr-stat-value{font-size:14px;font-weight:700;margin:2px 0}';

    h += '.smr-dir{font-size:9px;font-weight:800;padding:2px 6px;border-radius:3px;display:inline-block}';
    h += '.smr-LONG{background:#0ecb8133;color:#0ecb81}';
    h += '.smr-SHORT{background:#f6465d33;color:#f6465d}';
    h += '.smr-NEUTRAL{background:#33333366;color:var(--text-muted)}';

    h += '.smr-regime{font-size:7px;font-weight:700;padding:1px 4px;border-radius:2px;display:inline-block}';
    h += '.smr-ACCUMULATION{background:#0ecb8122;color:#0ecb81}';
    h += '.smr-DISTRIBUTION{background:#f6465d22;color:#f6465d}';
    h += '.smr-POSITIONING{background:#f0b90b22;color:#f0b90b}';
    h += '.smr-reg-NEUTRAL{background:#33333344;color:var(--text-muted)}';

    h += '.smr-score-bar{width:50px;height:6px;border-radius:3px;background:var(--bg-secondary);overflow:hidden;display:inline-block;vertical-align:middle;margin-right:4px}';
    h += '.smr-score-fill{height:100%;border-radius:3px;transition:width 0.3s}';
    h += '.smr-score-num{font-size:11px;font-weight:800;vertical-align:middle}';

    h += '.smr-factors{display:flex;gap:2px;flex-wrap:wrap}';
    h += '.smr-f{font-size:7px;padding:1px 3px;border-radius:2px;font-weight:600}';
    h += '.smr-f-bull{background:#0ecb8122;color:#0ecb81}';
    h += '.smr-f-bear{background:#f6465d22;color:#f6465d}';
    h += '.smr-f-neutral{background:#33333344;color:var(--text-muted)}';

    h += '.smr-strength{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px}';
    h += '.smr-STRONG{background:#0ecb8133;color:#0ecb81}';
    h += '.smr-MODERATE{background:#3b82f633;color:#3b82f6}';
    h += '.smr-WEAK{background:#f0b90b22;color:#f0b90b}';
    h += '.smr-NONE{background:#33333344;color:var(--text-muted)}';
    h += '</style>';

    // Hero card — top signal spotlight
    if (topSignal && topSignal.smartScore >= 40) {
      const heroColor = topSignal.direction === 'LONG' ? '#0ecb81' : topSignal.direction === 'SHORT' ? '#f6465d' : '#3b82f6';
      h += '<div class="smr-hero">';
      h += `<div class="smr-hero-glow" style="background:${heroColor}"></div>`;
      h += '<div class="smr-hero-title">Top Smart Money Signal</div>';
      h += '<div class="smr-hero-row">';
      h += `<div class="smr-hero-score" style="color:${heroColor}">${topSignal.symbol}</div>`;
      h += '<div class="smr-hero-meta">';
      h += `<span class="smr-dir smr-${topSignal.direction}">${topSignal.direction}</span> `;
      h += `<span class="smr-strength smr-${topSignal.strength}">${topSignal.strength}</span> `;
      h += `<span style="font-size:11px;font-weight:700;color:${heroColor}">${topSignal.smartScore}/100</span>`;
      h += `<br>`;
      h += `<span>${topSignal.agreeing}/6 factors aligned · ${topSignal.regime}</span>`;
      h += '</div></div>';
      if (topSignal.brief) {
        h += `<div class="smr-hero-brief">${topSignal.brief}</div>`;
      }
      h += '</div>';
    }

    // Stats row
    h += '<div class="smr-stats">';
    h += `<div class="smr-stat"><div class="smr-stat-label">Strong Signals</div><div class="smr-stat-value" style="color:#0ecb81">${strongSignals}</div></div>`;
    h += `<div class="smr-stat"><div class="smr-stat-label">Smart Bullish</div><div class="smr-stat-value val-up">${bullish}</div></div>`;
    h += `<div class="smr-stat"><div class="smr-stat-label">Smart Bearish</div><div class="smr-stat-value val-down">${bearish}</div></div>`;
    h += '</div>';

    // Table
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '45px' },
      { key: 'direction', label: 'Signal', align: 'center', width: '55px',
        render: v => `<span class="smr-dir smr-${v}">${v}</span>` },
      { key: 'smartScore', label: 'Score', align: 'center', width: '85px',
        render: (v, row) => {
          const color = v >= 60 ? '#0ecb81' : v >= 40 ? '#3b82f6' : v >= 25 ? '#f0b90b' : '#555';
          return `<div class="smr-score-bar"><div class="smr-score-fill" style="width:${v}%;background:${color}"></div></div><span class="smr-score-num" style="color:${color}">${v}</span>`;
        }},
      { key: 'regime', label: 'Regime', align: 'center', width: '70px',
        render: v => `<span class="smr-regime smr-${v === 'NEUTRAL' ? 'reg-NEUTRAL' : v}">${v}</span>` },
      { key: 'agreeing', label: 'Factors', align: 'center', width: '110px',
        render: (v, row) => {
          const labels = [
            ['SM', row.factors.smartDir],
            ['RT', row.factors.retailContra],
            ['DV', row.factors.divergence],
            ['TK', row.factors.takerPressure],
            ['FN', row.factors.fundingSignal],
            ['OI', row.factors.oiMomentum],
          ];
          let f = '<div class="smr-factors">';
          for (const [lbl, val] of labels) {
            const cls = val > 0.1 ? 'smr-f-bull' : val < -0.1 ? 'smr-f-bear' : 'smr-f-neutral';
            const arrow = val > 0.1 ? '↑' : val < -0.1 ? '↓' : '·';
            f += `<span class="smr-f ${cls}">${lbl}${arrow}</span>`;
          }
          f += '</div>';
          return f;
        }},
      { key: 'change', label: '24h%', align: 'right', width: '50px', render: v => formatPercent(v) },
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
customElements.define('smart-money-radar-panel', SmartMoneyRadarPanel);
export default SmartMoneyRadarPanel;
