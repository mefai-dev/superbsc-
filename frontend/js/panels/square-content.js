// MEFAI Square Content Intelligence — Data-driven Binance Square content creation
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

const TEMPLATES = [
  { id: 'market-brief', label: 'Market Brief', short: 'Brief' },
  { id: 'smart-money-alert', label: 'Smart Money', short: 'SM Alert' },
  { id: 'funding-snapshot', label: 'Funding', short: 'Funding' },
  { id: 'sector-rotation', label: 'Sector', short: 'Sector' },
  { id: 'regime-change', label: 'Regime', short: 'Regime' },
  { id: 'accumulation-watchlist', label: 'Accumulation', short: 'Accum' },
  { id: 'custom-analysis', label: 'Custom', short: 'Custom' },
];

const TOP_PAIRS = [
  'BTCUSDT', 'ETHUSDT', 'BNBUSDT', 'SOLUSDT', 'XRPUSDT',
  'DOGEUSDT', 'ADAUSDT', 'AVAXUSDT', 'DOTUSDT', 'LINKUSDT',
  'MATICUSDT', 'LTCUSDT', 'TRXUSDT', 'ATOMUSDT', 'UNIUSDT',
  'NEARUSDT', 'APTUSDT', 'ARBUSDT', 'OPUSDT', 'INJUSDT',
  'SUIUSDT', 'SEIUSDT', 'TIAUSDT', 'JUPUSDT', 'WIFUSDT',
  'FETUSDT', 'RENDERUSDT', 'GRTUSDT', 'RUNEUSDT', 'ENAUSDT',
  'PEPEUSDT', 'FLOKIUSDT', 'BONKUSDT', 'ORDIUSDT', 'PENDLEUSDT',
  'STXUSDT', 'ONDOUSDT', 'WLDUSDT', 'ALGOUSDT', 'FTMUSDT',
  'GALAUSDT', 'SANDUSDT', 'AXSUSDT', 'MANAUSDT', 'DYDXUSDT',
  'GMXUSDT', 'FILUSDT', 'XLMUSDT', 'SHIBUSDT', 'MKRUSDT',
  'AAVEUSDT', 'IMXUSDT',
];

export class SquareContentPanel extends BasePanel {
  static skill = 'Skill 60';
  static defaultTitle = 'Content Studio';

