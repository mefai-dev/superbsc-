// MEFAI Swap Router — Binance Web3 Wallet swap overview (informational)
import { BasePanel } from '../components/base-panel.js';

export class SwapRouterPanel extends BasePanel {
  static skill = 'Skill 22';
  static defaultTitle = 'Swap Router';

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
      <div class="panel-body">${this._renderInfoPanel()}</div>
    `;
  }

  async fetchData() { return null; }
  renderContent() { return this._renderInfoPanel(); }

  _renderInfoPanel() {
    let h = '<style scoped>';
    h += '.sw-info{padding:12px}';
    h += '.sw-header{text-align:center;margin-bottom:16px}';
    h += '.sw-title{font-size:14px;font-weight:700}';
    h += '.sw-sub{font-size:11px;color:var(--text-muted);margin-top:4px}';
    h += '.sw-chains{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin:12px 0}';
    h += '.sw-chain{background:var(--bg-secondary);border-radius:6px;padding:10px;text-align:center}';
    h += '.sw-chain-name{font-size:11px;font-weight:600}';
    h += '.sw-chain-dex{font-size:9px;color:var(--text-muted);margin-top:2px}';
    h += '.sw-section{border-top:1px solid var(--border);padding:10px 0}';
    h += '.sw-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 6px}';
    h += '.sw-feat{font-size:11px;padding:3px 0;display:flex;gap:6px;align-items:center}';
    h += '.sw-dot{width:5px;height:5px;border-radius:50%;background:#0ecb81;flex-shrink:0}';
    h += '</style>';

    h += '<div class="sw-info">';
    h += '<div class="sw-header">';
    h += '<div class="sw-title">Binance Web3 Wallet Swap</div>';
    h += '<div class="sw-sub">Multi-chain DEX aggregation via Binance Web3 Wallet</div></div>';

    h += '<div class="sw-chains">';
    const chains = [
      { name: 'BNB Chain', dex: 'PancakeSwap' },
      { name: 'Ethereum', dex: 'Uniswap' },
      { name: 'Solana', dex: 'Jupiter' },
      { name: 'Arbitrum', dex: 'Camelot' },
      { name: 'Base', dex: 'Aerodrome' },
      { name: 'Polygon', dex: 'QuickSwap' },
    ];
    chains.forEach(c => {
      h += `<div class="sw-chain"><div class="sw-chain-name">${c.name}</div><div class="sw-chain-dex">${c.dex}</div></div>`;
    });
    h += '</div>';

    h += '<div class="sw-section"><h4>Capabilities</h4>';
    const feats = [
      'Best price across multiple DEX aggregators',
      'Cross-chain bridge integration',
      'Gas estimation and optimization',
      'Slippage protection and MEV guard',
      'Token approval management',
      'Real-time price impact calculation',
    ];
    feats.forEach(f => { h += `<div class="sw-feat"><span class="sw-dot"></span>${f}</div>`; });
    h += '</div>';

    h += '<div class="sw-section"><h4>Status</h4>';
    h += '<div style="font-size:11px;color:var(--text-muted);padding:4px 0">Web3 Wallet swap API requires authenticated Binance wallet connection. Use Binance app or browser extension.</div>';
    h += '</div></div>';

    return h;
  }
}
customElements.define('swap-router-panel', SwapRouterPanel);
export default SwapRouterPanel;
