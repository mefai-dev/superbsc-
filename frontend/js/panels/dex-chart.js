// MEFAI DEX Chart Panel — token.kline(), listens to focusedToken
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

export class DexChartPanel extends BasePanel {
  static skill = 'Skill 7.4';
  static defaultTitle = 'DEX Chart';

  constructor() {
    super();
    this._refreshRate = 30000;
    this._chartInterval = '1h';
    this._token = null;
    this._chartInstance = null;
    this._unsub = null;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    // Listen to focused token changes
    this._unsub = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.address) {
        this._token = token;
        this._destroyChart();
        this.refresh();
      }
    });
    // Check if there's already a focused token
    const current = window.mefaiStore?.get('focusedToken');
    if (current?.address) {
      this._token = current;
    }
    this.startAutoRefresh();
  }

  disconnectedCallback() {
    this._destroyChart();
    this.stopAutoRefresh();
    if (this._unsub) this._unsub();
  }

  render() {
    const title = this.getAttribute('title') || this.constructor.defaultTitle;
    const skill = this.constructor.skill;
    this.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="panel-title">${title}</span>
          ${skill ? `<span class="panel-skill">${skill}</span>` : ''}
          <span class="chart-token-label" style="margin-left:6px;color:var(--text-muted);font-size:10px"></span>
        </div>
        <div class="panel-actions">
          <button class="panel-refresh" title="Refresh">&#8635;</button>
        </div>
      </div>
      <div class="filter-bar">
        <button class="btn interval-btn${this._chartInterval === '5m' ? ' btn-primary' : ''}" data-interval="5m">5m</button>
        <button class="btn interval-btn${this._chartInterval === '15m' ? ' btn-primary' : ''}" data-interval="15m">15m</button>
        <button class="btn interval-btn${this._chartInterval === '1h' ? ' btn-primary' : ''}" data-interval="1h">1h</button>
        <button class="btn interval-btn${this._chartInterval === '4h' ? ' btn-primary' : ''}" data-interval="4h">4h</button>
        <button class="btn interval-btn${this._chartInterval === '1d' ? ' btn-primary' : ''}" data-interval="1d">1d</button>
      </div>
      <div class="panel-body" style="padding:0">
        <div class="panel-loading">Select a token to view chart</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => {
      this._destroyChart();
      this.refresh();
    });
    this.querySelectorAll('.interval-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._chartInterval = btn.dataset.interval;
        this.querySelectorAll('.interval-btn').forEach(b => b.classList.remove('btn-primary'));
        btn.classList.add('btn-primary');
        this._destroyChart();
        this.refresh();
      });
    });
    this.refresh();
  }

  async fetchData() {
    if (!this._token?.address) return null;
    const res = await window.mefaiApi.token.kline({
      address: this._token.address,
      chain: this._token.chain || 'eth',
      interval: this._chartInterval,
      limit: 200,
    });
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    return Array.isArray(items) ? items : [];
  }

  renderContent(data) {
    if (!data || !this._token?.address) return '<div class="panel-loading">Select a token to view chart</div>';
    if (!data.length) return '<div class="panel-loading">No kline data available for this token</div>';

    // Update token label
    const label = this.querySelector('.chart-token-label');
    if (label) {
      label.textContent = this._token.symbol || this._token.address?.slice(0, 8) || '';
    }

    return '<div class="chart-container" id="dex-chart-container"></div>';
  }

  afterRender(body) {
    const data = this._data;
    if (!data || !data.length) return;

    const container = body.querySelector('#dex-chart-container');
    if (!container) return;

    this._destroyChart();

    if (!window.mefaiChart) {
      container.innerHTML = '<div class="panel-loading">Chart library not loaded</div>';
      return;
    }

    const formatted = window.mefaiChart.formatKlineData(data);
    if (!formatted.length) {
      container.innerHTML = '<div class="panel-loading">Invalid kline data</div>';
      return;
    }

    requestAnimationFrame(() => {
      this._chartInstance = window.mefaiChart.createChart(container, formatted);
    });
  }

  _destroyChart() {
    if (this._chartInstance) {
      if (this._chartInstance.ro) this._chartInstance.ro.disconnect();
      if (this._chartInstance.chart) this._chartInstance.chart.remove();
      this._chartInstance = null;
    }
  }
}

customElements.define('dex-chart-panel', DexChartPanel);
export default DexChartPanel;
