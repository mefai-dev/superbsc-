// Spread & Liquidity Monitor — Compare spot vs futures spread and order book depth
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent } = window.mefaiUtils;

export class SpreadMonitorPanel extends BasePanel {
  static skill = 'Skill 32';
  static defaultTitle = 'Spread Monitor';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sortKey = 'spreadBps';
    this._sortDir = 'desc';
  }

  async fetchData() {
    const [spotBook, futBook] = await Promise.all([
      window.mefaiApi.spot.bookTicker(),
      window.mefaiApi.futures.bookTicker(),
    ]);
    return { spotBook, futBook };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Unable to load spread data</div>';

    const spotArr = Array.isArray(data.spotBook) ? data.spotBook : [];
    const futArr = Array.isArray(data.futBook) ? data.futBook : [];

    // Build futures map
    const futMap = {};
    for (const f of futArr) {
      if (f.symbol?.endsWith('USDT')) futMap[f.symbol] = f;
    }

    let rows = [];
    for (const s of spotArr) {
      const sym = s.symbol;
      if (!sym?.endsWith('USDT')) continue;
      const f = futMap[sym];
      if (!f) continue;

      const spotBid = parseFloat(s.bidPrice || 0);
      const spotAsk = parseFloat(s.askPrice || 0);
      const futBid = parseFloat(f.bidPrice || 0);
      const futAsk = parseFloat(f.askPrice || 0);
      if (!spotBid || !spotAsk || !futBid || !futAsk) continue;

      const spotMid = (spotBid + spotAsk) / 2;
      const futMid = (futBid + futAsk) / 2;

      const spotSpread = spotAsk - spotBid;
      const futSpread = futAsk - futBid;
      const spotSpreadBps = (spotSpread / spotMid) * 10000;
      const futSpreadBps = (futSpread / futMid) * 10000;

      // Basis: futures premium/discount vs spot
      const basis = futMid > 0 ? ((futMid - spotMid) / spotMid) * 10000 : 0;

      const short = sym.replace('USDT', '');

      rows.push({
        symbol: short, spotMid, futMid,
        spotSpreadBps, futSpreadBps,
        spreadBps: Math.max(spotSpreadBps, futSpreadBps),
        basis, spotBidQty: parseFloat(s.bidQty || 0), futBidQty: parseFloat(f.bidQty || 0),
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const tight = rows.filter(r => r.spreadBps < 1).length;
    const wide = rows.filter(r => r.spreadBps > 5).length;
    const avgBasis = rows.length ? rows.reduce((s, r) => s + r.basis, 0) / rows.length : 0;

    let h = '<style scoped>';
    h += '.sm-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.sm-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.sm-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.sm-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '</style>';

    h += '<div class="sm-stats">';
    h += `<div class="sm-stat"><div class="sm-stat-label">Tight (<1 bps)</div><div class="sm-stat-value val-up">${tight}</div></div>`;
    h += `<div class="sm-stat"><div class="sm-stat-label">Avg Basis</div><div class="sm-stat-value">${avgBasis.toFixed(1)} bps</div></div>`;
    h += `<div class="sm-stat"><div class="sm-stat-label">Wide (>5 bps)</div><div class="sm-stat-value val-down">${wide}</div></div>`;
    h += '</div>';

    const top30 = rows.slice(0, 30);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px' },
      { key: 'spotMid', label: 'Spot', align: 'right', render: v => '$' + formatPrice(v) },
      { key: 'spotSpreadBps', label: 'Spot Sprd', align: 'right', render: v => {
        const cls = v < 1 ? 'val-up' : v > 5 ? 'val-down' : '';
        return `<span class="${cls}">${v.toFixed(1)} bps</span>`;
      }},
      { key: 'futSpreadBps', label: 'Fut Sprd', align: 'right', render: v => {
        const cls = v < 1 ? 'val-up' : v > 5 ? 'val-down' : '';
        return `<span class="${cls}">${v.toFixed(1)} bps</span>`;
      }},
      { key: 'basis', label: 'Basis', align: 'right', render: v => {
        const cls = v > 0 ? 'val-up' : v < 0 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(1)} bps</span>`;
      }},
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
customElements.define('spread-monitor-panel', SpreadMonitorPanel);
export default SpreadMonitorPanel;
