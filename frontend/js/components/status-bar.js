// MEFAI Status Bar

class StatusBar extends HTMLElement {
  connectedCallback() {
    this._interval = setInterval(() => this.updateClock(), 1000);
    this.render();
    this.checkHealth();
    this._healthInterval = setInterval(() => this.checkHealth(), 30000);
  }

  disconnectedCallback() {
    clearInterval(this._interval);
    clearInterval(this._healthInterval);
  }

  render() {
    this.innerHTML = `
      <div class="status-left">
        <span><span class="status-dot" id="status-dot"></span> <span id="status-text">Connecting...</span></span>
        <span id="status-layout">Overview</span>
      </div>
      <div class="status-right">
        <span id="status-ws" style="color:var(--text-muted)"></span>
        <span id="status-scanner"></span>
        <span id="status-clock">${this.getTime()}</span>
      </div>
    `;
  }

  getTime() {
    return new Date().toLocaleTimeString('en-US', { hour12: false, timeZone: 'UTC' }) + ' UTC';
  }

  updateClock() {
    const el = this.querySelector('#status-clock');
    if (el) el.textContent = this.getTime();
    // Update WS status
    const wsEl = this.querySelector('#status-ws');
    if (wsEl && window.mefaiStream) {
      wsEl.textContent = window.mefaiStream.connected ? 'WS LIVE' : '';
      wsEl.style.color = window.mefaiStream.connected ? 'var(--up)' : 'var(--text-muted)';
    }
  }

  async checkHealth() {
    try {
      const baseURI = document.baseURI || window.location.href;
      const resp = await fetch(new URL('health', baseURI));
      const ok = resp.ok;
      const dot = this.querySelector('#status-dot');
      const text = this.querySelector('#status-text');
      if (dot) dot.classList.toggle('connected', ok);
      if (text) text.textContent = ok ? 'Connected' : 'Disconnected';
      if (window.mefaiStore) window.mefaiStore.set('connected', ok);
    } catch {
      const dot = this.querySelector('#status-dot');
      const text = this.querySelector('#status-text');
      if (dot) dot.classList.remove('connected');
      if (text) text.textContent = 'Disconnected';
    }
  }

  setLayout(name) {
    const el = this.querySelector('#status-layout');
    if (el) el.textContent = name;
  }

  setScannerStatus(running) {
    const el = this.querySelector('#status-scanner');
    if (el) el.textContent = running ? '◉ Scanner Active' : '';
  }
}

customElements.define('status-bar', StatusBar);
export default StatusBar;
