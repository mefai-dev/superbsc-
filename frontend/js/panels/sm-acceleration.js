// MEFAI SM Acceleration — Multi-timeframe smart money inflow with pace detection (PR #11)
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, escapeHtml } = window.mefaiUtils;

export class SmAccelerationPanel extends BasePanel {
  static skill = 'Skill 8.4';
  static defaultTitle = 'SM Acceleration';

  constructor() {
    super();
    this._refreshRate = 20000;
    this._sort = 'paceRatio';
    this._dir = 'desc';
  }

  async fetchData() {
    // Fetch 3 timeframes: 1h, 4h, 24h
    const [res1h, res4h, res24h] = await Promise.allSettled([
      window.mefaiApi.rank.smartInflow({ chainId: '56', tagType: 2, period: '1h' }),
      window.mefaiApi.rank.smartInflow({ chainId: '56', tagType: 2, period: '4h' }),
      window.mefaiApi.rank.smartInflow({ chainId: '56', tagType: 2, period: '24h' }),
    ]);

    const parse = (r) => {
      if (r.status !== 'fulfilled' || !r.value || r.value.error || r.value.code !== '000000') return new Map();
      const items = r.value.data || [];
      const m = new Map();
      for (const t of (Array.isArray(items) ? items : [])) {
        const sym = (t.tokenName || '').toUpperCase();
        if (sym) m.set(sym, {
          inflow: parseFloat(t.inflow || 0),
          countBuy: parseInt(t.countBuy || 0),
          countSell: parseInt(t.countSell || 0),
          traders: parseInt(t.traders || t.holders || 0),
          price: parseFloat(t.price || 0),
          mcap: parseFloat(t.marketCap || 0),
          icon: t.tokenIconUrl || '',
          address: t.ca || '',
        });
      }
      return m;
    };

    const map1h = parse(res1h);
    const map4h = parse(res4h);
    const map24h = parse(res24h);

    // Merge all symbols
    const allSymbols = new Set([...map1h.keys(), ...map4h.keys(), ...map24h.keys()]);
    const results = [];

    for (const sym of allSymbols) {
      const d1h = map1h.get(sym);
      const d4h = map4h.get(sym);
      const d24h = map24h.get(sym);

      const inflow1h = d1h?.inflow || 0;
      const inflow4h = d4h?.inflow || 0;
      const inflow24h = d24h?.inflow || 0;

      // Pace ratio: (1h * 4) / 4h — measures acceleration
      let paceRatio = 0;
      let pace = 'STEADY';
      if (inflow1h > 0 && inflow4h > 0) {
        paceRatio = (inflow1h * 4) / inflow4h;
        if (paceRatio > 1.5) pace = 'ACCEL';
        else if (paceRatio < 0.5) pace = 'DECEL';
      }

      // Consensus: distinct wallet count
      const traders = d1h?.traders || d4h?.traders || d24h?.traders || 0;
      let consensus = 'MINIMAL';
      if (traders >= 50) consensus = 'V.HIGH';
      else if (traders >= 30) consensus = 'HIGH';
      else if (traders >= 15) consensus = 'MED';
      else if (traders >= 5) consensus = 'LOW';

      // Pick best metadata
      const ref = d1h || d4h || d24h;
      if (!ref) continue;

      // Only show tokens with at least some inflow
      if (inflow1h === 0 && inflow4h === 0 && inflow24h === 0) continue;

      results.push({
        symbol: sym,
        icon: ref.icon,
        address: ref.address,
        price: ref.price,
        mcap: ref.mcap,
        inflow1h, inflow4h, inflow24h,
        paceRatio: parseFloat(paceRatio.toFixed(2)),
        pace,
        traders,
        consensus,
        countBuy: (d1h?.countBuy || 0) + (d4h?.countBuy || 0),
      });
    }

    return results;
  }

  renderContent(data) {
    if (!data?.length) return `<div class="panel-loading">${_t('msg.loadingInflow')}</div>`;

    const sorted = [...data].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    );

    const paceColors = { ACCEL: '#0ecb81', STEADY: '#f0b90b', DECEL: '#f6465d' };
    const consColors = { 'V.HIGH': '#0ecb81', HIGH: '#0ecb81', MED: '#f0b90b', LOW: 'var(--text-muted)', MINIMAL: 'var(--text-muted)' };

    let h = '<table class="data-table"><thead><tr>';
    h += `<th data-k="symbol">${_t('col.token')}</th>`;
    h += `<th data-k="paceRatio">${_t('sm.pace')}</th>`;
    h += `<th data-k="inflow1h">1h $</th>`;
    h += `<th data-k="inflow4h">4h $</th>`;
    h += `<th data-k="inflow24h">24h $</th>`;
    h += `<th data-k="traders">${_t('sm.consensus')}</th>`;
    h += `<th data-k="price">${_t('col.price')}</th>`;
    h += '</tr></thead><tbody>';

    for (const r of sorted) {
      const iconUrl = window.mefaiUtils.tokenIcon(r.icon);
      const icon = iconUrl ? `<img src="${iconUrl}" style="width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
      const paceIcon = r.pace === 'ACCEL' ? '⚡' : r.pace === 'DECEL' ? '↘' : '→';

      h += `<tr data-a="${r.address}">`;
      h += `<td>${icon}<span style="font-weight:600">${escapeHtml(r.symbol)}</span></td>`;
      h += `<td style="color:${paceColors[r.pace]};font-weight:700">${paceIcon} ${r.paceRatio}x</td>`;
      h += `<td class="val-num">${formatCurrency(r.inflow1h)}</td>`;
      h += `<td class="val-num">${formatCurrency(r.inflow4h)}</td>`;
      h += `<td class="val-num">${formatCurrency(r.inflow24h)}</td>`;
      h += `<td style="color:${consColors[r.consensus]};font-size:10px;font-weight:700">${r.consensus} <span style="font-weight:400;color:var(--text-muted)">(${r.traders})</span></td>`;
      h += `<td class="val-num">${r.price ? '$' + formatPrice(r.price) : '—'}</td>`;
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
      this.emitTokenFocus({ address: tr.dataset.a, chain: 'SOL' });
    }));
  }
}
customElements.define('sm-acceleration-panel', SmAccelerationPanel);
export default SmAccelerationPanel;
