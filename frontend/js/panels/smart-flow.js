// MEFAI Smart Money Flow — SVG network visualization
import { BasePanel } from '../components/base-panel.js';

const { formatCurrency, escapeHtml } = window.mefaiUtils;

export class SmartFlowPanel extends BasePanel {
  static skill = 'Skill 4+5';
  static defaultTitle = 'Smart Money Flow';

  constructor() {
    super();
    this._refreshRate = 30000;
  }

  async fetchData() {
    const [sigRes, infRes] = await Promise.allSettled([
      window.mefaiApi.signals.smartMoney(),
      window.mefaiApi.rank.smartInflow(),
    ]);
    const signals = (sigRes.status === 'fulfilled' && sigRes.value?.code === '000000')
      ? (sigRes.value.data || []).slice(0, 12) : [];
    const inflows = (infRes.status === 'fulfilled' && infRes.value?.code === '000000')
      ? (infRes.value.data || []).slice(0, 8) : [];
    return { signals, inflows };
  }

  renderContent(data) {
    if (!data?.signals?.length && !data?.inflows?.length) {
      return '<div class="panel-loading">Loading smart money flow...</div>';
    }

    const W = 500, H = 320;
    const signals = data.signals || [];
    const inflows = data.inflows || [];

    // Layout: Left = Smart Money wallets, Center = flow lines, Right = tokens
    const walletCount = Math.min(signals.length, 8);
    const tokenSet = new Map();

    // Collect unique tokens from signals
    for (const s of signals) {
      const addr = s.contractAddress || '';
      if (addr && !tokenSet.has(addr)) {
        tokenSet.set(addr, {
          symbol: s.ticker || '?',
          direction: s.direction || s.signalDirection || 'buy',
          logo: s.logoUrl || '',
        });
      }
    }
    // Add inflow tokens
    for (const inf of inflows) {
      const addr = inf.ca || inf.contractAddress || '';
      if (addr && !tokenSet.has(addr)) {
        tokenSet.set(addr, {
          symbol: inf.tokenName || '?',
          direction: 'inflow',
          logo: inf.tokenIconUrl || '',
        });
      }
    }

    const tokens = Array.from(tokenSet.values()).slice(0, 10);
    const leftX = 30, rightX = W - 80, midX = W / 2;

    let svg = `<svg viewBox="0 0 ${W} ${H}" style="width:100%;height:100%;min-height:250px">`;

    // Title
    svg += `<text x="${midX}" y="18" text-anchor="middle" fill="var(--text-muted)" font-size="10" font-family="var(--font-mono)">SMART MONEY FLOW</text>`;

    // Draw wallets on left
    const walletSpacing = (H - 60) / Math.max(walletCount, 1);
    for (let i = 0; i < walletCount; i++) {
      const y = 40 + i * walletSpacing;
      const s = signals[i];
      const isBuy = (s.direction || s.signalDirection || '').toLowerCase() === 'buy';
      const color = isBuy ? 'var(--up)' : 'var(--down)';
      svg += `<circle cx="${leftX}" cy="${y}" r="6" fill="none" stroke="${color}" stroke-width="1.5"/>`;
      svg += `<text x="${leftX + 12}" y="${y + 3}" fill="var(--text-secondary)" font-size="8" font-family="var(--font-mono)">SM ${i + 1}</text>`;
    }

    // Draw tokens on right
    const tokenSpacing = (H - 60) / Math.max(tokens.length, 1);
    tokens.forEach((tk, i) => {
      const y = 40 + i * tokenSpacing;
      const color = tk.direction === 'buy' || tk.direction === 'inflow' ? 'var(--up)' : 'var(--down)';
      svg += `<rect x="${rightX - 4}" y="${y - 8}" width="80" height="16" rx="2" fill="var(--bg-hover)" stroke="${color}" stroke-width="1"/>`;
      svg += `<text x="${rightX + 2}" y="${y + 3}" fill="var(--text)" font-size="9" font-weight="600" font-family="var(--font-mono)">${escapeHtml(tk.symbol.slice(0, 10))}</text>`;
    });

    // Draw flow lines (wallet → token)
    for (let i = 0; i < walletCount; i++) {
      const wy = 40 + i * walletSpacing;
      const s = signals[i];
      const addr = s.contractAddress || '';
      const tIdx = tokens.findIndex(t => t.symbol === s.ticker);
      if (tIdx < 0) continue;
      const ty = 40 + tIdx * tokenSpacing;
      const isBuy = (s.direction || s.signalDirection || '').toLowerCase() === 'buy';
      const color = isBuy ? 'var(--up)' : 'var(--down)';
      const opacity = isBuy ? '0.6' : '0.3';

      // Bezier curve
      const cx1 = leftX + 80, cx2 = rightX - 80;
      svg += `<path d="M${leftX + 8},${wy} C${cx1},${wy} ${cx2},${ty} ${rightX - 6},${ty}" fill="none" stroke="${color}" stroke-width="1.5" opacity="${opacity}"/>`;

      // Arrow at end
      svg += `<polygon points="${rightX - 6},${ty} ${rightX - 12},${ty - 3} ${rightX - 12},${ty + 3}" fill="${color}" opacity="${opacity}"/>`;
    }

    // Legend
    svg += `<circle cx="${midX - 50}" cy="${H - 12}" r="4" fill="var(--up)"/>`;
    svg += `<text x="${midX - 42}" y="${H - 9}" fill="var(--text-muted)" font-size="8" font-family="var(--font-mono)">Buy</text>`;
    svg += `<circle cx="${midX + 10}" cy="${H - 12}" r="4" fill="var(--down)"/>`;
    svg += `<text x="${midX + 18}" y="${H - 9}" fill="var(--text-muted)" font-size="8" font-family="var(--font-mono)">Sell</text>`;

    svg += '</svg>';
    return svg;
  }
}

customElements.define('smart-flow-panel', SmartFlowPanel);
