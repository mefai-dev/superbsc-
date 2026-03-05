// MEFAI BTC Macro Indicators — Pi Cycle, Rainbow, Golden Ratio
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, formatNumber, escapeHtml } = window.mefaiUtils;

export class BtcMacroPanel extends BasePanel {
  static skill = 'Skill 23';
  static defaultTitle = 'BTC Macro';

  constructor() {
    super();
    this._refreshRate = 3600000;
    this._tab = 'pi-cycle';
  }

  async fetchData() {
    const [piRes, rainbowRes, goldenRes] = await Promise.allSettled([
      window.mefaiApi.btcMacro.piCycle(),
      window.mefaiApi.btcMacro.rainbow(),
      window.mefaiApi.btcMacro.goldenRatio(),
    ]);

    const pi = piRes.status === 'fulfilled' && piRes.value?.data ? piRes.value : null;
    const rainbow = rainbowRes.status === 'fulfilled' && rainbowRes.value?.data ? rainbowRes.value : null;
    const golden = goldenRes.status === 'fulfilled' && goldenRes.value?.data ? goldenRes.value : null;

    return { pi, rainbow, golden };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">No data</div>';

    let h = '<style scoped>';
    h += '.bm-tabs{display:flex;gap:4px;margin-bottom:8px}';
    h += '.bm-tab{padding:3px 10px;font-size:10px;font-weight:600;border:1px solid var(--border);border-radius:4px;background:transparent;color:var(--text-muted);cursor:pointer;text-transform:uppercase}';
    h += '.bm-tab.active{background:var(--accent);color:#0b0e11;border-color:var(--accent)}';
    h += '.bm-cards{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-bottom:10px}';
    h += '.bm-card{background:var(--bg);border:1px solid var(--border);border-radius:6px;padding:8px;text-align:center}';
    h += '.bm-label{font-size:9px;color:var(--text-muted);text-transform:uppercase;letter-spacing:.5px}';
    h += '.bm-val{font-size:14px;font-weight:700;color:var(--text);margin-top:2px}';
    h += '.bm-sub{font-size:9px;margin-top:1px;color:var(--text-muted)}';
    h += '.bm-desc{font-size:10px;color:var(--text-muted);line-height:1.5;padding:8px;background:var(--bg);border:1px solid var(--border);border-radius:6px;margin-bottom:8px}';
    h += '.bm-spark{display:flex;align-items:flex-end;gap:1px;height:40px;margin-top:6px}';
    h += '.bm-bar{flex:1;border-radius:1px;min-width:2px;opacity:.8}';
    h += '.bm-signal{display:inline-block;padding:2px 8px;border-radius:3px;font-size:9px;font-weight:700;text-transform:uppercase}';
    h += '.bm-signal-bull{background:rgba(0,200,83,.15);color:#00c853}';
    h += '.bm-signal-bear{background:rgba(255,82,82,.15);color:#ff5252}';
    h += '</style>';

    h += '<div class="bm-tabs">';
    h += `<button class="bm-tab ${this._tab === 'pi-cycle' ? 'active' : ''}" data-tab="pi-cycle">Pi Cycle</button>`;
    h += `<button class="bm-tab ${this._tab === 'rainbow' ? 'active' : ''}" data-tab="rainbow">Rainbow</button>`;
    h += `<button class="bm-tab ${this._tab === 'golden' ? 'active' : ''}" data-tab="golden">Golden Ratio</button>`;
    h += '</div>';

    if (this._tab === 'pi-cycle') h += this._renderPiCycle(data.pi);
    else if (this._tab === 'rainbow') h += this._renderRainbow(data.rainbow);
    else h += this._renderGolden(data.golden);

    return h;
  }