  constructor() {
    super();
    this._template = 'market-brief';
    this._symbol = 'BTCUSDT';
    this._content = '';
    this._customMsg = '';
    this._editing = false;
    this._posting = false;
    this._history = JSON.parse(localStorage.getItem('mefai_square_history') || '[]');
    this._apiKey = localStorage.getItem('mefai_square_apikey') || '';
    this._showHistory = false;
    // Tabs: 'create' or 'analyze'
    this._tab = 'create';
    this._analyzeText = '';
    this._analyzeResult = null;
    this._analyzing = false;
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
      <div class="panel-body sq-studio">
        ${this._renderStyles()}
        ${this._renderTabs()}
        ${this._tab === 'create' ? this._renderCreate() : this._renderAnalyze()}
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.render());
    this._bindEvents();
  }

  _renderStyles() {
    let h = '<style scoped>';
    h += '.sq-studio{display:flex;flex-direction:column;gap:8px;padding:4px}';
    // Tabs
    h += '.sq-tabs{display:flex;gap:0;border-bottom:1px solid var(--border);margin-bottom:4px}';
    h += '.sq-tab{padding:6px 16px;font-size:11px;font-weight:600;border:none;background:none;color:var(--text-muted);cursor:pointer;border-bottom:2px solid transparent;transition:all .15s}';
    h += '.sq-tab:hover{color:var(--text)}';
    h += '.sq-tab.active{color:#f0b90b;border-bottom-color:#f0b90b}';
    // Templates
    h += '.sq-templates{display:flex;gap:4px;flex-wrap:wrap}';
    h += '.sq-tpl-btn{padding:4px 8px;font-size:10px;border:1px solid var(--border);border-radius:4px;background:#1e2329;color:#848e9c;cursor:pointer;transition:all .15s}';
    h += '.sq-tpl-btn:hover{border-color:#f0b90b;color:#eaecef}';
    h += '.sq-tpl-btn.active{background:#f0b90b;color:#0b0e11;border-color:#f0b90b;font-weight:600}';
    // Row + Select
    h += '.sq-row{display:flex;gap:6px;align-items:center}';
    h += '.sq-select{flex:1;padding:5px 8px;font-size:11px;background:#1e2329;border:1px solid #2b3139;border-radius:4px;color:#eaecef}';
    h += '.sq-select option{background:#1e2329;color:#eaecef}';
    // Preview
    h += '.sq-preview{background:#1e2329;border:1px solid #2b3139;border-radius:4px;padding:8px;font-size:11px;line-height:1.5;white-space:pre-wrap;font-family:monospace;min-height:100px;max-height:240px;overflow-y:auto;color:#eaecef}';
    h += '.sq-preview-edit{background:#0b0e11;border:1px solid #f0b90b;border-radius:4px;padding:8px;font-size:11px;line-height:1.5;font-family:monospace;min-height:100px;max-height:240px;overflow-y:auto;color:#eaecef;outline:none;resize:none;width:100%;box-sizing:border-box}';
    // Buttons
    h += '.sq-actions{display:flex;gap:6px;flex-wrap:wrap}';
    h += '.sq-btn{padding:5px 12px;font-size:10px;font-weight:600;border:none;border-radius:4px;cursor:pointer;transition:all .15s}';
    h += '.sq-btn-primary{background:#f0b90b;color:#0b0e11}';
    h += '.sq-btn-primary:hover{background:#d4a20a}';
    h += '.sq-btn-secondary{background:#2b3139;color:#eaecef;border:1px solid #363c45}';
    h += '.sq-btn-secondary:hover{border-color:#f0b90b}';
    h += '.sq-btn:disabled{opacity:.4;cursor:not-allowed}';
    // Misc
    h += '.sq-char-count{font-size:9px;color:#848e9c;text-align:right}';
    h += '.sq-char-warn{color:#f6465d}';
    h += '.sq-msg{padding:6px 8px;border-radius:4px;font-size:10px;margin-top:4px}';
    h += '.sq-msg-ok{background:rgba(14,203,129,.15);color:#0ecb81}';
    h += '.sq-msg-err{background:rgba(246,70,93,.15);color:#f6465d}';
    h += '.sq-section-title{font-size:10px;font-weight:600;color:#848e9c;text-transform:uppercase;letter-spacing:.5px}';
    h += '.sq-loading{text-align:center;padding:20px;color:#848e9c;font-size:11px}';
    h += '.sq-input{width:100%;padding:5px 8px;font-size:11px;background:#1e2329;border:1px solid #2b3139;border-radius:4px;color:#eaecef;box-sizing:border-box;font-family:monospace}';
    h += '.sq-textarea{width:100%;padding:6px 8px;font-size:11px;background:#1e2329;border:1px solid #2b3139;border-radius:4px;color:#eaecef;box-sizing:border-box;resize:vertical;min-height:40px;font-family:inherit;line-height:1.4}';
    // History
    h += '.sq-history-item{padding:6px 0;border-bottom:1px solid #2b3139;font-size:10px}';
    h += '.sq-history-meta{display:flex;justify-content:space-between;color:#848e9c;margin-bottom:2px}';
    h += '.sq-history-content{font-size:10px;line-height:1.4;white-space:pre-wrap;max-height:60px;overflow:hidden;color:#eaecef}';
    // Analyzer
    h += '.sq-score-box{text-align:center;padding:12px;border-radius:6px;margin:6px 0}';
    h += '.sq-score-num{font-size:32px;font-weight:700;line-height:1}';
    h += '.sq-score-grade{font-size:14px;font-weight:600;margin-top:2px}';
    h += '.sq-score-label{font-size:10px;margin-top:2px}';
    h += '.sq-check{display:flex;align-items:flex-start;gap:6px;padding:4px 0;font-size:10px;border-bottom:1px solid #2b3139}';
    h += '.sq-check-icon{font-size:12px;flex-shrink:0;width:14px;text-align:center}';
    h += '.sq-check-pass{color:#0ecb81}';
    h += '.sq-check-fail{color:#f6465d}';
    h += '.sq-check-warn{color:#f0b90b}';
    h += '.sq-check-info{color:#848e9c}';
    h += '.sq-check-name{font-weight:600;color:#eaecef;min-width:90px}';
    h += '.sq-check-detail{color:#b7bdc6}';
    h += '.sq-verdict{padding:8px;background:#1e2329;border-radius:4px;font-size:10px;line-height:1.5;color:#b7bdc6;margin-top:4px;white-space:pre-wrap}';
    h += '.sq-help{font-size:9px;color:#848e9c;line-height:1.4;margin-top:4px}';
    h += '.sq-help a{color:#f0b90b}';
    h += '</style>';
    return h;
  }

  _renderTabs() {
    return `<div class="sq-tabs">
      <button class="sq-tab${this._tab === 'create' ? ' active' : ''}" data-tab="create">Create Post</button>
      <button class="sq-tab${this._tab === 'analyze' ? ' active' : ''}" data-tab="analyze">Post Analyzer</button>
    </div>`;
  }

  _renderCreate() {
    let h = '';

    // Template picker
    h += '<div class="sq-section-title">Template</div>';
    h += '<div class="sq-templates">';
    TEMPLATES.forEach(t => {
      h += `<button class="sq-tpl-btn${t.id === this._template ? ' active' : ''}" data-tpl="${t.id}">${t.short}</button>`;
    });
    h += '</div>';

    // Symbol selector
    h += '<div class="sq-row">';
    h += '<span class="sq-section-title" style="white-space:nowrap">Symbol</span>';
    h += '<select class="sq-select" id="sq-symbol">';
    TOP_PAIRS.forEach(p => {
      h += `<option value="${p}"${p === this._symbol ? ' selected' : ''}>${p.replace('USDT', '')}</option>`;
    });
    h += '</select>';
    h += '<button class="sq-btn sq-btn-primary" id="sq-generate">Generate</button>';
    h += '</div>';

    // Custom message
    h += '<div class="sq-section-title">Custom Message (optional)</div>';
    h += `<textarea class="sq-textarea" id="sq-custom-msg" rows="2" placeholder="Add your own analysis, commentary, or call-to-action...">${escapeHtml(this._customMsg)}</textarea>`;

    // Content preview
    h += '<div class="sq-section-title">Preview</div>';
    if (this._content) {
      const charCount = this._content.length;
      const warnCls = charCount > 1800 ? ' sq-char-warn' : '';
      if (this._editing) {
        h += `<textarea class="sq-preview-edit" id="sq-edit-area">${escapeHtml(this._content)}</textarea>`;
      } else {
        h += `<div class="sq-preview" id="sq-preview-box">${escapeHtml(this._content)}</div>`;
      }
      h += `<div class="sq-char-count${warnCls}">${charCount} / 2000</div>`;
    } else {
      h += '<div class="sq-preview" style="display:flex;align-items:center;justify-content:center;color:#848e9c;font-size:11px">Select a template and click Generate</div>';
    }

    // Action buttons
    h += '<div class="sq-actions">';
    if (this._editing) {
      h += '<button class="sq-btn sq-btn-primary" id="sq-save-edit">Save</button>';
      h += '<button class="sq-btn sq-btn-secondary" id="sq-cancel-edit">Cancel</button>';
    } else {
      h += `<button class="sq-btn sq-btn-secondary" id="sq-edit" ${!this._content ? 'disabled' : ''}>Edit</button>`;
      h += `<button class="sq-btn sq-btn-primary" id="sq-post" ${!this._content ? 'disabled' : ''}>${this._posting ? 'Posting...' : 'Post to Square'}</button>`;
      h += `<button class="sq-btn sq-btn-secondary" id="sq-copy" ${!this._content ? 'disabled' : ''}>Copy</button>`;
      h += `<button class="sq-btn sq-btn-secondary" id="sq-toggle-history">${this._showHistory ? 'Hide History' : 'History'}</button>`;
    }
    h += '</div>';

    // Message area
    h += '<div id="sq-message"></div>';

    // API Key
    h += '<div class="sq-section-title" style="margin-top:4px">Square API Key</div>';
    h += '<div class="sq-row">';
    h += `<input type="password" class="sq-input" id="sq-apikey" placeholder="Paste your X-Square-OpenAPI-Key here" value="${escapeHtml(this._apiKey)}" style="font-size:10px">`;
    h += '<button class="sq-btn sq-btn-secondary" id="sq-save-key">Save</button>';
    h += '</div>';
    h += '<div class="sq-help">';
    h += '<b>How to get your API Key:</b><br>';
    h += '1. Go to <a href="https://www.binance.com/en/square" target="_blank">binance.com/square</a><br>';
    h += '2. Click your profile icon (top right)<br>';
    h += '3. Select "Creator Center"<br>';
    h += '4. Go to "OpenAPI" section<br>';
    h += '5. Click "Create API Key"<br>';
    h += '6. Copy the key and paste it above<br>';
    h += 'Note: You need a verified Binance account and Square creator status.';
    h += '</div>';

    // Post history
    if (this._showHistory && this._history.length > 0) {
      h += '<div class="sq-section-title" style="margin-top:6px">Post History</div>';
      this._history.slice(0, 10).forEach(item => {
        h += '<div class="sq-history-item">';
        h += `<div class="sq-history-meta"><span>${escapeHtml(item.template || 'Unknown')}</span><span>${escapeHtml(item.date || '')}</span></div>`;
        h += `<div class="sq-history-content">${escapeHtml((item.content || '').slice(0, 150))}${(item.content || '').length > 150 ? '...' : ''}</div>`;
        if (item.postUrl) {
          h += `<a href="${escapeHtml(item.postUrl)}" target="_blank" style="font-size:9px;color:#f0b90b">View post</a>`;
        }
        h += '</div>';
      });
    }

    return h;
  }

  _renderAnalyze() {
    let h = '';

    h += '<div class="sq-section-title">Paste a Binance Square post to analyze</div>';
    h += `<textarea class="sq-preview-edit" id="sq-analyze-input" style="min-height:80px;border-color:#2b3139" placeholder="Paste the text of any Binance Square post here to check if its claims match real market data...">${escapeHtml(this._analyzeText)}</textarea>`;

    h += '<div class="sq-actions" style="margin-top:4px">';
    h += `<button class="sq-btn sq-btn-primary" id="sq-analyze-btn" ${this._analyzing ? 'disabled' : ''}>${this._analyzing ? 'Analyzing...' : 'Analyze Post'}</button>`;
    h += '<button class="sq-btn sq-btn-secondary" id="sq-analyze-clear">Clear</button>';
    h += '</div>';

    if (this._analyzeResult) {
      const r = this._analyzeResult;
      const scoreColor = r.score >= 80 ? '#0ecb81' : (r.score >= 60 ? '#f0b90b' : '#f6465d');
      const scoreBg = r.score >= 80 ? 'rgba(14,203,129,.1)' : (r.score >= 60 ? 'rgba(240,185,11,.1)' : 'rgba(246,70,93,.1)');

      h += `<div class="sq-score-box" style="background:${scoreBg};border:1px solid ${scoreColor}">`;
      h += `<div class="sq-score-num" style="color:${scoreColor}">${r.score}</div>`;
      h += `<div class="sq-score-grade" style="color:${scoreColor}">${escapeHtml(r.grade)}</div>`;
      h += `<div class="sq-score-label" style="color:#b7bdc6">${escapeHtml(r.label)}</div>`;
      h += '</div>';

      // Checks
      if (r.checks && r.checks.length) {
        h += '<div class="sq-section-title">Verification Checks</div>';
        r.checks.forEach(c => {
          const icon = c.status === 'pass' ? '&#10003;' : (c.status === 'fail' ? '&#10007;' : (c.status === 'warn' ? '!' : '?'));
          const cls = `sq-check-${c.status}`;
          h += `<div class="sq-check">`;
          h += `<span class="sq-check-icon ${cls}">${icon}</span>`;
          h += `<span class="sq-check-name">${escapeHtml(c.name)}</span>`;
          h += `<span class="sq-check-detail">${escapeHtml(c.detail)}</span>`;
          h += '</div>';
        });
      }

      // Verdict
      if (r.verdict) {
        h += '<div class="sq-section-title" style="margin-top:6px">Verdict</div>';
        h += `<div class="sq-verdict">${escapeHtml(r.verdict)}</div>`;
      }
    }

    return h;
  }

  _bindEvents() {
    // Tabs
    this.querySelectorAll('.sq-tab').forEach(tab => {
      tab.addEventListener('click', () => {
        this._tab = tab.dataset.tab;
        this._rerender();
      });
    });

    if (this._tab === 'create') {
      this._bindCreateEvents();
    } else {
      this._bindAnalyzeEvents();
    }
  }

  _bindCreateEvents() {
    // Template buttons
    this.querySelectorAll('.sq-tpl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._template = btn.dataset.tpl;
        this._content = '';
        this._editing = false;
        this._rerender();
      });
    });

    this.querySelector('#sq-symbol')?.addEventListener('change', (e) => { this._symbol = e.target.value; });
    this.querySelector('#sq-custom-msg')?.addEventListener('input', (e) => { this._customMsg = e.target.value; });
    this.querySelector('#sq-generate')?.addEventListener('click', () => this._generate());

    this.querySelector('#sq-edit')?.addEventListener('click', () => {
      this._editing = true;
      this._rerender();
    });
    this.querySelector('#sq-save-edit')?.addEventListener('click', () => {
      const area = this.querySelector('#sq-edit-area');
      if (area) this._content = area.value;
      this._editing = false;
      this._rerender();
    });
    this.querySelector('#sq-cancel-edit')?.addEventListener('click', () => {
      this._editing = false;
      this._rerender();
    });

    this.querySelector('#sq-post')?.addEventListener('click', () => this._post());
    this.querySelector('#sq-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(this._content).then(() => {
        this._showMsg('Content copied to clipboard', false);
      });
    });
    this.querySelector('#sq-toggle-history')?.addEventListener('click', () => {
      this._showHistory = !this._showHistory;
      this._rerender();
    });
    this.querySelector('#sq-save-key')?.addEventListener('click', () => {
      const input = this.querySelector('#sq-apikey');
      if (input) {
        this._apiKey = input.value;
        localStorage.setItem('mefai_square_apikey', this._apiKey);
        this._showMsg('API Key saved', false);
      }
    });
  }

  _bindAnalyzeEvents() {
    this.querySelector('#sq-analyze-input')?.addEventListener('input', (e) => {
      this._analyzeText = e.target.value;
    });
    this.querySelector('#sq-analyze-btn')?.addEventListener('click', () => this._analyze());
    this.querySelector('#sq-analyze-clear')?.addEventListener('click', () => {
      this._analyzeText = '';
      this._analyzeResult = null;
      this._rerender();
    });
  }

  _rerender() {
    const body = this.querySelector('.panel-body');
    if (body) {
      body.innerHTML = this._renderStyles() + this._renderTabs() +
        (this._tab === 'create' ? this._renderCreate() : this._renderAnalyze());
      this._bindEvents();
    }
  }

  _showMsg(msg, isError) {
    const el = this.querySelector('#sq-message');
    if (el) {
      el.innerHTML = `<div class="sq-msg ${isError ? 'sq-msg-err' : 'sq-msg-ok'}">${escapeHtml(msg)}</div>`;
      setTimeout(() => { if (el) el.innerHTML = ''; }, 5000);
    }
  }

  async _generate() {
    const preview = this.querySelector('#sq-preview-box') || this.querySelector('.sq-preview');
    if (preview) preview.innerHTML = '<div class="sq-loading">Generating content...</div>';

    try {
      const params = new URLSearchParams({ template: this._template, symbol: this._symbol });
      const resp = await fetch(`/superbsc/api/square/preview?${params}`);
      const data = await resp.json();

      if (data.error) {
        this._showMsg(data.error, true);
        return;
      }

      let content = data.content || '';

      // Append custom message before hashtags
      if (this._customMsg.trim()) {
        const hashtagIdx = content.lastIndexOf('\n\n#');
        if (hashtagIdx > -1) {
          const body = content.slice(0, hashtagIdx);
          const tags = content.slice(hashtagIdx);
          content = body + '\n\n' + this._customMsg.trim() + tags;
        } else {
          content += '\n\n' + this._customMsg.trim();
        }
      }

      this._content = content;
      this._editing = false;
      this._rerender();
    } catch (e) {
      this._showMsg('Failed to generate content: ' + e.message, true);
    }
  }

  async _post() {
    if (!this._apiKey) {
      this._showMsg('Set your Square API Key first (see instructions below)', true);
      return;
    }
    if (!this._content) {
      this._showMsg('Generate content first', true);
      return;
    }

    this._posting = true;
    this._rerender();

    try {
      const resp = await fetch('/superbsc/api/square/post', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ apiKey: this._apiKey, content: this._content }),
      });
      const data = await resp.json();

      if (data.success) {
        this._history.unshift({
          template: this._template,
          content: this._content,
          date: new Date().toISOString().slice(0, 16).replace('T', ' '),
          postId: data.postId,
          postUrl: data.postUrl,
        });
        if (this._history.length > 50) this._history = this._history.slice(0, 50);
        localStorage.setItem('mefai_square_history', JSON.stringify(this._history));
        this._showMsg(data.message + (data.postUrl ? ` — ${data.postUrl}` : ''), false);
      } else {
        this._showMsg(data.message || 'Post failed', true);
      }
    } catch (e) {
      this._showMsg('Post failed: ' + e.message, true);
    } finally {
      this._posting = false;
      this._rerender();
    }
  }

  async _analyze() {
    if (!this._analyzeText.trim()) {
      return;
    }

    this._analyzing = true;
    this._analyzeResult = null;
    this._rerender();

    try {
      // Check if this is our own generated content
      const isOwn = this._history.some(h => h.content && this._analyzeText.includes(h.content.slice(0, 50)));

      const resp = await fetch('/superbsc/api/square/analyze', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text: this._analyzeText, isOwn }),
      });
      this._analyzeResult = await resp.json();
    } catch (e) {
      this._analyzeResult = { score: 0, grade: 'ERR', label: 'Analysis Failed', checks: [], verdict: e.message };
    } finally {
      this._analyzing = false;
      this._rerender();
    }
  }

  async fetchData() { return {}; }
  renderContent() { return ''; }
}

customElements.define('square-content-panel', SquareContentPanel);
export default SquareContentPanel;
