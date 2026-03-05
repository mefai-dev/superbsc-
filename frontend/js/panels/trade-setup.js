// MEFAI Trade Setup Scanner — RSI, MACD, Bollinger Band setups
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class TradeSetupPanel extends BasePanel {
  static skill = 'Skill 27';
  static defaultTitle = 'Trade Setup Scanner';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._scanPairs = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT', 'MATICUSDT', 'LTCUSDT'];
  }

  async fetchData() {
    const results = await Promise.allSettled(
      this._scanPairs.map(sym => window.mefaiApi.spot.klines(sym, '1h', 100))
    );

    const setups = [];
    const readings = [];
    results.forEach((res, i) => {
      if (res.status !== 'fulfilled' || !Array.isArray(res.value) || res.value.length < 26) return;
      const klines = res.value;
      const symbol = this._scanPairs[i];
      const closes = klines.map(k => parseFloat(k[4]));
      const volumes = klines.map(k => parseFloat(k[5]));
      const price = closes[closes.length - 1];

      const rsi = this._calcRSI(closes, 14);
      const macd = this._calcMACD(closes);
      const bb = this._calcBB(closes, 20, 2);
      const avgVol = volumes.slice(-21, -1).reduce((a, b) => a + b, 0) / 20;
      const volSpike = avgVol > 0 ? volumes[volumes.length - 1] / avgVol : 1;
      const bbWidth = bb.middle > 0 ? (bb.upper - bb.lower) / bb.middle * 100 : 0;
      const chg = closes.length > 1 ? ((price - closes[closes.length - 2]) / closes[closes.length - 2] * 100) : 0;

      readings.push({ symbol, price, rsi, macdHist: macd.histogram, bbWidth, volSpike, chg });

      if (rsi <= 30) {
        setups.push({ symbol, price, type: 'RSI Oversold', signal: 'BUY', strength: Math.min(100, Math.round((30 - rsi) * 5 + 60)), detail: `RSI: ${rsi.toFixed(1)}`, rsi, volSpike });
      } else if (rsi >= 70) {
        setups.push({ symbol, price, type: 'RSI Overbought', signal: 'SELL', strength: Math.min(100, Math.round((rsi - 70) * 5 + 60)), detail: `RSI: ${rsi.toFixed(1)}`, rsi, volSpike });
      }

      if (macd.histogram > 0 && macd.prevHistogram <= 0) {
        setups.push({ symbol, price, type: 'MACD Bull Cross', signal: 'BUY', strength: 70, detail: `MACD: ${macd.line.toFixed(4)}`, rsi, volSpike });
      } else if (macd.histogram < 0 && macd.prevHistogram >= 0) {
        setups.push({ symbol, price, type: 'MACD Bear Cross', signal: 'SELL', strength: 70, detail: `MACD: ${macd.line.toFixed(4)}`, rsi, volSpike });
      }

      if (price <= bb.lower) {
        setups.push({ symbol, price, type: 'BB Lower Touch', signal: 'BUY', strength: 65, detail: `Band: ${formatCurrency(bb.lower)}`, rsi, volSpike });
      } else if (price >= bb.upper) {
        setups.push({ symbol, price, type: 'BB Upper Touch', signal: 'SELL', strength: 65, detail: `Band: ${formatCurrency(bb.upper)}`, rsi, volSpike });
      }

      if (bbWidth < 2) {
        setups.push({ symbol, price, type: 'BB Squeeze', signal: 'WATCH', strength: 55, detail: `Width: ${bbWidth.toFixed(2)}%`, rsi, volSpike });
      }

      if (volSpike > 2.5) {
        const dir = closes[closes.length - 1] > closes[closes.length - 2] ? 'BUY' : 'SELL';
        setups.push({ symbol, price, type: 'Volume Spike', signal: dir, strength: Math.min(90, Math.round(volSpike * 15)), detail: `${volSpike.toFixed(1)}x avg`, rsi, volSpike });
      }

      // Near-threshold setups (approaching oversold/overbought)
      if (rsi <= 35 && rsi > 30) {
        setups.push({ symbol, price, type: 'RSI Approaching Oversold', signal: 'WATCH', strength: 45, detail: `RSI: ${rsi.toFixed(1)}`, rsi, volSpike });
      } else if (rsi >= 65 && rsi < 70) {
        setups.push({ symbol, price, type: 'RSI Approaching Overbought', signal: 'WATCH', strength: 45, detail: `RSI: ${rsi.toFixed(1)}`, rsi, volSpike });
      }
    });

    setups.sort((a, b) => b.strength - a.strength);
    readings.sort((a, b) => Math.abs(b.rsi - 50) - Math.abs(a.rsi - 50));
    return { setups, readings, scanned: this._scanPairs.length };
  }

  _calcRSI(closes, period) {
    if (closes.length < period + 1) return 50;
    let gains = 0, losses = 0;
    for (let i = closes.length - period; i < closes.length; i++) {
      const diff = closes[i] - closes[i - 1];
      if (diff > 0) gains += diff; else losses -= diff;
    }
    const avgGain = gains / period;
    const avgLoss = losses / period;
    if (avgLoss === 0) return 100;
    return 100 - (100 / (1 + avgGain / avgLoss));
  }

  _calcMACD(closes) {
    if (closes.length < 26) return { line: 0, signal: 0, histogram: 0, prevHistogram: 0 };
    const k12 = 2 / 13, k26 = 2 / 27, k9 = 2 / 10;
    let e12 = closes.slice(0, 12).reduce((a, b) => a + b) / 12;
    let e26 = closes.slice(0, 26).reduce((a, b) => a + b) / 26;
    const ema12 = [], ema26 = [];
    for (let i = 0; i < closes.length; i++) {
      if (i < 12) ema12.push(closes.slice(0, i + 1).reduce((a, b) => a + b) / (i + 1));
      else { e12 = closes[i] * k12 + e12 * (1 - k12); ema12.push(e12); }
      if (i < 26) ema26.push(closes.slice(0, i + 1).reduce((a, b) => a + b) / (i + 1));
      else { e26 = closes[i] * k26 + e26 * (1 - k26); ema26.push(e26); }
    }
    const macdLine = ema12.map((v, i) => v - ema26[i]);
    let sig = macdLine.slice(0, 9).reduce((a, b) => a + b) / 9;
    const signals = [];
    for (let i = 0; i < macdLine.length; i++) {
      if (i < 9) signals.push(macdLine.slice(0, i + 1).reduce((a, b) => a + b) / (i + 1));
      else { sig = macdLine[i] * k9 + sig * (1 - k9); signals.push(sig); }
    }
    const n = macdLine.length - 1;
    return { line: macdLine[n], signal: signals[n], histogram: macdLine[n] - signals[n], prevHistogram: n > 0 ? macdLine[n - 1] - signals[n - 1] : 0 };
  }

  _calcBB(closes, period, mult) {
    if (closes.length < period) return { upper: 0, middle: 0, lower: 0 };
    const slice = closes.slice(-period);
    const mean = slice.reduce((a, b) => a + b) / period;
    const std = Math.sqrt(slice.reduce((a, v) => a + Math.pow(v - mean, 2), 0) / period);
    return { upper: mean + mult * std, middle: mean, lower: mean - mult * std };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading trade setups...</div>';

    let h = '<style scoped>';
    h += '.ts-header{display:flex;justify-content:space-between;align-items:center;margin-bottom:8px}';
    h += '.ts-count{font-size:11px;font-weight:700;color:var(--accent)}';
    h += '.ts-sub{font-size:9px;color:var(--text-muted)}';
    h += '.ts-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:5px;display:flex;justify-content:space-between;align-items:center}';
    h += '.ts-sym{font-weight:700;font-size:12px;color:var(--text)}';
    h += '.ts-type{font-size:9px;color:var(--text-muted)}';
    h += '.ts-detail{font-size:9px;color:var(--text-muted)}';
    h += '.ts-signal{padding:2px 8px;border-radius:3px;font-size:10px;font-weight:700;text-transform:uppercase}';
    h += '.ts-buy{background:rgba(0,200,83,.15);color:#00c853}';
    h += '.ts-sell{background:rgba(255,82,82,.15);color:#ff5252}';
    h += '.ts-watch{background:rgba(255,193,7,.15);color:#ffc107}';
    h += '.ts-price{font-size:10px;color:var(--text);font-weight:600}';
    h += '</style>';

    h += '<div class="ts-header">';
    if (data.setups.length > 0) {
      h += `<div><span class="ts-count">${data.setups.length} Active Setups</span><br><span class="ts-sub">${data.scanned} pairs · RSI · MACD · BB · Volume</span></div>`;
    } else {
      h += `<div><span class="ts-count">Market Readings</span><br><span class="ts-sub">${data.scanned} pairs scanned · No strong setups right now</span></div>`;
    }
    h += '</div>';

    if (data.setups.length > 0) {
      data.setups.slice(0, 12).forEach(s => {
        const sigCls = s.signal === 'BUY' ? 'ts-buy' : s.signal === 'SELL' ? 'ts-sell' : 'ts-watch';
        h += '<div class="ts-card">';
        h += '<div style="display:flex;flex-direction:column;gap:2px">';
        h += `<div class="ts-sym">${escapeHtml(s.symbol.replace('USDT', ''))}<span style="color:var(--text-muted);font-weight:400;font-size:10px">/USDT</span></div>`;
        h += `<div class="ts-type">${escapeHtml(s.type)}</div>`;
        h += `<div class="ts-detail">${escapeHtml(s.detail)}${s.volSpike > 1.5 ? ' · Vol ' + s.volSpike.toFixed(1) + 'x' : ''}</div>`;
        h += '</div>';
        h += '<div style="display:flex;flex-direction:column;align-items:flex-end;gap:2px">';
        h += `<span class="ts-signal ${sigCls}">${s.signal}</span>`;
        h += `<div class="ts-price">${formatCurrency(s.price)}</div>`;
        h += `<div style="font-size:8px;color:var(--text-muted)">Strength: ${s.strength}%</div>`;
        h += '</div></div>';
      });
    }

    // Always show current readings table
    if (data.readings && data.readings.length > 0) {
      h += '<div style="font-size:10px;font-weight:600;color:var(--text-muted);margin:8px 0 4px">Current Indicators (1H)</div>';
      h += '<table class="data-table" style="font-size:9px"><thead><tr><th>Pair</th><th style="text-align:right">Price</th><th style="text-align:right">RSI</th><th style="text-align:right">MACD</th><th style="text-align:right">BB%</th><th style="text-align:right">Vol</th></tr></thead><tbody>';
      data.readings.forEach(r => {
        const rsiCls = r.rsi <= 30 ? 'val-up' : r.rsi >= 70 ? 'val-down' : '';
        const macdCls = r.macdHist > 0 ? 'val-up' : r.macdHist < 0 ? 'val-down' : '';
        h += `<tr><td style="font-weight:600">${r.symbol.replace('USDT', '')}</td>`;
        h += `<td style="text-align:right">${formatCurrency(r.price)}</td>`;
        h += `<td style="text-align:right" class="${rsiCls}">${r.rsi.toFixed(0)}</td>`;
        h += `<td style="text-align:right" class="${macdCls}">${r.macdHist >= 0 ? '+' : ''}${r.macdHist.toFixed(2)}</td>`;
        h += `<td style="text-align:right">${r.bbWidth.toFixed(1)}%</td>`;
        h += `<td style="text-align:right">${r.volSpike.toFixed(1)}x</td></tr>`;
      });
      h += '</tbody></table>';
    }

    return h;
  }
}
customElements.define('trade-setup-panel', TradeSetupPanel);
export default TradeSetupPanel;
