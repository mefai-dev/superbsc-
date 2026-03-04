// MEFAI Capital Rotation Radar — Sector capital flow detection
import { BasePanel } from '../components/base-panel.js';

const { escapeHtml, formatCurrency, formatPercent } = window.mefaiUtils;

const CORE_SECTORS = [
  'meme-token', 'ai-agents', 'ai-meme-coins',
  'real-world-assets-rwa', 'depin', 'gaming',
  'layer-1', 'layer-2', 'decentralized-finance-defi',
  'smart-contract-platform', 'stablecoins',
];

export class CapitalRotationPanel extends BasePanel {
  static skill = 'Skill 16';
  static defaultTitle = 'Capital Rotation';

  constructor() {
    super();
    this._refreshRate = 60000; // 60s
    this._sortCol = 'change';
    this._sortDir = -1;
    this._showAll = false;
  }

  async fetchData() {
    const res = await window.mefaiApi.coingecko.categories('market_cap_change_24h_desc');
    if (!res || res?.error || !Array.isArray(res)) return { _fetchError: true };

    // Filter to core sectors
    const core = res.filter(c => CORE_SECTORS.includes(c.id));
    // Also get top 10 movers (non-core) for discovery
    const nonCore = res.filter(c => !CORE_SECTORS.includes(c.id));
    const topGainers = nonCore.filter(c => (c.market_cap_change_24h || 0) > 0).slice(0, 5);
    const topLosers = nonCore.filter(c => (c.market_cap_change_24h || 0) < 0).slice(-5).reverse();

    return { core, topGainers, topLosers, total: res.length };
  }

