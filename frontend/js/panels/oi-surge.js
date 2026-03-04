// Open Interest Surge Detector — Detect sudden OI changes across futures
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatPercent } = window.mefaiUtils;

export class OiSurgePanel extends BasePanel {
  static skill = 'Skill 31';
  static defaultTitle = 'OI Surge Detector';

  constructor() {
    super();
    this._refreshRate = 60000;
    this._sortKey = 'oiChange';
    this._sortDir = 'desc';
    this._symbols = ['BTCUSDT','ETHUSDT','BNBUSDT','SOLUSDT','XRPUSDT','DOGEUSDT','ADAUSDT','AVAXUSDT','LINKUSDT','LTCUSDT','APTUSDT','ARBUSDT','OPUSDT','SUIUSDT','INJUSDT','NEARUSDT'];
  }

  async fetchData() {
    const results = await Promise.all(
      this._symbols.map(async sym => {
        const [hist, ticker] = await Promise.all([
          window.mefaiApi.futures.openInterestHist(sym, '1h', 5),
          window.mefaiApi.futures.ticker24hr(sym),
        ]);
        return { symbol: sym, hist, ticker };
      })
    );
    return results;
  }

  renderContent(data) {
    if (!data || !Array.isArray(data)) return '<div class="panel-loading">Unable to load OI data</div>';

    let rows = [];
    for (const item of data) {
      const sym = item.symbol.replace('USDT', '');
      const hist = Array.isArray(item.hist) ? item.hist : [];
      const tk = Array.isArray(item.ticker) ? item.ticker[0] : item.ticker;

      if (hist.length < 2) continue;

      const latest = hist[hist.length - 1];
      const prev = hist[hist.length - 2];
      const oldest = hist[0];

      const oiNow = parseFloat(latest?.sumOpenInterest || 0);
      const oiValueNow = parseFloat(latest?.sumOpenInterestValue || 0);
      const oiPrev = parseFloat(prev?.sumOpenInterest || 0);
      const oiOldest = parseFloat(oldest?.sumOpenInterest || 0);

      const oiChange1h = oiPrev > 0 ? ((oiNow - oiPrev) / oiPrev) * 100 : 0;
      const oiChange5h = oiOldest > 0 ? ((oiNow - oiOldest) / oiOldest) * 100 : 0;

      const price = parseFloat(tk?.lastPrice || 0);
      const priceChange = parseFloat(tk?.priceChangePercent || 0);

      // Divergence: OI up + price down = potential squeeze
      const divergent = (oiChange1h > 2 && priceChange < -1) || (oiChange1h < -2 && priceChange > 1);

      rows.push({
        symbol: sym, oiNow, oiValueNow, oiChange: oiChange1h, oiChange5h,
        price, priceChange, divergent,
      });
    }

    // Sort
    const dir = this._sortDir === 'asc' ? 1 : -1;
    rows.sort((a, b) => {
      if (this._sortKey === 'symbol') return a.symbol.localeCompare(b.symbol) * dir;
      return ((a[this._sortKey] || 0) - (b[this._sortKey] || 0)) * dir;
    });

    // Stats
    const surges = rows.filter(r => r.oiChange > 3).length;
    const drops = rows.filter(r => r.oiChange < -3).length;
    const divergences = rows.filter(r => r.divergent).length;

    let h = '<style scoped>';
    h += '.oi-stats{display:grid;grid-template-columns:1fr 1fr 1fr;gap:6px;padding:0 0 8px}';
    h += '.oi-stat{background:var(--bg-secondary);border-radius:6px;padding:6px;text-align:center}';
    h += '.oi-stat-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.oi-stat-value{font-size:13px;font-weight:700;margin:2px 0}';
    h += '.oi-div{background:#f0b90b22;border:1px solid #f0b90b44;border-radius:3px;padding:1px 4px;font-size:8px;color:#f0b90b;font-weight:600}';
    h += '</style>';

    h += '<div class="oi-stats">';
    h += `<div class="oi-stat"><div class="oi-stat-label">OI Surges (>3%)</div><div class="oi-stat-value val-up">${surges}</div></div>`;
    h += `<div class="oi-stat"><div class="oi-stat-label">OI Drops (<-3%)</div><div class="oi-stat-value val-down">${drops}</div></div>`;
    h += `<div class="oi-stat"><div class="oi-stat-label">Divergences</div><div class="oi-stat-value" style="color:#f0b90b">${divergences}</div></div>`;
    h += '</div>';

    const { renderTable } = window.mefaiTable;
    const cols = [
      { key: 'symbol', label: 'Symbol', width: '55px', render: (v, row) => {
        return row.divergent ? `${v} <span class="oi-div">DIV</span>` : v;
      }},
      { key: 'oiValueNow', label: 'OI Value', align: 'right', render: v => formatCurrency(v) },
      { key: 'oiChange', label: '1h Chg%', align: 'right', render: v => {
        const cls = v > 2 ? 'val-up' : v < -2 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
      }},
      { key: 'oiChange5h', label: '5h Chg%', align: 'right', render: v => {
        const cls = v > 3 ? 'val-up' : v < -3 ? 'val-down' : '';
        return `<span class="${cls}">${v > 0 ? '+' : ''}${v.toFixed(2)}%</span>`;
      }},
      { key: 'priceChange', label: '24h%', align: 'right', render: v => formatPercent(v) },
    ];
    h += renderTable(cols, rows, { sortKey: this._sortKey, sortDir: this._sortDir });
    return h;
  }

  afterRender() {
    const body = this.querySelector('.panel-body');
    if (!body) return;
    const { bindTableEvents } = window.mefaiTable;
    bindTableEvents(body, [], [], {
      onSort: key => {
        if (this._sortKey === key) this._sortDir = this._sortDir === 'asc' ? 'desc' : 'asc';
        else { this._sortKey = key; this._sortDir = 'desc'; }
        this._renderBody();
      }
    });
  }

  _renderBody() {
    const body = this.querySelector('.panel-body');
    if (body && this._lastData) body.innerHTML = this.renderContent(this._lastData);
    this.afterRender();
  }
}
customElements.define('oi-surge-panel', OiSurgePanel);
export default OiSurgePanel;
