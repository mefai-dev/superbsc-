// MEFAI Trending Tokens Panel — rank.trending() data
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;
const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;

export class TrendingTokensPanel extends BasePanel {
  static skill = 'Skill 5.2';
  static defaultTitle = 'Trending Tokens';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'rank';
    this._sortDir = 'asc';
  }

  async fetchData() {
    const res = await window.mefaiApi.rank.trending();
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(items)) return [];
    return items.map((item, i) => ({
      rank: i + 1,
      symbol: item.symbol || '',
      icon: item.icon || '',
      chainId: item.chainId || '',
      contractAddress: item.contractAddress || '',
      price: parseFloat(item.price || 0),
      change1h: parseFloat(item.percentChange1h || 0),
      change24h: parseFloat(item.percentChange24h || 0),
      mcap: parseFloat(item.marketCap || 0),
      volume: parseFloat(item.volume24h || 0),
      liquidity: parseFloat(item.liquidity || 0),
    }));
  }

  renderContent(data) {
    if (!data || !data.length) {
      return '<div class="panel-loading">No trending tokens available</div>';
    }

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    const columns = [
      { key: 'rank', label: '#', width: '35px', render: (v) => `<span style="color:var(--text-muted)">${v}</span>` },
      { key: 'symbol', label: 'Token', width: '100px', render: (v, row) => {
        const img = row.icon ? `<img src="${((u) => u && u.startsWith("http") ? u : "https://bin.bnbstatic.com" + (u || ""))(row.icon)}" style="width:16px;height:16px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
        return `${img}<span style="font-weight:600">${escapeHtml(v)}</span>`;
      }},
      { key: 'price', label: 'Price', align: 'right', render: (v) => `$${formatPrice(v)}` },
      { key: 'change1h', label: '1h%', align: 'right', render: (v) => formatPercent(v) },
      { key: 'change24h', label: '24h%', align: 'right', render: (v) => formatPercent(v) },
      { key: 'mcap', label: 'MCap', align: 'right', render: (v) => formatCurrency(v) },
      { key: 'volume', label: 'Volume', align: 'right', render: (v) => formatCurrency(v) },
    ];

    return renderTable(columns, sorted, {
      sortKey: this._sortKey,
      sortDir: this._sortDir,
    });
  }

  afterRender(body) {
    const data = this._data;
    if (!data || !data.length) return;

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    bindTableEvents(body, null, sorted, {
      onSort: (key) => {
        if (this._sortKey === key) {
          this._sortDir = this._sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          this._sortKey = key;
          this._sortDir = key === 'rank' ? 'asc' : 'desc';
        }
        body.innerHTML = this.renderContent(this._data);
        this.afterRender(body);
      },
      onRowClick: (row) => {
        this.emitTokenFocus({ symbol: row.symbol, address: row.contractAddress, chain: row.chainId, platform: 'rank' });
      },
    });
  }
}

customElements.define('trending-tokens-panel', TrendingTokensPanel);
export default TrendingTokensPanel;