  renderContent(data) {
    if (!data || data?._fetchError) return `<div class="panel-loading">${_t('dex.noData')}</div>`;

    const { core, topGainers, topLosers } = data;

    // Sort core sectors
    const sorted = [...core].sort((a, b) => {
      let va, vb;
      if (this._sortCol === 'name') { va = a.name || ''; vb = b.name || ''; return this._sortDir * va.localeCompare(vb); }
      if (this._sortCol === 'mcap') { va = a.market_cap || 0; vb = b.market_cap || 0; }
      else if (this._sortCol === 'vol') { va = a.volume_24h || 0; vb = b.volume_24h || 0; }
      else { va = a.market_cap_change_24h || 0; vb = b.market_cap_change_24h || 0; }
      return this._sortDir * (va - vb);
    });

    // Detect rotation: biggest gainer + biggest loser in core
    const coreByChange = [...core].sort((a, b) => (b.market_cap_change_24h || 0) - (a.market_cap_change_24h || 0));
    const topInflow = coreByChange[0];
    const topOutflow = coreByChange[coreByChange.length - 1];
    const rotationStrength = topInflow && topOutflow
      ? Math.abs(topInflow.market_cap_change_24h || 0) + Math.abs(topOutflow.market_cap_change_24h || 0)
      : 0;
    const strengthLabel = rotationStrength > 10 ? 'STRONG' : rotationStrength > 4 ? 'MODERATE' : 'WEAK';
    const strengthColor = rotationStrength > 10 ? '#f6465d' : rotationStrength > 4 ? '#f0b90b' : '#0ecb81';

    let h = '<style scoped>';
    h += `.cr-rotation{text-align:center;padding:8px;margin-bottom:6px;border-radius:6px;background:var(--bg-panel)}`;
    h += `.cr-arrow{font-size:16px;margin:0 6px}`;
    h += `.cr-from{color:#f6465d;font-weight:700;font-size:12px}`;
    h += `.cr-to{color:#0ecb81;font-weight:700;font-size:12px}`;
    h += `.cr-strength{font-size:9px;font-weight:700;padding:1px 5px;border-radius:3px}`;
    h += `.cr-section{margin-top:8px}`;
    h += `.cr-section h4{font-size:10px;text-transform:uppercase;color:var(--text-muted);margin:0 0 4px;letter-spacing:.5px}`;
    h += `.cr-mini{font-size:10px;padding:2px 0;display:flex;justify-content:space-between}`;
    h += '</style>';

    // Rotation banner
    if (topInflow && topOutflow && rotationStrength > 2) {
      h += '<div class="cr-rotation">';
      h += `<span class="cr-from">${escapeHtml(topOutflow.name || '')} ${formatPercent(topOutflow.market_cap_change_24h)}</span>`;
      h += `<span class="cr-arrow">\u2192</span>`;
      h += `<span class="cr-to">${escapeHtml(topInflow.name || '')} ${formatPercent(topInflow.market_cap_change_24h)}</span>`;
      h += `<div style="margin-top:3px"><span class="cr-strength" style="color:${strengthColor};background:${strengthColor}22">${strengthLabel}</span></div>`;
      h += '</div>';
    }

    // Core sectors table
    const sortIcon = (col) => this._sortCol === col ? (this._sortDir > 0 ? '\u25B2' : '\u25BC') : '';
    h += '<table class="data-table"><thead><tr>';
    h += `<th class="sortable" data-sort="name">${_t('col.name')} ${sortIcon('name')}</th>`;
    h += `<th class="sortable" data-sort="mcap" style="text-align:right">MCap ${sortIcon('mcap')}</th>`;
    h += `<th class="sortable" data-sort="change" style="text-align:right">24h% ${sortIcon('change')}</th>`;
    h += `<th class="sortable" data-sort="vol" style="text-align:right">Vol ${sortIcon('vol')}</th>`;
    h += '<th style="text-align:center">Flow</th>';
    h += '</tr></thead><tbody>';

    sorted.forEach(s => {
      const chg = s.market_cap_change_24h || 0;
      const cls = chg >= 0 ? 'val-up' : 'val-down';
      const flow = chg > 2 ? '\u2B06\uFE0F' : chg < -2 ? '\u2B07\uFE0F' : '\u2796';
      const volIntensity = s.market_cap ? ((s.volume_24h || 0) / s.market_cap * 100).toFixed(1) : '0';
      h += '<tr>';
      h += `<td style="font-weight:600;max-width:100px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap">${escapeHtml(s.name || s.id)}</td>`;
      h += `<td style="text-align:right">${formatCurrency(s.market_cap || 0)}</td>`;
      h += `<td style="text-align:right" class="${cls}">${chg >= 0 ? '+' : ''}${chg.toFixed(2)}%</td>`;
      h += `<td style="text-align:right">${formatCurrency(s.volume_24h || 0)}</td>`;
      h += `<td style="text-align:center">${flow}</td>`;
      h += '</tr>';
    });
    h += '</tbody></table>';

    // Hot discoveries section
    if (topGainers.length) {
      h += '<div class="cr-section"><h4>Trending Sectors</h4>';
      topGainers.forEach(s => {
        const chg = s.market_cap_change_24h || 0;
        h += `<div class="cr-mini"><span>${escapeHtml(s.name || s.id)}</span><span class="val-up">+${chg.toFixed(1)}%</span></div>`;
      });
      h += '</div>';
    }

    if (topLosers.length) {
      h += '<div class="cr-section"><h4>Bleeding Sectors</h4>';
      topLosers.forEach(s => {
        const chg = s.market_cap_change_24h || 0;
        h += `<div class="cr-mini"><span>${escapeHtml(s.name || s.id)}</span><span class="val-down">${chg.toFixed(1)}%</span></div>`;
      });
      h += '</div>';
    }

    return h;
  }

  afterRender() {
    this.querySelectorAll('.sortable').forEach(th => {
      th.addEventListener('click', () => {
        const col = th.dataset.sort;
        if (this._sortCol === col) this._sortDir *= -1;
        else { this._sortCol = col; this._sortDir = -1; }
        const body = this.querySelector('.panel-body');
        if (body && this._lastData) body.innerHTML = this.renderContent(this._lastData);
        this.afterRender();
      });
    });
  }
}
customElements.define('capital-rotation-panel', CapitalRotationPanel);
export default CapitalRotationPanel;
