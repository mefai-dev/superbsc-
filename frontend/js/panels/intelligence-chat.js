// Speak to Binance — AI Market Assistant with live Binance data
// Interactive chat interface: user asks, AI answers with real-time market intelligence
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class IntelligenceChatPanel extends BasePanel {
  static skill = 'Skill 47';
  static defaultTitle = 'Speak to Binance';

  constructor() {
    super();
    this._refreshRate = 0; // No auto-refresh — user-driven
    this._messages = [];
    this._isThinking = false;
    this._allSymbols = [
      'BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT',
      'ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT',
      'OPUSDT','SUIUSDT','INJUSDT','NEARUSDT','MATICUSDT','DOTUSDT',
      'AAVEUSDT','UNIUSDT',
    ];
    this._addWelcome();
  }

  _addWelcome() {
    this._messages.push({
      role: 'ai',
      text: `Welcome to <b>Speak to Binance</b> — your AI market intelligence assistant powered by real-time Binance data.\n\nI analyze <b>6 Binance-exclusive data streams</b> that no other exchange provides: institutional positioning, retail sentiment, taker pressure, funding rates, open interest, and microstructure health.\n\nTry asking me:`,
      actions: [
        { label: 'Analyze BTC', cmd: 'analyze BTC' },
        { label: 'Market Summary', cmd: 'summary' },
        { label: 'Risk Check', cmd: 'risk' },
        { label: 'Top Opportunities', cmd: 'opportunities' },
        { label: 'Compare ETH SOL', cmd: 'compare ETH SOL' },
        { label: 'Funding Rates', cmd: 'funding' },
      ],
    });
  }

  async fetchData() { return null; }

  // ─── Data fetchers ───
  async _fetchSymbolData(symbols) {
    const syms = symbols.map(s => s.toUpperCase().endsWith('USDT') ? s.toUpperCase() : s.toUpperCase() + 'USDT');
    const [tickers, premium, fBook, sBook, ...perSym] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      window.mefaiApi.futures.premiumIndex(),
      window.mefaiApi.futures.bookTicker(),
      window.mefaiApi.spot.bookTicker(),
      ...syms.flatMap(sym => [
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
    return syms.map((sym, i) => this._computeMetrics(sym, {
      ticker: tkMap[sym] || {}, premium: pmMap[sym] || {},
      fBook: fbMap[sym] || {}, sBook: sbMap[sym] || {},
      retailLS: perSym[i * 5], topAccount: perSym[i * 5 + 1],
      topPosition: perSym[i * 5 + 2], taker: perSym[i * 5 + 3],
      oiHist: perSym[i * 5 + 4],
    }));
  }

  _computeMetrics(sym, item) {
    const name = sym.replace('USDT', '');
    const tk = item.ticker;
    const pm = item.premium;
    const fb = item.fBook;
    const sb = item.sBook;

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
    const volume = parseFloat(tk.quoteVolume || 0);
    const high = parseFloat(tk.highPrice || 0);
    const low = parseFloat(tk.lowPrice || 0);

    let oiChange = 0, oiValue = 0;
    if (oiArr.length >= 2) {
      const latest = parseFloat(oiArr[oiArr.length - 1]?.sumOpenInterestValue || 0);
      const prev = parseFloat(oiArr[0]?.sumOpenInterestValue || 0);
      oiValue = latest;
      if (prev > 0) oiChange = ((latest - prev) / prev) * 100;
    }

    const fBid = parseFloat(fb.bidPrice || 0), fAsk = parseFloat(fb.askPrice || 0);
    const fMid = (fBid + fAsk) / 2;
    const spreadBps = fMid > 0 ? ((fAsk - fBid) / fMid) * 10000 : 0;
    const sBid = parseFloat(sb.bidPrice || 0), sAsk = parseFloat(sb.askPrice || 0);
    const sMid = (sBid + sAsk) / 2;
    const sfGap = sMid > 0 ? ((fMid - sMid) / sMid) * 10000 : 0;

    // Smart Money Score
    const factors = {
      smartDir: Math.max(-1, Math.min(1, (topPosRatio - 1) * 5)),
      retailContra: Math.max(-1, Math.min(1, (1 - retailRatio) * 5)),
      divergence: Math.max(-1, Math.min(1, (topPosRatio - retailRatio) * 3)),
      takerPressure: Math.max(-1, Math.min(1, (takerRatio - 1) * 5)),
      fundingSignal: Math.max(-1, Math.min(1, -fundingBps * 0.1)),
      oiMomentum: Math.max(-1, Math.min(1, oiChange * 0.3)),
    };
    const vals = Object.values(factors);
    const avgSignal = vals.reduce((s, v) => s + v, 0) / vals.length;
    const agreeing = vals.filter(v => Math.sign(v) === Math.sign(avgSignal) && Math.abs(v) > 0.1).length;
    const confluence = agreeing / 6;
    const smartScore = Math.min(100, Math.round(Math.abs(avgSignal) * confluence * 250));
    const direction = avgSignal > 0.08 ? 'LONG' : avgSignal < -0.08 ? 'SHORT' : 'NEUTRAL';

    // Health score
    let healthScore = 100;
    healthScore -= Math.min(30, spreadBps * 3);
    healthScore -= Math.min(20, Math.abs(sfGap) * 0.5);
    healthScore -= Math.min(20, Math.abs(fundingBps) * 1.5);
    healthScore -= Math.min(15, Math.abs(takerRatio - 1) * 30);
    let oiVol = 0;
    if (oiArr.length >= 2) {
      const ov = oiArr.map(o => parseFloat(o?.sumOpenInterestValue || 0));
      for (let j = 1; j < ov.length; j++) if (ov[j-1] > 0) oiVol += Math.abs((ov[j] - ov[j-1]) / ov[j-1]) * 100;
      oiVol /= (ov.length - 1);
    }
    healthScore -= Math.min(15, oiVol * 3);
    healthScore = Math.max(0, Math.round(healthScore));
    const grade = healthScore >= 80 ? 'A' : healthScore >= 60 ? 'B' : healthScore >= 40 ? 'C' : healthScore >= 20 ? 'D' : 'F';

    // Regime
    let regime = 'NEUTRAL';
    if (smartScore >= 60 && direction === 'LONG' && oiChange > 0) regime = 'ACCUMULATION';
    else if (smartScore >= 60 && direction === 'SHORT' && oiChange > 0) regime = 'DISTRIBUTION';
    else if (smartScore >= 40 && Math.abs(oiChange) < 1) regime = 'POSITIONING';

    // Anomalies
    const anomalies = [];
    const vwapDev = vwap > 0 ? ((price - vwap) / vwap) * 100 : 0;
    if (Math.abs(vwapDev) > 1.5) anomalies.push(`VWAP ${vwapDev > 0 ? '+' : ''}${vwapDev.toFixed(1)}%`);
    if (Math.abs(change24h) > 8) anomalies.push(`24h ${change24h > 0 ? '+' : ''}${change24h.toFixed(1)}%`);
    if (Math.abs(fundingBps) > 10) anomalies.push(`Funding ${fundingBps > 0 ? '+' : ''}${fundingBps.toFixed(1)}bps`);
    if (Math.abs(oiChange) > 3) anomalies.push(`OI ${oiChange > 0 ? '+' : ''}${oiChange.toFixed(1)}%`);
    if (takerRatio > 1.4 || takerRatio < 0.7) anomalies.push(`Taker ${takerRatio.toFixed(2)}`);

    return {
      symbol: sym, name, price, change24h, volume, high, low, vwap, vwapDev,
      retailRatio, topAcctRatio, topPosRatio, takerRatio, fundingBps, oiChange, oiValue,
      spreadBps, sfGap, smartScore, direction, healthScore, grade, regime, agreeing,
      factors, anomalies,
    };
  }

  // ─── Command handlers ───
  async _handleCommand(input) {
    const raw = input.trim();
    if (!raw) return;
    this._messages.push({ role: 'user', text: raw });
    this._isThinking = true;
    this._render();

    try {
      const lower = raw.toLowerCase();
      let response;

      if (lower.startsWith('analyze ') || lower.startsWith('analyse ') || lower.startsWith('analiz ')) {
        const sym = raw.split(/\s+/)[1];
        response = await this._cmdAnalyze(sym);
      } else if (lower.startsWith('compare ') || lower.startsWith('karşılaştır ')) {
        const parts = raw.split(/\s+/).slice(1);
        response = await this._cmdCompare(parts[0], parts[1]);
      } else if (lower === 'summary' || lower === 'özet' || lower === 'market') {
        response = await this._cmdSummary();
      } else if (lower === 'risk' || lower === 'risk check' || lower === 'risk kontrol') {
        response = await this._cmdRisk();
      } else if (lower === 'opportunities' || lower === 'fırsatlar' || lower === 'best' || lower === 'top') {
        response = await this._cmdOpportunities();
      } else if (lower === 'funding' || lower === 'fonlama') {
        response = await this._cmdFunding();
      } else if (lower === 'health' || lower === 'sağlık' || lower === 'microstructure') {
        response = await this._cmdHealth();
      } else if (lower === 'help' || lower === 'yardım') {
        response = this._cmdHelp();
      } else {
        // Try as symbol
        const maybeSym = raw.replace(/[^a-zA-Z]/g, '').toUpperCase();
        if (maybeSym.length >= 2 && maybeSym.length <= 10) {
          response = await this._cmdAnalyze(maybeSym);
        } else {
          response = this._cmdHelp();
        }
      }

      this._messages.push(response);
    } catch (e) {
      this._messages.push({ role: 'ai', text: `Error fetching data: ${e.message}. Please try again.` });
    }

    this._isThinking = false;
    this._render();
  }

  async _cmdAnalyze(sym) {
    const data = await this._fetchSymbolData([sym]);
    const d = data[0];
    if (!d || !d.price) return { role: 'ai', text: `Could not find data for <b>${sym.toUpperCase()}</b>. Try: BTC, ETH, SOL, BNB...` };

    const dirEmoji = d.direction === 'LONG' ? '🟢' : d.direction === 'SHORT' ? '🔴' : '⚪';
    const scoreBar = '█'.repeat(Math.round(d.smartScore / 10)) + '░'.repeat(10 - Math.round(d.smartScore / 10));
    const scoreColor = d.smartScore >= 60 ? '#0ecb81' : d.smartScore >= 40 ? '#3b82f6' : d.smartScore >= 25 ? '#f0b90b' : '#f6465d';

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">${d.name} Market Intelligence <span class="ic-live">LIVE</span></div>`;

    // Price section
    t += `<div class="ic-section">`;
    t += `<div class="ic-section-title">Price Data</div>`;
    t += `<div class="ic-grid">`;
    t += `<span>Price:</span><span><b>$${d.price.toLocaleString()}</b></span>`;
    t += `<span>24h Change:</span><span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}"><b>${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(2)}%</b></span>`;
    t += `<span>24h High:</span><span>$${d.high.toLocaleString()}</span>`;
    t += `<span>24h Low:</span><span>$${d.low.toLocaleString()}</span>`;
    t += `<span>VWAP:</span><span>$${d.vwap.toLocaleString()} (${d.vwapDev >= 0 ? '+' : ''}${d.vwapDev.toFixed(2)}%)</span>`;
    t += `<span>Volume:</span><span>$${(d.volume / 1e6).toFixed(1)}M</span>`;
    t += `</div></div>`;

    // Smart Money
    t += `<div class="ic-section">`;
    t += `<div class="ic-section-title">${dirEmoji} Smart Money Analysis</div>`;
    t += `<div class="ic-score"><span style="color:${scoreColor}">${scoreBar} ${d.smartScore}/100</span> <b>${d.direction}</b></div>`;
    t += `<div class="ic-grid">`;
    t += `<span>Top Traders:</span><span>${d.topPosRatio > 1 ? '🟢 Long' : '🔴 Short'} (${d.topPosRatio.toFixed(3)} ratio)</span>`;
    t += `<span>Retail:</span><span>${d.retailRatio > 1 ? '🟢 Long' : '🔴 Short'} (${d.retailRatio.toFixed(3)} ratio)</span>`;
    t += `<span>Divergence:</span><span>${Math.abs(d.topPosRatio - d.retailRatio) > 0.2 ? '⚡ ' : ''}${(d.topPosRatio - d.retailRatio).toFixed(3)} gap</span>`;
    t += `<span>Factors Aligned:</span><span>${d.agreeing}/6</span>`;
    t += `<span>Regime:</span><span><b>${d.regime}</b></span>`;
    t += `</div></div>`;

    // Derivatives
    t += `<div class="ic-section">`;
    t += `<div class="ic-section-title">⚡ Derivatives Data</div>`;
    t += `<div class="ic-grid">`;
    t += `<span>Funding Rate:</span><span>${d.fundingBps >= 0 ? '+' : ''}${d.fundingBps.toFixed(2)} bps ${d.fundingBps < 0 ? '(longs get paid ✓)' : d.fundingBps > 5 ? '(shorts get paid)' : ''}</span>`;
    t += `<span>Taker Ratio:</span><span>${d.takerRatio.toFixed(3)} ${d.takerRatio > 1.1 ? '(buyers aggressive ✓)' : d.takerRatio < 0.9 ? '(sellers aggressive)' : '(balanced)'}</span>`;
    t += `<span>OI Change:</span><span>${d.oiChange >= 0 ? '+' : ''}${d.oiChange.toFixed(2)}% ${d.oiChange > 2 ? '(positions building ✓)' : d.oiChange < -2 ? '(positions closing)' : ''}</span>`;
    t += `<span>OI Value:</span><span>$${(d.oiValue / 1e6).toFixed(0)}M</span>`;
    t += `</div></div>`;

    // Microstructure
    t += `<div class="ic-section">`;
    t += `<div class="ic-section-title">🏥 Microstructure Health</div>`;
    const hColor = d.healthScore >= 80 ? '#0ecb81' : d.healthScore >= 60 ? '#3b82f6' : d.healthScore >= 40 ? '#f0b90b' : '#f6465d';
    t += `<div class="ic-score"><span style="color:${hColor}">Grade ${d.grade} — ${d.healthScore}/100</span></div>`;
    t += `<div class="ic-grid">`;
    t += `<span>Spread:</span><span>${d.spreadBps.toFixed(2)} bps ${d.spreadBps < 1 ? '✓' : d.spreadBps > 3 ? '⚠️' : ''}</span>`;
    t += `<span>Spot-Futures Gap:</span><span>${d.sfGap.toFixed(1)} bps ${Math.abs(d.sfGap) < 10 ? '✓' : '⚠️'}</span>`;
    t += `</div></div>`;

    // Anomalies
    if (d.anomalies.length > 0) {
      t += `<div class="ic-section ic-alert">`;
      t += `<div class="ic-section-title">⚠️ Active Anomalies (${d.anomalies.length}/5)</div>`;
      t += `<div>${d.anomalies.join(' · ')}</div>`;
      t += `</div>`;
    }

    // AI Verdict
    t += `<div class="ic-section ic-verdict">`;
    t += `<div class="ic-section-title">🧠 AI Verdict</div>`;
    t += `<div>${this._generateVerdict(d)}</div>`;
    t += `</div>`;

    t += `</div>`;

    return {
      role: 'ai', text: t,
      actions: [
        { label: `Compare ${d.name}`, cmd: `compare ${d.name} ETH` },
        { label: 'Market Summary', cmd: 'summary' },
        { label: 'Risk Check', cmd: 'risk' },
      ],
    };
  }

  _generateVerdict(d) {
    const parts = [];
    if (d.smartScore >= 70) {
      parts.push(`<b>Strong ${d.direction} signal</b> — ${d.agreeing}/6 factors aligned.`);
      if (d.direction === 'LONG') {
        if (d.topPosRatio > d.retailRatio + 0.2) parts.push('Top traders are more bullish than retail — smart money is leading.');
        if (d.fundingBps < -2) parts.push(`Negative funding (${d.fundingBps.toFixed(1)}bps) means longs are getting paid to hold.`);
        if (d.oiChange > 2) parts.push('Rising OI confirms new positions are being opened with conviction.');
      } else {
        if (d.topPosRatio < d.retailRatio - 0.2) parts.push('Top traders are more bearish than retail — potential squeeze incoming.');
        if (d.fundingBps > 5) parts.push(`Elevated funding (+${d.fundingBps.toFixed(1)}bps) suggests crowded longs.`);
      }
    } else if (d.smartScore >= 40) {
      parts.push(`<b>Moderate ${d.direction} lean</b> — ${d.agreeing}/6 factors aligned. Not high conviction yet.`);
    } else {
      parts.push('<b>No clear signal</b> — factors are mixed. Wait for better alignment before positioning.');
    }

    if (d.healthScore >= 80) parts.push(`Execution environment is excellent (Grade ${d.grade}).`);
    else if (d.healthScore < 40) parts.push(`⚠️ Poor microstructure (Grade ${d.grade}) — use caution with large orders.`);

    if (d.anomalies.length >= 3) parts.push(`⚠️ ${d.anomalies.length} anomaly signals active — elevated market activity.`);

    return parts.join(' ');
  }

  async _cmdCompare(sym1, sym2) {
    if (!sym1 || !sym2) return { role: 'ai', text: 'Usage: <b>compare BTC ETH</b>' };
    const data = await this._fetchSymbolData([sym1, sym2]);
    const a = data[0], b = data[1];
    if (!a?.price || !b?.price) return { role: 'ai', text: `Could not fetch data for one or both symbols.` };

    const better = a.smartScore > b.smartScore ? a : b;
    const aColor = a.smartScore >= 60 ? '#0ecb81' : a.smartScore >= 40 ? '#3b82f6' : '#f0b90b';
    const bColor = b.smartScore >= 60 ? '#0ecb81' : b.smartScore >= 40 ? '#3b82f6' : '#f0b90b';

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">${a.name} vs ${b.name} <span class="ic-live">LIVE</span></div>`;
    t += `<table class="ic-compare"><thead><tr><th></th><th>${a.name}</th><th>${b.name}</th></tr></thead><tbody>`;
    t += `<tr><td>Price</td><td>$${a.price.toLocaleString()}</td><td>$${b.price.toLocaleString()}</td></tr>`;
    t += `<tr><td>24h</td><td class="${a.change24h >= 0 ? 'val-up' : 'val-down'}">${a.change24h >= 0 ? '+' : ''}${a.change24h.toFixed(2)}%</td><td class="${b.change24h >= 0 ? 'val-up' : 'val-down'}">${b.change24h >= 0 ? '+' : ''}${b.change24h.toFixed(2)}%</td></tr>`;
    t += `<tr><td>Smart Score</td><td style="color:${aColor}"><b>${a.smartScore}/100</b></td><td style="color:${bColor}"><b>${b.smartScore}/100</b></td></tr>`;
    t += `<tr><td>Signal</td><td><b>${a.direction}</b></td><td><b>${b.direction}</b></td></tr>`;
    t += `<tr><td>Top Traders</td><td>${a.topPosRatio.toFixed(3)}</td><td>${b.topPosRatio.toFixed(3)}</td></tr>`;
    t += `<tr><td>Retail</td><td>${a.retailRatio.toFixed(3)}</td><td>${b.retailRatio.toFixed(3)}</td></tr>`;
    t += `<tr><td>Funding</td><td>${a.fundingBps.toFixed(1)}bps</td><td>${b.fundingBps.toFixed(1)}bps</td></tr>`;
    t += `<tr><td>Taker</td><td>${a.takerRatio.toFixed(3)}</td><td>${b.takerRatio.toFixed(3)}</td></tr>`;
    t += `<tr><td>OI Change</td><td>${a.oiChange >= 0 ? '+' : ''}${a.oiChange.toFixed(2)}%</td><td>${b.oiChange >= 0 ? '+' : ''}${b.oiChange.toFixed(2)}%</td></tr>`;
    t += `<tr><td>Health</td><td>Grade ${a.grade} (${a.healthScore})</td><td>Grade ${b.grade} (${b.healthScore})</td></tr>`;
    t += `<tr><td>Regime</td><td>${a.regime}</td><td>${b.regime}</td></tr>`;
    t += `</tbody></table>`;

    t += `<div class="ic-section ic-verdict"><div class="ic-section-title">🧠 AI Verdict</div>`;
    t += `<div><b>${better.name}</b> shows stronger institutional interest with a Smart Score of ${better.smartScore}/100 (${better.direction}).`;
    if (better.fundingBps < -2) t += ` Funding is favorable — ${better.direction === 'LONG' ? 'longs' : 'shorts'} getting paid.`;
    if (better.oiChange > 2) t += ` Rising OI confirms conviction.`;
    t += `</div></div></div>`;

    return { role: 'ai', text: t };
  }

  async _cmdSummary() {
    const top12 = this._allSymbols.slice(0, 12);
    const data = await this._fetchSymbolData(top12);

    const bullish = data.filter(d => d.direction === 'LONG');
    const bearish = data.filter(d => d.direction === 'SHORT');
    const neutral = data.filter(d => d.direction === 'NEUTRAL');
    const avgScore = Math.round(data.reduce((s, d) => s + d.smartScore, 0) / data.length);
    const bias = bullish.length > bearish.length + 2 ? 'BULLISH' : bearish.length > bullish.length + 2 ? 'BEARISH' : 'MIXED';

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">Market Summary <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">📊 Overall</div>`;
    t += `<div class="ic-grid">`;
    t += `<span>Market Bias:</span><span><b>${bias}</b></span>`;
    t += `<span>Avg Smart Score:</span><span>${avgScore}/100</span>`;
    t += `<span>Bullish:</span><span class="val-up">${bullish.length} assets</span>`;
    t += `<span>Bearish:</span><span class="val-down">${bearish.length} assets</span>`;
    t += `<span>Neutral:</span><span>${neutral.length} assets</span>`;
    t += `</div></div>`;

    // Top signals
    const sorted = [...data].sort((a, b) => b.smartScore - a.smartScore);
    t += `<div class="ic-section"><div class="ic-section-title">🔥 Strongest Signals</div>`;
    for (const d of sorted.slice(0, 5)) {
      const c = d.smartScore >= 60 ? '#0ecb81' : d.smartScore >= 40 ? '#3b82f6' : '#f0b90b';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span class="ic-dir ic-dir-${d.direction}">${d.direction}</span> <span style="color:${c};font-weight:700">${d.smartScore}</span> <span class="ic-regime">${d.regime}</span> <span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}">${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(1)}%</span></div>`;
    }
    t += `</div></div>`;

    return {
      role: 'ai', text: t,
      actions: [
        { label: `Analyze ${sorted[0].name}`, cmd: `analyze ${sorted[0].name}` },
        { label: 'Risk Check', cmd: 'risk' },
        { label: 'Opportunities', cmd: 'opportunities' },
      ],
    };
  }

  async _cmdRisk() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const risky = data.filter(d => d.healthScore < 50 || d.anomalies.length >= 3).sort((a, b) => a.healthScore - b.healthScore);
    const safe = data.filter(d => d.healthScore >= 80 && d.anomalies.length === 0).sort((a, b) => b.healthScore - a.healthScore);

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">Risk Assessment <span class="ic-live">LIVE</span></div>`;

    t += `<div class="ic-section"><div class="ic-section-title">🔴 High Risk Assets (${risky.length})</div>`;
    if (risky.length === 0) t += `<div>No high-risk assets detected. Market structure is healthy.</div>`;
    for (const d of risky) {
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> Grade ${d.grade} (${d.healthScore}/100)`;
      if (d.anomalies.length > 0) t += ` · ${d.anomalies.length} anomalies`;
      t += `</div>`;
    }
    t += `</div>`;

    t += `<div class="ic-section"><div class="ic-section-title">🟢 Safe Assets (${safe.length})</div>`;
    for (const d of safe.slice(0, 5)) {
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> Grade ${d.grade} (${d.healthScore}/100) · Score ${d.smartScore} ${d.direction}</div>`;
    }
    t += `</div></div>`;

    return { role: 'ai', text: t };
  }

  async _cmdOpportunities() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const sorted = [...data].filter(d => d.smartScore >= 40).sort((a, b) => b.smartScore - a.smartScore);

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">Top Opportunities <span class="ic-live">LIVE</span></div>`;

    if (sorted.length === 0) {
      t += `<div class="ic-section"><div>No strong signals right now. Market is indecisive — wait for factor alignment.</div></div>`;
    } else {
      for (const d of sorted.slice(0, 5)) {
        const c = d.smartScore >= 60 ? '#0ecb81' : '#3b82f6';
        t += `<div class="ic-section">`;
        t += `<div class="ic-section-title" style="color:${c}">${d.name} — ${d.direction} (Score: ${d.smartScore}/100)</div>`;
        t += `<div class="ic-grid">`;
        t += `<span>Price:</span><span>$${d.price.toLocaleString()} (${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(2)}%)</span>`;
        t += `<span>Factors:</span><span>${d.agreeing}/6 aligned</span>`;
        t += `<span>Regime:</span><span>${d.regime}</span>`;
        t += `<span>Health:</span><span>Grade ${d.grade}</span>`;
        t += `</div></div>`;
      }
    }
    t += `</div>`;

    return {
      role: 'ai', text: t,
      actions: sorted.length > 0 ? [{ label: `Deep Dive ${sorted[0].name}`, cmd: `analyze ${sorted[0].name}` }] : [],
    };
  }

  async _cmdFunding() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const sorted = [...data].sort((a, b) => a.fundingBps - b.fundingBps);

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">Funding Rate Overview <span class="ic-live">LIVE</span></div>`;
    t += `<div class="ic-section"><div class="ic-section-title">Sorted by Funding Rate (lowest first = contrarian bullish)</div>`;
    for (const d of sorted) {
      const fc = d.fundingBps < -3 ? '#0ecb81' : d.fundingBps > 5 ? '#f6465d' : 'var(--text-secondary)';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span style="color:${fc};font-weight:700">${d.fundingBps >= 0 ? '+' : ''}${d.fundingBps.toFixed(2)}bps</span> <span class="ic-dir ic-dir-${d.direction}">${d.direction}</span> <span class="${d.change24h >= 0 ? 'val-up' : 'val-down'}">${d.change24h >= 0 ? '+' : ''}${d.change24h.toFixed(1)}%</span></div>`;
    }
    t += `</div></div>`;

    return { role: 'ai', text: t };
  }

  async _cmdHealth() {
    const data = await this._fetchSymbolData(this._allSymbols.slice(0, 12));
    const sorted = [...data].sort((a, b) => b.healthScore - a.healthScore);

    let t = `<div class="ic-analysis">`;
    t += `<div class="ic-title">Microstructure Health <span class="ic-live">LIVE</span></div>`;
    for (const d of sorted) {
      const hc = d.healthScore >= 80 ? '#0ecb81' : d.healthScore >= 60 ? '#3b82f6' : d.healthScore >= 40 ? '#f0b90b' : '#f6465d';
      t += `<div class="ic-row"><span class="ic-sym">${d.name}</span> <span style="color:${hc};font-weight:700">Grade ${d.grade} (${d.healthScore})</span> <span>Spread: ${d.spreadBps.toFixed(1)}bps</span></div>`;
    }
    t += `</div>`;

    return { role: 'ai', text: t };
  }

  _cmdHelp() {
    return {
      role: 'ai',
      text: `<div class="ic-analysis"><div class="ic-title">Available Commands</div>
<div class="ic-section"><div class="ic-grid">
<span><b>analyze BTC</b></span><span>Full asset analysis with all metrics</span>
<span><b>compare ETH SOL</b></span><span>Side-by-side comparison of two assets</span>
<span><b>summary</b></span><span>Market overview with top signals</span>
<span><b>risk</b></span><span>Risk assessment across all assets</span>
<span><b>opportunities</b></span><span>Best setups ranked by Smart Score</span>
<span><b>funding</b></span><span>Funding rate overview</span>
<span><b>health</b></span><span>Microstructure health check</span>
</div></div>
<div class="ic-section">Or just type any symbol name (e.g., <b>SOL</b>) for a full analysis.</div></div>`,
      actions: [
        { label: 'Analyze BTC', cmd: 'analyze BTC' },
        { label: 'Market Summary', cmd: 'summary' },
        { label: 'Risk Check', cmd: 'risk' },
      ],
    };
  }

  // ─── Render ───
  _render() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    body.innerHTML = this.renderContent(null);
    this._bindEvents(body);
  }

  renderContent() {
    let h = '<style scoped>';
    h += '.ic-chat{display:flex;flex-direction:column;height:100%;min-height:300px}';
    h += '.ic-messages{flex:1;overflow-y:auto;padding:8px;display:flex;flex-direction:column;gap:8px}';
    h += '.ic-msg{max-width:95%;border-radius:8px;padding:8px 10px;font-size:10px;line-height:1.5;word-wrap:break-word}';
    h += '.ic-msg-user{align-self:flex-end;background:#3b82f633;color:#93c5fd;border-bottom-right-radius:2px;font-weight:600}';
    h += '.ic-msg-ai{align-self:flex-start;background:var(--bg-secondary);color:var(--text-secondary);border-bottom-left-radius:2px}';
    h += '.ic-actions{display:flex;flex-wrap:wrap;gap:4px;margin-top:6px}';
    h += '.ic-action{background:var(--bg-primary);border:1px solid var(--border-color);border-radius:12px;padding:3px 10px;font-size:9px;color:var(--text-muted);cursor:pointer;font-family:var(--font-mono);transition:all 0.15s}';
    h += '.ic-action:hover{border-color:#0ecb81;color:#0ecb81;background:#0ecb8111}';

    h += '.ic-input-area{padding:6px 8px;border-top:1px solid var(--border-color);display:flex;gap:6px;align-items:center}';
    h += '.ic-input{flex:1;background:var(--bg-secondary);border:1px solid var(--border-color);border-radius:6px;padding:8px 10px;font-size:11px;color:var(--text-primary);font-family:var(--font-mono);outline:none}';
    h += '.ic-input:focus{border-color:#0ecb81}';
    h += '.ic-input::placeholder{color:var(--text-muted)}';
    h += '.ic-send{background:#0ecb81;border:none;border-radius:6px;padding:8px 14px;color:#000;font-weight:700;font-size:11px;cursor:pointer;font-family:var(--font-mono)}';
    h += '.ic-send:hover{background:#0fde8e}';

    h += '.ic-thinking{display:flex;align-items:center;gap:6px;padding:8px;font-size:10px;color:var(--text-muted)}';
    h += '.ic-dots{display:flex;gap:3px}';
    h += '.ic-dot{width:5px;height:5px;border-radius:50%;background:#0ecb81;animation:ic-bounce 1.4s infinite}';
    h += '.ic-dot:nth-child(2){animation-delay:0.2s}';
    h += '.ic-dot:nth-child(3){animation-delay:0.4s}';
    h += '@keyframes ic-bounce{0%,80%,100%{transform:scale(0.6);opacity:0.4}40%{transform:scale(1);opacity:1}}';

    h += '.ic-analysis{font-size:10px;line-height:1.5}';
    h += '.ic-title{font-size:12px;font-weight:800;margin-bottom:6px;display:flex;align-items:center;gap:6px}';
    h += '.ic-live{font-size:7px;background:#0ecb8133;color:#0ecb81;padding:1px 5px;border-radius:3px;font-weight:700}';
    h += '.ic-section{background:rgba(255,255,255,0.02);border-radius:4px;padding:6px 8px;margin:4px 0}';
    h += '.ic-section-title{font-size:10px;font-weight:700;margin-bottom:4px;color:var(--text-primary)}';
    h += '.ic-grid{display:grid;grid-template-columns:120px 1fr;gap:2px 8px;font-size:9px}';
    h += '.ic-grid span:nth-child(odd){color:var(--text-muted)}';
    h += '.ic-score{font-size:11px;margin:2px 0;font-family:var(--font-mono)}';
    h += '.ic-row{display:flex;align-items:center;gap:6px;padding:2px 0;font-size:9px}';
    h += '.ic-sym{font-weight:700;min-width:40px;color:var(--text-primary)}';
    h += '.ic-dir{font-size:7px;font-weight:700;padding:1px 4px;border-radius:2px}';
    h += '.ic-dir-LONG{background:#0ecb8133;color:#0ecb81}';
    h += '.ic-dir-SHORT{background:#f6465d33;color:#f6465d}';
    h += '.ic-dir-NEUTRAL{background:#33333366;color:var(--text-muted)}';
    h += '.ic-regime{font-size:7px;color:var(--text-muted);padding:1px 4px;background:var(--bg-primary);border-radius:2px}';
    h += '.ic-alert{border-left:2px solid #f0b90b}';
    h += '.ic-verdict{border-left:2px solid #0ecb81;background:#0ecb8108}';

    h += '.ic-compare{width:100%;border-collapse:collapse;font-size:9px;margin:4px 0}';
    h += '.ic-compare th{text-align:left;padding:3px 6px;border-bottom:1px solid var(--border-color);color:var(--text-muted);font-weight:600}';
    h += '.ic-compare td{padding:3px 6px;border-bottom:1px solid rgba(255,255,255,0.03)}';
    h += '.ic-compare td:first-child{color:var(--text-muted)}';
    h += '</style>';

    h += '<div class="ic-chat">';
    h += '<div class="ic-messages" id="ic-messages">';

    for (const msg of this._messages) {
      h += `<div class="ic-msg ic-msg-${msg.role}">`;
      h += msg.text;
      if (msg.actions?.length) {
        h += '<div class="ic-actions">';
        for (const a of msg.actions) {
          h += `<button class="ic-action" data-cmd="${a.cmd}">${a.label}</button>`;
        }
        h += '</div>';
      }
      h += '</div>';
    }

    if (this._isThinking) {
      h += '<div class="ic-thinking"><div class="ic-dots"><div class="ic-dot"></div><div class="ic-dot"></div><div class="ic-dot"></div></div>Analyzing live Binance data...</div>';
    }

    h += '</div>';
    h += '<div class="ic-input-area">';
    h += '<input class="ic-input" id="ic-input" type="text" placeholder="Ask about any asset... (e.g., analyze BTC, compare ETH SOL, risk)" autocomplete="off">';
    h += '<button class="ic-send" id="ic-send">Ask</button>';
    h += '</div></div>';

    return h;
  }

  _bindEvents(body) {
    const input = body.querySelector('#ic-input');
    const send = body.querySelector('#ic-send');
    const messages = body.querySelector('#ic-messages');

    if (messages) messages.scrollTop = messages.scrollHeight;

    if (input && send) {
      const go = () => {
        const val = input.value.trim();
        if (val && !this._isThinking) {
          input.value = '';
          this._handleCommand(val);
        }
      };
      send.addEventListener('click', go);
      input.addEventListener('keydown', e => { if (e.key === 'Enter') go(); });
      if (!this._isThinking) input.focus();
    }

    body.querySelectorAll('.ic-action').forEach(btn => {
      btn.addEventListener('click', () => {
        if (!this._isThinking) this._handleCommand(btn.dataset.cmd);
      });
    });
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (body) this._bindEvents(body);
  }
}
customElements.define('intelligence-chat-panel', IntelligenceChatPanel);
export default IntelligenceChatPanel;
