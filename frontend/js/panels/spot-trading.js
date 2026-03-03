// MEFAI Spot Trading Panel — Shows "API Key Required" message (spot.account needs key)
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml } = window.mefaiUtils;

export class SpotTradingPanel extends BasePanel {
  static skill = 'Skill 1';
  static defaultTitle = 'Spot Trading';

  constructor() {
    super();
    this._refreshRate = 0; // no auto-refresh, static message
  }

  async fetchData() {
    return { _requiresKey: true };
  }

  renderContent(data) {
    return `<div class="panel-loading" style="flex-direction:column;gap:12px;text-align:center;padding:40px 20px">
      <div style="font-size:32px;opacity:0.3">&#128274;</div>
      <div style="font-weight:700;font-size:14px">API Key Required</div>
      <div style="font-size:11px;color:var(--text-muted);line-height:1.5">
        Spot trading requires a Binance API key with trading permissions.<br>
        Configure your API key in settings to enable:
      </div>
      <div style="text-align:left;font-size:11px;color:var(--text-secondary);line-height:1.8;padding:0 20px">
        &#8226; Place market and limit orders<br>
        &#8226; View open orders<br>
        &#8226; Check account balances<br>
        &#8226; Manage positions
      </div>
      <div style="font-size:10px;color:var(--text-muted);margin-top:8px;padding:8px;border:1px solid var(--border);border-radius:4px">
        Go to Settings &#8594; API Keys to configure
      </div>
    </div>`;
  }
}

customElements.define('spot-trading-panel', SpotTradingPanel);
export default SpotTradingPanel;
