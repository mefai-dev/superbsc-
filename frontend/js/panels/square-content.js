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
    this._editing = false;
    this._posting = false;
    this._history = JSON.parse(localStorage.getItem('mefai_square_history') || '[]');
    this._apiKey = localStorage.getItem('mefai_square_apikey') || '';
    this._showHistory = false;
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
        ${this._renderStudio()}
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.render());
    this._bindEvents();
  }

  _renderStudio() {
    let h = '<style scoped>';
    h += '.sq-studio{display:flex;flex-direction:column;gap:8px;padding:4px}';
    h += '.sq-templates{display:flex;gap:4px;flex-wrap:wrap}';
    h += '.sq-tpl-btn{padding:4px 8px;font-size:10px;border:1px solid var(--border);border-radius:4px;background:var(--bg-secondary);color:var(--text);cursor:pointer;transition:all .15s}';
    h += '.sq-tpl-btn:hover{border-color:#f0b90b}';
    h += '.sq-tpl-btn.active{background:#f0b90b;color:#0b0e11;border-color:#f0b90b;font-weight:600}';
    h += '.sq-row{display:flex;gap:6px;align-items:center}';
    h += '.sq-select{flex:1;padding:4px 6px;font-size:11px;background:var(--bg-secondary);border:1px solid var(--border);border-radius:4px;color:var(--text);-webkit-appearance:none;appearance:none;background-image:url("data:image/svg+xml,%3Csvg xmlns=\'http://www.w3.org/2000/svg\' width=\'8\' height=\'5\'%3E%3Cpath d=\'M0 0l4 5 4-5z\' fill=\'%23848e9c\'/%3E%3C/svg%3E");background-repeat:no-repeat;background-position:right 6px center;padding-right:18px}';
    h += '.sq-select option{background:#1e2329;color:#eaecef}';
    h += '.sq-preview{background:var(--bg-secondary);border:1px solid var(--border);border-radius:4px;padding:8px;font-size:11px;line-height:1.5;white-space:pre-wrap;font-family:monospace;min-height:120px;max-height:280px;overflow-y:auto;color:var(--text)}';
    h += '.sq-preview-edit{background:var(--bg);border:1px solid #f0b90b;border-radius:4px;padding:8px;font-size:11px;line-height:1.5;white-space:pre-wrap;font-family:monospace;min-height:120px;max-height:280px;overflow-y:auto;color:var(--text);outline:none;resize:none;width:100%;box-sizing:border-box}';
    h += '.sq-actions{display:flex;gap:6px;flex-wrap:wrap}';
    h += '.sq-btn{padding:5px 12px;font-size:10px;font-weight:600;border:none;border-radius:4px;cursor:pointer;transition:all .15s}';
    h += '.sq-btn-primary{background:#f0b90b;color:#0b0e11}';
    h += '.sq-btn-primary:hover{background:#d4a20a}';
    h += '.sq-btn-secondary{background:var(--bg-secondary);color:var(--text);border:1px solid var(--border)}';
    h += '.sq-btn-secondary:hover{border-color:#f0b90b}';
    h += '.sq-btn-danger{background:#f6465d;color:#fff}';
    h += '.sq-btn-danger:hover{background:#d43b50}';
    h += '.sq-btn:disabled{opacity:.4;cursor:not-allowed}';
    h += '.sq-char-count{font-size:9px;color:var(--text-muted);text-align:right}';
    h += '.sq-char-warn{color:#f6465d}';
    h += '.sq-history-item{padding:6px 0;border-bottom:1px solid var(--border);font-size:10px}';
    h += '.sq-history-meta{display:flex;justify-content:space-between;color:var(--text-muted);margin-bottom:2px}';
    h += '.sq-history-content{font-size:10px;line-height:1.4;white-space:pre-wrap;max-height:60px;overflow:hidden}';
    h += '.sq-msg{padding:6px 8px;border-radius:4px;font-size:10px;margin-top:4px}';
    h += '.sq-msg-ok{background:rgba(14,203,129,.15);color:#0ecb81}';
    h += '.sq-msg-err{background:rgba(246,70,93,.15);color:#f6465d}';
    h += '.sq-key-row{display:flex;gap:4px;align-items:center}';
    h += '.sq-key-input{flex:1;padding:4px 6px;font-size:10px;background:#1e2329;border:1px solid var(--border);border-radius:4px;color:#eaecef;font-family:monospace}';
    h += '.sq-section-title{font-size:10px;font-weight:600;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.sq-loading{text-align:center;padding:20px;color:var(--text-muted);font-size:11px}';
    h += '</style>';

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
    h += `<button class="sq-btn sq-btn-primary" id="sq-generate">Generate</button>`;
    h += '</div>';

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
      h += '<div class="sq-preview" style="display:flex;align-items:center;justify-content:center;color:var(--text-muted)">Select a template and click Generate</div>';
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

    // API Key config
    h += '<div class="sq-section-title" style="margin-top:4px">API Key</div>';
    h += '<div class="sq-key-row">';
    h += `<input type="password" class="sq-key-input" id="sq-apikey" placeholder="X-Square-OpenAPI-Key" value="${escapeHtml(this._apiKey)}">`;
    h += '<button class="sq-btn sq-btn-secondary" id="sq-save-key">Save</button>';
    h += '</div>';
    h += '<div style="font-size:9px;color:var(--text-muted);line-height:1.4;margin-top:4px">';
    h += 'To get your Square API Key: Log in to Binance > Navigate to ';
    h += '<a href="https://www.binance.com/en/square" target="_blank" style="color:#f0b90b">Binance Square</a>';
    h += ' > Settings > API Key > Create New Key. Copy the key and paste it above.';
    h += '</div>';

    // Post history
    if (this._showHistory && this._history.length > 0) {
      h += '<div class="sq-section-title" style="margin-top:6px">Post History</div>';
      this._history.slice(0, 10).forEach(item => {
        h += '<div class="sq-history-item">';
        h += `<div class="sq-history-meta"><span>${item.template || 'Unknown'}</span><span>${item.date || ''}</span></div>`;
        h += `<div class="sq-history-content">${escapeHtml((item.content || '').slice(0, 150))}${(item.content || '').length > 150 ? '...' : ''}</div>`;
        if (item.postUrl) {
          h += `<a href="${escapeHtml(item.postUrl)}" target="_blank" style="font-size:9px;color:#f0b90b">View post</a>`;
        }
        h += '</div>';
      });
    }

    return h;
  }

  _bindEvents() {
    // Template buttons
    this.querySelectorAll('.sq-tpl-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._template = btn.dataset.tpl;
        this._content = '';
        this._editing = false;
        this._rerender();
      });
    });

    // Symbol selector
    this.querySelector('#sq-symbol')?.addEventListener('change', (e) => {
      this._symbol = e.target.value;
    });

    // Generate
    this.querySelector('#sq-generate')?.addEventListener('click', () => this._generate());

    // Edit
    this.querySelector('#sq-edit')?.addEventListener('click', () => {
      this._editing = true;
      this._rerender();
    });

    // Save edit
    this.querySelector('#sq-save-edit')?.addEventListener('click', () => {
      const area = this.querySelector('#sq-edit-area');
      if (area) this._content = area.value;
      this._editing = false;
      this._rerender();
    });

    // Cancel edit
    this.querySelector('#sq-cancel-edit')?.addEventListener('click', () => {
      this._editing = false;
      this._rerender();
    });

    // Post
    this.querySelector('#sq-post')?.addEventListener('click', () => this._post());

    // Copy
    this.querySelector('#sq-copy')?.addEventListener('click', () => {
      navigator.clipboard.writeText(this._content).then(() => {
        this._showMsg('Content copied to clipboard', false);
      });
    });

    // Toggle history
    this.querySelector('#sq-toggle-history')?.addEventListener('click', () => {
      this._showHistory = !this._showHistory;
      this._rerender();
    });

    // Save API key
    this.querySelector('#sq-save-key')?.addEventListener('click', () => {
      const input = this.querySelector('#sq-apikey');
      if (input) {
        this._apiKey = input.value;
        localStorage.setItem('mefai_square_apikey', this._apiKey);
        this._showMsg('API Key saved', false);
      }
    });
  }

  _rerender() {
    const body = this.querySelector('.panel-body');
    if (body) {
      body.innerHTML = this._renderStudio();
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
    const body = this.querySelector('.panel-body');
    const preview = this.querySelector('#sq-preview-box') || this.querySelector('.sq-preview');
    if (preview) preview.innerHTML = '<div class="sq-loading">Generating content...</div>';

    try {
      const params = new URLSearchParams({
        template: this._template,
        symbol: this._symbol,
      });
      const resp = await fetch(`/superbsc/api/square/preview?${params}`);
      const data = await resp.json();

      if (data.error) {
        this._showMsg(data.error, true);
        return;
      }

      this._content = data.content || '';
      this._editing = false;
      this._rerender();
    } catch (e) {
      this._showMsg('Failed to generate content: ' + e.message, true);
    }
  }

  async _post() {
    if (!this._apiKey) {
      this._showMsg('Set your Square API Key first', true);
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
        body: JSON.stringify({
          apiKey: this._apiKey,
          content: this._content,
        }),
      });
      const data = await resp.json();

      if (data.success) {
        // Add to history
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

  // Override BasePanel methods — this panel doesn't auto-refresh
  async fetchData() { return {}; }
  renderContent() { return ''; }
}

customElements.define('square-content-panel', SquareContentPanel);
export default SquareContentPanel;
