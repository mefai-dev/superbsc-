// MEFAI Tax Report Assistant — API Key required informational panel
import { BasePanel } from '../components/base-panel.js';

export class TaxReportPanel extends BasePanel {
  static skill = 'Skill 20';
  static defaultTitle = 'Tax Report';

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
    h += '.tax-auth{text-align:center;padding:20px}';
    h += '.tax-auth-title{font-size:14px;font-weight:700;margin-bottom:6px}';
    h += '.tax-auth-desc{font-size:11px;color:var(--text-muted);margin-bottom:12px;line-height:1.5}';
    h += '.tax-steps{background:var(--bg-secondary);border-radius:6px;padding:12px;text-align:left;margin-top:12px}';
    h += '.tax-steps h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 8px}';
    h += '.tax-step{font-size:11px;padding:4px 0;display:flex;gap:8px}';
    h += '.tax-step-num{width:18px;height:18px;border-radius:50%;background:rgba(240,185,11,.15);color:#f0b90b;display:inline-flex;align-items:center;justify-content:center;font-size:9px;font-weight:700;flex-shrink:0}';
    h += '.tax-preview{background:var(--bg-secondary);border-radius:6px;padding:12px;margin-top:12px;text-align:left}';
    h += '.tax-preview h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 8px}';
    h += '.tax-preview-item{font-size:11px;padding:3px 0;display:flex;justify-content:space-between}';
    h += '</style>';

    h += '<div class="tax-auth">';
    h += '<div class="tax-auth-title">API Key Required</div>';
    h += '<div class="tax-auth-desc">Generate tax reports from your Binance trade history. Requires a read-only API key with trade access.</div>';

    h += '<div class="tax-steps"><h4>Setup Instructions</h4>';
    h += '<div class="tax-step"><span class="tax-step-num">1</span>Go to Binance API Management</div>';
    h += '<div class="tax-step"><span class="tax-step-num">2</span>Create API key with "Read-Only" permissions</div>';
    h += '<div class="tax-step"><span class="tax-step-num">3</span>Enable "Can Read" for Spot & Margin trading</div>';
    h += '<div class="tax-step"><span class="tax-step-num">4</span>Add key to terminal settings</div>';
    h += '</div>';

    h += '<div class="tax-preview"><h4>Feature Preview</h4>';
    h += '<div class="tax-preview-item"><span>Realized P&L Summary</span><span>Per asset</span></div>';
    h += '<div class="tax-preview-item"><span>Trade History Export</span><span>CSV/JSON</span></div>';
    h += '<div class="tax-preview-item"><span>Cost Basis Methods</span><span>FIFO/LIFO/Avg</span></div>';
    h += '<div class="tax-preview-item"><span>Annual Report</span><span>By year</span></div>';
    h += '</div></div>';

    return h;
  }
}
customElements.define('tax-report-panel', TaxReportPanel);
export default TaxReportPanel;
