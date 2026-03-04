// MEFAI All Skills Panel — Multi-skill fusion dashboard (card-based, NOT table)
import { BasePanel } from '../components/base-panel.js';

export class AllSkillsPanel extends BasePanel {
  static skill = 'All Skills';
  static defaultTitle = 'MEFAI Dashboard';

  constructor() {
    super();
    this._refreshRate = 12000;
  }

  async fetchData() {
    const [sigRes, trendRes, memeRes, tickerRes, inflowRes] = await Promise.allSettled([
      window.mefaiApi.signals.smartMoney(),
      window.mefaiApi.rank.trending(),
      window.mefaiApi.rank.memeRank(),
      window.mefaiApi.spot.tickers(),
      window.mefaiApi.rank.smartInflow(),
    ]);

    const signals = (sigRes.status === 'fulfilled' && sigRes.value?.code === '000000')
      ? (sigRes.value.data || []) : [];
    const trending = (trendRes.status === 'fulfilled' && trendRes.value?.code === '000000')
      ? (trendRes.value.data?.tokens || []) : [];
    const memes = (memeRes.status === 'fulfilled' && memeRes.value?.code === '000000')
      ? (memeRes.value.data?.tokens || []) : [];
    const tickers = (tickerRes.status === 'fulfilled' && Array.isArray(tickerRes.value))
      ? tickerRes.value : [];
    const inflow = (inflowRes.status === 'fulfilled' && inflowRes.value?.code === '000000')
      ? (inflowRes.value.data?.tokenInfoList || inflowRes.value.data || []) : [];

    // Compute stats
    const buys = signals.filter(s => (s.signalDirection || s.direction || '').toLowerCase() === 'buy');
    const sells = signals.filter(s => (s.signalDirection || s.direction || '').toLowerCase() === 'sell');
    const activeSignals = signals.filter(s => s.status === 'active');
    const avgGain = signals.length ? signals.reduce((a, s) => a + parseFloat(s.maxGain || 0), 0) / signals.length : 0;

    // BTC + ETH from tickers
    const btc = tickers.find(t => t.symbol === 'BTCUSDT');
    const eth = tickers.find(t => t.symbol === 'ETHUSDT');
    const bnb = tickers.find(t => t.symbol === 'BNBUSDT');

    // Top gainers from spot
    const gainers = tickers
      .filter(t => t.symbol?.endsWith('USDT') && parseFloat(t.quoteVolume) > 300000)
      .map(t => ({ sym: t.symbol.replace('USDT', ''), chg: parseFloat(t.priceChangePercent || 0), vol: parseFloat(t.quoteVolume || 0), price: parseFloat(t.lastPrice || 0) }))
      .sort((a, b) => b.chg - a.chg)
      .slice(0, 5);

    // Top losers
    const losers = tickers
      .filter(t => t.symbol?.endsWith('USDT') && parseFloat(t.quoteVolume) > 300000)
      .map(t => ({ sym: t.symbol.replace('USDT', ''), chg: parseFloat(t.priceChangePercent || 0), vol: parseFloat(t.quoteVolume || 0), price: parseFloat(t.lastPrice || 0) }))
      .sort((a, b) => a.chg - b.chg)
      .slice(0, 5);

    // Hot signals (top 6 by SM count)
    const hotSignals = [...signals]
      .sort((a, b) => parseInt(b.smartMoneyCount || b.signalCount || 0) - parseInt(a.smartMoneyCount || a.signalCount || 0))
      .slice(0, 6);

    return {
      stats: { totalSignals: signals.length, buys: buys.length, sells: sells.length, active: activeSignals.length, avgGain },
      btc, eth, bnb,
      gainers, losers,
      hotSignals,
      trending: trending.slice(0, 6),
      memes: memes.slice(0, 6),
      inflow: (Array.isArray(inflow) ? inflow : []).slice(0, 6),
    };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading dashboard...</div>';
    const u = window.mefaiUtils;
    const st = data.stats;

    // Market tickers
    const btcP = data.btc ? parseFloat(data.btc.lastPrice) : 0;
    const btcC = data.btc ? parseFloat(data.btc.priceChangePercent) : 0;
    const ethP = data.eth ? parseFloat(data.eth.lastPrice) : 0;
    const ethC = data.eth ? parseFloat(data.eth.priceChangePercent) : 0;
    const bnbP = data.bnb ? parseFloat(data.bnb.lastPrice) : 0;
    const bnbC = data.bnb ? parseFloat(data.bnb.priceChangePercent) : 0;

    let h = `<style>
.dash{display:flex;flex-direction:column;gap:8px;font-variant-numeric:tabular-nums}
.dash-row{display:flex;gap:8px;flex-wrap:wrap}
.dash-card{flex:1;min-width:80px;background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px 10px}
.dash-card-lg{flex:2;min-width:160px}
.dash-lbl{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--text-muted);margin-bottom:4px}
.dash-val{font-size:16px;font-weight:800;letter-spacing:.3px}
.dash-sub{font-size:10px;color:var(--text-secondary);margin-top:2px}
.dash-grid{display:grid;grid-template-columns:1fr 1fr;gap:6px}
.dash-mini{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:6px 8px;display:flex;align-items:center;gap:6px;cursor:pointer;transition:border-color .15s}
.dash-mini:hover{border-color:var(--accent)}
.dash-mini-icon{width:20px;height:20px;border-radius:50%;flex-shrink:0}
.dash-mini-info{flex:1;min-width:0}
.dash-mini-sym{font-size:10px;font-weight:700;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.dash-mini-val{font-size:9px;color:var(--text-secondary)}
.dash-section{margin-top:4px}
.dash-section-title{font-size:9px;text-transform:uppercase;letter-spacing:.5px;color:var(--accent);font-weight:700;margin-bottom:6px;display:flex;align-items:center;gap:6px}
.dash-section-title::after{content:'';flex:1;height:1px;background:var(--border)}
.dash-pill{display:inline-block;padding:1px 6px;font-size:8px;font-weight:700;border-radius:3px;text-transform:uppercase}
.pill-buy{color:#0ecb81;background:rgba(14,203,129,.12)}
.pill-sell{color:#f6465d;background:rgba(246,70,93,.12)}
.pill-active{color:var(--accent);background:rgba(240,185,11,.12)}
.dash-bar-row{display:flex;gap:2px;height:6px;border-radius:3px;overflow:hidden;margin-top:4px}
.dash-bar-seg{height:100%;border-radius:3px}
</style>`;

    h += `<div class="dash">`;

    // Row 1 — Market Pulse (BTC, ETH, BNB) + Signal Stats
    h += `<div class="dash-row">`;
    // BTC
    h += `<div class="dash-card">
      <div class="dash-lbl">BTC</div>
      <div class="dash-val" style="font-size:14px">$${u.formatPrice(btcP)}</div>
      <div class="dash-sub ${btcC >= 0 ? 'val-up' : 'val-down'}">${btcC >= 0 ? '+' : ''}${btcC.toFixed(2)}%</div>
    </div>`;
    // ETH
    h += `<div class="dash-card">
      <div class="dash-lbl">ETH</div>
      <div class="dash-val" style="font-size:14px">$${u.formatPrice(ethP)}</div>
      <div class="dash-sub ${ethC >= 0 ? 'val-up' : 'val-down'}">${ethC >= 0 ? '+' : ''}${ethC.toFixed(2)}%</div>
    </div>`;
    // BNB
    h += `<div class="dash-card">
      <div class="dash-lbl">BNB</div>
      <div class="dash-val" style="font-size:14px">$${u.formatPrice(bnbP)}</div>
      <div class="dash-sub ${bnbC >= 0 ? 'val-up' : 'val-down'}">${bnbC >= 0 ? '+' : ''}${bnbC.toFixed(2)}%</div>
    </div>`;
    // Signal Summary
    h += `<div class="dash-card dash-card-lg">
      <div class="dash-lbl">Signal Pulse</div>
      <div style="display:flex;gap:12px;align-items:center">
        <div>
          <div class="dash-val" style="font-size:14px">${st.totalSignals}</div>
          <div class="dash-sub">Total</div>
        </div>
        <div>
          <span class="dash-pill pill-buy">▲ ${st.buys} Buy</span>
        </div>
        <div>
          <span class="dash-pill pill-sell">▼ ${st.sells} Sell</span>
        </div>
        <div>
          <span class="dash-pill pill-active">● ${st.active} Active</span>
        </div>
      </div>
      <div class="dash-bar-row">
        <div class="dash-bar-seg" style="flex:${st.buys || 1};background:#0ecb81"></div>
        <div class="dash-bar-seg" style="flex:${st.sells || 1};background:#f6465d"></div>
      </div>
    </div>`;
    h += `</div>`;

    // Row 2 — Hot Signals (cards, not table!)
    h += `<div class="dash-section"><div class="dash-section-title">Hot Signals — Smart Money</div></div>`;
    h += `<div class="dash-grid">`;
    for (const s of data.hotSignals) {
      const dir = (s.signalDirection || s.direction || '').toLowerCase();
      const gain = parseFloat(s.maxGain || 0);
      const smCount = parseInt(s.smartMoneyCount || s.signalCount || 0);
      const iconUrl = u.tokenIcon(s.logoUrl || '');
      const icon = iconUrl ? `<img src="${iconUrl}" class="dash-mini-icon" onerror="this.style.display='none'">` : `<div class="dash-mini-icon" style="background:var(--border)"></div>`;
      h += `<div class="dash-mini" data-a="${s.contractAddress || ''}" data-c="${s.chainId || '56'}">
        ${icon}
        <div class="dash-mini-info">
          <div class="dash-mini-sym">${u.escapeHtml(s.ticker || s.symbol || '')}</div>
          <div class="dash-mini-val">SM: ${smCount} · $${u.formatPrice(parseFloat(s.currentPrice || 0))}</div>
        </div>
        <div style="text-align:right">
          <span class="dash-pill ${dir === 'buy' ? 'pill-buy' : 'pill-sell'}">${dir === 'buy' ? '▲' : '▼'} ${dir}</span>
          <div style="font-size:9px;margin-top:2px" class="${gain >= 0 ? 'val-up' : 'val-down'}">${gain >= 0 ? '+' : ''}${gain.toFixed(1)}%</div>
        </div>
      </div>`;
    }
    h += `</div>`;

    // Row 3 — Top Gainers + Losers side by side
    h += `<div class="dash-row">`;
    // Gainers
    h += `<div class="dash-card" style="flex:1">
      <div class="dash-section-title" style="margin-top:0">Top Gainers</div>`;
    for (const g of data.gainers) {
      h += `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:10px">
        <span style="font-weight:600">${u.escapeHtml(g.sym)}</span>
        <span class="val-up">+${g.chg.toFixed(1)}%</span>
      </div>`;
    }
    h += `</div>`;
    // Losers
    h += `<div class="dash-card" style="flex:1">
      <div class="dash-section-title" style="margin-top:0">Top Losers</div>`;
    for (const l of data.losers) {
      h += `<div style="display:flex;justify-content:space-between;padding:2px 0;font-size:10px">
        <span style="font-weight:600">${u.escapeHtml(l.sym)}</span>
        <span class="val-down">${l.chg.toFixed(1)}%</span>
      </div>`;
    }
    h += `</div>`;
    h += `</div>`;

    // Row 4 — Trending tokens (mini cards)
    if (data.trending.length) {
      h += `<div class="dash-section"><div class="dash-section-title">Trending Tokens</div></div>`;
      h += `<div class="dash-grid">`;
      for (const t of data.trending) {
        const iconUrl = u.tokenIcon(t.icon || '');
        const icon = iconUrl ? `<img src="${iconUrl}" class="dash-mini-icon" onerror="this.style.display='none'">` : `<div class="dash-mini-icon" style="background:var(--border)"></div>`;
        const chg = parseFloat(t.percentChange24h || 0);
        h += `<div class="dash-mini" data-a="${t.contractAddress || ''}" data-c="${t.chainId || ''}">
          ${icon}
          <div class="dash-mini-info">
            <div class="dash-mini-sym">${u.escapeHtml(t.symbol || '')}</div>
            <div class="dash-mini-val">$${u.formatPrice(parseFloat(t.price || 0))}</div>
          </div>
          <div style="font-size:10px;font-weight:600" class="${chg >= 0 ? 'val-up' : 'val-down'}">${chg >= 0 ? '+' : ''}${chg.toFixed(1)}%</div>
        </div>`;
      }
      h += `</div>`;
    }

    // Row 5 — Smart Inflow (if available)
    if (data.inflow.length) {
      h += `<div class="dash-section"><div class="dash-section-title">Smart Money Inflow</div></div>`;
      h += `<div class="dash-grid">`;
      for (const t of data.inflow) {
        const iconUrl = u.tokenIcon(t.tokenLogo || t.icon || '');
        const icon = iconUrl ? `<img src="${iconUrl}" class="dash-mini-icon" onerror="this.style.display='none'">` : `<div class="dash-mini-icon" style="background:var(--border)"></div>`;
        const inAmt = parseFloat(t.smartMoneyInflow || t.inflowAmount || 0);
        h += `<div class="dash-mini" data-a="${t.contractAddress || ''}" data-c="${t.chainId || ''}">
          ${icon}
          <div class="dash-mini-info">
            <div class="dash-mini-sym">${u.escapeHtml(t.tokenSymbol || t.symbol || '')}</div>
            <div class="dash-mini-val">${u.formatCurrency(inAmt)} inflow</div>
          </div>
        </div>`;
      }
      h += `</div>`;
    }

    h += `</div>`;
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.dash-mini[data-a]').forEach(el => {
      el.addEventListener('click', () => {
        this.emitTokenFocus({ address: el.dataset.a, chain: el.dataset.c });
      });
    });
  }
}

customElements.define('all-skills-panel', AllSkillsPanel);
export default AllSkillsPanel;
