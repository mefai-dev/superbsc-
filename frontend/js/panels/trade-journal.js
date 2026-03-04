// MEFAI Trade Journal — API Key required informational panel
import { BasePanel } from '../components/base-panel.js';

export class TradeJournalPanel extends BasePanel {
  static skill = 'Skill 21';
  static defaultTitle = 'Trade Journal';

  constructor() {
    super();
    this._refreshRate = 0;
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
      </div>
      <div class="panel-body">${this._renderAuthCard()}</div>
    `;
  }

  async fetchData() { return null; }
  renderContent() { return this._renderAuthCard(); }

  _renderAuthCard() {
    let h = '<style scoped>';
    h += '.tj-auth{text-align:center;padding:20px}';
    h += '.tj-title{font-size:14px;font-weight:700;margin-bottom:6px}';
    h += '.tj-desc{font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.5}';
    h += '.tj-preview{background:var(--bg-secondary);border-radius:6px;padding:12px;text-align:left;margin-top:12px}';
    h += '.tj-preview h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 8px}';
    h += '.tj-stat{display:flex;justify-content:space-between;padding:4px 0;font-size:11px}';
    h += '.tj-stat-val{font-weight:600}';
    h += '.tj-metrics{display:grid;grid-template-columns:1fr 1fr;gap:8px;margin-top:12px}';
    h += '.tj-metric{background:var(--bg-primary);border-radius:6px;padding:10px;text-align:center}';
    h += '.tj-metric-label{font-size:9px;color:var(--text-muted);text-transform:uppercase}';
    h += '.tj-metric-val{font-size:16px;font-weight:700;margin-top:2px;color:#f0b90b}';
    h += '</style>';

    h += '<div class="tj-auth">';
    h += '<div class="tj-title">API Key Required</div>';
    h += '<div class="tj-desc">Track and analyze your trading performance with automated journaling from Binance trade history.</div>';

    h += '<div class="tj-metrics">';
    h += '<div class="tj-metric"><div class="tj-metric-label">Win Rate</div><div class="tj-metric-val">—%</div></div>';
    h += '<div class="tj-metric"><div class="tj-metric-label">Avg Hold Time</div><div class="tj-metric-val">—</div></div>';
    h += '<div class="tj-metric"><div class="tj-metric-label">Top Pair</div><div class="tj-metric-val">—</div></div>';
    h += '<div class="tj-metric"><div class="tj-metric-label">PnL Summary</div><div class="tj-metric-val">—</div></div>';
    h += '</div>';

    h += '<div class="tj-preview"><h4>Features</h4>';
    h += '<div class="tj-stat"><span>Auto-import trades</span><span class="tj-stat-val">myTrades API</span></div>';
    h += '<div class="tj-stat"><span>Win/Loss analysis</span><span class="tj-stat-val">Per pair</span></div>';
    h += '<div class="tj-stat"><span>Holding periods</span><span class="tj-stat-val">Time analysis</span></div>';
    h += '<div class="tj-stat"><span>PnL breakdown</span><span class="tj-stat-val">Daily/Weekly</span></div>';
    h += '</div></div>';

    return h;
  }
}
customElements.define('trade-journal-panel', TradeJournalPanel);
export default TradeJournalPanel;
