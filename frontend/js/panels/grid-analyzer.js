// MEFAI Grid Trading Analyzer — ATR, Bollinger, Volatility analysis
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatPrice, formatPercent } = window.mefaiUtils;

export class GridAnalyzerPanel extends BasePanel {
  static skill = 'Skill 18';
  static defaultTitle = 'Grid Analyzer';

  constructor() {
    super();
    this._refreshRate = 0;
    this._symbol = 'BTCUSDT';
    this._interval = '4h';
    this._gridCount = 10;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
  }

  render() {
    const title = this.getAttribute('title') || this.constructor.defaultTitle;
    const skill = this.constructor.skill;
    this.innerHTML = `
      <div class="panel-header">
        <div><span class="panel-title">${title}</span>${skill ? `<span class="panel-skill">${skill}</span>` : ''}</div>
        <div class="panel-actions"><button class="panel-refresh" title="Refresh">&#8635;</button></div>
      </div>
      <div class="filter-bar">
        <input type="text" class="ga-symbol form-input" placeholder="Symbol" value="${escapeHtml(this._symbol)}" style="width:100px">
        <select class="ga-interval form-select">
          <option value="1h"${this._interval==='1h'?' selected':''}>1H</option>
          <option value="4h"${this._interval==='4h'?' selected':''}>4H</option>
          <option value="1d"${this._interval==='1d'?' selected':''}>1D</option>
        </select>
        <input type="number" class="ga-grids form-input" value="${this._gridCount}" min="3" max="50" style="width:60px" placeholder="Grids">
        <button class="btn ga-analyze-btn">Analyze</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Enter a symbol and click Analyze</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.ga-analyze-btn')?.addEventListener('click', () => this._doAnalyze());
    this.querySelector('.ga-symbol')?.addEventListener('keydown', e => { if (e.key === 'Enter') this._doAnalyze(); });
  }

  _doAnalyze() {
    this._symbol = (this.querySelector('.ga-symbol')?.value?.trim() || 'BTCUSDT').toUpperCase();
    this._interval = this.querySelector('.ga-interval')?.value || '4h';
    this._gridCount = Math.min(50, Math.max(3, parseInt(this.querySelector('.ga-grids')?.value) || 10));
    this.refresh();
  }

  async fetchData() {
    const res = await window.mefaiApi.spot.klines(this._symbol, this._interval, 100);
    if (!res || res?.error || !Array.isArray(res)) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Enter a symbol and click Analyze</div>';
    if (data?._fetchError) return '<div class="panel-loading">Unable to load kline data</div>';
    if (!data.length) return '<div class="panel-loading">No data for this symbol</div>';

    // Parse OHLCV
    const closes = data.map(k => parseFloat(k[4]));
    const highs = data.map(k => parseFloat(k[2]));
    const lows = data.map(k => parseFloat(k[3]));
    const price = closes[closes.length - 1];

    // ATR(14)
    const atrPeriod = 14;
    let atrSum = 0;
    for (let i = Math.max(1, closes.length - atrPeriod); i < closes.length; i++) {
      const tr = Math.max(highs[i] - lows[i], Math.abs(highs[i] - closes[i-1]), Math.abs(lows[i] - closes[i-1]));
      atrSum += tr;
    }
    const atr = atrSum / Math.min(atrPeriod, closes.length - 1);
    const atrPct = (atr / price) * 100;

    // Bollinger Bands(20,2)
    const bbPeriod = 20;
    const bbSlice = closes.slice(-bbPeriod);
    const sma = bbSlice.reduce((a, b) => a + b, 0) / bbSlice.length;
    const stdDev = Math.sqrt(bbSlice.reduce((a, b) => a + (b - sma) ** 2, 0) / bbSlice.length);
    const bbUpper = sma + 2 * stdDev;
    const bbLower = sma - 2 * stdDev;
    const bbWidth = ((bbUpper - bbLower) / sma * 100);

    // Historical Volatility (std of returns)
    const returns = [];
    for (let i = 1; i < closes.length; i++) returns.push(Math.log(closes[i] / closes[i-1]));
    const avgRet = returns.reduce((a, b) => a + b, 0) / returns.length;
    const volStd = Math.sqrt(returns.reduce((a, b) => a + (b - avgRet) ** 2, 0) / returns.length);
    const hvPct = volStd * 100;

    // Grid suggestions
    const gridUpper = price + atr * 2;
    const gridLower = price - atr * 2;
    const gridSpacing = (gridUpper - gridLower) / this._gridCount;
    const estProfitPerGrid = (gridSpacing / price * 100);

    let h = '<style scoped>';
    h += '.ga-cards{display:grid;grid-template-columns:1fr 1fr;gap:8px;padding:8px 0}';
    h += '.ga-card{background:var(--bg-secondary);border-radius:6px;padding:10px;text-align:center}';
    h += '.ga-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.ga-card-value{font-size:18px;font-weight:700;margin:4px 0}';
    h += '.ga-card-sub{font-size:10px;color:var(--text-muted)}';
    h += '.ga-grid-section{padding:8px 0;border-top:1px solid var(--border)}';
    h += '.ga-grid-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 6px}';
    h += '.ga-row{display:flex;justify-content:space-between;padding:3px 0;font-size:11px}';
    h += '</style>';

    h += '<div class="ga-cards">';
    h += `<div class="ga-card"><div class="ga-card-label">ATR(14)</div><div class="ga-card-value">${formatPrice(atr)}</div><div class="ga-card-sub">${atrPct.toFixed(2)}% of price</div></div>`;
    h += `<div class="ga-card"><div class="ga-card-label">Volatility</div><div class="ga-card-value">${hvPct.toFixed(2)}%</div><div class="ga-card-sub">Historical Vol</div></div>`;
    h += `<div class="ga-card"><div class="ga-card-label">BB Width</div><div class="ga-card-value">${bbWidth.toFixed(2)}%</div><div class="ga-card-sub">Bollinger(20,2)</div></div>`;
    h += `<div class="ga-card"><div class="ga-card-label">Price</div><div class="ga-card-value">${formatPrice(price)}</div><div class="ga-card-sub">${escapeHtml(this._symbol)}</div></div>`;
    h += '</div>';

    h += '<div class="ga-grid-section"><h4>Grid Parameters (' + this._gridCount + ' grids)</h4>';
    h += `<div class="ga-row"><span>Upper Bound</span><span style="font-weight:600">${formatPrice(gridUpper)}</span></div>`;
    h += `<div class="ga-row"><span>Lower Bound</span><span style="font-weight:600">${formatPrice(gridLower)}</span></div>`;
    h += `<div class="ga-row"><span>Grid Spacing</span><span>${formatPrice(gridSpacing)}</span></div>`;
    h += `<div class="ga-row"><span>Est. Profit/Grid</span><span class="val-up">${estProfitPerGrid.toFixed(3)}%</span></div>`;
    h += `<div class="ga-row"><span>BB Upper</span><span>${formatPrice(bbUpper)}</span></div>`;
    h += `<div class="ga-row"><span>BB Lower</span><span>${formatPrice(bbLower)}</span></div>`;
    h += `<div class="ga-row"><span>SMA(20)</span><span>${formatPrice(sma)}</span></div>`;
    h += '</div>';

    return h;
  }
}
customElements.define('grid-analyzer-panel', GridAnalyzerPanel);
export default GridAnalyzerPanel;
