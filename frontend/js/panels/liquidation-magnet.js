// MEFAI Liquidation Magnet — Estimated liquidation clusters that attract price
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class LiquidationMagnetPanel extends BasePanel {
  static skill = 'Skill 29';
  static defaultTitle = 'Liquidation Magnet';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._symbol = 'BTCUSDT';
  }

  async fetchData() {
    const sym = this._symbol;
    const [tickerRes, oiRes, lsRes, takerRes, topPosRes] = await Promise.allSettled([
      window.mefaiApi.futures.ticker24hr(sym),
      window.mefaiApi.futures.openInterestHist(sym, '1h', 24),
      window.mefaiApi.futures.longShortRatio(sym, '1h'),
      window.mefaiApi.futures.takerBuySellRatio(sym, '1h'),
      window.mefaiApi.futures.topLongShortPosition(sym, '1h'),
    ]);

    const ticker = tickerRes.status === 'fulfilled' && !tickerRes.value?.error
      ? (Array.isArray(tickerRes.value) ? tickerRes.value.find(t => t.symbol === sym) : tickerRes.value) : null;
    const oiHist = oiRes.status === 'fulfilled' && Array.isArray(oiRes.value) ? oiRes.value : [];
    const lsData = lsRes.status === 'fulfilled' && Array.isArray(lsRes.value) ? lsRes.value : [];
    const takerData = takerRes.status === 'fulfilled' && Array.isArray(takerRes.value) ? takerRes.value : [];
    const topPos = topPosRes.status === 'fulfilled' && Array.isArray(topPosRes.value) ? topPosRes.value : [];

    if (!ticker) return null;

    const price = parseFloat(ticker.lastPrice || ticker.markPrice || 0);
    const volume = parseFloat(ticker.quoteVolume || 0);
    const change = parseFloat(ticker.priceChangePercent || 0);

    const ls = lsData.length > 0 ? parseFloat(lsData[0].longShortRatio || 1) : 1;
    const longPct = ls / (1 + ls) * 100;
    const shortPct = 100 - longPct;

    const topLong = topPos.length > 0 ? parseFloat(topPos[0].longAccount || 0.5) * 100 : 50;
    const takerRatio = takerData.length > 0 ? parseFloat(takerData[0].buySellRatio || 1) : 1;

    const oiValues = oiHist.map(o => parseFloat(o.sumOpenInterestValue || 0));
    const oiCurrent = oiValues.length > 0 ? oiValues[oiValues.length - 1] : 0;
    const oiPrev = oiValues.length > 1 ? oiValues[0] : oiCurrent;
    const oiChange = oiPrev > 0 ? ((oiCurrent - oiPrev) / oiPrev * 100) : 0;

    const leverages = [5, 10, 20, 50, 100];
    const liqZones = [];

    leverages.forEach(lev => {
      const liqDistPct = 100 / lev;
      const longLiqPrice = price * (1 - liqDistPct / 100);
      const shortLiqPrice = price * (1 + liqDistPct / 100);
      const weight = lev <= 10 ? 0.3 : lev <= 25 ? 0.35 : lev <= 50 ? 0.2 : 0.15;

      liqZones.push({
        leverage: lev,
        longLiq: longLiqPrice,
        shortLiq: shortLiqPrice,
        liqDistPct,
        longOI: oiCurrent * weight * (longPct / 100),
        shortOI: oiCurrent * weight * (shortPct / 100),
      });
    });

    const totalLongLiqValue = liqZones.reduce((s, z) => s + z.longOI, 0);
    const totalShortLiqValue = liqZones.reduce((s, z) => s + z.shortOI, 0);
    const magnetDirection = totalLongLiqValue > totalShortLiqValue ? 'DOWN' : 'UP';
    const magnetStrength = Math.abs(totalLongLiqValue - totalShortLiqValue) / (totalLongLiqValue + totalShortLiqValue || 1) * 100;

    return {
      symbol: sym, price, volume, change,
      longPct, shortPct, topLong, takerRatio,
      oiCurrent, oiChange, liqZones,
      magnetDirection, magnetStrength,
    };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">No liquidation data</div>';

    let h = '<style scoped>';
    h += '.lm-toggle{display:flex;gap:4px;margin-bottom:8px;flex-wrap:wrap}';
    h += '.lm-btn{padding:3px 8px;font-size:9px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer}';
    h += '.lm-btn.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.lm-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:8px}';
    h += '.lm-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.lm-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.lm-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.lm-sub{font-size:9px;margin-top:1px;color:var(--text-muted)}';
    h += '.lm-magnet{background:var(--bg);border:2px solid;border-radius:8px;padding:10px;margin-bottom:8px;text-align:center}';
    h += '.lm-magnet-up{border-color:#00c853}';
    h += '.lm-magnet-down{border-color:#ff5252}';
    h += '.lm-zone{display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);font-size:10px}';
    h += '.lm-zone:last-child{border:none}';
    h += '.lm-bar-long{height:12px;background:rgba(0,200,83,.4);border-radius:2px}';
    h += '.lm-bar-short{height:12px;background:rgba(255,82,82,.4);border-radius:2px}';
    h += '</style>';

    const symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT'];
    h += '<div class="lm-toggle">';
    symbols.forEach(s => {
      h += `<button class="lm-btn ${this._symbol === s ? 'active' : ''}" data-sym="${s}">${s.replace('USDT', '')}</button>`;
    });
    h += '</div>';

    const magCls = data.magnetDirection === 'UP' ? 'lm-magnet-up' : 'lm-magnet-down';
    const magColor = data.magnetDirection === 'UP' ? '#00c853' : '#ff5252';
    const magArrow = data.magnetDirection === 'UP' ? '↑' : '↓';
    h += `<div class="lm-magnet ${magCls}">`;
    h += '<div style="font-size:10px;color:var(--text-muted);text-transform:uppercase;letter-spacing:1px">Liquidation Magnet</div>';
    h += `<div style="font-size:20px;font-weight:800;color:${magColor};margin:4px 0">${magArrow} ${data.magnetDirection}</div>`;
    h += `<div style="font-size:10px;color:var(--text-muted)">Strength: ${data.magnetStrength.toFixed(0)}% · More ${data.magnetDirection === 'DOWN' ? 'long' : 'short'} liquidations ahead</div>`;
    h += '</div>';

    const chgCls = data.change >= 0 ? 'val-up' : 'val-down';
    h += '<div class="lm-cards">';
    h += `<div class="lm-card"><div class="lm-label">Price</div><div class="lm-val">${formatCurrency(data.price)}</div><div class="lm-sub ${chgCls}">${data.change >= 0 ? '+' : ''}${data.change.toFixed(2)}%</div></div>`;
    h += `<div class="lm-card"><div class="lm-label">Long/Short</div><div class="lm-val">${data.longPct.toFixed(0)}/${data.shortPct.toFixed(0)}</div><div class="lm-sub">L/S ratio</div></div>`;
    h += `<div class="lm-card"><div class="lm-label">OI Change</div><div class="lm-val ${data.oiChange >= 0 ? 'val-up' : 'val-down'}">${data.oiChange >= 0 ? '+' : ''}${data.oiChange.toFixed(1)}%</div><div class="lm-sub">24h</div></div>`;
    h += '</div>';

    h += '<div style="font-size:10px;font-weight:600;color:var(--text-muted);margin-bottom:4px">Estimated Liquidation Clusters</div>';
    const maxOI = Math.max(...data.liqZones.map(z => Math.max(z.longOI, z.shortOI)));
    data.liqZones.forEach(z => {
      const longW = maxOI > 0 ? (z.longOI / maxOI * 100).toFixed(0) : 0;
      const shortW = maxOI > 0 ? (z.shortOI / maxOI * 100).toFixed(0) : 0;
      h += '<div class="lm-zone">';
      h += `<span style="min-width:30px;font-weight:700">${z.leverage}x</span>`;
      h += `<span style="min-width:65px;font-size:9px;color:#ff5252">${formatCurrency(z.longLiq)}</span>`;
      h += '<div style="flex:1;display:flex;gap:2px">';
      h += `<div class="lm-bar-long" style="width:${longW}%"></div>`;
      h += `<div class="lm-bar-short" style="width:${shortW}%"></div>`;
      h += '</div>';
      h += `<span style="min-width:65px;text-align:right;font-size:9px;color:#00c853">${formatCurrency(z.shortLiq)}</span>`;
      h += '</div>';
    });
    h += '<div style="font-size:8px;color:var(--text-muted);margin-top:2px;display:flex;gap:10px"><span style="color:rgba(0,200,83,.8)">Long Liq (price falls)</span><span style="color:rgba(255,82,82,.8)">Short Liq (price rises)</span></div>';

    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.lm-btn').forEach(btn => btn.addEventListener('click', () => {
      this._symbol = btn.dataset.sym;
      this.refresh();
    }));
  }
}
customElements.define('liquidation-magnet-panel', LiquidationMagnetPanel);
export default LiquidationMagnetPanel;