  _renderPiCycle(apiData) {
    if (!apiData?.data?.price) return '<div class="bm-desc">Pi Cycle data unavailable</div>';

    const d = apiData.data;
    let h = '<div class="bm-desc">Pi Cycle Top: When the 111-day MA crosses above the 350-day MA x2, it has historically signaled cycle tops within 3 days.</div>';

    const prices = d.price || [];
    const ma111Arr = d.ma111 || [];
    const ma350x2Arr = d.ma350x2 || [];
    const lastPrice = prices.length > 0 ? prices[prices.length - 1] : null;
    if (!lastPrice) return h;

    const price = lastPrice.price || 0;
    const ma111 = ma111Arr.length > 0 ? (ma111Arr[ma111Arr.length - 1].value || ma111Arr[ma111Arr.length - 1]) : 0;
    const ma350x2 = ma350x2Arr.length > 0 ? (ma350x2Arr[ma350x2Arr.length - 1].value || ma350x2Arr[ma350x2Arr.length - 1]) : 0;
    const gap = ma350x2 > 0 ? ((ma350x2 - ma111) / ma350x2 * 100) : 0;
    const crossed = ma111 >= ma350x2;

    h += '<div class="bm-cards">';
    h += `<div class="bm-card"><div class="bm-label">BTC Price</div><div class="bm-val">${formatCurrency(price)}</div></div>`;
    h += `<div class="bm-card"><div class="bm-label">111d MA</div><div class="bm-val">${formatCurrency(ma111)}</div></div>`;
    h += `<div class="bm-card"><div class="bm-label">350d MA x2</div><div class="bm-val">${formatCurrency(ma350x2)}</div></div>`;
    h += '</div>';

    h += '<div class="bm-cards" style="grid-template-columns:1fr 1fr">';
    h += `<div class="bm-card"><div class="bm-label">Gap to Cross</div><div class="bm-val">${gap.toFixed(1)}%</div></div>`;
    h += `<div class="bm-card"><div class="bm-label">Signal</div><div class="bm-val"><span class="bm-signal ${crossed ? 'bm-signal-bear' : 'bm-signal-bull'}">${crossed ? 'TOP SIGNAL' : 'No Top Signal'}</span></div></div>`;
    h += '</div>';

    const recent = prices.slice(-60);
    if (recent.length > 1) {
      const vals = recent.map(p => p.price || 0).filter(v => v > 0);
      if (vals.length > 1) {
        const max = Math.max(...vals);
        const min = Math.min(...vals);
        const range = max - min || 1;
        h += '<div class="bm-label" style="margin-top:4px">60-Day Price Trend</div>';
        h += '<div class="bm-spark">';
        vals.forEach(v => {
          const pct = ((v - min) / range * 80 + 20).toFixed(0);
          h += `<div class="bm-bar" style="height:${pct}%;background:var(--accent)"></div>`;
        });
        h += '</div>';
      }
    }
    return h;
  }

