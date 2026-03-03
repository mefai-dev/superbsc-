import { BasePanel } from '../components/base-panel.js';

const DEFAULT_ADDR = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const DEFAULT_CHAIN = '56';

export class DexChartPanel extends BasePanel {
  static skill = 'Skill 7.4';
  static defaultTitle = 'DEX Chart';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._interval = '1h';
    this._address = DEFAULT_ADDR;
    this._chain = DEFAULT_CHAIN;
    this._label = 'WBNB';
    this._chart = null;
    this._unsub = null;
  }

  connectedCallback() {
    this.classList.add('panel');
    this._renderShell();
    this._unsub = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.address && token.address !== this._address) {
        this._address = token.address;
        this._chain = token.chain || DEFAULT_CHAIN;
        this._label = token.symbol || token.address.slice(0, 8);
        this._destroyChart();
        this.refresh();
      }
    });
    const current = window.mefaiStore?.get('focusedToken');
    if (current?.address) {
      this._address = current.address;
      this._chain = current.chain || DEFAULT_CHAIN;
      this._label = current.symbol || '';
    }
    this.startAutoRefresh();
  }

  disconnectedCallback() {
    this._destroyChart();
    this.stopAutoRefresh();
    if (this._unsub) this._unsub();
  }

  _renderShell() {
    this.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="panel-title">DEX Chart</span>
          <span class="panel-skill">Skill 7.4</span>
          <span class="chart-label" style="margin-left:8px;color:var(--text-secondary);font-size:11px;font-weight:600">${this._label}</span>
        </div>
        <div class="panel-actions"><button class="panel-refresh">↻</button></div>
      </div>
      <div class="filter-bar">
        ${['5m','15m','1h','4h','1d'].map(i =>
          `<button class="btn iv-btn${this._interval === i ? ' btn-primary' : ''}" data-i="${i}">${i}</button>`
        ).join('')}
      </div>
      <div class="panel-body" style="padding:0">
        <div class="panel-loading">Loading chart...</div>
      </div>`;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => { this._destroyChart(); this.refresh(); });
    this.querySelectorAll('.iv-btn').forEach(b => b.addEventListener('click', () => {
      this._interval = b.dataset.i;
      this.querySelectorAll('.iv-btn').forEach(x => x.classList.remove('btn-primary'));
      b.classList.add('btn-primary');
      this._destroyChart();
      this.refresh();
    }));
    this.refresh();
  }

  async fetchData() {
    if (!this._address) return null;
    const res = await window.mefaiApi.token.kline({
      address: this._address,
      chain: this._chain,
      interval: this._interval,
      limit: 200,
    });
    if (!res || res?.error) return null;
    // DQuery returns {data: [[open,high,low,close,volume,time,count], ...]}
    const raw = res?.data || (Array.isArray(res) ? res : null);
    if (!raw || !Array.isArray(raw) || !raw.length) return null;
    // Convert DQuery format to TradingView format
    return raw.map(c => {
      if (Array.isArray(c)) {
        return { time: Math.floor(c[5] / 1000), open: c[0], high: c[1], low: c[2], close: c[3] };
      }
      return c;
    }).filter(c => c.time && !isNaN(c.open));
  }

  renderContent(data) {
    // Update label
    const lbl = this.querySelector('.chart-label');
    if (lbl) lbl.textContent = this._label;

    if (!data?.length) return '<div class="panel-loading">No chart data</div>';
    return '<div class="chart-container" id="dex-chart-c"></div>';
  }

  afterRender(body) {
    if (!this._data?.length) return;
    const container = body.querySelector('#dex-chart-c');
    if (!container || !window.mefaiChart) return;
    this._destroyChart();
    requestAnimationFrame(() => {
      this._chart = window.mefaiChart.createChart(container, this._data);
    });
  }

  _destroyChart() {
    if (this._chart) {
      if (this._chart.ro) this._chart.ro.disconnect();
      if (this._chart.chart) this._chart.chart.remove();
      this._chart = null;
    }
  }
}

customElements.define('dex-chart-panel', DexChartPanel);
