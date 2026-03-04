// MEFAI Base Panel — Web Component base class for all panels

export class BasePanel extends HTMLElement {
  static skill = '';
  static defaultTitle = 'Panel';

  constructor() {
    super();
    this._interval = null;
    this._refreshRate = 10000;
    this._loading = false;
    this._data = null;
    this._error = null;
    this._unsubs = [];
    this._firstLoad = true;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    this.startAutoRefresh();
  }

  disconnectedCallback() {
    this.stopAutoRefresh();
    this._unsubs.forEach(fn => fn());
    this._unsubs = [];
  }

  /** Register a store subscription for automatic cleanup on disconnect. */
  trackSub(unsub) {
    this._unsubs.push(unsub);
    return unsub;
  }

  render() {
    const title = this.getAttribute('title') || this.constructor.defaultTitle;
    const skill = this.constructor.skill;
    this.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="panel-title">${title}</span>
          ${skill ? `<span class="panel-skill">${skill}</span>` : ''}
        </div>
        <div class="panel-actions">
          <button class="panel-refresh" title="Refresh">↻</button>
        </div>
      </div>
      <div class="panel-body">
        ${this._skeletonHTML()}
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.refresh();
  }

  _skeletonHTML() {
    const msgs = [
      'AI is analyzing markets',
      'Scanning blockchain data',
      'Processing smart money signals',
      'Fetching live market data',
      'Connecting to data feeds',
      'AI models warming up',
      'Syncing with exchange',
    ];
    const msg = msgs[Math.floor(Math.random() * msgs.length)];
    return `<div class="panel-loading">
      <div class="ai-loader">
        <div class="ai-pulse-ring"></div>
        <div class="ai-pulse-core"></div>
      </div>
      <div class="ai-loader-text">${msg}</div>
      <div class="ai-loader-dots"><span>.</span><span>.</span><span>.</span></div>
    </div>`;
  }

  async refresh() {
    if (this._loading) return;
    this._loading = true;
    const body = this.querySelector('.panel-body');
    try {
      // On first load, show AI animation for at least 800ms
      const t0 = this._firstLoad ? Date.now() : 0;
      const data = await this.fetchData();
      if (t0) {
        const elapsed = Date.now() - t0;
        if (elapsed < 800) await new Promise(r => setTimeout(r, 800 - elapsed));
      }
      this._data = data;
      this._error = null;
      this._firstLoad = false;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    } catch (e) {
      this._error = e;
      if (this._data && !this._firstLoad) {
        // Silent fail — keep existing content
      } else {
        const msg = (window.mefaiUtils?.escapeHtml || ((s) => { const d = document.createElement('div'); d.textContent = s; return d.innerHTML; }))(e.message || 'Unknown error');
        body.innerHTML = `<div class="panel-error">Error: ${msg}</div>`;
      }
    }
    this._loading = false;
  }

  async fetchData() {
    return null;
  }

  renderContent(data) {
    return '<div class="panel-loading">No data</div>';
  }

  afterRender(body) {
    // Override for post-render hooks (event listeners, charts, etc.)
  }

  startAutoRefresh() {
    this.stopAutoRefresh();
    if (this._refreshRate > 0) {
      this._interval = setInterval(() => this.refresh(), this._refreshRate);
    }
  }

  stopAutoRefresh() {
    if (this._interval) {
      clearInterval(this._interval);
      this._interval = null;
    }
  }

  setRefreshRate(ms) {
    this._refreshRate = ms;
    if (this.isConnected) this.startAutoRefresh();
  }

  emitTokenFocus(token) {
    window.mefaiStore?.focusToken(token);
  }

  emitWalletFocus(wallet) {
    window.mefaiStore?.focusWallet(wallet);
  }
}

window.BasePanel = BasePanel;
export default BasePanel;
