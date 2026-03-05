// AI Market Intelligence Feed — Real-time natural language market analysis
// Synthesizes data from Smart Money, Anomaly, Microstructure, Momentum, and Funding engines
// into a prioritized, human-readable intelligence feed
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class IntelligenceFeedPanel extends BasePanel {
  static skill = 'Skill 46';
  static defaultTitle = 'Intelligence Feed';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._history = [];
    this._maxHistory = 50;
    this._symbols = [
      'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT',
      'ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT',
    ];
  }

  async fetchData() {
    const [tickers, premium, fBook, sBook, ...perSym] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      window.mefaiApi.futures.premiumIndex(),
      window.mefaiApi.futures.bookTicker(),
      window.mefaiApi.spot.bookTicker(),
      ...this._symbols.flatMap(sym => [
        window.mefaiApi.futures.longShortRatio(sym, '1h', 1),
        window.mefaiApi.futures.topLongShortAccount(sym, '1h', 1),
        window.mefaiApi.futures.topLongShortPosition(sym, '1h', 1),
        window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),
        window.mefaiApi.futures.openInterestHist(sym, '1h', 3),
      ]),
    ]);
    const tkMap = {}, pmMap = {}, fbMap = {}, sbMap = {};
    if (Array.isArray(tickers)) tickers.forEach(t => { tkMap[t.symbol] = t; });
    if (Array.isArray(premium)) premium.forEach(p => { pmMap[p.symbol] = p; });
    if (Array.isArray(fBook)) fBook.forEach(b => { fbMap[b.symbol] = b; });
    if (Array.isArray(sBook)) sBook.forEach(b => { sbMap[b.symbol] = b; });
    return this._symbols.map((sym, i) => ({
      symbol: sym,
      ticker: tkMap[sym] || {},
      premium: pmMap[sym] || {},
      fBook: fbMap[sym] || {},
      sBook: sbMap[sym] || {},
      retailLS:    perSym[i * 5],
      topAccount:  perSym[i * 5 + 1],
      topPosition: perSym[i * 5 + 2],
      taker:       perSym[i * 5 + 3],
      oiHist:      perSym[i * 5 + 4],
    }));
  }

  _analyze(data) {
    const events = [];
    const now = new Date();
    const ts = now.toLocaleTimeString('en-US', { hour12: false, hour: '2-digit', minute: '2-digit' }) + ' UTC';

    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const tk = item.ticker;
      const pm = item.premium;
      const fb = item.fBook;
      const sb = item.sBook;

      // --- Extract all signals ---
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
      const change24h = parseFloat(tk.priceChangePercent || 0);
      const price = parseFloat(tk.lastPrice || 0);
      const vwap = parseFloat(tk.weightedAvgPrice || price);
      const vwapDev = vwap > 0 ? ((price - vwap) / vwap) * 100 : 0;

      // OI change
      let oiChange = 0;
      if (oiArr.length >= 2) {
        const latest = parseFloat(oiArr[oiArr.length - 1]?.sumOpenInterestValue || 0);
        const prev = parseFloat(oiArr[0]?.sumOpenInterestValue || 0);
        if (prev > 0) oiChange = ((latest - prev) / prev) * 100;
      }

      // Spread
      const fBid = parseFloat(fb.bidPrice || 0);
      const fAsk = parseFloat(fb.askPrice || 0);
      const fMid = (fBid + fAsk) / 2;
      const spreadBps = fMid > 0 ? ((fAsk - fBid) / fMid) * 10000 : 0;

      // Spot-Futures gap
      const sBid = parseFloat(sb.bidPrice || 0);
      const sAsk = parseFloat(sb.askPrice || 0);
      const sMid = (sBid + sAsk) / 2;
      const sfGap = sMid > 0 ? ((fMid - sMid) / sMid) * 10000 : 0;

      // --- Smart Money Score ---
      const smartDir = Math.max(-1, Math.min(1, (topPosRatio - 1) * 5));
      const retailContra = Math.max(-1, Math.min(1, (1 - retailRatio) * 5));
      const divergence = Math.max(-1, Math.min(1, (topPosRatio - retailRatio) * 3));
      const takerSignal = Math.max(-1, Math.min(1, (takerRatio - 1) * 5));
      const fundingSignal = Math.max(-1, Math.min(1, -fundingBps * 0.1));
      const oiMomentum = Math.max(-1, Math.min(1, oiChange * 0.3));

      const factors = [smartDir, retailContra, divergence, takerSignal, fundingSignal, oiMomentum];
      const avgSignal = factors.reduce((s, v) => s + v, 0) / factors.length;
      const agreeing = factors.filter(v => Math.sign(v) === Math.sign(avgSignal) && Math.abs(v) > 0.1).length;
      const confluence = agreeing / 6;
      const smartScore = Math.min(100, Math.round(Math.abs(avgSignal) * confluence * 250));
      const direction = avgSignal > 0.08 ? 'LONG' : avgSignal < -0.08 ? 'SHORT' : 'NEUTRAL';

      // --- Anomaly count ---
      let anomalyCount = 0;
      const anomalies = [];
      if (Math.abs(vwapDev) > 1.5) { anomalyCount++; anomalies.push(`VWAP ${vwapDev > 0 ? '+' : ''}${vwapDev.toFixed(1)}%`); }
      if (Math.abs(change24h) > 8) { anomalyCount++; anomalies.push(`24h ${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%`); }
      if (Math.abs(fundingBps) > 10) { anomalyCount++; anomalies.push(`Funding ${fundingBps > 0 ? '+' : ''}${fundingBps.toFixed(1)}bps`); }
      if (Math.abs(oiChange) > 3) { anomalyCount++; anomalies.push(`OI ${oiChange > 0 ? '+' : ''}${oiChange.toFixed(1)}%`); }
      if (Math.abs(sfGap) > 15) { anomalyCount++; anomalies.push(`Spread ${sfGap.toFixed(0)}bps`); }
      if (takerRatio > 1.4 || takerRatio < 0.7) { anomalyCount++; anomalies.push(`Taker ${takerRatio.toFixed(2)}`); }

      // --- Microstructure health ---
      let healthScore = 100;
      healthScore -= Math.min(30, spreadBps * 3);
      healthScore -= Math.min(20, Math.abs(sfGap) * 0.5);
      healthScore -= Math.min(20, Math.abs(fundingBps) * 1.5);
      healthScore -= Math.min(15, Math.abs(takerRatio - 1) * 30);
      let oiVol = 0;
      if (oiArr.length >= 2) {
        const vals = oiArr.map(o => parseFloat(o?.sumOpenInterestValue || 0));
        for (let i = 1; i < vals.length; i++) {
          if (vals[i - 1] > 0) oiVol += Math.abs((vals[i] - vals[i - 1]) / vals[i - 1]) * 100;
        }
        oiVol /= (vals.length - 1);
      }
      healthScore -= Math.min(15, oiVol * 3);
      healthScore = Math.max(0, Math.round(healthScore));
      const healthGrade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : healthScore >= 20 ? 'D' : 'F';

      // --- Generate intelligence events ---

      // 1. Smart Money Signal (high priority)
      if (smartScore >= 55) {
        const severity = smartScore >= 75 ? 'CRITICAL' : smartScore >= 60 ? 'HIGH' : 'MEDIUM';
        const smartAction = direction === 'LONG' ? 'going long aggressively' : 'building short positions';
        const retailAction = retailRatio > 1.1 ? 'heavily long' : retailRatio < 0.9 ? 'heavily short' : 'neutral';
        const fundingNote = fundingBps < -3 ? ` Funding at ${fundingBps.toFixed(1)}bps — longs getting paid to hold.` :
                           fundingBps > 5 ? ` Funding elevated at +${fundingBps.toFixed(1)}bps — shorts getting paid.` : '';
        const oiNote = oiChange > 2 ? ` OI rising ${oiChange.toFixed(1)}% — new positions being opened with conviction.` :
                      oiChange < -2 ? ` OI declining ${oiChange.toFixed(1)}% — positions being closed.` : '';
        const healthNote = ` Microstructure: Grade ${healthGrade} (${healthScore}/100).`;

        let text = `Smart Money Score ${smartScore}/100 — Top traders ${smartAction} while retail is ${retailAction}.`;
        text += ` ${agreeing}/6 factors aligned (${direction}).`;
        text += fundingNote + oiNote + healthNote;

        events.push({ sym, severity, direction, smartScore, text, ts, type: 'smart-money', sortPriority: smartScore + (severity === 'CRITICAL' ? 100 : severity === 'HIGH' ? 50 : 0) });
      }

      // 2. Anomaly Alert
      if (anomalyCount >= 3) {
        const severity = anomalyCount >= 5 ? 'CRITICAL' : anomalyCount >= 4 ? 'HIGH' : 'MEDIUM';
        let text = `${anomalyCount}/6 anomaly signals firing: ${anomalies.join(', ')}.`;
        if (smartScore >= 40) text += ` Smart Money reading: ${direction} (${smartScore}/100).`;
        text += ` Microstructure: Grade ${healthGrade}.`;
        events.push({ sym, severity, direction: anomalyCount >= 4 ? direction : 'ALERT', smartScore, text, ts, type: 'anomaly', sortPriority: anomalyCount * 20 + anomalyCount });
      }

      // 3. Divergence Alert (smart vs retail disagree strongly)
      if (Math.abs(topPosRatio - retailRatio) > 0.3) {
        const smartSide = topPosRatio > 1 ? 'long' : 'short';
        const retailSide = retailRatio > 1 ? 'long' : 'short';
        if (smartSide !== retailSide) {
          let text = `Smart-Retail Divergence — Top traders are ${smartSide} (${topPosRatio.toFixed(2)}) while retail is ${retailSide} (${retailRatio.toFixed(2)}).`;
          text += ` Divergence gap: ${Math.abs(topPosRatio - retailRatio).toFixed(2)}.`;
          text += ` Historically, smart money wins this divergence.`;
          events.push({ sym, severity: 'HIGH', direction: smartSide === 'long' ? 'LONG' : 'SHORT', smartScore, text, ts, type: 'divergence', sortPriority: 65 });
        }
      }

      // 4. Funding Extreme
      if (Math.abs(fundingBps) > 15) {
        const side = fundingBps > 0 ? 'positive' : 'negative';
        const contrarian = fundingBps > 0 ? 'SHORT' : 'LONG';
        let text = `Funding rate extreme: ${fundingBps > 0 ? '+' : ''}${fundingBps.toFixed(1)}bps (${side}).`;
        text += ` Market is crowded ${fundingBps > 0 ? 'long' : 'short'} — contrarian ${contrarian} signal.`;
        text += ` Current 24h: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}%.`;
        events.push({ sym, severity: 'MEDIUM', direction: contrarian, smartScore, text, ts, type: 'funding', sortPriority: Math.abs(fundingBps) * 2 });
      }

      // 5. OI Surge
      if (Math.abs(oiChange) > 5) {
        let text = `Open Interest ${oiChange > 0 ? 'surged' : 'dropped'} ${oiChange > 0 ? '+' : ''}${oiChange.toFixed(1)}% in recent hours.`;
        text += oiChange > 0 ? ' Significant new position buildup — watch for breakout or squeeze.' : ' Rapid position unwind — potential capitulation or profit-taking.';
        text += ` Price: ${change24h > 0 ? '+' : ''}${change24h.toFixed(2)}% 24h.`;
        events.push({ sym, severity: Math.abs(oiChange) > 8 ? 'HIGH' : 'MEDIUM', direction: oiChange > 0 ? (change24h > 0 ? 'LONG' : 'SHORT') : 'ALERT', smartScore, text, ts, type: 'oi', sortPriority: Math.abs(oiChange) * 5 });
      }

      // 6. Microstructure Stress
      if (healthScore < 35) {
        let text = `Microstructure degraded to Grade ${healthGrade} (${healthScore}/100).`;
        text += ` Spread: ${spreadBps.toFixed(1)}bps.`;
        if (Math.abs(sfGap) > 5) text += ` Spot-futures gap: ${sfGap.toFixed(0)}bps.`;
        text += ` Exercise caution — poor execution environment for large orders.`;
        events.push({ sym, severity: healthScore < 20 ? 'HIGH' : 'MEDIUM', direction: 'ALERT', smartScore, text, ts, type: 'health', sortPriority: (100 - healthScore) / 2 });
      }
    }

    // Sort by priority (highest first)
    events.sort((a, b) => b.sortPriority - a.sortPriority);
    return events;
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Initializing Intelligence Feed...</div>';

    const events = this._analyze(data);

    // Merge new events into history (dedup by sym+type)
    const seen = new Set();
    for (const ev of events) {
      const key = `${ev.sym}-${ev.type}`;
      if (!seen.has(key)) {
        seen.add(key);
        // Remove old entry of same key
        this._history = this._history.filter(h => `${h.sym}-${h.type}` !== key);
        this._history.unshift(ev);
      }
    }
    this._history = this._history.slice(0, this._maxHistory);

    // Stats
    const critical = events.filter(e => e.severity === 'CRITICAL').length;
    const high = events.filter(e => e.severity === 'HIGH').length;
    const total = events.length;

    // Market summary
    const longCount = events.filter(e => e.direction === 'LONG').length;
    const shortCount = events.filter(e => e.direction === 'SHORT').length;
    const marketBias = longCount > shortCount + 2 ? 'BULLISH' : shortCount > longCount + 2 ? 'BEARISH' : 'MIXED';

    let h = '<style scoped>';
    h += '.if-header{display:flex;align-items:center;justify-content:space-between;padding:0 0 6px}';
    h += '.if-live{display:flex;align-items:center;gap:4px;font-size:9px;color:#0ecb81;font-weight:600}';
    h += '.if-dot{width:6px;height:6px;border-radius:50%;background:#0ecb81;animation:if-pulse 2s infinite}';
    h += '@keyframes if-pulse{0%,100%{opacity:1}50%{opacity:0.3}}';
    h += '.if-bias{font-size:10px;font-weight:700;padding:2px 8px;border-radius:4px}';
    h += '.if-BULLISH{background:#0ecb8122;color:#0ecb81}';
    h += '.if-BEARISH{background:#f6465d22;color:#f6465d}';
    h += '.if-MIXED{background:#f0b90b22;color:#f0b90b}';

    h += '.if-stats{display:grid;grid-template-columns:1fr 1fr 1fr 1fr;gap:4px;padding:0 0 8px}';
    h += '.if-stat{background:var(--bg-secondary);border-radius:5px;padding:4px 6px;text-align:center}';
    h += '.if-stat-label{font-size:7px;color:var(--text-muted);text-transform:uppercase;letter-spacing:0.5px}';
    h += '.if-stat-value{font-size:13px;font-weight:700;margin:1px 0}';

    h += '.if-feed{display:flex;flex-direction:column;gap:6px;max-height:400px;overflow-y:auto;padding-right:2px}';
    h += '.if-event{background:var(--bg-secondary);border-radius:6px;padding:8px 10px;border-left:3px solid;position:relative}';
    h += '.if-event-CRITICAL{border-left-color:#f6465d;background:linear-gradient(90deg,#f6465d08,var(--bg-secondary))}';
    h += '.if-event-HIGH{border-left-color:#f0b90b;background:linear-gradient(90deg,#f0b90b08,var(--bg-secondary))}';
    h += '.if-event-MEDIUM{border-left-color:#3b82f6}';
    h += '.if-event-LOW{border-left-color:#3b82f6}';

    h += '.if-event-header{display:flex;align-items:center;gap:6px;margin-bottom:4px}';
    h += '.if-sev{font-size:7px;font-weight:800;padding:1px 5px;border-radius:2px;text-transform:uppercase}';
    h += '.if-sev-CRITICAL{background:#f6465d33;color:#f6465d}';
    h += '.if-sev-HIGH{background:#f0b90b33;color:#f0b90b}';
    h += '.if-sev-MEDIUM{background:#3b82f633;color:#3b82f6}';
    h += '.if-sev-LOW{background:#33333366;color:var(--text-muted)}';
    h += '.if-sym{font-size:12px;font-weight:800;color:var(--text-primary)}';
    h += '.if-dir{font-size:8px;font-weight:700;padding:1px 5px;border-radius:3px}';
    h += '.if-dir-LONG{background:#0ecb8133;color:#0ecb81}';
    h += '.if-dir-SHORT{background:#f6465d33;color:#f6465d}';
    h += '.if-dir-ALERT{background:#f0b90b22;color:#f0b90b}';
    h += '.if-dir-NEUTRAL{background:#33333344;color:var(--text-muted)}';
    h += '.if-time{font-size:8px;color:var(--text-muted);margin-left:auto}';
    h += '.if-type{font-size:7px;color:var(--text-muted);padding:1px 4px;border-radius:2px;background:var(--bg-primary)}';

    h += '.if-text{font-size:10px;line-height:1.45;color:var(--text-secondary)}';
    h += '.if-score{display:inline-block;font-size:9px;font-weight:700;padding:0 4px;border-radius:2px;margin-left:2px}';

    h += '.if-empty{text-align:center;padding:30px 10px;color:var(--text-muted);font-size:11px}';
    h += '.if-empty-icon{font-size:24px;margin-bottom:8px;opacity:0.5}';
    h += '</style>';

    // Header
    h += '<div class="if-header">';
    h += '<div class="if-live"><div class="if-dot"></div>LIVE INTELLIGENCE</div>';
    h += `<span class="if-bias if-${marketBias}">${marketBias}</span>`;
    h += '</div>';

    // Stats
    h += '<div class="if-stats">';
    h += `<div class="if-stat"><div class="if-stat-label">Critical</div><div class="if-stat-value" style="color:#f6465d">${critical}</div></div>`;
    h += `<div class="if-stat"><div class="if-stat-label">High</div><div class="if-stat-value" style="color:#f0b90b">${high}</div></div>`;
    h += `<div class="if-stat"><div class="if-stat-label">Events</div><div class="if-stat-value">${total}</div></div>`;
    h += `<div class="if-stat"><div class="if-stat-label">Bias</div><div class="if-stat-value">${longCount}L/${shortCount}S</div></div>`;
    h += '</div>';

    // Feed
    h += '<div class="if-feed">';
    if (this._history.length === 0) {
      h += '<div class="if-empty"><div class="if-empty-icon">&#x1f4e1;</div>Scanning 12 assets across 6 signal dimensions...<br>Events appear when significant market activity is detected.</div>';
    } else {
      for (const ev of this._history) {
        const typeLabels = { 'smart-money': 'SMART MONEY', 'anomaly': 'ANOMALY', 'divergence': 'DIVERGENCE', 'funding': 'FUNDING', 'oi': 'OPEN INTEREST', 'health': 'MICROSTRUCTURE' };
        h += `<div class="if-event if-event-${ev.severity}">`;
        h += '<div class="if-event-header">';
        h += `<span class="if-sev if-sev-${ev.severity}">${ev.severity}</span>`;
        h += `<span class="if-sym">${ev.sym}</span>`;
        h += `<span class="if-dir if-dir-${ev.direction}">${ev.direction}</span>`;
        h += `<span class="if-type">${typeLabels[ev.type] || ev.type.toUpperCase()}</span>`;
        h += `<span class="if-time">${ev.ts}</span>`;
        h += '</div>';
        h += `<div class="if-text">${ev.text}</div>`;
        h += '</div>';
      }
    }
    h += '</div>';

    return h;
  }

  afterRender() {
    // No table events needed — feed is not sortable
  }
}
customElements.define('intelligence-feed-panel', IntelligenceFeedPanel);
export default IntelligenceFeedPanel;
