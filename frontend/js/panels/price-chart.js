// MEFAI Price Chart Panel — spot.klines(). Default BTCUSDT.
import { BasePanel } from '../components/base-panel.js';

const INTERVALS = ['1m', '5m', '15m', '1h', '4h', '1d'];

export class PriceChartPanel extends BasePanel {
  static skill = 'Skill 1+7';
  static defaultTitle = 'Price Chart';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._symbol = 'BTCUSDT';
    this._klineIv = '1h';
    this._chartInstance = null;
    this._unsubscribe = null;
  }

  connectedCallback() {
    super.connectedCallback();
    this._unsubscribe = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.symbol && token.platform === 'spot' && token.symbol !== this._symbol) {
        this._symbol = token.symbol;
        this._destroyChart();
        this.refresh();
      }
    });
    const current = window.mefaiStore?.get('focusedToken');
    if (current?.symbol && current.platform === 'spot') {
      this._symbol = current.symbol;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsubscribe) this._unsubscribe();
    this._destroyChart();
  }

  _destroyChart() {
    if (this._chartInstance) {
      if (this._chartInstance.ro) this._chartInstance.ro.disconnect();
      if (this._chartInstance.chart) this._chartInstance.chart.remove();
      this._chartInstance = null;
    }
  }

  render() {
    const title = this.getAttribute('title') || this.constructor.defaultTitle;
    const skill = this.constructor.skill;
    this.innerHTML = `
      <div class="panel-header">
        <div>
          <span class="panel-title">${title}</span>
          ${skill ? `<span class="panel-skill">${skill}</span>` : ''}
          <span class="panel-skill" style="margin-left:8px" id="chart-symbol">${window.mefaiUtils.escapeHtml(this._symbol)}</span>
        </div>
        <div class="panel-actions">
          ${INTERVALS.map(iv => `<button class="interval-btn${iv === this._klineIv ? ' active' : ''}" data-interval="${iv}" style="font-size:10px;padding:2px 6px;border:1px solid ${iv === this._klineIv ? 'var(--accent)' : 'transparent'}">${iv}</button>`).join('')}
          <button class="panel-refresh" title="Refresh">&#8635;</button>
        </div>
      </div>
      <div class="panel-body" style="padding:0">
        ${this._skeletonHTML()}
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => { this._destroyChart(); this.refresh(); });
    this.querySelectorAll('.interval-btn').forEach(btn => {
      btn.addEventListener('click', () => {
        this._klineIv = btn.dataset.interval;
        this.querySelectorAll('.interval-btn').forEach(b => {
          b.style.borderColor = b.dataset.interval === this._klineIv ? 'var(--accent)' : 'transparent';
          b.classList.toggle('active', b.dataset.interval === this._klineIv);
        });
        this._destroyChart();
        this.refresh();
      });
    });
    this.refresh();
  }

  async fetchData() {
    const res = await window.mefaiApi.spot.klines(this._symbol, this._klineIv, 100);
    if (!res || res?.error || res?.code === '000002') return { klines: [], symbol: this._symbol };
    const klines = Array.isArray(res) ? res : (res?.data || res?.klines || []);
    return { klines: Array.isArray(klines) ? klines : [], symbol: this._symbol };
  }

  renderContent(data) {
    if (!data || !data.klines || !data.klines.length) {
      return `<div class="panel-loading" style="flex-direction:column;gap:4px;text-align:center">
        <div>No kline data</div>
        <div style="font-size:10px;color:var(--text-muted)">Select a trading pair to view the price chart</div>
      </div>`;
    }
    return '<div class="chart-container" id="price-chart-container"></div>';
  }

  afterRender(body) {
    const data = this._data;
    if (!data || !data.klines || !data.klines.length) return;

    const symbolLabel = this.querySelector('#chart-symbol');
    if (symbolLabel) symbolLabel.textContent = data.symbol;

    this._destroyChart();

    const container = body.querySelector('#price-chart-container');
    if (!container || !window.mefaiChart) return;

    const formatted = window.mefaiChart.formatKlineData(data.klines);
    if (!formatted.length) {
      container.innerHTML = '<div class="panel-loading">Invalid kline data</div>';
      return;
    }

    requestAnimationFrame(() => {
      this._chartInstance = window.mefaiChart.createChart(container, formatted);
    });
  }
}

customElements.define('price-chart-panel', PriceChartPanel);
export default PriceChartPanel;
