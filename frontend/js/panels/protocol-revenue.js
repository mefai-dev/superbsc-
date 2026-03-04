// MEFAI BSC Protocol Revenue Intelligence — fee & revenue rankings
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, escapeHtml } = window.mefaiUtils;

export class ProtocolRevenuePanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'Protocol Revenue';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sort = 'total24h';
    this._dir = 'desc';
    this._expanded = null;
  }

  async fetchData() {
    const res = await window.mefaiApi.defillama.fees();
    if (res?.error) return null;
    const protocols = (res?.protocols || [])
      .filter(p => p.total24h > 0)
      .map(p => ({
        name: p.displayName || p.name || '?',
        logo: p.logo || '',
        category: p.category || '—',
        total24h: p.total24h || 0,
        total7d: p.total7d || 0,
        total30d: p.total30d || 0,
        total1y: p.total1y || 0,
        change1d: p.change_1d || 0,
        change7d: p.change_7d || 0,
        methodology: p.methodology || null,
      }));
    return {
      total24h: res.total24h || 0,
      total7d: res.total7d || 0,
      total30d: res.total30d || 0,
      change1d: res.change_1d || 0,
      protocols,
    };
  }

  renderContent(data) {
    if (!data?.protocols?.length) return '<div class="panel-loading">No revenue data</div>';

    let h = '<style scoped>';
    h += '.pr-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.pr-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.pr-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.pr-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.pr-sub{font-size:9px;margin-top:1px}';
    h += '.pr-logo{width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px}';
    h += '.pr-meth{font-size:9px;color:var(--text-muted);padding:6px 8px;background:var(--bg);border-radius:4px;margin-top:4px;line-height:1.5}';
    h += '.pr-meth b{color:var(--accent)}';
    h += '</style>';

    const c1d = data.change1d >= 0 ? 'val-up' : 'val-down';
    const annualized = data.total24h * 365;

    h += '<div class="pr-cards">';
    h += `<div class="pr-card"><div class="pr-label">24h Fees</div><div class="pr-val">${formatCurrency(data.total24h)}</div><div class="pr-sub ${c1d}">${data.change1d >= 0 ? '↑' : '↓'}${Math.abs(data.change1d).toFixed(1)}%</div></div>`;
    h += `<div class="pr-card"><div class="pr-label">7d Fees</div><div class="pr-val">${formatCurrency(data.total7d)}</div></div>`;
    h += `<div class="pr-card"><div class="pr-label">Ann. Revenue</div><div class="pr-val">${formatCurrency(annualized)}</div></div>`;
    h += '</div>';

    const sorted = [...data.protocols].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    ).slice(0, 30);

    h += '<table class="data-table"><thead><tr>';
    h += '<th>#</th><th>Protocol</th><th>Cat</th>';
    h += `<th data-k="total24h" style="text-align:right">24h Fees</th>`;
    h += `<th data-k="change1d" style="text-align:right">24h%</th>`;
    h += `<th data-k="total30d" style="text-align:right">30d Fees</th>`;
    h += '</tr></thead><tbody>';

    sorted.forEach((p, i) => {
      const cls1d = p.change1d >= 0 ? 'val-up' : 'val-down';
      const logo = p.logo ? `<img class="pr-logo" src="${p.logo}" onerror="this.style.display='none'">` : '';
      h += `<tr data-idx="${i}" style="cursor:pointer">`;
      h += `<td style="color:var(--text-muted)">${i + 1}</td>`;
      h += `<td>${logo}<span style="font-weight:600">${escapeHtml(p.name)}</span></td>`;
      h += `<td style="font-size:9px;color:var(--text-muted)">${escapeHtml(p.category)}</td>`;
      h += `<td style="text-align:right">${formatCurrency(p.total24h)}</td>`;
      h += `<td style="text-align:right" class="${cls1d}">${p.change1d >= 0 ? '↑' : '↓'}${Math.abs(p.change1d).toFixed(1)}%</td>`;
      h += `<td style="text-align:right">${formatCurrency(p.total30d)}</td>`;
      h += '</tr>';
      // Methodology row (expandable)
      if (this._expanded === i && p.methodology) {
        h += '<tr><td colspan="6"><div class="pr-meth">';
        for (const [k, v] of Object.entries(p.methodology)) {
          h += `<b>${escapeHtml(k)}:</b> ${escapeHtml(v)}<br>`;
        }
        h += '</div></td></tr>';
      }
    });
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      this._expanded = null;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
    body.querySelectorAll('tr[data-idx]').forEach(tr => tr.addEventListener('click', () => {
      const idx = parseInt(tr.dataset.idx);
      this._expanded = this._expanded === idx ? null : idx;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('protocol-revenue-panel', ProtocolRevenuePanel);
export default ProtocolRevenuePanel;
