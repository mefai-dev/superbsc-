// MEFAI Funding Rate Alert — High funding rate arbitrage opportunities
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class FundingAlertPanel extends BasePanel {
  static skill = 'Skill 28';
  static defaultTitle = 'Funding Alert';

  constructor() {
    super();
    this._refreshRate = 30000;
  }

  async fetchData() {
    const [premRes, infoRes] = await Promise.allSettled([
      window.mefaiApi.futures.premiumIndex(),
      window.mefaiApi.futures.fundingInfo(),
    ]);

    const premiums = premRes.status === 'fulfilled' && Array.isArray(premRes.value) ? premRes.value : [];
    const fundingInfo = infoRes.status === 'fulfilled' && Array.isArray(infoRes.value) ? infoRes.value : [];

    const infoMap = {};
    fundingInfo.forEach(f => { infoMap[f.symbol] = f; });

    const alerts = premiums
      .filter(p => p.lastFundingRate && p.symbol?.endsWith('USDT'))
      .map(p => {
        const rate = parseFloat(p.lastFundingRate) * 100;
        const markPrice = parseFloat(p.markPrice || 0);
        const indexPrice = parseFloat(p.indexPrice || 0);
        const premium = markPrice && indexPrice ? ((markPrice - indexPrice) / indexPrice * 100) : 0;
        const annualized = rate * 3 * 365;
        const nextFunding = p.nextFundingTime ? new Date(p.nextFundingTime) : null;
        const timeToNext = nextFunding ? Math.max(0, (nextFunding - Date.now()) / 60000) : 0;

        return {
          symbol: p.symbol,
          rate, annualized, markPrice, premium,
          direction: rate > 0 ? 'SHORT' : 'LONG',
          opportunity: rate > 0 ? 'Longs pay shorts' : 'Shorts pay longs',
          timeToNext: Math.round(timeToNext),
          absRate: Math.abs(rate),
        };
      })
      .filter(a => a.absRate >= 0.01)
      .sort((a, b) => b.absRate - a.absRate);

    return { alerts, total: premiums.length };
  }

  renderContent(data) {
    if (!data || data.alerts.length === 0) return '<div class="panel-loading">No significant funding rate opportunities</div>';

    let h = '<style scoped>';
    h += '.fa-header{display:flex;justify-content:space-between;margin-bottom:8px}';
    h += '.fa-stat{font-size:10px;color:var(--text-muted)}';
    h += '.fa-stat b{color:var(--accent);font-size:12px}';
    h += '.fa-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;margin-bottom:5px}';
    h += '.fa-top{display:flex;justify-content:space-between;align-items:center}';
    h += '.fa-sym{font-weight:700;font-size:12px;color:var(--text)}';
    h += '.fa-rate{font-size:14px;font-weight:700}';
    h += '.fa-bottom{display:flex;justify-content:space-between;margin-top:4px;font-size:9px;color:var(--text-muted)}';
    h += '.fa-dir{padding:2px 6px;border-radius:3px;font-size:9px;font-weight:700}';
    h += '.fa-short{background:rgba(255,82,82,.15);color:#ff5252}';
    h += '.fa-long{background:rgba(0,200,83,.15);color:#00c853}';
    h += '.fa-hot{color:#ff5252;font-weight:700}';
    h += '</style>';

    const extremeCount = data.alerts.filter(a => a.absRate >= 0.05).length;
    h += '<div class="fa-header">';
    h += `<div class="fa-stat"><b>${data.alerts.length}</b> opportunities</div>`;
    h += `<div class="fa-stat">${extremeCount > 0 ? `<span class="fa-hot">${extremeCount} extreme</span>` : `${data.total} pairs scanned`}</div>`;
    h += '</div>';

    data.alerts.slice(0, 15).forEach(a => {
      const rateColor = a.rate > 0 ? 'val-up' : 'val-down';
      const dirCls = a.direction === 'SHORT' ? 'fa-short' : 'fa-long';
      const aprColor = Math.abs(a.annualized) > 100 ? 'fa-hot' : '';

      h += '<div class="fa-card">';
      h += '<div class="fa-top">';
      h += `<div><span class="fa-sym">${escapeHtml(a.symbol.replace('USDT', ''))}</span><span style="color:var(--text-muted);font-size:10px">/USDT</span></div>`;
      h += `<div style="display:flex;align-items:center;gap:6px">`;
      h += `<span class="fa-dir ${dirCls}">${a.direction}</span>`;
      h += `<span class="fa-rate ${rateColor}">${a.rate > 0 ? '+' : ''}${a.rate.toFixed(4)}%</span>`;
      h += '</div></div>';
      h += '<div class="fa-bottom">';
      h += `<span>${a.opportunity}</span>`;
      h += `<span>Mark: ${formatCurrency(a.markPrice)}</span>`;
      h += `<span class="${aprColor}">APR: ${a.annualized > 0 ? '+' : ''}${a.annualized.toFixed(0)}%</span>`;
      h += `<span>${a.timeToNext > 0 ? a.timeToNext + 'min' : 'Now'}</span>`;
      h += '</div></div>';
    });

    return h;
  }
}
customElements.define('funding-alert-panel', FundingAlertPanel);
export default FundingAlertPanel;
