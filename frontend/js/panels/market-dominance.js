// Market Cap Dominance Tracker — BTC/ETH/BNB dominance + sector breakdown
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatPercent } = window.mefaiUtils;

export class MarketDominancePanel extends BasePanel {
  static skill = 'Skill 22';
  static defaultTitle = 'Market Dominance';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sortKey = 'mcap';
    this._sortDir = 'desc';
  }

  async fetchData() {
    const [symbolsRes, globalRes] = await Promise.all([
      window.mefaiApi.products.symbols(),
      window.mefaiApi.coingecko.global(),
    ]);
    if (!symbolsRes || symbolsRes?.error) return { _fetchError: true };
    return { symbols: symbolsRes, global: globalRes };
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load market data</div>';

    const list = data?.symbols?.data || data?.data || data;
    if (!Array.isArray(list) || !list.length) return '<div class="panel-loading">No market data</div>';

    // Get CoinGecko dominance data
    const cgGlobal = data?.global?.data || {};
    const cgDominance = cgGlobal.market_cap_percentage || {};
    const cgTotalMcap = cgGlobal.total_market_cap?.usd || 0;

    // Parse coins with market cap
    let coins = [];
    let totalMcap = 0;
    for (const item of list) {
      const name = item.name || '';
      const symbol = item.symbol || item.name || '';
      const mcap = parseFloat(item.marketCap || 0);
      const price = parseFloat(item.price || 0);
      const change24h = parseFloat(item.dayChange || 0);
      const dominance = cgDominance[name.toLowerCase()] || 0;
      if (mcap > 0) {
        coins.push({ name, symbol, mcap, price, change24h, dominance });
        totalMcap += mcap;
      }
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    coins.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Top 5 dominance bar
    const top5 = coins.slice(0, 5);

    let h = '<style scoped>';
    h += '.md-bar{display:flex;height:24px;border-radius:4px;overflow:hidden;margin:0 0 8px}';
    h += '.md-seg{display:flex;align-items:center;justify-content:center;font-size:9px;font-weight:600;color:#fff;min-width:30px}';
    h += '.md-total{font-size:10px;color:var(--text-muted);text-align:right;padding:0 0 6px}';
    h += '</style>';

    h += `<div class="md-total">Total Market Cap: ${formatCurrency(cgTotalMcap || totalMcap)}</div>`;

    // Dominance bar — use CoinGecko global percentages
    const domColors = { btc: '#f0b90b', eth: '#627eea', usdt: '#26a17b', bnb: '#f3ba2f', xrp: '#23292f', sol: '#9945ff' };
    const domEntries = Object.entries(cgDominance).filter(([, v]) => v > 1).slice(0, 6);
    h += '<div class="md-bar">';
    if (domEntries.length) {
      let used = 0;
      for (const [key, pct] of domEntries) {
        const color = domColors[key] || '#6366f1';
        h += `<div class="md-seg" style="width:${pct}%;background:${color}" title="${key.toUpperCase()}: ${pct.toFixed(1)}%">${key.toUpperCase()} ${pct.toFixed(1)}%</div>`;
        used += pct;
      }
      const otherPct = 100 - used;
      if (otherPct > 1) h += `<div class="md-seg" style="width:${otherPct}%;background:#6366f1">Other ${otherPct.toFixed(1)}%</div>`;
    } else {
      // Fallback: compute from Binance market caps
      for (let i = 0; i < top5.length; i++) {
        const pct = totalMcap > 0 ? (top5[i].mcap / totalMcap * 100) : 0;
        if (pct < 1) continue;
        const fallbackColors = ['#f0b90b', '#627eea', '#f3ba2f', '#26a17b', '#e84142'];
        h += `<div class="md-seg" style="width:${pct}%;background:${fallbackColors[i % 5]}" title="${top5[i].name}: ${pct.toFixed(1)}%">${top5[i].name} ${pct.toFixed(1)}%</div>`;
      }
    }
    h += '</div>';

    // Table
    const top25 = coins.slice(0, 25);
    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '60px' },
      { key: 'price', label: 'Price', align: 'right', render: v => '$' + (v >= 1 ? v.toFixed(2) : v.toFixed(6)) },
      { key: 'mcap', label: 'MCap', align: 'right', render: v => formatCurrency(v) },
      { key: 'dominance', label: 'Dom%', align: 'right', render: (v, row) => {
        const pct = totalMcap > 0 ? (row.mcap / totalMcap * 100) : v;
        return pct.toFixed(2) + '%';
      }},
      { key: 'change24h', label: '24h%', align: 'right', render: v => formatPercent(v) },
    ];
    h += renderTable(cols, top25, { sortKey: this._sortKey, sortDir: this._sortDir });
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
customElements.define('market-dominance-panel', MarketDominancePanel);
export default MarketDominancePanel;
