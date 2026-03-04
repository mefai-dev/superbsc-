// API & Maintenance Monitor — Binance system status announcements
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

export class ApiMonitorPanel extends BasePanel {
  static skill = 'Skill 26';
  static defaultTitle = 'API Monitor';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._tab = 'system'; // system | api
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
  }

  render() {
    const title = this.getAttribute('title') || this.constructor.defaultTitle;
    const skill = this.constructor.skill;
    this.innerHTML = `
      <div class="panel-header">
        <div><span class="panel-title">${title}</span>${skill ? `<span class="panel-skill">${skill}</span>` : ''}</div>
        <div class="panel-actions"><button class="panel-refresh" title="Refresh">&#8635;</button></div>
      </div>
      <div class="filter-bar">
        <button class="btn am-tab${this._tab === 'system' ? ' active' : ''}" data-tab="system">System Updates</button>
        <button class="btn am-tab${this._tab === 'api' ? ' active' : ''}" data-tab="api">API Changes</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Loading...</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.am-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._tab = btn.dataset.tab;
        this.querySelectorAll('.am-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === this._tab));
        this.refresh();
      });
    });
    this.refresh();
  }

  async fetchData() {
    // catalogId 157 = system maintenance, 51 = API updates
    const catalogId = this._tab === 'api' ? 51 : 157;
    const res = await window.mefaiApi.announcements.list({ type: 1, catalogId, pageNo: 1, pageSize: 20 });
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load system status</div>';

    const articles = data?.data?.catalogs?.[0]?.articles || data?.data?.articles || [];
    if (!articles.length) return '<div class="panel-loading">No updates available</div>';

    let h = '<style scoped>';
    h += '.am-list{display:flex;flex-direction:column;gap:6px}';
    h += '.am-item{background:var(--bg-secondary);border-radius:6px;padding:8px 10px;cursor:pointer;transition:background .15s}';
    h += '.am-item:hover{background:var(--bg-hover)}';
    h += '.am-title{font-size:11px;font-weight:500;line-height:1.4}';
    h += '.am-meta{display:flex;gap:8px;margin-top:4px;font-size:9px;color:var(--text-muted)}';
    h += '.am-badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;margin-right:4px}';
    h += '.am-badge-maint{background:rgba(240,185,11,.15);color:#f0b90b}';
    h += '.am-badge-complete{background:rgba(14,203,129,.15);color:#0ecb81}';
    h += '.am-badge-update{background:rgba(46,134,222,.15);color:#2e86de}';
    h += '</style>';

    h += '<div class="am-list">';
    for (const art of articles) {
      const title = art.title || '';
      const code = art.code || '';
      const releaseDate = art.releaseDate ? new Date(art.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' }) : '';

      const tl = title.toLowerCase();
      let badge = '';
      if (tl.includes('complet') || tl.includes('resolved')) badge = '<span class="am-badge am-badge-complete">RESOLVED</span>';
      else if (tl.includes('maint') || tl.includes('schedul')) badge = '<span class="am-badge am-badge-maint">MAINTENANCE</span>';
      else if (tl.includes('update') || tl.includes('upgrad')) badge = '<span class="am-badge am-badge-update">UPDATE</span>';

      h += `<div class="am-item" data-code="${escapeHtml(code)}">`;
      h += `<div class="am-title">${badge}${escapeHtml(title)}</div>`;
      h += `<div class="am-meta"><span>${releaseDate}</span></div>`;
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  afterRender() {
    this.querySelectorAll('.am-item[data-code]').forEach(el => {
      el.addEventListener('click', () => {
        const code = el.dataset.code;
        if (code) window.open(`https://www.binance.com/en/support/announcement/${code}`, '_blank');
      });
    });
  }
}
customElements.define('api-monitor-panel', ApiMonitorPanel);
export default ApiMonitorPanel;
