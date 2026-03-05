// MEFAI Deribit Options — Implied Volatility, Put/Call Ratio, Max Pain
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class DeribitOptionsPanel extends BasePanel {
  static skill = 'Skill 24';
  static defaultTitle = 'Deribit Options';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._currency = 'BTC';
  }

  async fetchData() {
    const [bookRes, volRes] = await Promise.allSettled([
      window.mefaiApi.deribit.bookSummary(this._currency, 'option'),
      window.mefaiApi.deribit.historicalVol(this._currency),
    ]);

    const contracts = bookRes.status === 'fulfilled' && bookRes.value?.result
      ? bookRes.value.result : [];
    const volHistory = volRes.status === 'fulfilled' && volRes.value?.result
      ? volRes.value.result : [];

    // Compute analytics
    let totalCallOI = 0, totalPutOI = 0, totalCallVol = 0, totalPutVol = 0;
    let avgCallIV = 0, avgPutIV = 0, callCount = 0, putCount = 0;
    const strikeOI = {};

    contracts.forEach(c => {
      const name = c.instrument_name || '';
      const isCall = name.endsWith('-C');
      const isPut = name.endsWith('-P');
      const oi = c.open_interest || 0;
      const vol = c.volume || 0;
      const iv = c.mark_iv || 0;

      // Extract strike from name like BTC-260626-80000-C
      const parts = name.split('-');
      const strike = parts.length >= 3 ? parseInt(parts[2]) : 0;

      if (isCall) {
        totalCallOI += oi;
        totalCallVol += vol;
        if (iv > 0) { avgCallIV += iv; callCount++; }
      } else if (isPut) {
        totalPutOI += oi;
        totalPutVol += vol;
        if (iv > 0) { avgPutIV += iv; putCount++; }
      }

      if (strike > 0) {
        if (!strikeOI[strike]) strikeOI[strike] = { call: 0, put: 0 };
        if (isCall) strikeOI[strike].call += oi;
        else strikeOI[strike].put += oi;
      }
    });

    avgCallIV = callCount > 0 ? avgCallIV / callCount : 0;
    avgPutIV = putCount > 0 ? avgPutIV / putCount : 0;
    const pcRatio = totalCallOI > 0 ? totalPutOI / totalCallOI : 0;

    // Max pain — strike where total pain is minimized
    let maxPainStrike = 0, minPain = Infinity;
    const strikes = Object.keys(strikeOI).map(Number).sort((a, b) => a - b);
    strikes.forEach(s => {
      let pain = 0;
      strikes.forEach(k => {
        const d = strikeOI[k];
        if (k < s) pain += d.put * (s - k);
        if (k > s) pain += d.call * (k - s);
      });
      if (pain < minPain) { minPain = pain; maxPainStrike = s; }
    });

    // Top strikes by OI
    const topStrikes = strikes
      .map(s => ({ strike: s, callOI: strikeOI[s].call, putOI: strikeOI[s].put, total: strikeOI[s].call + strikeOI[s].put }))
      .sort((a, b) => b.total - a.total)
      .slice(0, 10);

    const underlying = contracts.length > 0 ? (contracts[0].underlying_price || 0) : 0;
    const realizedVol = volHistory.length > 0 ? volHistory[volHistory.length - 1] : [0, 0];

    return {
      totalContracts: contracts.length,
      totalCallOI, totalPutOI, totalCallVol, totalPutVol,
      avgCallIV, avgPutIV, pcRatio, maxPainStrike,
      topStrikes, underlying,
      realizedVol: realizedVol[1] || 0,
      currency: this._currency,
    };
  }

  renderContent(data) {
    if (!data || data.totalContracts === 0) return '<div class="panel-loading">No options data available</div>';

    let h = '<style scoped>';
    h += '.do-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.do-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.do-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.do-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.do-sub{font-size:9px;margin-top:1px;color:var(--text-muted)}';
    h += '.do-toggle{display:flex;gap:4px;margin-bottom:8px}';
    h += '.do-btn{padding:3px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer}';
    h += '.do-btn.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.do-bar-row{display:flex;align-items:center;gap:4px;margin-bottom:3px;font-size:10px}';
    h += '.do-bar-call{background:rgba(0,200,83,.3);height:14px;border-radius:2px}';
    h += '.do-bar-put{background:rgba(255,82,82,.3);height:14px;border-radius:2px}';
    h += '.do-strike{min-width:55px;text-align:right;font-weight:600;font-size:9px}';
    h += '</style>';

    // Currency toggle
    h += '<div class="do-toggle">';
    h += `<button class="do-btn ${this._currency === 'BTC' ? 'active' : ''}" data-cur="BTC">BTC</button>`;
    h += `<button class="do-btn ${this._currency === 'ETH' ? 'active' : ''}" data-cur="ETH">ETH</button>`;
    h += '</div>';

    // Key metrics
    const pcColor = data.pcRatio > 1 ? 'val-down' : data.pcRatio < 0.7 ? 'val-up' : '';
    const pcSignal = data.pcRatio > 1 ? 'Bearish Hedge' : data.pcRatio < 0.7 ? 'Bullish' : 'Neutral';

    h += '<div class="do-cards">';
    h += `<div class="do-card"><div class="do-label">P/C Ratio</div><div class="do-val ${pcColor}">${data.pcRatio.toFixed(2)}</div><div class="do-sub">${pcSignal}</div></div>`;
    h += `<div class="do-card"><div class="do-label">Max Pain</div><div class="do-val">${formatCurrency(data.maxPainStrike)}</div><div class="do-sub">Expiry magnet</div></div>`;
    h += `<div class="do-card"><div class="do-label">Underlying</div><div class="do-val">${formatCurrency(data.underlying)}</div><div class="do-sub">${data.currency}</div></div>`;
    h += '</div>';

    h += '<div class="do-cards">';
    h += `<div class="do-card"><div class="do-label">Call IV</div><div class="do-val">${data.avgCallIV.toFixed(1)}%</div><div class="do-sub">${formatNumber(data.totalCallOI)} OI</div></div>`;
    h += `<div class="do-card"><div class="do-label">Put IV</div><div class="do-val">${data.avgPutIV.toFixed(1)}%</div><div class="do-sub">${formatNumber(data.totalPutOI)} OI</div></div>`;
    h += `<div class="do-card"><div class="do-label">Realized Vol</div><div class="do-val">${data.realizedVol.toFixed(1)}%</div><div class="do-sub">${data.totalContracts} contracts</div></div>`;
    h += '</div>';

    // Top strikes OI distribution
    if (data.topStrikes.length > 0) {
      h += '<div style="font-size:10px;font-weight:600;color:var(--text-muted);margin-bottom:4px">Top Strikes by Open Interest</div>';
      const maxOI = Math.max(...data.topStrikes.map(s => Math.max(s.callOI, s.putOI)));
      data.topStrikes.forEach(s => {
        const callW = maxOI > 0 ? (s.callOI / maxOI * 100).toFixed(0) : 0;
        const putW = maxOI > 0 ? (s.putOI / maxOI * 100).toFixed(0) : 0;
        const isMaxPain = s.strike === data.maxPainStrike;
        h += `<div class="do-bar-row" ${isMaxPain ? 'style="font-weight:700"' : ''}>`;
        h += `<span class="do-strike">${formatCurrency(s.strike)}</span>`;
        h += `<div style="flex:1;display:flex;gap:2px">`;
        h += `<div class="do-bar-call" style="width:${callW}%"></div>`;
        h += `<div class="do-bar-put" style="width:${putW}%"></div>`;
        h += '</div>';
        h += `<span style="min-width:30px;font-size:8px;color:var(--text-muted)">${isMaxPain ? 'MP' : ''}</span>`;
        h += '</div>';
      });
      h += '<div style="font-size:8px;color:var(--text-muted);margin-top:2px;display:flex;gap:10px"><span style="color:rgba(0,200,83,.8)">Call OI</span><span style="color:rgba(255,82,82,.8)">Put OI</span><span>MP = Max Pain</span></div>';
    }

    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.do-btn').forEach(btn => btn.addEventListener('click', () => {
      this._currency = btn.dataset.cur;
      this.refresh();
    }));
  }
}
customElements.define('deribit-options-panel', DeribitOptionsPanel);
export default DeribitOptionsPanel;
