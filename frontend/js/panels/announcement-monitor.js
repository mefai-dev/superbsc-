// MEFAI Announcement Monitor — Binance CMS article feed
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatAge } = window.mefaiUtils;

const CATALOGS = [
  { id: 48, label: 'New Listings' },
  { id: 49, label: 'Activities' },
  { id: 161, label: 'Delisting' },
  { id: 128, label: 'Airdrop' },
];

const KEYWORDS = {
  LIST: { re: /\b(list|listing|listed)\b/i, cls: 'val-up' },
  DELIST: { re: /\b(delist|removal|remove)\b/i, cls: 'val-down' },
  AIRDROP: { re: /\b(airdrop|reward|bonus)\b/i, cls: '' },
  FUTURES: { re: /\b(futures|perpetual|usdm)\b/i, cls: '' },
  MARGIN: { re: /\b(margin|leverage)\b/i, cls: '' },
};

export class AnnouncementMonitorPanel extends BasePanel {
  static skill = 'Skill 15';
  static defaultTitle = 'Announcements';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._catalogId = 48;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    this.refresh();
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
        ${CATALOGS.map(c => `<button class="btn ann-tab${c.id===this._catalogId?' active':''}" data-cat="${c.id}">${c.label}</button>`).join('')}
      </div>
      <div class="panel-body"><div class="panel-loading">Loading announcements...</div></div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.ann-tab').forEach(btn => btn.addEventListener('click', e => {
      this._catalogId = parseInt(e.target.dataset.cat);
      this.querySelectorAll('.ann-tab').forEach(b => b.classList.toggle('active', parseInt(b.dataset.cat) === this._catalogId));
      this.refresh();
    }));
  }

  async fetchData() {
    const res = await window.mefaiApi.announcements.list({ type: 1, catalogId: this._catalogId, pageNo: 1, pageSize: 20 });
    if (!res || res?.error) return { _fetchError: true };
    return res;
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading announcements...</div>';
    if (data?._fetchError) return '<div class="panel-loading">Unable to load announcements</div>';

    const articles = data?.data?.catalogs?.[0]?.articles || [];
    if (!articles.length) return '<div class="panel-loading">No announcements available</div>';

    let h = '<style scoped>';
    h += '.ann-item{padding:8px 0;border-bottom:1px solid var(--border);cursor:pointer}';
    h += '.ann-item:hover{background:var(--bg-secondary)}';
    h += '.ann-title{font-size:12px;font-weight:500;line-height:1.3}';
    h += '.ann-meta{display:flex;align-items:center;gap:6px;margin-top:3px;font-size:9px;color:var(--text-muted)}';
    h += '.ann-kw{font-size:8px;font-weight:700;padding:1px 4px;border-radius:3px;background:rgba(240,185,11,.15);color:#f0b90b}';
    h += '.ann-kw.val-up{background:rgba(14,203,129,.15);color:#0ecb81}';
    h += '.ann-kw.val-down{background:rgba(246,70,93,.15);color:#f6465d}';
    h += '</style>';

    articles.forEach(art => {
      const artTitle = escapeHtml(art.title || '');
      const releaseDate = art.releaseDate;

      // Detect keyword badges
      let badges = '';
      for (const [label, kw] of Object.entries(KEYWORDS)) {
        if (kw.re.test(artTitle)) {
          badges += `<span class="ann-kw ${kw.cls}">${label}</span>`;
        }
      }

      h += `<div class="ann-item" onclick="window.open('https://www.binance.com/en/support/announcement/${art.code || ''}','_blank')">`;
      h += `<div class="ann-title">${artTitle}</div>`;
      h += `<div class="ann-meta">${badges}<span>${formatAge(releaseDate)}</span></div>`;
      h += '</div>';
    });

    return h;
  }
}
customElements.define('announcement-monitor-panel', AnnouncementMonitorPanel);
export default AnnouncementMonitorPanel;
