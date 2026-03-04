import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatPrice, formatAge, escapeHtml } = window.mefaiUtils;
const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;
const renderRiskBadge = window.mefaiRiskBadge;

export class AutoScannerPanel extends BasePanel {
  static skill = 'All Skills';
  static defaultTitle = 'Auto Scanner';

  constructor() {
    super();
    this._refreshRate = 10000;
    this._sortKey = 'score';
    this._sortDir = 'desc';
  }

  async fetchData() {
    // Always show data — combine meme rank + trending + signals for a composite view
    const [memeRes, trendRes, sigRes] = await Promise.allSettled([
      window.mefaiApi.rank.memeRank(),
      window.mefaiApi.rank.trending(),
      window.mefaiApi.signals.smartMoney(),
    ]);

    const memes = (memeRes.status === 'fulfilled' && memeRes.value?.code === '000000')
      ? (memeRes.value.data?.tokens || []) : [];
    const trending = (trendRes.status === 'fulfilled' && trendRes.value?.code === '000000')
      ? (trendRes.value.data?.tokens || []) : [];
    const signals = (sigRes.status === 'fulfilled' && sigRes.value?.code === '000000')
      ? (sigRes.value.data || []) : [];

    // Build signal lookup
    const sigMap = {};
    for (const s of signals) {
      const addr = (s.contractAddress || '').toLowerCase();
      if (addr) sigMap[addr] = (s.direction || s.signalDirection || '') === 'buy' ? 'BUY' : 'SELL';
    }

    // Score meme tokens
    const scored = memes.slice(0, 30).map(t => {
      const addr = (t.contractAddress || '').toLowerCase();
      let score = parseFloat(t.score || 0) * 10;
      const sig = sigMap[addr] || '';
      if (sig === 'BUY') score += 15;
      // Check if also trending
      const isTrending = trending.some(tr => (tr.contractAddress || '').toLowerCase() === addr);
      if (isTrending) score += 10;
      return {
        score: Math.min(100, Math.max(0, score)),
        token: t.symbol || '',
        address: t.contractAddress || '',
        chain: t.chainId || '56',
        risk: t.riskLevel ?? '',
        signal: sig,
        mcap: parseFloat(t.marketCap || 0),
        price: parseFloat(t.price || 0),
        age: t.createTime || 0,
      };
    });

    return scored.sort((a, b) => b.score - a.score);
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">Scanning market data...</div>';

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    let h = '<table class="data-table"><thead><tr>';
    h += '<th data-k="score">Score</th><th data-k="token">Token</th>';
    h += '<th data-k="signal">Signal</th><th data-k="mcap">MCap</th>';
    h += '<th data-k="price">Price</th><th data-k="age">Age</th></tr></thead><tbody>';

    for (const t of sorted) {
      const pct = Math.min(100, Math.max(0, t.score));
      const sigCls = t.signal === 'BUY' ? 'val-up' : t.signal === 'SELL' ? 'val-down' : '';
      h += `<tr data-a="${t.address}" data-c="${t.chain}">`;
      const hex = pct >= 70 ? '#0ecb81' : pct >= 40 ? '#f0b90b' : '#f6465d';
      const barW = Math.max(5, pct);
      h += `<td><span style="font-weight:700;color:${hex}">${t.score.toFixed(0)}</span> <span class="score-bar"><span class="score-fill" style="width:${barW}%;background:${hex}"></span></span></td>`;
      h += `<td style="font-weight:600">${escapeHtml(t.token)} <span class="chain-badge">${t.chain}</span></td>`;
      h += `<td class="${sigCls}">${t.signal || '—'}</td>`;
      h += `<td class="val-num">${formatCurrency(t.mcap)}</td>`;
      h += `<td class="val-num">$${formatPrice(t.price)}</td>`;
      h += `<td>${formatAge(t.age)}</td></tr>`;
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.length) return;
    const sorted = sortRows(this._data, this._sortKey, this._sortDir);
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sortKey === k) this._sortDir = this._sortDir === 'desc' ? 'asc' : 'desc';
      else { this._sortKey = k; this._sortDir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}

customElements.define('auto-scanner-panel', AutoScannerPanel);
