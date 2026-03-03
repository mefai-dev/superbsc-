// MEFAI Utils — Formatters and helpers

export function formatCurrency(n, decimals = 2) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (Math.abs(num) >= 1e9) return `$${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `$${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `$${(num / 1e3).toFixed(2)}K`;
  return `$${num.toFixed(decimals)}`;
}

export function formatPrice(n) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (num >= 1) return num.toFixed(2);
  if (num >= 0.01) return num.toFixed(4);
  if (num >= 0.0001) return num.toFixed(6);
  return num.toFixed(8);
}

export function formatPercent(n) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  const arrow = num >= 0 ? '↑' : '↓';
  const cls = num >= 0 ? 'val-up' : 'val-down';
  return `<span class="${cls}">${arrow}${Math.abs(num).toFixed(2)}%</span>`;
}

export function formatNumber(n) {
  if (n === null || n === undefined) return '—';
  const num = Number(n);
  if (isNaN(num)) return '—';
  if (Math.abs(num) >= 1e9) return `${(num / 1e9).toFixed(2)}B`;
  if (Math.abs(num) >= 1e6) return `${(num / 1e6).toFixed(2)}M`;
  if (Math.abs(num) >= 1e3) return `${(num / 1e3).toFixed(1)}K`;
  return num.toLocaleString();
}

export function formatAddress(addr) {
  if (!addr) return '—';
  return `${addr.slice(0, 6)}...${addr.slice(-4)}`;
}

export function formatTime(ts) {
  if (!ts) return '—';
  const d = new Date(typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  return d.toLocaleTimeString('en-US', { hour12: false });
}

export function formatAge(ts) {
  if (!ts) return '—';
  const ms = Date.now() - (typeof ts === 'number' && ts < 1e12 ? ts * 1000 : ts);
  const m = Math.floor(ms / 60000);
  if (m < 60) return `${m}m`;
  const h = Math.floor(m / 60);
  if (h < 24) return `${h}h`;
  return `${Math.floor(h / 24)}d`;
}

export function copyToClipboard(text) {
  navigator.clipboard.writeText(text).catch(() => {
    const ta = document.createElement('textarea');
    ta.value = text;
    document.body.appendChild(ta);
    ta.select();
    document.execCommand('copy');
    document.body.removeChild(ta);
  });
}

export function debounce(fn, ms = 300) {
  let t;
  return (...args) => {
    clearTimeout(t);
    t = setTimeout(() => fn(...args), ms);
  };
}

export function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

export function riskClass(level) {
  if (!level) return 'risk-low';
  const l = String(level).toLowerCase();
  if (l === 'high' || l === 'danger') return 'risk-high';
  if (l === 'medium' || l === 'med') return 'risk-medium';
  return 'risk-low';
}

export function tokenIcon(iconPath) {
  if (!iconPath) return '';
  if (iconPath.startsWith('http')) return iconPath;
  return `https://bin.bnbstatic.com${iconPath}`;
}

window.mefaiUtils = { formatCurrency, formatPrice, formatPercent, formatNumber, formatAddress, formatTime, formatAge, copyToClipboard, debounce, escapeHtml, riskClass, tokenIcon };
export default { formatCurrency, formatPrice, formatPercent, formatNumber, formatAddress, formatTime, formatAge, copyToClipboard, debounce, escapeHtml, riskClass, tokenIcon };
