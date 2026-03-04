// Top Trader vs Retail Divergence — Compare pro vs retail positioning
import { BasePanel } from '../components/base-panel.js';

const { formatPercent } = window.mefaiUtils;

export class TraderDivergencePanel extends BasePanel {
  static skill = 'Skill 24';
  static defaultTitle = 'Trader Divergence';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._symbols = ['BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT', 'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT'];
  }

  async fetchData() {
    const results = await Promise.all(
      this._symbols.map(async sym => {
        const [topAccount, retailAccount, topPosition] = await Promise.all([
          window.mefaiApi.futures.topLongShortAccount(sym, '1h'),
          window.mefaiApi.futures.longShortRatio(sym, '1h'),
          window.mefaiApi.futures.topLongShortPosition(sym, '1h'),
        ]);
        return { symbol: sym, topAccount, retailAccount, topPosition };
      })
    );
    return results;
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Unable to load divergence data</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const topAcc = Array.isArray(item.topAccount) ? item.topAccount[0] : item.topAccount;
      const retailAcc = Array.isArray(item.retailAccount) ? item.retailAccount[0] : item.retailAccount;
      const topPos = Array.isArray(item.topPosition) ? item.topPosition[0] : item.topPosition;

      const topLong = parseFloat(topAcc?.longAccount || topAcc?.longShortRatio || 0) * 100;
      const retailLong = parseFloat(retailAcc?.longAccount || retailAcc?.longShortRatio || 0) * 100;
      const topPosLong = parseFloat(topPos?.longAccount || topPos?.longShortRatio || 0) * 100;

      // Divergence: top traders vs retail sentiment
      const divergence = topLong - retailLong;

      rows.push({
        symbol: sym,
        topLong: topLong > 1 ? topLong : topLong * 100,
        retailLong: retailLong > 1 ? retailLong : retailLong * 100,
        topPosLong: topPosLong > 1 ? topPosLong : topPosLong * 100,
        divergence,
      });
    }

    // Sort by absolute divergence
    rows.sort((a, b) => Math.abs(b.divergence) - Math.abs(a.divergence));

    let h = '<style scoped>';
    h += '.td-cards{display:grid;grid-template-columns:1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.td-card{background:var(--bg-secondary);border-radius:6px;padding:8px;text-align:center}';
    h += '.td-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.td-card-value{font-size:14px;font-weight:700;margin:2px 0}';
    h += '.td-bar-row{display:flex;align-items:center;gap:6px;padding:4px 0;font-size:11px}';
    h += '.td-bar-label{width:50px;font-weight:600}';
    h += '.td-bar-wrap{flex:1;display:flex;height:16px;border-radius:3px;overflow:hidden;background:var(--bg-secondary)}';
    h += '.td-bar-long{background:#0ecb81;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:600}';
    h += '.td-bar-short{background:#f6465d;display:flex;align-items:center;justify-content:center;font-size:9px;color:#fff;font-weight:600}';
    h += '.td-diverge{width:60px;text-align:right;font-weight:600;font-size:10px}';
    h += '.td-section{border-top:1px solid var(--border);padding:6px 0}';
    h += '.td-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 4px}';
    h += '</style>';

    // Summary
    const maxDiv = rows[0];
    const bullish = rows.filter(r => r.divergence > 5).length;
    const bearish = rows.filter(r => r.divergence < -5).length;
    h += '<div class="td-cards">';
    h += `<div class="td-card"><div class="td-card-label">Top Bias Bullish</div><div class="td-card-value val-up">${bullish} coins</div></div>`;
    h += `<div class="td-card"><div class="td-card-label">Top Bias Bearish</div><div class="td-card-value val-down">${bearish} coins</div></div>`;
    h += '</div>';

    // Divergence bars
    h += '<div class="td-section"><h4>Top Trader (Account) vs Retail Long%</h4>';
    for (const r of rows) {
      const topL = Math.max(0, Math.min(100, r.topLong));
      const retL = Math.max(0, Math.min(100, r.retailLong));
      const divCls = r.divergence > 0 ? 'val-up' : 'val-down';
      h += '<div class="td-bar-row">';
      h += `<span class="td-bar-label">${r.symbol}</span>`;
      h += '<div style="flex:1;display:flex;flex-direction:column;gap:2px">';
      // Top row
      h += `<div class="td-bar-wrap"><div class="td-bar-long" style="width:${topL}%">${topL.toFixed(0)}%</div><div class="td-bar-short" style="width:${100-topL}%">${(100-topL).toFixed(0)}%</div></div>`;
      // Retail row
      h += `<div class="td-bar-wrap"><div class="td-bar-long" style="width:${retL}%">${retL.toFixed(0)}%</div><div class="td-bar-short" style="width:${100-retL}%">${(100-retL).toFixed(0)}%</div></div>`;
      h += '</div>';
      h += `<span class="td-diverge ${divCls}">${r.divergence > 0 ? '+' : ''}${r.divergence.toFixed(1)}%</span>`;
      h += '</div>';
    }
    h += '</div>';

    return h;
  }
}
customElements.define('trader-divergence-panel', TraderDivergencePanel);
export default TraderDivergencePanel;
