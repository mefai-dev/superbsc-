// MEFAI Global Market Pulse — crypto market overview from CoinGecko
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class MarketPulsePanel extends BasePanel {
  static skill = 'Skill 11';
  static defaultTitle = 'Market Pulse';

  constructor() {
    super();
    this._refreshRate = 60000;
  }

  async fetchData() {
    const [globalRes, defiRes] = await Promise.allSettled([
      window.mefaiApi.coingecko.global(),
      window.mefaiApi.coingecko.globalDefi(),
    ]);

    const global = globalRes.status === 'fulfilled' && !globalRes.value?.error
      ? (globalRes.value?.data || globalRes.value) : null;
    const defi = defiRes.status === 'fulfilled' && !defiRes.value?.error
      ? (defiRes.value?.data || defiRes.value) : null;

    return { global, defi };
  }

  renderContent(data) {
    const g = data?.global;
    const d = data?.defi;
    if (!g) return '<div class="panel-loading">No global market data</div>';

    let h = '<style scoped>';
    h += '.mp-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:12px}';
    h += '.mp-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.mp-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.mp-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.mp-sub{font-size:9px;color:var(--text-muted);margin-top:1px}';
    h += '.mp-dom-bar{display:flex;height:20px;border-radius:4px;overflow:hidden;margin-bottom:12px}';
    h += '.mp-dom-seg{height:100%;position:relative;min-width:2px}';
    h += '.mp-dom-lbl{position:absolute;font-size:8px;color:#fff;left:4px;top:3px;white-space:nowrap;text-shadow:0 0 2px rgba(0,0,0,.8)}';
    h += '.mp-section{margin-bottom:12px}';
    h += '.mp-section-title{font-size:10px;font-weight:700;text-transform:uppercase;letter-spacing:.5px;color:var(--accent);margin-bottom:6px}';
    h += '.mp-defi-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}';
    h += '</style>';

    // Summary cards
    const totalMcap = g.total_market_cap?.usd || 0;
    const totalVol = g.total_volume?.usd || 0;
    const btcDom = g.market_cap_percentage?.btc || 0;
    const mcapChange = g.market_cap_change_percentage_24h_usd || 0;
    const activeCoins = g.active_cryptocurrencies || 0;

    h += '<div class="mp-cards">';
    h += `<div class="mp-card"><div class="mp-label">Total MCap</div><div class="mp-val">${formatCurrency(totalMcap)}</div>`;
    const mcapCls = mcapChange >= 0 ? 'val-up' : 'val-down';
    h += `<div class="mp-sub ${mcapCls}">${mcapChange >= 0 ? '↑' : '↓'}${Math.abs(mcapChange).toFixed(2)}%</div></div>`;
    h += `<div class="mp-card"><div class="mp-label">24h Volume</div><div class="mp-val">${formatCurrency(totalVol)}</div></div>`;
    h += `<div class="mp-card"><div class="mp-label">BTC Dom</div><div class="mp-val">${btcDom.toFixed(1)}%</div>`;
    h += `<div class="mp-sub">${formatNumber(activeCoins)} coins</div></div>`;
    h += '</div>';

    // Dominance bar
    const domMap = g.market_cap_percentage || {};
    const domEntries = Object.entries(domMap)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 6);
    const colors = { btc: '#f7931a', eth: '#627eea', usdt: '#26a17b', bnb: '#f0b90b', sol: '#9945ff', usdc: '#2775ca', xrp: '#23292f' };
    const fallbackColors = ['#e74c3c', '#9b59b6', '#3498db', '#1abc9c', '#f39c12', '#848e9c'];

    h += '<div class="mp-section"><div class="mp-section-title">Market Dominance</div>';
    h += '<div class="mp-dom-bar">';
    domEntries.forEach(([ coin, pct], i) => {
      const color = colors[coin] || fallbackColors[i % fallbackColors.length];
      h += `<div class="mp-dom-seg" style="width:${pct}%;background:${color}">`;
      if (pct > 5) h += `<span class="mp-dom-lbl">${coin.toUpperCase()} ${pct.toFixed(1)}%</span>`;
      h += '</div>';
    });
    h += '</div></div>';

    // DeFi section
    if (d) {
      const defiMcap = parseFloat(d.defi_market_cap || 0);
      const defiVol = parseFloat(d.trading_volume_24h || 0);
      const defiDom = parseFloat(d.defi_dominance || 0);
      const ethRatio = parseFloat(d.eth_market_cap || 0);
      const topCoin = d.top_coin_name || '—';
      const topDom = parseFloat(d.top_coin_defi_dominance || 0);

      h += '<div class="mp-section"><div class="mp-section-title">DeFi Overview</div>';
      h += '<div class="mp-defi-grid">';
      h += `<div class="mp-card"><div class="mp-label">DeFi MCap</div><div class="mp-val">${formatCurrency(defiMcap)}</div></div>`;
      h += `<div class="mp-card"><div class="mp-label">DeFi 24h Vol</div><div class="mp-val">${formatCurrency(defiVol)}</div></div>`;
      h += `<div class="mp-card"><div class="mp-label">DeFi Dom%</div><div class="mp-val">${defiDom.toFixed(2)}%</div></div>`;
      h += `<div class="mp-card"><div class="mp-label">Top: ${escapeHtml(topCoin)}</div><div class="mp-val">${topDom.toFixed(1)}%</div></div>`;
      h += '</div></div>';
    }

    return h;
  }
}
customElements.define('market-pulse-panel', MarketPulsePanel);
export default MarketPulsePanel;
