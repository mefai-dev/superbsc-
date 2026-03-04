// MEFAI Stablecoin Flow Tracker — cross-chain stablecoin supply from DefiLlama
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class StablecoinFlowPanel extends BasePanel {
  static skill = 'Skill 13';
  static defaultTitle = 'Stablecoin Flow';

  constructor() {
    super();
    this._refreshRate = 120000;
    this._sort = 'bscCirculating';
    this._dir = 'desc';
  }

  async fetchData() {
    const [stablesRes, chainsRes] = await Promise.allSettled([
      window.mefaiApi.defillama.stablecoins(),
      window.mefaiApi.defillama.stablecoinChains(),
    ]);

    const stablesData = stablesRes.status === 'fulfilled' && !stablesRes.value?.error ? stablesRes.value : null;
    const chainsData = chainsRes.status === 'fulfilled' && !chainsRes.value?.error ? chainsRes.value : [];

    const peggedAssets = stablesData?.peggedAssets || [];

    // Extract BSC data for each stablecoin
    const stables = peggedAssets.map(s => {
      const bscData = s.chainCirculating?.BSC?.current?.peggedUSD || 0;
      const chains = s.chainCirculating || {};
      const totalCirc = Object.values(chains).reduce((sum, c) => sum + (c?.current?.peggedUSD || 0), 0);
      return {
        name: s.name || '?',
        symbol: s.symbol || '?',
        bscCirculating: bscData,
        totalCirculating: totalCirc,
        bscPct: totalCirc > 0 ? (bscData / totalCirc * 100) : 0,
        price: s.price || 1,
        pegMechanism: s.pegMechanism || '?',
      };
    }).filter(s => s.bscCirculating > 0)
      .sort((a, b) => b.bscCirculating - a.bscCirculating);

    // Chain distribution from chains endpoint
    const chainList = Array.isArray(chainsData) ? chainsData : [];
    const bscChain = chainList.find(c => c.name === 'BSC' || c.gecko_id === 'binance-smart-chain');
    const totalBsc = bscChain?.totalCirculatingUSD?.peggedUSD || stables.reduce((s, c) => s + c.bscCirculating, 0);

    // Top chains for distribution bar
    const topChains = chainList
      .filter(c => c.totalCirculatingUSD?.peggedUSD > 0)
      .sort((a, b) => (b.totalCirculatingUSD?.peggedUSD || 0) - (a.totalCirculatingUSD?.peggedUSD || 0))
      .slice(0, 6)
      .map(c => ({ name: c.name || c.gecko_id, value: c.totalCirculatingUSD?.peggedUSD || 0 }));

    return { stables, totalBsc, topChains };
  }

  renderContent(data) {
    if (!data?.stables?.length) return '<div class="panel-loading">No stablecoin data</div>';

    let h = '<style scoped>';
    h += '.sf-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.sf-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.sf-card-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.sf-card-value{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.sf-bar{display:flex;height:16px;border-radius:4px;overflow:hidden;margin-bottom:10px;background:var(--bg)}';
    h += '.sf-seg{height:100%;position:relative;min-width:2px}';
    h += '.sf-seg-label{position:absolute;font-size:7px;color:#fff;left:4px;top:1px;white-space:nowrap;text-shadow:0 0 2px rgba(0,0,0,.8)}';
    h += '</style>';

    const totalBsc = data.totalBsc;
    const totalStables = data.stables.length;

    h += '<div class="sf-cards">';
    h += `<div class="sf-card"><div class="sf-card-label">BSC Total</div><div class="sf-card-value">${formatCurrency(totalBsc)}</div></div>`;
    h += `<div class="sf-card"><div class="sf-card-label">Stablecoins</div><div class="sf-card-value">${totalStables}</div></div>`;
    h += `<div class="sf-card"><div class="sf-card-label">#1 on BSC</div><div class="sf-card-value">${escapeHtml(data.stables[0]?.symbol || '—')}</div></div>`;
    h += '</div>';

    // Chain distribution bar
    if (data.topChains?.length) {
      const colors = ['#f0b90b', '#627eea', '#0ecb81', '#e74c3c', '#9b59b6', '#848e9c'];
      const total = data.topChains.reduce((s, c) => s + c.value, 0);
      h += '<div class="sf-bar">';
      data.topChains.forEach((c, i) => {
        const pct = (c.value / total * 100).toFixed(1);
        h += `<div class="sf-seg" style="width:${pct}%;background:${colors[i % colors.length]}">`;
        if (parseFloat(pct) > 8) h += `<span class="sf-seg-label">${escapeHtml(c.name)} ${pct}%</span>`;
        h += '</div>';
      });
      h += '</div>';
    }

    // Table
    const sorted = [...data.stables].sort((a, b) =>
      this._dir === 'desc' ? b[this._sort] - a[this._sort] : a[this._sort] - b[this._sort]
    ).slice(0, 30);

    h += '<table class="data-table"><thead><tr>';
    h += '<th>Stablecoin</th>';
    h += `<th data-k="bscCirculating" style="text-align:right">BSC Supply</th>`;
    h += `<th data-k="totalCirculating" style="text-align:right">Total Supply</th>`;
    h += `<th data-k="bscPct" style="text-align:right">BSC%</th>`;
    h += '<th>Type</th>';
    h += '</tr></thead><tbody>';

    for (const s of sorted) {
      h += '<tr>';
      h += `<td><span style="font-weight:600">${escapeHtml(s.symbol)}</span> <span style="font-size:9px;color:var(--text-muted)">${escapeHtml(s.name)}</span></td>`;
      h += `<td style="text-align:right">${formatCurrency(s.bscCirculating)}</td>`;
      h += `<td style="text-align:right">${formatCurrency(s.totalCirculating)}</td>`;
      h += `<td style="text-align:right">${s.bscPct.toFixed(1)}%</td>`;
      h += `<td style="font-size:9px;color:var(--text-muted)">${escapeHtml(s.pegMechanism)}</td>`;
      h += '</tr>';
    }
    h += '</tbody></table>';
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('th[data-k]').forEach(th => th.addEventListener('click', () => {
      const k = th.dataset.k;
      if (this._sort === k) this._dir = this._dir === 'desc' ? 'asc' : 'desc';
      else { this._sort = k; this._dir = 'desc'; }
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('stablecoin-flow-panel', StablecoinFlowPanel);
export default StablecoinFlowPanel;
