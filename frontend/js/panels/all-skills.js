// MEFAI All Skills Panel — Combined dashboard showing all skill data with buy/sell signals
import { BasePanel } from '../components/base-panel.js';

export class AllSkillsPanel extends BasePanel {
  static skill = 'All Skills';
  static defaultTitle = 'MEFAI Signals';

  constructor() {
    super();
    this._refreshRate = 10000;
    this._tab = 'signals'; // signals | trending | overview
  }

  async fetchData() {
    const [sigRes, trendRes, memeRes, tickerRes] = await Promise.allSettled([
      window.mefaiApi.signals.smartMoney(),
      window.mefaiApi.rank.trending(),
      window.mefaiApi.rank.memeRank(),
      window.mefaiApi.spot.tickers(),
    ]);

    const signals = (sigRes.status === 'fulfilled' && sigRes.value?.code === '000000')
      ? (sigRes.value.data || []) : [];
    const trending = (trendRes.status === 'fulfilled' && trendRes.value?.code === '000000')
      ? (trendRes.value.data?.tokens || []) : [];
    const memes = (memeRes.status === 'fulfilled' && memeRes.value?.code === '000000')
      ? (memeRes.value.data?.tokens || []) : [];
    const tickers = (tickerRes.status === 'fulfilled' && Array.isArray(tickerRes.value))
      ? tickerRes.value : [];

    // Top movers from spot
    const topMovers = tickers
      .filter(t => t.symbol?.endsWith('USDT') && parseFloat(t.quoteVolume) > 500000)
      .map(t => ({
        symbol: t.symbol.replace('USDT', ''),
        price: parseFloat(t.lastPrice || 0),
        change: parseFloat(t.priceChangePercent || 0),
        volume: parseFloat(t.quoteVolume || 0),
      }))
      .sort((a, b) => Math.abs(b.change) - Math.abs(a.change))
      .slice(0, 15);

    return { signals, trending: trending.slice(0, 15), memes: memes.slice(0, 15), topMovers };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading all skills...</div>';
    const u = window.mefaiUtils;

    const tabs = `<div class="panel-tabs" style="margin:-8px -8px 8px;padding:0;">
      <button class="panel-tab ${this._tab === 'signals' ? 'active' : ''}" data-tab="signals">Signals</button>
      <button class="panel-tab ${this._tab === 'trending' ? 'active' : ''}" data-tab="trending">Trending</button>
      <button class="panel-tab ${this._tab === 'overview' ? 'active' : ''}" data-tab="overview">Top Movers</button>
    </div>`;

    if (this._tab === 'signals') {
      if (!data.signals?.length) return tabs + '<div class="panel-loading">No signals available</div>';
      let h = tabs + '<table class="data-table"><thead><tr>';
      h += '<th>Token</th><th>Signal</th><th>SM#</th><th>Price</th><th>Gain%</th><th>Status</th>';
      h += '</tr></thead><tbody>';
      for (const s of data.signals.slice(0, 25)) {
        const dir = (s.signalDirection || s.direction || '').toLowerCase();
        const dirCls = dir === 'buy' ? 'val-up' : 'val-down';
        const dirText = dir === 'buy' ? '▲ BUY' : '▼ SELL';
        const gain = parseFloat(s.maxGain || 0);
        const gainCls = gain > 0 ? 'val-up' : gain < 0 ? 'val-down' : '';
        const iconUrl = u.tokenIcon(s.logoUrl || '');
        const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
        const status = s.status || '';
        const stCls = status === 'active' ? 'color:var(--up);font-weight:700' : 'color:var(--text-muted)';
        h += `<tr data-a="${s.contractAddress || ''}" data-c="${s.chainId || '56'}">`;
        h += `<td>${icon}<span style="font-weight:600">${u.escapeHtml(s.ticker || s.symbol || '')}</span></td>`;
        h += `<td class="${dirCls}" style="font-weight:700;font-size:10px">${dirText}</td>`;
        h += `<td class="val-num">${parseInt(s.smartMoneyCount || s.signalCount || 0)}</td>`;
        h += `<td class="val-num">$${u.formatPrice(parseFloat(s.currentPrice || 0))}</td>`;
        h += `<td class="${gainCls}">${gain > 0 ? '+' : ''}${gain.toFixed(1)}%</td>`;
        h += `<td style="${stCls};font-size:10px;text-transform:uppercase">${u.escapeHtml(status || '—')}</td>`;
        h += '</tr>';
      }
      h += '</tbody></table>';
      return h;
    }

    if (this._tab === 'trending') {
      if (!data.trending?.length) return tabs + '<div class="panel-loading">No trending data</div>';
      let h = tabs + '<table class="data-table"><thead><tr>';
      h += '<th>#</th><th>Token</th><th>Price</th><th>1h%</th><th>24h%</th><th>MCap</th>';
      h += '</tr></thead><tbody>';
      data.trending.forEach((t, i) => {
        const iconUrl = u.tokenIcon(t.icon || '');
        const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
        h += `<tr data-a="${t.contractAddress || ''}" data-c="${t.chainId || ''}">`;
        h += `<td style="color:var(--text-muted)">${i + 1}</td>`;
        h += `<td>${icon}<span style="font-weight:600">${u.escapeHtml(t.symbol || '')}</span></td>`;
        h += `<td class="val-num">$${u.formatPrice(parseFloat(t.price || 0))}</td>`;
        h += `<td>${u.formatPercent(parseFloat(t.percentChange1h || 0))}</td>`;
        h += `<td>${u.formatPercent(parseFloat(t.percentChange24h || 0))}</td>`;
        h += `<td class="val-num">${u.formatCurrency(parseFloat(t.marketCap || 0))}</td>`;
        h += '</tr>';
      });
      h += '</tbody></table>';
      return h;
    }

    // overview — top movers
    if (!data.topMovers?.length) return tabs + '<div class="panel-loading">No market data</div>';
    let h = tabs + '<table class="data-table"><thead><tr>';
    h += '<th>Pair</th><th>Price</th><th>24h%</th><th>Volume</th>';
    h += '</tr></thead><tbody>';
    for (const t of data.topMovers) {
      const cls = t.change >= 0 ? 'val-up' : 'val-down';
      const ar = t.change >= 0 ? '↑' : '↓';
      h += `<tr><td style="font-weight:600">${u.escapeHtml(t.symbol)}</td>`;
      h += `<td class="val-num">${u.formatPrice(t.price)}</td>`;
      h += `<td class="${cls}">${ar}${Math.abs(t.change).toFixed(2)}%</td>`;
      h += `<td class="val-num">${u.formatCurrency(t.volume)}</td></tr>`;
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    // Tab clicks
    body.querySelectorAll('.panel-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._tab = tab.dataset.tab;
        body.innerHTML = this.renderContent(this._data);
        this.afterRender(body);
      });
    });
    // Row clicks
    body.querySelectorAll('tr[data-a]').forEach(tr => {
      tr.addEventListener('click', () => {
        this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
      });
    });
  }
}

customElements.define('all-skills-panel', AllSkillsPanel);
export default AllSkillsPanel;
