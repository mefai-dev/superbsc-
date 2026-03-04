// MEFAI BSC DEX Volume Analytics — 129+ DEX volume rankings
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class DexVolumePanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'DEX Volume';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sort = 'total24h';
    this._dir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.defillama.dexVolume();
    if (res?.error) return null;
    const protocols = (res?.protocols || [])
      .filter(p => p.total24h > 0)
      .map(p => ({
        name: p.displayName || p.name || '?',
        logo: p.logo || '',
        category: p.category || 'DEX',
        total24h: p.total24h || 0,
        total7d: p.total7d || 0,
        total30d: p.total30d || 0,
        change1d: p.change_1d || 0,
        change7d: p.change_7d || 0,
      }));
    return {
      total24h: res.total24h || 0,
      total7d: res.total7d || 0,
      total30d: res.total30d || 0,
      change1d: res.change_1d || 0,
      change7d: res.change_7d || 0,
      change1m: res.change_1m || 0,
      protocols,
    };
  }

  renderContent(data) {
    if (!data?.protocols?.length) return '<div class="panel-loading">No DEX volume data</div>';

    let h = '<style scoped>';
    h += '.dv-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.dv-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.dv-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.dv-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.dv-sub{font-size:9px;margin-top:1px}';
    h += '.dv-logo{width:14px;height:14px;border-radius:50%;vertical-align:middle;margin-right:4px}';
    h += '</style>';

    const c1d = data.change1d >= 0 ? 'val-up' : 'val-down';
    const c7d = data.change7d >= 0 ? 'val-up' : 'val-down';
    const c1m = data.change1m >= 0 ? 'val-up' : 'val-down';

    h += '<div class="dv-cards">';
    h += `<div class="dv-card"><div class="dv-label">24h Vol</div><div class="dv-val">${formatCurrency(data.total24h)}</div><div class="dv-sub ${c1d}">${data.change1d >= 0 ? '↑' : '↓'}${Math.abs(data.change1d).toFixed(1)}%</div></div>`;
    h += `<div class="dv-card"><div class="dv-label">7d Vol</div><div class="dv-val">${formatCurrency(data.total7d)}</div><div class="dv-sub ${c7d}">${data.change7d >= 0 ? '↑' : '↓'}${Math.abs(data.change7d).toFixed(1)}%</div></div>`;
    h += `<div class="dv-card"><div class="dv-label">30d Vol</div><div class="dv-val">${formatCurrency(data.total30d)}</div><div class="dv-sub ${c1m}">${data.change1m >= 0 ? '↑' : '↓'}${Math.abs(data.change1m).toFixed(1)}%</div></div>`;
    h += '</div>';

    const sorted = [...data.protocols].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    ).slice(0, 30);

    // Market share bar for top 5
    const top5 = sorted.slice(0, 5);
    const top5Total = top5.reduce((s, p) => s + p.total24h, 0);
    if (top5Total > 0) {
      const colors = ['#f0b90b', '#627eea', '#0ecb81', '#e74c3c', '#9b59b6'];
      h += '<div style="display:flex;height:14px;border-radius:4px;overflow:hidden;margin-bottom:10px">';
      top5.forEach((p, i) => {
        const pct = (p.total24h / data.total24h * 100).toFixed(1);
        h += `<div style="width:${pct}%;background:${colors[i]};position:relative;min-width:2px">`;
        if (parseFloat(pct) > 10) h += `<span style="position:absolute;font-size:7px;color:#fff;left:3px;top:0;white-space:nowrap;text-shadow:0 0 2px rgba(0,0,0,.8)">${escapeHtml(p.name)} ${pct}%</span>`;
        h += '</div>';
      });
      h += '</div>';
    }

    h += '<table class="data-table"><thead><tr>';
    h += '<th>#</th><th>DEX</th>';
    h += `<th data-k="total24h" style="text-align:right">24h Vol</th>`;
    h += `<th data-k="change1d" style="text-align:right">24h%</th>`;
    h += `<th data-k="total7d" style="text-align:right">7d Vol</th>`;
    h += `<th data-k="change7d" style="text-align:right">7d%</th>`;
    h += '</tr></thead><tbody>';

    sorted.forEach((p, i) => {
      const cls1d = p.change1d >= 0 ? 'val-up' : 'val-down';
      const cls7d = p.change7d >= 0 ? 'val-up' : 'val-down';
      const logo = p.logo ? `<img class="dv-logo" src="${p.logo}" onerror="this.style.display='none'">` : '';
      h += '<tr>';
      h += `<td style="color:var(--text-muted)">${i + 1}</td>`;
      h += `<td>${logo}<span style="font-weight:600">${escapeHtml(p.name)}</span></td>`;
      h += `<td style="text-align:right">${formatCurrency(p.total24h)}</td>`;
      h += `<td style="text-align:right" class="${cls1d}">${p.change1d >= 0 ? '↑' : '↓'}${Math.abs(p.change1d).toFixed(1)}%</td>`;
      h += `<td style="text-align:right">${formatCurrency(p.total7d)}</td>`;
      h += `<td style="text-align:right" class="${cls7d}">${p.change7d >= 0 ? '↑' : '↓'}${Math.abs(p.change7d).toFixed(1)}%</td>`;
      h += '</tr>';
    });
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('dex-volume-panel', DexVolumePanel);
export default DexVolumePanel;
