// MEFAI Auto Scanner Panel — scanner.results()/status()/start()/stop()
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatAge, escapeHtml } = window.mefaiUtils;
const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;
const renderRiskBadge = window.mefaiRiskBadge;

export class AutoScannerPanel extends BasePanel {
  static skill = 'All Skills';
  static defaultTitle = 'Auto Scanner';

  constructor() {
    super();
    this._refreshRate = 5000;
    this._sortKey = 'score';
    this._sortDir = 'desc';
    this._scanning = false;
    this._statusText = '';
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    this.startAutoRefresh();
    this._checkStatus();
  }

  async _checkStatus() {
    try {
      const status = await window.mefaiApi.scanner.status();
      if (!status || status?.error || status?.code === '000002') return;
      this._scanning = status?.running || status?.active || false;
      this._statusText = status?.status || (this._scanning ? 'Scanning' : 'Stopped');
      this._updateHeaderState();
    } catch (e) {
      // silent
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
          <span class="scanner-status" style="margin-left:6px;font-size:10px;color:var(--text-muted)"></span>
        </div>
        <div class="panel-actions">
          <button class="scanner-toggle btn" style="font-size:10px;padding:2px 8px">${this._scanning ? 'Stop' : 'Start'}</button>
          <button class="panel-refresh" title="Refresh">&#8635;</button>
        </div>
      </div>
      <div class="panel-body">
        <div class="panel-loading">Loading scanner results...</div>
      </div>
    `;
    this.querySelector('.panel-refresh')?.addEventListener('click', () => this.refresh());
    this.querySelector('.scanner-toggle')?.addEventListener('click', () => this._toggleScanner());
    this.refresh();
  }

  _updateHeaderState() {
    const statusEl = this.querySelector('.scanner-status');
    const toggleBtn = this.querySelector('.scanner-toggle');
    if (statusEl) {
      const dot = this._scanning ? '<span style="color:var(--text);font-weight:700">&#9679;</span>' : '<span style="color:var(--text-muted)">&#9675;</span>';
      statusEl.innerHTML = `${dot} ${escapeHtml(this._statusText)}`;
    }
    if (toggleBtn) {
      toggleBtn.textContent = this._scanning ? 'Stop' : 'Start';
    }
  }

  async _toggleScanner() {
    try {
      if (this._scanning) {
        await window.mefaiApi.scanner.stop();
        this._scanning = false;
        this._statusText = 'Stopped';
      } else {
        await window.mefaiApi.scanner.start();
        this._scanning = true;
        this._statusText = 'Scanning';
      }
      this._updateHeaderState();
      window.mefaiStore?.set('scannerRunning', this._scanning);
    } catch (e) {
      this._statusText = `Error: ${e.message}`;
      this._updateHeaderState();
    }
  }

  async fetchData() {
    const res = await window.mefaiApi.scanner.results();
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(items)) return [];

    // Also update scanner status from response
    if (res?.scanning !== undefined) {
      this._scanning = res.scanning;
      this._statusText = res.scanning ? 'Scanning' : 'Stopped';
      this._updateHeaderState();
    }

    return items.map(item => ({
      score: parseFloat(item.score || item.totalScore || 0),
      token: item.token || item.symbol || item.name || '',
      address: item.address || item.contract || '',
      chain: item.chain || item.network || '',
      risk: item.risk || item.riskLevel || item.risk_level || '',
      smInflow: parseFloat(item.smInflow || item.smartMoneyInflow || item.sm_inflow || 0),
      signal: item.signal || item.signalType || item.direction || '',
      mcap: parseFloat(item.mcap || item.marketCap || item.market_cap || 0),
      age: item.age || item.createdAt || item.created_at || item.listTime || null,
      logo: item.logo || item.icon || '',
    }));
  }

  renderContent(data) {
    if (!data || !data.length) {
      return `<div class="panel-loading" style="flex-direction:column;gap:4px;text-align:center">
        <div>No scanner results</div>
        <div style="font-size:10px;color:var(--text-muted)">Click "Start" to begin scanning for opportunities</div>
      </div>`;
    }

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    const columns = [
      {
        key: 'score',
        label: 'Score',
        width: '100px',
        render: (v) => {
          const pct = Math.min(100, Math.max(0, v));
          return `<span style="font-weight:700">${v.toFixed(1)}</span>
            <span class="score-bar"><span class="score-fill" style="width:${pct}%"></span></span>`;
        },
      },
      {
        key: 'token',
        label: 'Token',
        render: (v, row) => {
          const chain = row.chain ? ` <span class="chain-badge">${escapeHtml(row.chain)}</span>` : '';
          return `<span style="font-weight:600">${escapeHtml(v)}</span>${chain}`;
        },
      },
      {
        key: 'risk',
        label: 'Risk',
        width: '70px',
        render: v => v ? renderRiskBadge(v) : '<span style="color:var(--text-muted)">--</span>',
      },
      {
        key: 'smInflow',
        label: 'SM Inflow',
        align: 'right',
        render: v => {
          if (!v) return '<span style="color:var(--text-muted)">--</span>';
          const cls = v >= 0 ? 'val-up' : 'val-down';
          const arrow = v >= 0 ? '&#8593;' : '&#8595;';
          return `<span class="${cls}">${arrow}${formatCurrency(Math.abs(v))}</span>`;
        },
      },
      {
        key: 'signal',
        label: 'Signal',
        width: '60px',
        render: v => {
          if (!v) return '<span style="color:var(--text-muted)">--</span>';
          const lower = String(v).toLowerCase();
          const cls = lower === 'buy' || lower === 'bullish' || lower === 'long' ? 'signal-buy' : 'signal-sell';
          return `<span class="${cls}">${escapeHtml(String(v).toUpperCase())}</span>`;
        },
      },
      { key: 'mcap', label: 'MCap', align: 'right', render: v => formatCurrency(v) },
      { key: 'age', label: 'Age', width: '50px', render: v => formatAge(v) },
    ];

    return renderTable(columns, sorted, {
      sortKey: this._sortKey,
      sortDir: this._sortDir,
    });
  }

  afterRender(body) {
    const data = this._data;
    if (!data || !data.length) return;

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    bindTableEvents(body, null, sorted, {
      onSort: (key) => {
        if (this._sortKey === key) {
          this._sortDir = this._sortDir === 'desc' ? 'asc' : 'desc';
        } else {
          this._sortKey = key;
          this._sortDir = 'desc';
        }
        body.innerHTML = this.renderContent(this._data);
        this.afterRender(body);
      },
      onRowClick: (row) => {
        this.emitTokenFocus({
          symbol: row.token,
          address: row.address,
          chain: row.chain,
          platform: 'dex',
        });
      },
    });
  }
}

customElements.define('auto-scanner-panel', AutoScannerPanel);
export default AutoScannerPanel;
