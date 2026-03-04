// Volume Profile Analyzer — Track volume distribution and unusual volume spikes
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatCurrency } = window.mefaiUtils;

export class VolumeProfilePanel extends BasePanel {
  static skill = 'Skill 37';
  static defaultTitle = 'Volume Profile';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'volRatio';
    this._sortDir = 'desc';
  }

  async fetchData() {
    const [tickers, futures] = await Promise.all([
      window.mefaiApi.spot.tickers(),
      window.mefaiApi.futures.ticker24hr(),
    ]);
    return { tickers, futures };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Unable to load volume data</div>';

    const spotArr = Array.isArray(data.tickers) ? data.tickers : [];
    const futArr = Array.isArray(data.futures) ? data.futures : [];

    // Build futures volume map
    const futVolMap = {};
    for (const f of futArr) {
      if (f.symbol?.endsWith('USDT')) {
        futVolMap[f.symbol] = parseFloat(f.quoteVolume || 0);
      }
    }

    let rows = [];
    for (const t of spotArr) {
      const sym = t.symbol || '';
      if (!sym.endsWith('USDT')) continue;
      const short = sym.replace('USDT', '');

      const price = parseFloat(t.lastPrice || 0);
      const volume = parseFloat(t.quoteVolume || 0);
      const change = parseFloat(t.priceChangePercent || 0);
      const trades = parseInt(t.count || 0);
      const avgPrice = parseFloat(t.weightedAvgPrice || 0);
      if (!price || volume < 100000) continue;

      const futVol = futVolMap[sym] || 0;
      const totalVol = volume + futVol;

      // Volume ratio: futures / spot (higher = more speculative)
      const volRatio = volume > 0 ? futVol / volume : 0;

      // Average trade size
      const avgTradeSize = trades > 0 ? volume / trades : 0;

      // VWAP distance (price vs weighted avg)
      const vwapDist = avgPrice > 0 ? ((price - avgPrice) / avgPrice) * 100 : 0;

      rows.push({
        symbol: short, price, volume, futVol, totalVol,
        volRatio, change, trades, avgTradeSize, vwapDist,
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const highSpec = rows.filter(r => r.volRatio > 5).length;
    const totalMarketVol = rows.reduce((s, r) => s + r.totalVol, 0);
    const avgRatio = rows.length ? rows.reduce((s, r) => s + r.volRatio, 0) / rows.length : 0;

    let h = '<style scoped>';
    h += '.vp-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.vp-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.vp-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.vp-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.vp-bar{display:flex;height:12px;border-radius:3px;overflow:hidden;background:var(--bg-secondary)}';
    h += '.vp-bar-spot{background:#0ecb81;display:flex;align-items:center;justify-content:center;font-size:7px;color:#fff;font-weight:600}';
    h += '.vp-bar-fut{background:#f0b90b;display:flex;align-items:center;justify-content:center;font-size:7px;color:#000;font-weight:600}';
    h += '</style>';

    h += '<div class="vp-stats">';
    h += `<div class="vp-stat"><div class="vp-stat-label">Total 24h Vol</div><div class="vp-stat-value">${formatCurrency(totalMarketVol)}</div></div>`;
    h += `<div class="vp-stat"><div class="vp-stat-label">Avg Fut/Spot</div><div class="vp-stat-value">${avgRatio.toFixed(1)}x</div></div>`;
    h += `<div class="vp-stat"><div class="vp-stat-label">High Spec (>5x)</div><div class="vp-stat-value">${highSpec}</div></div>`;
    h += '</div>';

    const top30 = rows.slice(0, 30);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px' },
      { key: 'totalVol', label: 'Total Vol', align: 'right', render: v => formatCurrency(v) },
      { key: 'volRatio', label: 'Fut/Spot', align: 'center', width: '100px', render: (v, row) => {
        const spotPct = row.totalVol > 0 ? (row.volume / row.totalVol) * 100 : 50;
        const futPct = 100 - spotPct;
        return `<div class="vp-bar"><div class="vp-bar-spot" style="width:${spotPct}%">S</div><div class="vp-bar-fut" style="width:${futPct}%">F</div></div>`;
      }},
      { key: 'vwapDist', label: 'VWAP%', align: 'right', render: v => {
        const cls = v > 0.5 ? 'val-up' : v < -0.5 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
      }},
      { key: 'change', label: '24h%', align: 'right', render: v => formatPercent(v) },
    ];
    h += renderTable(cols, top30, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    const { bindTableEvents } = window.mefaiTable;
    bindTableEvents(body, [], [], {
      onSort: key => {
        if (this._sortKey === key) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        else { this._sortKey = key; this._sortDir = 'desc'; }
        this._renderBody();
      }
    });
  }

  _renderBody() {
    const body = this.querySelector('.panel-body');
    if (body && this._lastData) body.innerHTML = this.renderContent(this._lastData);
    this.afterRender();
  }
}
customElements.define('volume-profile-panel', VolumeProfilePanel);
export default VolumeProfilePanel;
