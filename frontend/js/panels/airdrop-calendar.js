// Airdrop & Delisting Calendar — Binance listing/delisting announcements
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

export class AirdropCalendarPanel extends BasePanel {
  static skill = 'Skill 25';
  static defaultTitle = 'List & Delist';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._tab = 'airdrop'; // airdrop | delist
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
        <button class="btn ac-tab${this._tab === 'airdrop' ? ' active' : ''}" data-tab="airdrop">Airdrop / New Listing</button>
        <button class="btn ac-tab${this._tab === 'delist' ? ' active' : ''}" data-tab="delist">Delisting</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Loading...</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.ac-tab').forEach(btn => {
      btn.addEventListener('click', () => {
        this._tab = btn.dataset.tab;
        this.querySelectorAll('.ac-tab').forEach(b => b.classList.toggle('active', b.dataset.tab === this._tab));
        this.refresh();
      });
    });
    this.refresh();
  }

  async fetchData() {
    const catalogId = this._tab === 'delist' ? 161 : 128;
    const res = await window.mefaiApi.announcements.list({ type: 1, catalogId, pageNo: 1, pageSize: 20 });
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (data?._fetchError) return '<div class="panel-loading">Unable to load announcements</div>';

    const articles = data?.data?.catalogs?.[0]?.articles || data?.data?.articles || [];
    if (!articles.length) return '<div class="panel-loading">No announcements available</div>';

    let h = '<style scoped>';
    h += '.ac-list{display:flex;flex-direction:column;gap:6px}';
    h += '.ac-item{background:var(--bg-secondary);border-radius:6px;padding:8px 10px;cursor:pointer;transition:background .15s}';
    h += '.ac-item:hover{background:var(--bg-hover)}';
    h += '.ac-title{font-size:11px;font-weight:500;line-height:1.4}';
    h += '.ac-meta{display:flex;gap:8px;margin-top:4px;font-size:9px;color:var(--text-muted)}';
    h += '.ac-badge{display:inline-block;padding:1px 5px;border-radius:3px;font-size:8px;font-weight:700;margin-right:4px}';
    h += '.ac-badge-list{background:rgba(14,203,129,.15);color:#0ecb81}';
    h += '.ac-badge-delist{background:rgba(246,70,93,.15);color:#f6465d}';
    h += '.ac-badge-airdrop{background:rgba(240,185,11,.15);color:#f0b90b}';
    h += '</style>';

    h += '<div class="ac-list">';
    for (const art of articles) {
      const title = art.title || '';
      const code = art.code || '';
      const releaseDate = art.releaseDate ? new Date(art.releaseDate).toLocaleDateString('en-US', { month: 'short', day: 'numeric' }) : '';

      // Detect keywords for badges
      const tl = title.toLowerCase();
      let badge = '';
      if (tl.includes('delist') || tl.includes('removal')) badge = '<span class="ac-badge ac-badge-delist">DELIST</span>';
      else if (tl.includes('list') || tl.includes('listing')) badge = '<span class="ac-badge ac-badge-list">LISTING</span>';
      if (tl.includes('airdrop')) badge += '<span class="ac-badge ac-badge-airdrop">AIRDROP</span>';

      h += `<div class="ac-item" data-code="${escapeHtml(code)}">`;
      h += `<div class="ac-title">${badge}${escapeHtml(title)}</div>`;
      h += `<div class="ac-meta"><span>${releaseDate}</span></div>`;
      h += '</div>';
    }
    h += '</div>';
    return h;
  }

  afterRender() {
    this.querySelectorAll('.ac-item[data-code]').forEach(el => {
      el.addEventListener('click', () => {
        const code = el.dataset.code;
        if (code) window.open(`https://www.binance.com/en/support/announcement/${code}`, '_blank');
      });
    });
  }
}
customElements.define('airdrop-calendar-panel', AirdropCalendarPanel);
export default AirdropCalendarPanel;
