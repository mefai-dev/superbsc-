// MEFAI Token Profile Panel — token.meta() + token.dynamic(), default BNB
import { BasePanel } from '../components/base-panel.js';

const { formatPrice, formatCurrency, formatPercent, formatNumber, formatAddress, escapeHtml, copyToClipboard } = window.mefaiUtils;

// Default BNB token on BSC
const DEFAULT_ADDRESS = '0xbb4CdB9CBd36B01bD1cBaEBF2De08d9173bc095c';
const DEFAULT_CHAIN = '56';

export class TokenProfilePanel extends BasePanel {
  static skill = 'Skill 7.2+7.3';
  static defaultTitle = 'Token Profile';

  constructor() {
    super();
    this._refreshRate = 15000;
    this._address = DEFAULT_ADDRESS;
    this._chain = DEFAULT_CHAIN;
    this._unsub = null;
  }

  connectedCallback() {
    this.classList.add('panel');
    this.render();
    // Listen to focused token changes
    this._unsub = window.mefaiStore?.subscribe('focusedToken', (token) => {
      if (token?.address) {
        this._address = token.address;
        this._chain = token.chain || DEFAULT_CHAIN;
        this.refresh();
      }
    });
    // Check if there's already a focused token
    const current = window.mefaiStore?.get('focusedToken');
    if (current?.address) {
      this._address = current.address;
      this._chain = current.chain || DEFAULT_CHAIN;
    }
  }

  disconnectedCallback() {
    super.disconnectedCallback();
    if (this._unsub) this._unsub();
  }

  async fetchData() {
    const addr = this._address;
    const chain = this._chain;

    // Fetch meta and dynamic data in parallel
    const [metaRes, dynRes] = await Promise.allSettled([
      window.mefaiApi.token.meta(addr, chain),
      window.mefaiApi.token.dynamic(addr, chain),
    ]);

    const metaRaw = metaRes.status === 'fulfilled' ? metaRes.value : {};
    const dynRaw = dynRes.status === 'fulfilled' ? dynRes.value : {};

    // Check for errors
    const metaErr = !metaRaw || metaRaw?.error || metaRaw?.code === '000002';
    const dynErr = !dynRaw || dynRaw?.error || dynRaw?.code === '000002';

    if (metaErr && dynErr) return { _fetchError: true };

    const metaData = metaErr ? {} : (metaRaw?.data || metaRaw || {});
    const dynData = dynErr ? {} : (dynRaw?.data || dynRaw || {});

    return { meta: metaData, dynamic: dynData };
  }

  renderContent(data) {
    if (!data) return '<div class="panel-loading">Loading token profile...</div>';
    if (data?._fetchError) return '<div class="panel-loading">Unable to load token profile. Please try again.</div>';

    const m = data.meta || {};
    const d = data.dynamic || {};

    const name = m.name || d.name || '';
    const symbol = (m.symbol || d.symbol || '').toUpperCase();
    const chain = m.chainId || d.chainId || this._chain;
    const address = m.contractAddress || d.contractAddress || this._address || '';
    const logo = m.icon || m.logo || d.icon || '';
    const description = m.description || '';

    // Price data — dynamic has: price, volume24h, volume24hBuy/Sell
    const price = parseFloat(d.price || m.price || 0);
    const volume24h = parseFloat(d.volume24h || 0);
    const volume24hBuy = parseFloat(d.volume24hBuy || 0);
    const volume24hSell = parseFloat(d.volume24hSell || 0);
    const volume1h = parseFloat(d.volume1h || 0);

    let html = '';

    // Header section
    html += `<div class="profile-section">`;
    html += `<div style="display:flex;align-items:center;gap:8px;margin-bottom:8px">`;
    if (logo) {
      html += `<img src="${((u) => u && u.startsWith("http") ? u : "https://bin.bnbstatic.com" + (u || ""))(logo)}" class="token-icon" style="width:24px;height:24px;border-radius:50%" onerror="this.style.display='none'">`;
    }
    html += `<div>`;
    html += `<span style="font-weight:700;font-size:14px">${escapeHtml(name || symbol || 'Unknown')}</span>`;
    if (symbol) html += ` <span style="color:var(--text-muted)">${escapeHtml(symbol)}</span>`;
    html += `</div>`;
    if (chain) html += `<span class="chain-badge">${escapeHtml(String(chain))}</span>`;
    html += `</div>`;
    if (address && address.length > 10) {
      html += `<div style="font-size:10px;color:var(--text-muted)">`;
      html += `${formatAddress(address)} <button class="copy-btn" data-copy="${escapeHtml(address)}">copy</button>`;
      html += `</div>`;
    }
    if (description) {
      const shortDesc = description.length > 200 ? description.substring(0, 200) + '...' : description;
      html += `<div style="font-size:10px;color:var(--text-secondary);margin-top:6px;line-height:1.4">${escapeHtml(shortDesc)}</div>`;
    }
    html += `</div>`;

    // Price section
    html += `<div class="profile-section">`;
    html += `<h3>Price</h3>`;
    html += `<div style="font-size:20px;font-weight:700;margin-bottom:8px">$${formatPrice(price)}</div>`;
    html += `</div>`;

    // Volume section
    html += `<div class="profile-section">`;
    html += `<h3>Volume</h3>`;
    html += `<div class="profile-grid">`;
    if (volume24h) html += `<span class="profile-label">24h Total</span><span class="profile-value">${formatCurrency(volume24h)}</span>`;
    if (volume24hBuy) html += `<span class="profile-label">24h Buy</span><span class="profile-value val-up">${formatCurrency(volume24hBuy)}</span>`;
    if (volume24hSell) html += `<span class="profile-label">24h Sell</span><span class="profile-value val-down">${formatCurrency(volume24hSell)}</span>`;
    if (volume1h) html += `<span class="profile-label">1h Total</span><span class="profile-value">${formatCurrency(volume1h)}</span>`;
    html += `</div></div>`;

    return html;
  }

  afterRender(body) {
    // Copy button handler
    body.querySelectorAll('.copy-btn').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.stopPropagation();
        copyToClipboard(btn.dataset.copy);
        btn.textContent = 'copied';
        setTimeout(() => { btn.textContent = 'copy'; }, 1500);
      });
    });
  }
}

customElements.define('token-profile-panel', TokenProfilePanel);
export default TokenProfilePanel;
