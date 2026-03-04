// MEFAI Whale Wallet Intelligence — 3-stage whale tracking pipeline
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatAddress, escapeHtml } = window.mefaiUtils;

export class WhaleIntelPanel extends BasePanel {
  static skill = 'Skill 11';
  static defaultTitle = 'Whale Intel';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._sort = 'pnl';
    this._dir = 'desc';
  }

  async fetchData() {
    // Stage 1: Leaderboard Discovery — top whales
    const res = await window.mefaiApi.rank.topTraders({
      pageNo: 1, pageSize: 20, period: '7d', chainId: '56',
      tag: 'ALL', sortBy: 0, orderBy: 0,
    });
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.data || res?.data || [];
    if (!Array.isArray(items) || !items.length) return [];

    // Stage 2: Portfolio Tracking — fetch positions for top 5 whales
    const top5 = items.slice(0, 5);
    const posResults = await Promise.allSettled(
      top5.map(w => window.mefaiApi.address.positions({ address: w.address, chainId: '56' }))
    );

    return items.map((t, i) => {
      let posCount = 0;
      let topHoldings = '';
      if (i < 5 && posResults[i]?.status === 'fulfilled') {
        const posData = posResults[i].value?.data || [];
        const positions = Array.isArray(posData) ? posData : [];
        posCount = positions.length;
        topHoldings = positions.slice(0, 3).map(p =>
          p.tokenSymbol || p.symbol || '?'
        ).join(', ');
      }

      return {
        rank: i + 1,
        address: t.address || '',
        label: t.addressLabel || '',
        pnl: parseFloat(t.realizedPnl || 0),
        pnlPct: parseFloat(t.realizedPnlPercent || 0),
        winRate: parseFloat(t.winRate || 0),
        balance: parseFloat(t.balance || 0),
        tags: t.tags || '',
        posCount,
        topHoldings,
      };
    });
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('whale.noData')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    // Summary cards
    const avgPnl = data.reduce((s, w) => s + w.pnl, 0) / data.length;
    const avgWinRate = data.reduce((s, w) => s + w.winRate, 0) / data.length;
    const bestWhale = data.reduce((best, w) => w.pnl > best.pnl ? w : best, data[0]);

    let h = '<style scoped>';
    h += `.whale-cards{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}`;
    h += `.whale-card{flex:1;min-width:80px;background:var(--panel-bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;text-align:center}`;
    h += `.whale-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}`;
    h += `.whale-card-value{font-size:13px;font-weight:700;margin-top:2px}`;
    h += `.whale-tag{display:inline-block;font-size:8px;padding:1px 4px;border-radius:3px;background:var(--border);color:var(--text-muted);margin-left:3px}`;
    h += `.whale-holdings{font-size:9px;color:var(--accent);max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}`;
    h += '</style>';

    // Summary row
    h += '<div class="whale-cards">';
    h += `<div class="whale-card"><div class="whale-card-label">${_t('whale.tracked')}</div><div class="whale-card-value">${data.length}</div></div>`;
    h += `<div class="whale-card"><div class="whale-card-label">${_t('pnl.avgGain')}</div><div class="whale-card-value ${avgPnl >= 0 ? 'val-up' : 'val-down'}">${formatCurrency(avgPnl)}</div></div>`;
    h += `<div class="whale-card"><div class="whale-card-label">${_t('whale.winRate')}</div><div class="whale-card-value" style="color:#0ecb81">${(avgWinRate * 100).toFixed(1)}%</div></div>`;
    h += `<div class="whale-card"><div class="whale-card-label">${_t('whale.bestPnl')}</div><div class="whale-card-value val-up">${formatCurrency(bestWhale.pnl)}</div></div>`;
    h += '</div>';

    // Table
    h += '<table class="data-table"><thead><tr>';
    h += `<th>${_t('col.rank')}</th>`;
    h += `<th data-k="address">${_t('col.address')}</th>`;
    h += `<th data-k="pnl">${_t('col.pnl')}</th>`;
    h += `<th data-k="winRate">${_t('whale.winRate')}</th>`;
    h += `<th data-k="balance">${_t('col.balance')}</th>`;
    h += `<th>${_t('whale.holdings')}</th>`;
    h += '</tr></thead><tbody>';

    for (const w of sorted) {
      const cls = w.pnl >= 0 ? 'val-up' : 'val-down';
      const ar = w.pnl >= 0 ? '↑' : '↓';
      const wrCls = w.winRate >= 0.6 ? 'val-up' : w.winRate >= 0.4 ? '' : 'val-down';
      const tagHtml = w.tags ? `<span class="whale-tag">${escapeHtml(String(w.tags).split(',')[0])}</span>` : '';

      h += `<tr data-a="${w.address}">`;
      h += `<td>${w.rank}</td>`;
      h += `<td style="font-weight:600">${formatAddress(w.address)}${tagHtml}</td>`;
      h += `<td class="${cls}">${ar}${formatCurrency(Math.abs(w.pnl))}</td>`;
      h += `<td class="${wrCls}">${(w.winRate * 100).toFixed(1)}%</td>`;
      h += `<td class="val-num">${formatCurrency(w.balance)}</td>`;
      h += `<td>${w.topHoldings ? `<span class="whale-holdings">${escapeHtml(w.topHoldings)}</span><span style="color:var(--text-muted);font-size:9px"> (${w.posCount})</span>` : '<span style="color:var(--text-muted)">—</span>'}</td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitWalletFocus({ address: tr.dataset.a, chain: '56' });
    }));
  }
}
customElements.define('whale-intel-panel', WhaleIntelPanel);
export default WhaleIntelPanel;
