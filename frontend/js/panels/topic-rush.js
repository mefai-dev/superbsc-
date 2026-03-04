import { BasePanel } from '../components/base-panel.js';

export class TopicRushPanel extends BasePanel {
  static skill = 'Skill 2: Topic Rush';
  static defaultTitle = 'Topic Rush';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._tab = 10;
  }

  connectedCallback() {
    this.classList.add('panel');
    this._renderShell();
    this.startAutoRefresh();
  }

  _renderShell() {
    this.innerHTML = `
      <div class="panel-header">
        <div><span class="panel-title">${this.constructor.defaultTitle}</span>
        <span class="panel-skill">${this.constructor.skill}</span></div>
        <div class="panel-actions"><button class="panel-refresh">↻</button></div>
      </div>
      <div class="panel-tabs">
        <button class="panel-tab ${this._tab === 10 ? 'active' : ''}" data-t="10">Latest</button>
        <button class="panel-tab ${this._tab === 20 ? 'active' : ''}" data-t="20">Rising</button>
        <button class="panel-tab ${this._tab === 30 ? 'active' : ''}" data-t="30">Viral</button>
      </div>
      <div class="panel-body"><div class="panel-loading">Loading...</div></div>`;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelectorAll('.panel-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = parseInt(tab.dataset.t);
      this.querySelectorAll('.panel-tab').forEach(t => t.classList.toggle('active', t.dataset.t === String(this._tab)));
      this.refresh();
    }));
    this.refresh();
  }

  async fetchData() {
    const sort = this._tab === 30 ? 30 : 10;
    const res = await window.mefaiApi.meme.topicList({ chainId: '56', rankType: this._tab, sort });
    if (!res || res?.error || res?.code !== '000000') return [];
    const items = res?.data || [];
    return (Array.isArray(items) ? items : []).map(t => {
      // name is {topicNameEn, topicNameCn} object
      const nameObj = t.name || {};
      const name = (typeof nameObj === 'string') ? nameObj : (nameObj.topicNameEn || nameObj.topicNameCn || '');
      // summary is {aiSummaryEn, aiSummaryCn} object
      const sumObj = t.aiSummary || {};
      const summary = (typeof sumObj === 'string') ? sumObj : (sumObj.aiSummaryEn || sumObj.aiSummaryCn || '');
      return {
        id: t.topicId || '',
        name,
        summary,
        type: t.type || '',
        tokenSize: t.tokenSize || 0,
        netInflow: parseFloat(t.topicNetInflow || 0),
        tokens: t.tokenList || [],
        progress: t.progress || 0,
      };
    });
  }

  renderContent(data) {
    if (!data?.length) return '<div class="panel-loading">No topics available</div>';
    const u = window.mefaiUtils;
    let h = '';
    for (const topic of data) {
      h += `<div style="padding:8px;border-bottom:1px solid var(--border)">`;
      h += `<div style="display:flex;justify-content:space-between;align-items:center;margin-bottom:4px">`;
      h += `<span style="font-weight:600;font-size:12px">${u.escapeHtml(topic.name)}</span>`;
      h += `<span style="font-size:9px;color:var(--accent);border:1px solid var(--accent);padding:1px 6px;border-radius:3px;font-weight:600">${u.escapeHtml(topic.type)}</span>`;
      h += `</div>`;
      if (topic.summary) {
        h += `<div style="font-size:10px;color:var(--text-secondary);margin-bottom:4px;line-height:1.4">${u.escapeHtml(topic.summary.slice(0, 120))}</div>`;
      }
      h += `<div style="font-size:10px;color:var(--text-muted);margin-bottom:4px">`;
      h += `${topic.tokenSize} tokens`;
      if (topic.netInflow) {
        const cls = topic.netInflow >= 0 ? 'val-up' : 'val-down';
        h += ` · Inflow: <span class="${cls}">${u.formatCurrency(topic.netInflow)}</span>`;
      }
      h += `</div>`;
      if (topic.tokens?.length) {
        h += `<div style="display:flex;gap:4px;flex-wrap:wrap">`;
        for (const tk of topic.tokens.slice(0, 6)) {
          h += `<span class="chain-badge" style="cursor:pointer;color:var(--accent);border-color:var(--accent)" data-a="${tk.contractAddress || ''}" data-c="${tk.chainId || '56'}">${u.escapeHtml(tk.symbol || '?')}</span>`;
        }
        h += `</div>`;
      }
      h += `</div>`;
    }
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('[data-a]').forEach(el => el.addEventListener('click', () => {
      if (el.dataset.a) this.emitTokenFocus({ address: el.dataset.a, chain: el.dataset.c || '56' });
    }));
  }
}
customElements.define('topic-rush-panel', TopicRushPanel);
