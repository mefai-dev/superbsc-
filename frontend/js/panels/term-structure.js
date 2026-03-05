// Futures Term Structure & Delivery Analyzer — Basis curves, settlement history, contango/backwardation
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatCurrency } = window.mefaiUtils;

export class TermStructurePanel extends BasePanel {
  static skill = 'Skill 41';
  static defaultTitle = 'Term Structure';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._selectedPair = 0;
    this._sortKey = 'annBasis';
    this._sortDir = 'desc';
    this._pairs = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT'];
  }

  async fetchData() {
    const [tickers, exchangeInfo, ...rest] = await Promise.all([
      window.mefaiApi.futures.ticker24hr(),
      window.mefaiApi.futures.exchangeInfo(),
      ...this._pairs.flatMap(pair => [
        window.mefaiApi.futures.basis(pair, 'PERPETUAL', '1h', 10),
        window.mefaiApi.futures.deliveryPrice(pair),
      ]),
    ]);

    const tickerMap = {};
    if (Array.isArray(tickers)) tickers.forEach(t => { tickerMap[t.symbol] = t; });

    // Extract quarterly contract info
    const contracts = {};
    if (exchangeInfo?.symbols) {
      for (const s of exchangeInfo.symbols) {
        if (!contracts[s.pair]) contracts[s.pair] = [];
        contracts[s.pair].push({
          symbol: s.symbol,
          contractType: s.contractType,
          deliveryDate: s.deliveryDate,
          onboardDate: s.onboardDate,
          status: s.status,
        });
      }
    }

    return this._pairs.map((pair, i) => ({
      pair,
      ticker: tickerMap[pair] || {},
      basis: rest[i * 2],
      deliveries: rest[i * 2 + 1],
      contracts: contracts[pair] || [],
    }));
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Loading term structure...</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.pair.replace('USDT', '');
      const basisArr = Array.isArray(item.basis) ? item.basis : [];
      const deliveries = Array.isArray(item.deliveries) ? item.deliveries : [];
      const tk = item.ticker;

      if (!basisArr.length) continue;

      const latest = basisArr[basisArr.length - 1];
      const basisRate = parseFloat(latest?.basisRate || 0) * 100;
      const basisValue = parseFloat(latest?.basis || 0);
      const indexPrice = parseFloat(latest?.indexPrice || 0);
      const futuresPrice = parseFloat(latest?.futuresPrice || 0);

      // Calculate basis trend (are we in deepening contango or reversing?)
      let basisTrend = 0;
      if (basisArr.length >= 3) {
        const recent = basisArr.slice(-3).map(b => parseFloat(b?.basisRate || 0));
        basisTrend = (recent[2] - recent[0]) * 10000;
      }

      // Annualized basis (perpetual: use funding rate × 365 × 3 if 8h intervals)
      const fundingRate = parseFloat(tk?.lastFundingRate || 0);
      const annBasis = fundingRate * 3 * 365 * 100; // annualized %

      // Quarterly contracts
      const quarterlyContracts = item.contracts.filter(c =>
        c.contractType === 'CURRENT_QUARTER' || c.contractType === 'NEXT_QUARTER'
      ).filter(c => c.status === 'TRADING');

      // Next delivery
      const nextDelivery = quarterlyContracts
        .filter(c => c.deliveryDate > Date.now())
        .sort((a, b) => a.deliveryDate - b.deliveryDate)[0];

      const daysToDelivery = nextDelivery ? Math.ceil((nextDelivery.deliveryDate - Date.now()) / 86400000) : null;

      // Last settlement price
      const lastSettlement = deliveries.length ? deliveries[0] : null;

      const regime = basisRate > 0.01 ? 'CONTANGO' : basisRate < -0.01 ? 'BACKWRD' : 'FLAT';
      const change = parseFloat(tk?.priceChangePercent || 0);

      rows.push({
        symbol: sym, basisRate, basisValue, basisTrend, annBasis,
        indexPrice, futuresPrice, regime, change,
        daysToDelivery, lastSettlementPrice: lastSettlement?.deliveryPrice,
        lastSettlementTime: lastSettlement?.deliveryTime,
        quarterlyCount: quarterlyContracts.length,
      });
    }

    if (!rows.length) return '<div class="panel-loading">Loading term structure...</div>';

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      if (this._sortKey === 'regime') return a.regime.localeCompare(b.regime) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    const contango = rows.filter(r => r.regime === 'CONTANGO').length;
    const backwrd = rows.filter(r => r.regime === 'BACKWRD').length;
    const avgAnn = rows.length ? rows.reduce((s, r) => s + r.annBasis, 0) / rows.length : 0;

    let h = '<style scoped>';
    h += '.ts-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.ts-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.ts-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.ts-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.ts-regime{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700}';
    h += '.ts-contango{background:#0ecb8133;color:#0ecb81}';
    h += '.ts-backwrd{background:#f6465d33;color:#f6465d}';
    h += '.ts-flat{background:#33333366;color:var(--text-muted)}';
    h += '.ts-trend{font-size:10px;font-weight:600}';
    h += '</style>';

    h += '<div class="ts-stats">';
    h += `<div class="ts-stat"><div class="ts-stat-label">Contango</div><div class="ts-stat-value val-up">${contango}</div></div>`;
    h += `<div class="ts-stat"><div class="ts-stat-label">Avg Ann. Basis</div><div class="ts-stat-value">${avgAnn.toFixed(1)}%</div></div>`;
    h += `<div class="ts-stat"><div class="ts-stat-label">Backwardation</div><div class="ts-stat-value val-down">${backwrd}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Pair', width: '50px' },
      { key: 'regime', label: 'Regime', align: 'center', render: v => {
        const cls = v === 'CONTANGO' ? 'ts-contango' : v === 'BACKWRD' ? 'ts-backwrd' : 'ts-flat';
        return `<span class="ts-regime ${cls}">${v}</span>`;
      }},
      { key: 'basisRate', label: 'Basis', align: 'right', render: v => {
        const cls = v > 0 ? 'val-up' : v < 0 ? 'val-down' : '';
        return `<span class="${cls}">${(v).toFixed(3)}%</span>`;
      }},
      { key: 'annBasis', label: 'Ann.%', align: 'right', render: v => {
        const cls = v > 0 ? 'val-up' : v < 0 ? 'val-down' : '';
        return `<span class="${cls}">${v.toFixed(1)}%</span>`;
      }},
      { key: 'basisTrend', label: 'Trend', align: 'center', render: v => {
        if (Math.abs(v) < 0.5) return '<span class="ts-trend" style="color:var(--text-muted)">—</span>';
        const cls = v > 0 ? 'val-up' : 'val-down';
        const arrow = v > 0 ? '↑' : '↓';
        return `<span class="ts-trend ${cls}">${arrow}${Math.abs(v).toFixed(1)}</span>`;
      }},
      { key: 'change', label: '24h%', align: 'right', render: v => formatPercent(v) },
    ];
    h += renderTable(cols, rows, { sortKey: this._sortKey, sortDir: this._sortDir });
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
    if (body && this._data) body.innerHTML = this.renderContent(this._data);
    this.afterRender();
  }
}
customElements.define('term-structure-panel', TermStructurePanel);
export default TermStructurePanel;
