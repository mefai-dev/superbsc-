// MEFAI BSC Chain Growth Tracker — TVL history + multi-chain comparison
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class ChainGrowthPanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'Chain Growth';

  constructor() {
    super();
    this._refreshRate = 300000;
    this._tab = 'overview';
  }

  async fetchData() {
    const [tvlRes, chainsRes] = await Promise.allSettled([
      window.mefaiApi.defillama.chainTvl(),
      window.mefaiApi.defillama.chains(),
    ]);

    const tvlHistory = tvlRes.status === 'fulfilled' && Array.isArray(tvlRes.value) ? tvlRes.value : [];
    const allChains = chainsRes.status === 'fulfilled' && Array.isArray(chainsRes.value) ? chainsRes.value : [];

    // Current BSC TVL
    const currentTvl = tvlHistory.length ? tvlHistory[tvlHistory.length - 1].tvl : 0;
    const prevDayTvl = tvlHistory.length > 1 ? tvlHistory[tvlHistory.length - 2].tvl : currentTvl;
    const prev7dTvl = tvlHistory.length > 7 ? tvlHistory[tvlHistory.length - 8].tvl : currentTvl;
    const prev30dTvl = tvlHistory.length > 30 ? tvlHistory[tvlHistory.length - 31].tvl : currentTvl;
    const athTvl = tvlHistory.reduce((max, d) => Math.max(max, d.tvl), 0);

    // Chain ranking
    const chainRank = [...allChains]
      .filter(c => c.tvl > 0)
      .sort((a, b) => b.tvl - a.tvl);
    const bscRank = chainRank.findIndex(c => c.name === 'BSC') + 1;
    const totalTvl = chainRank.reduce((s, c) => s + c.tvl, 0);
    const bscShare = totalTvl > 0 ? (currentTvl / totalTvl * 100) : 0;

    // Recent TVL trend (last 30 days for sparkline)
    const trend = tvlHistory.slice(-30).map(d => d.tvl);

    return {
      currentTvl, prevDayTvl, prev7dTvl, prev30dTvl, athTvl,
      bscRank, bscShare, totalTvl,
      topChains: chainRank.slice(0, 10),
      trend,
      totalDays: tvlHistory.length,
    };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">No chain data</div>';

    let h = '<style scoped>';
    h += '.cg-tabs{display:flex;gap:4px;margin-bottom:8px}';
    h += '.cg-tab{padding:3px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase}';
    h += '.cg-tab.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.cg-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.cg-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.cg-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.cg-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.cg-sub{font-size:9px;margin-top:1px}';
    h += '.cg-spark{display:flex;align-items:flex-end;gap:1px;height:32px;margin-bottom:10px}';
    h += '.cg-bar{flex:1;background:var(--accent);border-radius:1px;min-width:2px;opacity:.7}';
    h += '.cg-rank{display:inline-block;width:18px;text-align:center;font-weight:700;color:var(--accent)}';
    h += '</style>';

    h += '<div class="cg-tabs">';
    h += `<button class="cg-tab ${this._tab === 'overview' ? 'active' : ''}" data-tab="overview">Overview</button>`;
    h += `<button class="cg-tab ${this._tab === 'ranking' ? 'active' : ''}" data-tab="ranking">Chain Ranking</button>`;
    h += '</div>';

    if (this._tab === 'overview') {
      h += this._renderOverview(data);
    } else {
      h += this._renderRanking(data);
    }
    return h;
  }

  _renderOverview(data) {
    let h = '';
    const chg1d = data.prevDayTvl > 0 ? ((data.currentTvl - data.prevDayTvl) / data.prevDayTvl * 100) : 0;
    const chg7d = data.prev7dTvl > 0 ? ((data.currentTvl - data.prev7dTvl) / data.prev7dTvl * 100) : 0;
    const chg30d = data.prev30dTvl > 0 ? ((data.currentTvl - data.prev30dTvl) / data.prev30dTvl * 100) : 0;
    const athDist = data.athTvl > 0 ? ((data.currentTvl - data.athTvl) / data.athTvl * 100) : 0;

    const c1d = chg1d >= 0 ? 'val-up' : 'val-down';
    const c7d = chg7d >= 0 ? 'val-up' : 'val-down';
    const c30d = chg30d >= 0 ? 'val-up' : 'val-down';

    h += '<div class="cg-cards">';
    h += `<div class="cg-card"><div class="cg-label">BSC TVL</div><div class="cg-val">${formatCurrency(data.currentTvl)}</div><div class="cg-sub ${c1d}">${chg1d >= 0 ? '↑' : '↓'}${Math.abs(chg1d).toFixed(2)}% 24h</div></div>`;
    h += `<div class="cg-card"><div class="cg-label">Rank</div><div class="cg-val">#${data.bscRank}</div><div class="cg-sub">${data.bscShare.toFixed(1)}% share</div></div>`;
    h += `<div class="cg-card"><div class="cg-label">ATH TVL</div><div class="cg-val">${formatCurrency(data.athTvl)}</div><div class="cg-sub">${athDist.toFixed(1)}% from ATH</div></div>`;
    h += '</div>';

    h += '<div class="cg-cards" style="grid-template-columns:1fr 1fr">';
    h += `<div class="cg-card"><div class="cg-label">7d Change</div><div class="cg-val ${c7d}">${chg7d >= 0 ? '↑' : '↓'}${Math.abs(chg7d).toFixed(2)}%</div></div>`;
    h += `<div class="cg-card"><div class="cg-label">30d Change</div><div class="cg-val ${c30d}">${chg30d >= 0 ? '↑' : '↓'}${Math.abs(chg30d).toFixed(2)}%</div></div>`;
    h += '</div>';

    // 30-day TVL sparkline
    if (data.trend.length > 1) {
      const max = Math.max(...data.trend);
      const min = Math.min(...data.trend);
      const range = max - min || 1;
      h += '<div class="cg-label" style="margin-bottom:4px">30-Day TVL Trend</div>';
      h += '<div class="cg-spark">';
      data.trend.forEach(v => {
        const pct = ((v - min) / range * 80 + 20).toFixed(0);
        h += `<div class="cg-bar" style="height:${pct}%"></div>`;
      });
      h += '</div>';
    }

    return h;
  }

  _renderRanking(data) {
    let h = '<table class="data-table"><thead><tr>';
    h += '<th>#</th><th>Chain</th><th style="text-align:right">TVL</th><th style="text-align:right">Share%</th><th>Token</th>';
    h += '</tr></thead><tbody>';

    data.topChains.forEach((c, i) => {
      const share = data.totalTvl > 0 ? (c.tvl / data.totalTvl * 100) : 0;
      const isBsc = c.name === 'BSC';
      const style = isBsc ? 'background:rgba(240,185,11,0.08);font-weight:700' : '';
      h += `<tr style="${style}">`;
      h += `<td><span class="cg-rank">${i + 1}</span></td>`;
      h += `<td style="font-weight:600">${escapeHtml(c.name)}</td>`;
      h += `<td style="text-align:right">${formatCurrency(c.tvl)}</td>`;
      h += `<td style="text-align:right">${share.toFixed(1)}%</td>`;
      h += `<td style="font-size:9px;color:var(--text-muted)">${escapeHtml(c.tokenSymbol || '—')}</td>`;
      h += '</tr>';
    });
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.cg-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = tab.dataset.tab;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('chain-growth-panel', ChainGrowthPanel);
export default ChainGrowthPanel;
