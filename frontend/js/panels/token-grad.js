// MEFAI Token Graduation Tracker — Launch-to-CEX lifecycle tracking
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatPercent, escapeHtml } = window.mefaiUtils;
const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;

// Graduation stages
const STAGES = [
  { id: 0, label: 'Launch', color: '#474d57', icon: '🚀' },
  { id: 1, label: 'Trending', color: '#f0b90b', icon: '📈' },
  { id: 2, label: 'Ranked', color: '#0ecb81', icon: '🏆' },
  { id: 3, label: 'Alpha', color: '#1e90ff', icon: '⭐' },
  { id: 4, label: 'CEX Ready', color: '#a855f7', icon: '🎓' },
];

export class TokenGradPanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'Graduation';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._sortKey = 'gradScore';
    this._sortDir = 'desc';
  }

  async fetchData() {
    // Fetch meme rank data — contains alphaStatus, score, holders, volume
    const res = await window.mefaiApi.rank.memeRank({ page: 1, size: 50 });
    if (!res || res?.error) return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(items)) return [];

    return items.map((item, i) => {
      const score = parseFloat(item.score || 0);
      const mcap = parseFloat(item.marketCap || 0);
      const liquidity = parseFloat(item.liquidity || 0);
      const holders = parseInt(item.kycHolders || item.holders || 0);
      const uniqueTraders = parseInt(item.uniqueTraderBn || 0);
      const volumeBn = parseFloat(item.volumeBnTotal || 0);
      const alphaStatus = parseInt(item.alphaStatus || 0);
      const change = parseFloat(item.percentChange || 0);

      // Graduation score (0-100)
      let gradScore = 0;

      // Alpha status is the strongest signal (+30)
      if (alphaStatus === 1) gradScore += 30;

      // Market cap maturity (+0-20)
      if (mcap >= 10e6) gradScore += 20;
      else if (mcap >= 1e6) gradScore += Math.round((mcap / 10e6) * 20);

      // KYC holders (+0-15)
      if (holders >= 1000) gradScore += 15;
      else if (holders > 0) gradScore += Math.round((holders / 1000) * 15);

      // Unique Binance traders (+0-15)
      if (uniqueTraders >= 500) gradScore += 15;
      else if (uniqueTraders > 0) gradScore += Math.round((uniqueTraders / 500) * 15);

      // Binance volume share (+0-10)
      if (volumeBn > 0) gradScore += Math.min(10, Math.round(volumeBn / 100000));

      // Meme score bonus (+0-10)
      gradScore += Math.min(10, Math.round(score * 2));

      gradScore = Math.min(100, gradScore);

      // Determine stage
      let stage = 0;
      if (gradScore >= 80) stage = 4;
      else if (alphaStatus === 1 || gradScore >= 60) stage = 3;
      else if (gradScore >= 40) stage = 2;
      else if (gradScore >= 20) stage = 1;

      return {
        rank: parseInt(item.rank || i + 1),
        symbol: item.symbol || '',
        contractAddress: item.contractAddress || '',
        chainId: item.chainId || '',
        price: parseFloat(item.price || 0),
        change,
        mcap,
        liquidity,
        holders,
        uniqueTraders,
        alphaStatus,
        gradScore,
        stage,
        score,
      };
    });
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('grad.noData')}</div>`;

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    // Summary — stage distribution
    const stageCounts = [0, 0, 0, 0, 0];
    for (const t of data) stageCounts[t.stage]++;
    const alphaCount = data.filter(t => t.alphaStatus === 1).length;

    let h = '<style scoped>';
    h += `.grad-summary{display:flex;gap:6px;margin-bottom:8px;flex-wrap:wrap}`;
    h += `.grad-stage{flex:1;min-width:55px;text-align:center;padding:4px 6px;border-radius:6px;border:1px solid var(--border);background:var(--panel-bg)}`;
    h += `.grad-stage-icon{font-size:14px}`;
    h += `.grad-stage-count{font-size:14px;font-weight:700}`;
    h += `.grad-stage-label{font-size:8px;color:var(--text-muted);text-transform:uppercase}`;
    h += `.grad-bar{height:6px;background:var(--border);border-radius:3px;width:60px;display:inline-block;vertical-align:middle;margin-left:4px}`;
    h += `.grad-fill{height:100%;border-radius:3px;transition:width .3s}`;
    h += `.grad-badge{display:inline-block;font-size:8px;font-weight:700;padding:1px 5px;border-radius:10px;color:#fff}`;
    h += '</style>';

    // Stage distribution
    h += '<div class="grad-summary">';
    for (let i = 0; i < STAGES.length; i++) {
      const s = STAGES[i];
      h += `<div class="grad-stage"><div class="grad-stage-icon">${s.icon}</div><div class="grad-stage-count" style="color:${s.color}">${stageCounts[i]}</div><div class="grad-stage-label">${s.label}</div></div>`;
    }
    h += '</div>';

    // Table
    const columns = [
      { key: 'rank', label: _t('col.rank'), width: '30px', render: v => `<span style="color:var(--text-muted)">${v}</span>` },
      {
        key: 'symbol', label: _t('col.token'), render: (v, row) => {
          const chain = row.chainId ? ` <span class="chain-badge">${escapeHtml(String(row.chainId))}</span>` : '';
          const alpha = row.alphaStatus === 1 ? ' <span style="color:#1e90ff;font-size:9px">ALPHA</span>' : '';
          return `<span style="font-weight:600">${escapeHtml(v)}</span>${alpha}${chain}`;
        },
      },
      {
        key: 'gradScore', label: _t('grad.score'), width: '120px', render: (v, row) => {
          const s = STAGES[row.stage];
          const pct = Math.min(100, Math.max(5, v));
          return `<span class="grad-badge" style="background:${s.color}">${s.label}</span>` +
            `<span class="grad-bar"><span class="grad-fill" style="width:${pct}%;background:${s.color}"></span></span>` +
            ` <span style="font-size:10px;font-weight:700;color:${s.color}">${v}</span>`;
        },
      },
      { key: 'price', label: _t('col.price'), align: 'right', render: v => `$${formatPrice(v)}` },
      { key: 'change', label: _t('col.change24h'), align: 'right', render: v => formatPercent(v) },
      { key: 'mcap', label: _t('col.mcap'), align: 'right', render: v => formatCurrency(v) },
      { key: 'holders', label: _t('grad.holders'), align: 'right', render: v => v > 0 ? v.toLocaleString() : '—' },
    ];

    h += renderTable(columns, sorted, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender(body) {
    const data = this._data;
    if (!data?.length) return;

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    bindTableEvents(body, null, sorted, {
      onSort: (key) => {
        if (this._sortKey === key) this._sortDir = this._sortDir === 'desc' ? 'asc' : 'desc';
        else { this._sortKey = key; this._sortDir = 'desc'; }
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
customElements.define('token-grad-panel', TokenGradPanel);
export default TokenGradPanel;
