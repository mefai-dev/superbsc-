import { BasePanel } from '../components/base-panel.js';

export class SocialHypePanel extends BasePanel {
  static skill = 'Skill 5.1';
  static defaultTitle = 'Social Hype';

  constructor() {
    super();
    this._refreshRate = 60000;
  }

  async fetchData() {
    const res = await window.mefaiApi.rank.socialHype();
    if (!res || res?.error || res?.code !== '000000') return [];
    const list = res?.data?.leaderBoardList || [];
    return (Array.isArray(list) ? list : []).map((item, i) => {
      const meta = item.metaInfo || {};
      const hype = item.socialHypeInfo || {};
      const market = item.marketInfo || {};
      return {
        rank: i + 1,
        symbol: meta.symbol || '',
        icon: meta.logo || '',
        chain: meta.chainId || '56',
        address: meta.contractAddress || '',
        sentiment: hype.sentiment || '',
        hypeScore: parseInt(hype.socialHype || 0),
        summary: hype.socialSummaryBrief || '',
        mcap: parseFloat(market.marketCap || 0),
        change: parseFloat(market.priceChange || 0),
      };
    });
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">Loading social hype...</div>';
    const u = window.mefaiUtils;
    let h = '<table class="data-table"><thead><tr>';
    h += '<th>#</th><th>Token</th><th>Hype</th><th>Sentiment</th><th>MCap</th><th>24h%</th>';
    h += '</tr></thead><tbody>';
    for (const t of data) {
      const icon = t.icon ? `<img src="${t.icon.startsWith('http') ? t.icon : 'https://bin.bnbstatic.com' + t.icon}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const sColor = t.sentiment === 'Positive' ? 'var(--up)' : t.sentiment === 'Negative' ? 'var(--down)' : 'var(--text-muted)';
      const cls = t.change >= 0 ? 'val-up' : 'val-down';
      h += `<tr data-a="${t.address}" data-c="${t.chain}"><td>${t.rank}</td>`;
      h += `<td>${icon}<span style="font-weight:600">${u.escapeHtml(t.symbol)}</span></td>`;
      h += `<td class="val-num">${u.formatNumber(t.hypeScore)}</td>`;
      h += `<td style="color:${sColor};font-size:10px">${u.escapeHtml(t.sentiment || '—')}</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.mcap)}</td>`;
      h += `<td class="${cls}">${t.change >= 0 ? '↑' : '↓'}${Math.abs(t.change).toFixed(2)}%</td></tr>`;
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('social-hype-panel', SocialHypePanel);
