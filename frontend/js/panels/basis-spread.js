// Spot-Futures Basis Spread — Compare spot vs futures prices
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent } = window.mefaiUtils;

export class BasisSpreadPanel extends BasePanel {
  static skill = 'Skill 21';
  static defaultTitle = 'Basis Spread';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sortKey = 'spread';
    this._sortDir = 'desc';
  }

  async fetchData() {
    const [spotData, futuresData] = await Promise.all([
      window.mefaiApi.spot.tickers(),
      window.mefaiApi.futures.premiumIndex(),
    ]);
    if (!spotData || spotData?.error || !futuresData || futuresData?.error) return { _fetchError: true };
    return { spot: spotData, futures: futuresData };
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load basis data</div>';

    const spotArr = Array.isArray(data.spot) ? data.spot : [];
    const futArr = Array.isArray(data.futures) ? data.futures : [];

    // Build spot price map
    const spotMap = {};
    for (const t of spotArr) {
      if (t.symbol?.endsWith('USDT')) spotMap[t.symbol] = parseFloat(t.lastPrice || 0);
    }

    // Build basis rows
    let rows = [];
    for (const f of futArr) {
      const sym = f.symbol;
      if (!sym?.endsWith('USDT') || !spotMap[sym]) continue;
      const markPrice = parseFloat(f.markPrice || 0);
      const spotPrice = spotMap[sym];
      const fundingRate = parseFloat(f.lastFundingRate || 0);
      if (!markPrice || !spotPrice) continue;
      const spread = ((markPrice - spotPrice) / spotPrice) * 100;
      const annualized = spread * 365;
      rows.push({
        symbol: sym.replace('USDT', ''),
        spotPrice, markPrice, spread, annualized,
        fundingRate: fundingRate * 100,
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Top extremes
    const top20 = rows.slice(0, 20);

    // Summary
    const avgSpread = rows.length ? rows.reduce((s, r) => s + r.spread, 0) / rows.length : 0;
    const maxContango = rows.length ? rows.reduce((m, r) => r.spread > m.spread ? r : m, rows[0]) : null;
    const maxBackward = rows.length ? rows.reduce((m, r) => r.spread < m.spread ? r : m, rows[0]) : null;

    let h = '<style scoped>';
    h += '.bs-cards{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.bs-card{background:var(--bg-secondary);border-radius:6px;padding:8px;text-align:center}';
    h += '.bs-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.bs-card-value{font-size:14px;font-weight:700;margin:2px 0}';
    h += '</style>';

    h += '<div class="bs-cards">';
    h += `<div class="bs-card"><div class="bs-card-label">Avg Basis</div><div class="bs-card-value ${avgSpread >= 0 ? 'val-up' : 'val-down'}">${avgSpread.toFixed(4)}%</div></div>`;
    if (maxContango) h += `<div class="bs-card"><div class="bs-card-label">Max Contango</div><div class="bs-card-value val-up">${maxContango.symbol} +${maxContango.spread.toFixed(3)}%</div></div>`;
    if (maxBackward) h += `<div class="bs-card"><div class="bs-card-label">Max Backwardation</div><div class="bs-card-value val-down">${maxBackward.symbol} ${maxBackward.spread.toFixed(3)}%</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '60px' },
      { key: 'spotPrice', label: 'Spot', align: 'right', render: v => formatPrice(v) },
      { key: 'markPrice', label: 'Futures', align: 'right', render: v => formatPrice(v) },
      { key: 'spread', label: 'Basis%', align: 'right', render: v => {
        const cls = v >= 0 ? 'val-up' : 'val-down';
        return `<span class="${cls}">${v >= 0 ? '+' : ''}${v.toFixed(4)}%</span>`;
      }},
      { key: 'fundingRate', label: 'Fund%', align: 'right', render: v => {
        const cls = v >= 0 ? 'val-up' : 'val-down';
        return `<span class="${cls}">${v.toFixed(4)}%</span>`;
      }},
    ];
    h += renderTable(cols, top20, { sortKey: this._sortKey, sortDir: this._sortDir });
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
customElements.define('basis-spread-panel', BasisSpreadPanel);
export default BasisSpreadPanel;
