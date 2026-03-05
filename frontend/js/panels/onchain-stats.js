// MEFAI Bitcoin On-Chain Stats — Hashrate, Difficulty, Mining, Network
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class OnchainStatsPanel extends BasePanel {
  static skill = 'Skill 25';
  static defaultTitle = 'On-Chain Stats';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._tab = 'network';
  }

  async fetchData() {
    const [statsRes, poolsRes, hashRes] = await Promise.allSettled([
      window.mefaiApi.onchain.stats(),
      window.mefaiApi.onchain.pools('4days'),
      window.mefaiApi.onchain.chart('hash-rate', '60days'),
    ]);

    const stats = statsRes.status === 'fulfilled' && statsRes.value && !statsRes.value.error ? statsRes.value : null;
    const pools = poolsRes.status === 'fulfilled' && poolsRes.value && !poolsRes.value.error ? poolsRes.value : null;
    const hashChart = hashRes.status === 'fulfilled' && hashRes.value?.values ? hashRes.value.values : [];

    return { stats, pools, hashChart };
  }

  renderContent(data) {
    if (!data?.stats) return '<div class="panel-loading">No on-chain data</div>';

    const s = data.stats;
    let h = '<style scoped>';
    h += '.oc-tabs{display:flex;gap:4px;margin-bottom:8px}';
    h += '.oc-tab{padding:3px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase}';
    h += '.oc-tab.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.oc-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.oc-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.oc-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.oc-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.oc-sub{font-size:9px;margin-top:1px;color:var(--text-muted)}';
    h += '.oc-spark{display:flex;align-items:flex-end;gap:1px;height:36px;margin-top:6px}';
    h += '.oc-bar{flex:1;background:var(--accent);border-radius:1px;min-width:2px;opacity:.7}';
    h += '.oc-pool-row{display:flex;align-items:center;gap:6px;padding:4px 0;border-bottom:1px solid var(--border);font-size:10px}';
    h += '.oc-pool-row:last-child{border-bottom:none}';
    h += '.oc-pool-bar{height:12px;background:var(--accent);border-radius:2px;opacity:.6}';
    h += '</style>';

    h += '<div class="oc-tabs">';
    h += `<button class="oc-tab ${this._tab === 'network' ? 'active' : ''}" data-tab="network">Network</button>`;
    h += `<button class="oc-tab ${this._tab === 'mining' ? 'active' : ''}" data-tab="mining">Mining</button>`;
    h += `<button class="oc-tab ${this._tab === 'hashrate' ? 'active' : ''}" data-tab="hashrate">Hashrate</button>`;
    h += '</div>';

    if (this._tab === 'network') {
      const hashrate = s.hash_rate || 0;
      const hashEH = (hashrate / 1e9).toFixed(2);
      const diff = s.difficulty || 0;
      const diffT = (diff / 1e12).toFixed(1);
      const blockTime = s.minutes_between_blocks || 0;
      const txCount = s.n_tx || 0;
      const blocksToday = s.n_blocks_mined || 0;
      const price = s.market_price_usd || 0;

      h += '<div class="oc-cards">';
      h += `<div class="oc-card"><div class="oc-label">BTC Price</div><div class="oc-val">${formatCurrency(price)}</div></div>`;
      h += `<div class="oc-card"><div class="oc-label">Hashrate</div><div class="oc-val">${hashEH}</div><div class="oc-sub">EH/s</div></div>`;
      h += `<div class="oc-card"><div class="oc-label">Difficulty</div><div class="oc-val">${diffT}T</div></div>`;
      h += '</div>';

      h += '<div class="oc-cards">';
      h += `<div class="oc-card"><div class="oc-label">Block Time</div><div class="oc-val">${blockTime.toFixed(1)}</div><div class="oc-sub">minutes avg</div></div>`;
      h += `<div class="oc-card"><div class="oc-label">TX Count</div><div class="oc-val">${formatNumber(txCount)}</div><div class="oc-sub">24h</div></div>`;
      h += `<div class="oc-card"><div class="oc-label">Blocks</div><div class="oc-val">${blocksToday}</div><div class="oc-sub">mined today</div></div>`;
      h += '</div>';

      const totalBTC = (s.totalbc || 0) / 1e8;
      const nextRetarget = s.nextretarget || 0;
      const blocksTotal = s.n_blocks_total || 0;
      const blocksToRetarget = nextRetarget - blocksTotal;
      h += '<div class="oc-cards" style="grid-template-columns:1fr 1fr">';
      h += `<div class="oc-card"><div class="oc-label">Total BTC</div><div class="oc-val">${formatNumber(totalBTC)}</div><div class="oc-sub">of 21M mined</div></div>`;
      h += `<div class="oc-card"><div class="oc-label">Next Retarget</div><div class="oc-val">${formatNumber(blocksToRetarget)}</div><div class="oc-sub">blocks away</div></div>`;
      h += '</div>';

    } else if (this._tab === 'mining') {
      if (data.pools) {
        const entries = Object.entries(data.pools).sort((a, b) => b[1] - a[1]);
        const total = entries.reduce((s, e) => s + e[1], 0);
        const maxBlocks = entries.length > 0 ? entries[0][1] : 1;

        h += '<div style="font-size:10px;font-weight:600;color:var(--text-muted);margin-bottom:6px">Mining Pool Distribution (4 days)</div>';
        entries.slice(0, 12).forEach(([name, blocks]) => {
          const pct = total > 0 ? (blocks / total * 100).toFixed(1) : 0;
          const w = (blocks / maxBlocks * 100).toFixed(0);
          h += `<div class="oc-pool-row">`;
          h += `<span style="min-width:90px;font-weight:600">${escapeHtml(name)}</span>`;
          h += `<div style="flex:1"><div class="oc-pool-bar" style="width:${w}%"></div></div>`;
          h += `<span style="min-width:50px;text-align:right">${blocks} (${pct}%)</span>`;
          h += '</div>';
        });
      } else {
        h += '<div style="color:var(--text-muted);font-size:10px">Pool data unavailable</div>';
      }

    } else {
      // Hashrate chart
      if (data.hashChart.length > 0) {
        const vals = data.hashChart.map(d => d.y);
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        const range = max - min || 1;
        const latest = vals[vals.length - 1];
        const first = vals[0];
        const chg = first > 0 ? ((latest - first) / first * 100) : 0;

        h += '<div class="oc-cards" style="grid-template-columns:1fr 1fr">';
        h += `<div class="oc-card"><div class="oc-label">Current</div><div class="oc-val">${(latest / 1e9).toFixed(2)} EH/s</div></div>`;
        h += `<div class="oc-card"><div class="oc-label">60d Change</div><div class="oc-val ${chg >= 0 ? 'val-up' : 'val-down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%</div></div>`;
        h += '</div>';

        h += '<div class="oc-label">60-Day Hashrate Trend</div>';
        h += '<div class="oc-spark">';
        vals.forEach(v => {
          const pct = ((v - min) / range * 80 + 20).toFixed(0);
          h += `<div class="oc-bar" style="height:${pct}%"></div>`;
        });
        h += '</div>';
      }
    }

    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.oc-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = tab.dataset.tab;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('onchain-stats-panel', OnchainStatsPanel);
export default OnchainStatsPanel;
