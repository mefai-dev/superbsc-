// MEFAI Signal P&L — Smart Money signal performance tracker
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, escapeHtml } = window.mefaiUtils;

export class SignalPnlPanel extends BasePanel {
  static skill = 'Skill 8.2';
  static defaultTitle = 'Signal P&L';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._sort = 'gain';
    this._dir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.signals.smartMoney();
    if (!res || res?.error || res?.code !== '000000') return { signals: [], stats: { winRate: 0, avgGain: 0, bestTrade: 0, total: 0 } };

    const items = res?.data || [];
    const signals = (Array.isArray(items) ? items : []).map(s => {
      const dir = (s.signalDirection || s.direction || '').toLowerCase();
      const alertPrice = parseFloat(s.alertPrice || 0);
      const currentPrice = parseFloat(s.currentPrice || 0);
      let gain = 0;
      if (alertPrice > 0) {
        gain = dir === 'sell'
          ? ((alertPrice - currentPrice) / alertPrice) * 100
          : ((currentPrice - alertPrice) / alertPrice) * 100;
      }
      return {
        symbol: s.ticker || '',
        logo: s.logoUrl || '',
        address: s.contractAddress || '',
        chain: s.chainId || '56',
        direction: dir,
        alertPrice,
        currentPrice,
        gain: parseFloat(gain.toFixed(2)),
        smCount: parseInt(s.smartMoneyCount || s.signalCount || 0),
        status: s.status || '',
      };
    });

    const total = signals.length;
    const wins = signals.filter(s => s.gain > 0).length;
    const winRate = total > 0 ? parseFloat(((wins / total) * 100).toFixed(1)) : 0;
    const avgGain = total > 0 ? parseFloat((signals.reduce((sum, s) => sum + s.gain, 0) / total).toFixed(2)) : 0;
    const bestTrade = total > 0 ? Math.max(...signals.map(s => s.gain)) : 0;

    return { signals, stats: { winRate, avgGain, bestTrade: parseFloat(bestTrade.toFixed(2)), total } };
  }

  renderContent(data) {
    if (!data?.signals?.length) return `<div class="panel-loading">${_t('msg.loadingSignals')}</div>`;

    const { stats, signals } = data;
    const sorted = [...signals].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    const wrColor = stats.winRate >= 50 ? '#0ecb81' : '#f6465d';
    const avgColor = stats.avgGain >= 0 ? '#0ecb81' : '#f6465d';
    const bestColor = stats.bestTrade >= 0 ? '#0ecb81' : '#f6465d';

    let h = '<style scoped>';
    h += `.pnl-stats{display:flex;gap:8px;margin-bottom:8px;flex-wrap:wrap}`;
    h += `.pnl-card{flex:1;min-width:70px;background:var(--surface);border:1px solid var(--border);border-radius:6px;padding:6px 8px;text-align:center}`;
    h += `.pnl-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}`;
    h += `.pnl-card-value{font-size:16px;font-weight:700;margin-top:2px}`;
    h += '</style>';

    // Summary cards
    h += '<div class="pnl-stats">';
    h += `<div class="pnl-card"><div class="pnl-card-label">${_t('pnl.winRate')}</div><div class="pnl-card-value" style="color:${wrColor}">${stats.winRate}%</div></div>`;
    h += `<div class="pnl-card"><div class="pnl-card-label">${_t('pnl.avgGain')}</div><div class="pnl-card-value" style="color:${avgColor}">${stats.avgGain >= 0 ? '+' : ''}${stats.avgGain}%</div></div>`;
    h += `<div class="pnl-card"><div class="pnl-card-label">${_t('pnl.bestTrade')}</div><div class="pnl-card-value" style="color:${bestColor}">${stats.bestTrade >= 0 ? '+' : ''}${stats.bestTrade}%</div></div>`;
    h += `<div class="pnl-card"><div class="pnl-card-label">${_t('pnl.total')}</div><div class="pnl-card-value">${stats.total}</div></div>`;
    h += '</div>';

    // Detail table
    h += '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="direction">${_t('col.dir')}</th>`;
    h += `<th data-k="alertPrice">${_t('col.signalPrice')}</th>`;
    h += `<th data-k="currentPrice">${_t('col.nowPrice')}</th>`;
    h += `<th data-k="gain">${_t('col.gainPct')}</th>`;
    h += `<th data-k="smCount">${_t('col.smCount')}</th>`;
    h += `<th data-k="status">${_t('col.status')}</th>`;
    h += '</tr></thead><tbody>';

    for (const s of sorted) {
      const iconUrl = window.mefaiUtils.tokenIcon(s.logo);
      const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const dirCls = s.direction === 'buy' ? 'val-up' : s.direction === 'sell' ? 'val-down' : '';
      const dirText = s.direction === 'buy' ? _t('trade.buyUp') : s.direction === 'sell' ? _t('trade.sellDown') : '—';
      const gainCls = s.gain > 0 ? 'val-up' : s.gain < 0 ? 'val-down' : '';
      const statusStyle = s.status === 'active' ? 'color:var(--up);font-weight:700' : s.status === 'timeout' ? 'color:var(--down)' : 'color:var(--text-muted)';

      h += `<tr data-a="${s.address}" data-c="${s.chain}">`;
      h += `<td>${icon}<span style="font-weight:600">${escapeHtml(s.symbol)}</span></td>`;
      h += `<td class="${dirCls}" style="font-weight:700">${dirText}</td>`;
      h += `<td class="val-num">$${formatPrice(s.alertPrice)}</td>`;
      h += `<td class="val-num">$${formatPrice(s.currentPrice)}</td>`;
      h += `<td class="${gainCls}" style="font-weight:700">${s.gain > 0 ? '+' : ''}${s.gain}%</td>`;
      h += `<td class="val-num">${s.smCount}</td>`;
      h += `<td style="${statusStyle};font-size:10px;text-transform:uppercase">${escapeHtml(s.status || '—')}</td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    if (!this._data?.signals?.length) return;
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-a]').forEach(tr => tr.addEventListener('click', () => {
      this.emitTokenFocus({ address: tr.dataset.a, chain: tr.dataset.c });
    }));
  }
}
customElements.define('signal-pnl-panel', SignalPnlPanel);
export default SignalPnlPanel;
