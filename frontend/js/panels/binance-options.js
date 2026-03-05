// MEFAI Binance Options — Greeks, OI by Expiry, Max Pain
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class BinanceOptionsPanel extends BasePanel {
  static skill = 'Skill 26';
  static defaultTitle = 'Binance Options';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._tab = 'overview';
  }

  async fetchData() {
    const [markRes, oiRes] = await Promise.allSettled([
      window.mefaiApi.binanceOptions.mark(),
      window.mefaiApi.binanceOptions.openInterest('BTC'),
    ]);

    // Detect geo-restriction: proxy returns {error:true, status:451, detail:{code:0, msg:"..."}}
    const markVal = markRes.status === 'fulfilled' ? markRes.value : null;
    if (markVal && markVal.error === true && (markVal.status === 451 || markVal.detail?.code === 0)) {
      return { geoBlocked: true };
    }

    const marks = Array.isArray(markVal) ? markVal : [];
    const oiData = oiRes.status === 'fulfilled' && Array.isArray(oiRes.value) ? oiRes.value : [];

    // Parse greeks from mark data
    let totalCallOI = 0, totalPutOI = 0;
    const byExpiry = {};

    marks.forEach(m => {
      const sym = m.symbol || '';
      const isCall = sym.includes('-C');
      const isPut = sym.includes('-P');
      const parts = sym.split('-');
      const expiry = parts.length >= 2 ? parts[1] : 'unknown';

      if (!byExpiry[expiry]) byExpiry[expiry] = { callOI: 0, putOI: 0, callVol: 0, putVol: 0, contracts: 0 };
      byExpiry[expiry].contracts++;

      const oi = parseFloat(m.sumOpenInterest || m.openInterest || 0);
      if (isCall) { totalCallOI += oi; byExpiry[expiry].callOI += oi; }
      else if (isPut) { totalPutOI += oi; byExpiry[expiry].putOI += oi; }
    });

    const pcRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;
    const expiries = Object.entries(byExpiry)
      .map(([exp, d]) => ({ expiry: exp, ...d, total: d.callOI + d.putOI }))
      .sort((a, b) => b.total - a.total);

    // Top contracts by greeks
    const topGreeks = marks
      .filter(m => m.markPrice && parseFloat(m.markPrice) > 0)
      .map(m => ({
        symbol: m.symbol,
        markPrice: parseFloat(m.markPrice || 0),
        delta: parseFloat(m.delta || 0),
        gamma: parseFloat(m.gamma || 0),
        theta: parseFloat(m.theta || 0),
        vega: parseFloat(m.vega || 0),
        markIV: parseFloat(m.markImpliedVolatility || m.markIv || 0),
      }))
      .sort((a, b) => Math.abs(b.delta) - Math.abs(a.delta))
      .slice(0, 15);

    return {
      totalContracts: marks.length,
      totalCallOI, totalPutOI, pcRatio,
      expiries: expiries.slice(0, 8),
      topGreeks,
    };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">No data</div>';
    if (data.geoBlocked) return this._renderGeoBlocked();
    if (data.totalContracts === 0) return '<div class="panel-loading">No Binance options data available</div>';

    let h = '<style scoped>';
    h += '.bo-tabs{display:flex;gap:4px;margin-bottom:8px}';
    h += '.bo-tab{padding:3px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase}';
    h += '.bo-tab.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.bo-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.bo-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.bo-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.bo-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.bo-sub{font-size:9px;margin-top:1px;color:var(--text-muted)}';
    h += '</style>';

    h += '<div class="bo-tabs">';
    h += `<button class="bo-tab ${this._tab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>`;
    h += `<button class="bo-tab ${this._tab === 'expiry' ? 'active' : ''}" data-tab="expiry">By Expiry</button>`;
    h += `<button class="bo-tab ${this._tab === 'greeks' ? 'active' : ''}" data-tab="greeks">Greeks</button>`;
    h += '</div>';

    if (this._tab === 'overview') {
      const pcColor = data.pcRatio > 1 ? 'val-down' : data.pcRatio < 0.7 ? 'val-up' : '';
      h += '<div class="bo-cards">';
      h += `<div class="bo-card"><div class="bo-label">Contracts</div><div class="bo-val">${formatNumber(data.totalContracts)}</div></div>`;
      h += `<div class="bo-card"><div class="bo-label">P/C Ratio</div><div class="bo-val ${pcColor}">${data.pcRatio.toFixed(2)}</div></div>`;
      h += `<div class="bo-card"><div class="bo-label">Call OI</div><div class="bo-val">${formatNumber(data.totalCallOI)}</div></div>`;
      h += '</div>';
      h += '<div class="bo-cards" style="grid-template-columns:1fr 1fr">';
      h += `<div class="bo-card"><div class="bo-label">Put OI</div><div class="bo-val">${formatNumber(data.totalPutOI)}</div></div>`;
      h += `<div class="bo-card"><div class="bo-label">Expiries</div><div class="bo-val">${data.expiries.length}</div></div>`;
      h += '</div>';
    } else if (this._tab === 'expiry') {
      h += '<table class="data-table"><thead><tr><th>Expiry</th><th style="text-align:right">Call OI</th><th style="text-align:right">Put OI</th><th style="text-align:right">P/C</th></tr></thead><tbody>';
      data.expiries.forEach(e => {
        const pc = e.callOI > 0 ? (e.putOI / e.callOI).toFixed(2) : '—';
        h += `<tr><td style="font-weight:600">${escapeHtml(e.expiry)}</td><td style="text-align:right">${formatNumber(e.callOI)}</td><td style="text-align:right">${formatNumber(e.putOI)}</td><td style="text-align:right">${pc}</td></tr>`;
      });
      h += '</tbody></table>';
    } else {
      h += '<table class="data-table" style="font-size:9px"><thead><tr><th>Contract</th><th>Delta</th><th>Gamma</th><th>Theta</th><th>Vega</th><th>IV%</th></tr></thead><tbody>';
      data.topGreeks.forEach(g => {
        const short = g.symbol.replace('BTC-', '').replace('ETH-', '');
        h += `<tr><td style="font-weight:600;font-size:8px">${escapeHtml(short)}</td>`;
        h += `<td class="${g.delta > 0 ? 'val-up' : 'val-down'}">${g.delta.toFixed(3)}</td>`;
        h += `<td>${g.gamma.toFixed(5)}</td><td>${g.theta.toFixed(3)}</td><td>${g.vega.toFixed(3)}</td>`;
        h += `<td>${(g.markIV * 100).toFixed(0)}</td></tr>`;
      });
      h += '</tbody></table>';
    }

    return h;
  }

  _renderGeoBlocked() {
    let h = '<style scoped>';
    h += '.bo-geo{text-align:center;padding:12px}';
    h += '.bo-geo-icon{font-size:28px;margin-bottom:8px}';
    h += '.bo-geo-title{font-size:13px;font-weight:700;color:var(--text);margin-bottom:4px}';
    h += '.bo-geo-sub{font-size:10px;color:var(--text-muted);margin-bottom:12px;line-height:1.5}';
    h += '.bo-features{display:grid;grid-template-columns:1fr 1fr;gap:6px;text-align:left}';
    h += '.bo-feat{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px}';
    h += '.bo-feat-title{font-size:10px;font-weight:700;color:var(--accent)}';
    h += '.bo-feat-desc{font-size:9px;color:var(--text-muted);margin-top:2px}';
    h += '.bo-alt{margin-top:10px;padding:8px;background:rgba(0,200,83,.08);border:1px solid rgba(0,200,83,.2);border-radius:6px;font-size:10px;color:var(--text-muted)}';
    h += '.bo-alt a{color:var(--accent);cursor:pointer;text-decoration:underline}';
    h += '</style>';
    h += '<div class="bo-geo">';
    h += '<div class="bo-geo-icon">&#127760;</div>';
    h += '<div class="bo-geo-title">Binance Options — Region Restricted</div>';
    h += '<div class="bo-geo-sub">Binance European Options API (eapi.binance.com) is not available in this server region.<br>When accessible, this panel provides:</div>';
    h += '<div class="bo-features">';
    h += '<div class="bo-feat"><div class="bo-feat-title">Options Greeks</div><div class="bo-feat-desc">Delta, Gamma, Theta, Vega, IV for all BTC/ETH contracts</div></div>';
    h += '<div class="bo-feat"><div class="bo-feat-title">Put/Call Ratio</div><div class="bo-feat-desc">Aggregate OI ratio to gauge market sentiment</div></div>';
    h += '<div class="bo-feat"><div class="bo-feat-title">OI by Expiry</div><div class="bo-feat-desc">Open interest distribution across expiration dates</div></div>';
    h += '<div class="bo-feat"><div class="bo-feat-title">Max Pain</div><div class="bo-feat-desc">Strike price where most options expire worthless</div></div>';
    h += '</div>';
    h += '<div class="bo-alt">For live options data, use the <a onclick="document.querySelector(\'[data-layout=bitcoin]\')?.click()">Deribit Options</a> panel which covers BTC &amp; ETH options globally.</div>';
    h += '</div>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.bo-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = tab.dataset.tab;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('binance-options-panel', BinanceOptionsPanel);
export default BinanceOptionsPanel;
