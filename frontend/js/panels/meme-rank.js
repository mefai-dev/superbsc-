// MEFAI Meme Rank Panel — rank.memeRank() data
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatPercent, escapeHtml } = window.mefaiUtils;
const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;

export class MemeRankPanel extends BasePanel {
  static skill = 'Skill 5.4';
  static defaultTitle = 'Meme Rank';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sortKey = 'score';
    this._sortDir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.rank.memeRank();
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(items)) return [];
    return items.map((item, i) => ({
      rank: parseInt(item.rank || i + 1),
      score: parseFloat(item.score || 0),
      symbol: item.symbol || '',
      chainId: item.chainId || '',
      contractAddress: item.contractAddress || '',
      price: parseFloat(item.price || 0),
      change: parseFloat(item.percentChange || 0),
      mcap: parseFloat(item.marketCap || 0),
      liquidity: parseFloat(item.liquidity || 0),
      createTime: item.createTime || null,
    }));
  }

  renderContent(data) {
    if (!data || !data.length) return '<div class="panel-loading">No meme rank data available</div>';

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    const columns = [
      { key: 'rank', label: '#', width: '36px', render: v => `<span style="color:var(--text-muted)">${v}</span>` },
      {
        key: 'score',
        label: 'Score',
        width: '120px',
        render: (v) => {
          const pct = Math.min(100, Math.max(5, (v / 5) * 100)); // score is 0-5
          const hex = pct >= 70 ? '#0ecb81' : pct >= 40 ? '#f0b90b' : '#f6465d';
          return `<span style="font-weight:700;color:${hex}">${v.toFixed(1)}</span>
            <span class="score-bar"><span class="score-fill" style="width:${pct}%;background:${hex}"></span></span>`;
        },
      },
      {
        key: 'symbol',
        label: 'Token',
        render: (v, row) => {
          const chain = row.chainId ? ` <span class="chain-badge">${escapeHtml(String(row.chainId))}</span>` : '';
          return `<span style="font-weight:600">${escapeHtml(v)}</span>${chain}`;
        },
      },
      { key: 'price', label: 'Price', align: 'right', render: v => `$${formatPrice(v)}` },
      { key: 'change', label: '24h%', align: 'right', render: v => formatPercent(v) },
      { key: 'mcap', label: 'MCap', align: 'right', render: v => formatCurrency(v) },
      { key: 'liquidity', label: 'Liquidity', align: 'right', render: v => formatCurrency(v) },
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
          this._sortDir = 'desc';
        }
        body.innerHTML = this.renderContent(this._data);
        this.afterRender(body);
      },
      onRowClick: (row) => {
        this.emitTokenFocus({
          symbol: row.symbol,
          address: row.contractAddress,
          chain: row.chainId,
          platform: 'dex',
        });
      },
    });
  }
}

customElements.define('meme-rank-panel', MemeRankPanel);
export default MemeRankPanel;
