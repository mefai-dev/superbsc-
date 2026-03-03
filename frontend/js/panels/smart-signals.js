// MEFAI Smart Signals Panel — signals.smartMoney() data
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatPercent, formatNumber, escapeHtml } = window.mefaiUtils;
const { renderTable, bindTableEvents, sortRows } = window.mefaiTable;

export class SmartSignalsPanel extends BasePanel {
  static skill = 'Skill 4';
  static defaultTitle = 'Smart Signals';

  constructor() {
    super();
    this._refreshRate = 10000;
    this._sortKey = 'smCount';
    this._sortDir = 'desc';
  }

  async fetchData() {
    const res = await window.mefaiApi.signals.smartMoney();
    if (!res || res?.error || res?.code === '000002') return [];
    const items = res?.data?.tokens || res?.data || (Array.isArray(res) ? res : []);
    if (!Array.isArray(items)) return [];
    return items.map(s => ({
      signalId: s.signalId || '',
      symbol: s.ticker || s.symbol || '',
      chainId: s.chainId || '',
      contractAddress: s.contractAddress || '',
      logo: s.logoUrl || '',
      mark: s.mark || '',
      smCount: parseInt(s.smartMoneyTotalCount || 0),
      signalPrice: parseFloat(s.smartSignalPrice || 0),
      maxProfit: parseFloat(s.maxProfitPercent || 0),
      currentPrice: parseFloat(s.tokenCurrentPrice || 0),
      direction: (s.signalDirection || '').toLowerCase(),
      status: s.signalStatus || '',
    }));
  }

  renderContent(data) {
    if (!data || !data.length) {
      return `<div class="panel-loading" style="flex-direction:column;gap:8px;text-align:center">
        <div>No smart money signals</div>
        <div style="font-size:10px;color:var(--text-muted)">Signals appear when smart money wallets make notable trades.</div>
      </div>`;
    }

    const sorted = sortRows(data, this._sortKey, this._sortDir);

    const columns = [
      { key: 'symbol', label: 'Token', width: '90px', render: (v, row) => {
        const img = row.logo ? `<img src="${window.mefaiUtils.tokenIcon(row.logo)}" style="width:16px;height:16px;border-radius:50%;vertical-align:middle;margin-right:4px" onerror="this.style.display='none'">` : '';
        return `${img}<span style="font-weight:600">${escapeHtml(v)}</span>`;
      }},
      { key: 'direction', label: 'Dir', width: '60px', render: (v) => {
        if (v === 'buy') return '<span class="signal-buy">BUY &#8593;</span>';
        if (v === 'sell') return '<span class="signal-sell">SELL &#8595;</span>';
        return `<span style="color:var(--text-muted)">${escapeHtml(v.toUpperCase())}</span>`;
      }},
      { key: 'smCount', label: 'SM Count', align: 'right', render: (v) => formatNumber(v) },
      { key: 'signalPrice', label: 'Signal $', align: 'right', render: (v) => `$${formatPrice(v)}` },
      { key: 'currentPrice', label: 'Now $', align: 'right', render: (v) => `$${formatPrice(v)}` },
      { key: 'maxProfit', label: 'Max Gain%', align: 'right', render: (v) => formatPercent(v) },
      { key: 'status', label: 'Status', width: '70px', render: (v) => {
        if (!v) return '<span style="color:var(--text-muted)">--</span>';
        const isActive = v === 'active';
        return `<span style="font-weight:${isActive ? '700' : '400'};text-transform:uppercase;font-size:10px;color:${isActive ? 'var(--text)' : 'var(--text-muted)'}">${escapeHtml(v)}</span>`;
      }},
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
        this.emitTokenFocus({ symbol: row.symbol, address: row.contractAddress, chain: row.chainId, platform: 'signal' });
      },
    });
  }
}

customElements.define('smart-signals-panel', SmartSignalsPanel);
export default SmartSignalsPanel;