  _renderRainbow(apiData) {
    if (!apiData?.data?.price) return '<div class="bm-desc">Rainbow data unavailable</div>';

    const d = apiData.data;
    const currentZone = d.currentZone
      ? (Array.isArray(d.currentZone) ? d.currentZone[d.currentZone.length - 1] : d.currentZone)
      : null;
    const zones = d.zones || [];

    let h = '<div class="bm-desc">Rainbow Chart: Logarithmic regression bands showing which market phase BTC is in. Historically, buying in blue/green zones outperforms.</div>';

    const bandColors = {
      'Maximum Bubble': '#ff0000', 'Sell. Seriously.': '#ff4400', 'FOMO Intensifies': '#ff8800',
      'Is This a Bubble?': '#ffbb00', 'HODL!': '#ffff00', 'Still Cheap': '#88ff00',
      'Accumulate': '#00cc00', 'BUY!': '#0088cc', 'Fire Sale': '#0044ff',
    };

    const bandOrder = ['Maximum Bubble', 'Sell. Seriously.', 'FOMO Intensifies', 'Is This a Bubble?', 'HODL!', 'Still Cheap', 'Accumulate', 'BUY!', 'Fire Sale'];
    h += '<div style="display:flex;flex-direction:column;gap:2px;margin-bottom:10px">';
    bandOrder.forEach(name => {
      const color = bandColors[name] || '#888';
      const isCurrent = currentZone && currentZone.name === name;
      h += `<div style="display:flex;align-items:center;gap:6px;padding:3px 6px;border-radius:3px;background:${color}${isCurrent ? '44' : '22'};${isCurrent ? 'border:1px solid ' + color : ''}">`;
      h += `<div style="width:10px;height:10px;border-radius:2px;background:${color}"></div>`;
      h += `<span style="font-size:10px;color:var(--text);${isCurrent ? 'font-weight:700' : ''}">${name}${isCurrent ? ' ← Current' : ''}</span>`;
      h += '</div>';
    });
    h += '</div>';

    const prices = d.price || [];
    const lastPrice = prices.length > 0 ? prices[prices.length - 1] : null;
    if (lastPrice) {
      const price = lastPrice.price || 0;
      const zoneName = currentZone ? currentZone.name : 'Unknown';
      const zoneDesc = currentZone ? currentZone.description : '';
      h += '<div class="bm-cards" style="grid-template-columns:1fr 1fr">';
      h += `<div class="bm-card"><div class="bm-label">BTC Price</div><div class="bm-val">${formatCurrency(price)}</div></div>`;
      h += `<div class="bm-card"><div class="bm-label">Zone</div><div class="bm-val" style="font-size:11px">${escapeHtml(zoneName)}</div><div class="bm-sub">${escapeHtml(zoneDesc)}</div></div>`;
      h += '</div>';
    }
    return h;
  }

  _renderGolden(apiData) {
    if (!apiData?.data?.goldenRatioData) return '<div class="bm-desc">Golden Ratio data unavailable</div>';

    const d = apiData.data;
    let h = '<div class="bm-desc">Golden Ratio Multiplier: Fibonacci multiples of the 350-day MA create key support/resistance levels.</div>';

    const grData = d.goldenRatioData || [];
    const last = grData.length > 0 ? grData[grData.length - 1] : null;
    if (!last) return h;

    const price = last.price || 0;
    const ma350 = last.dma350 || 0;
    const levels = last.levels || {};

    if (ma350 > 0) {
      h += '<div class="bm-cards" style="grid-template-columns:1fr 1fr">';
      h += `<div class="bm-card"><div class="bm-label">BTC Price</div><div class="bm-val">${formatCurrency(price)}</div></div>`;
      h += `<div class="bm-card"><div class="bm-label">350d MA</div><div class="bm-val">${formatCurrency(ma350)}</div></div>`;
      h += '</div>';

      const fibs = [
        { name: '1.6x', key: 'level_1_6' }, { name: '2x', key: 'level_2' },
        { name: '3x', key: 'level_3' }, { name: '5x', key: 'level_5' },
        { name: '8x', key: 'level_8' }, { name: '13x', key: 'level_13' },
        { name: '21x', key: 'level_21' },
      ];
      h += '<table class="data-table"><thead><tr><th>Fib</th><th style="text-align:right">Level</th><th style="text-align:right">Distance</th></tr></thead><tbody>';
      fibs.forEach(f => {
        const level = levels[f.key] || ma350 * parseFloat(f.name);
        const dist = price > 0 ? ((level - price) / price * 100) : 0;
        const cls = dist > 0 ? 'val-up' : 'val-down';
        h += `<tr><td style="font-weight:600">${f.name}</td><td style="text-align:right">${formatCurrency(level)}</td><td style="text-align:right" class="${cls}">${dist > 0 ? '+' : ''}${dist.toFixed(1)}%</td></tr>`;
      });
      h += '</tbody></table>';
    }
    return h;
  }

  afterRender(body) {
    body.querySelectorAll('.bm-tab').forEach(tab => tab.addEventListener('click', () => {
      this._tab = tab.dataset.tab;
      body.innerHTML = this.renderContent(this._data);
      this.afterRender(body);
    }));
  }
}
customElements.define('btc-macro-panel', BtcMacroPanel);
export default BtcMacroPanel;
