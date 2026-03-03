import { BasePanel } from '../components/base-panel.js';

export class SocialHypePanel extends BasePanel {
  static skill = 'Skill 5.1';
  static defaultTitle = 'Social Hype';

  constructor() {
    super();
    this._refreshRate = 60000;
  }

  async fetchData() {
    const res = await window.mefaiApi.rank.socialHype({ chainId: '56', page: 1, size: 20, targetLanguage: 'en', timeRange: 1 });
    if (!res || res?.error || res?.code !== '000000') return [];
    // Response: {data: {leaderBoardList: [{metaInfo: {symbol, logo, ...}, aiSummary, sentimentType, ...}]}}
    const list = res?.data?.leaderBoardList || res?.data || [];
    return (Array.isArray(list) ? list : []).map((item, i) => {
      const meta = item.metaInfo || {};
      return {
        rank: i + 1,
        symbol: meta.symbol || '',
        icon: meta.logo || meta.icon || '',
        chain: meta.chainId || '56',
        address: meta.contractAddress || '',
        sentiment: item.sentimentType || '',
        summary: item.aiSummary?.en || item.aiSummary || '',
        mcap: parseFloat(meta.marketCap || 0),
        change24h: parseFloat(meta.percentChange24h || 0),
      };
    });
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">Loading social hype data...</div>';
    const u = window.mefaiUtils;
    let h = '<table class="data-table"><thead><tr>';
    h += '<th>#</th><th>Token</th><th>Sentiment</th><th>MCap</th><th>24h%</th></tr></thead><tbody>';
    for (const t of data) {
      const cls = t.change24h >= 0 ? 'val-up' : 'val-down';
      const ar = t.change24h >= 0 ? '↑' : '↓';
      const sColor = t.sentiment === 'Bullish' || t.sentiment === 'positive' ? 'var(--up)' : t.sentiment === 'Bearish' || t.sentiment === 'negative' ? 'var(--down)' : 'var(--text-muted)';
      h += `<tr data-a="${t.address}" data-c="${t.chain}"><td>${t.rank}</td>`;
      h += `<td style="font-weight:600">${u.escapeHtml(t.symbol)}</td>`;
      h += `<td style="color:${sColor};font-size:10px">${u.escapeHtml(t.sentiment || 'Neutral')}</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.mcap)}</td>`;
      h += `<td class="${cls}">${ar}${Math.abs(t.change24h).toFixed(2)}%</td></tr>`;
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c, symbol: '' });
    }));
  }
}
customElements.define('social-hype-panel', SocialHypePanel);
