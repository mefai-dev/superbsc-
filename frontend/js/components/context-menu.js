// MEFAI Context Menu 路路路 Right-click on tokens/addresses

const menu = () => document.getElementById('context-menu');

let currentContext = null;

export function showContextMenu(e, context) {
  e.preventDefault();
  currentContext = context;
  const m = menu();

  const items = [];
  if (context.address) {
    items.push({ label: 'Audit Token', icon: '路枲', action: 'audit' });
    items.push({ label: 'View Profile', icon: '路梿', action: 'profile' });
    items.push({ label: 'Copy Address', icon: '路', action: 'copy-address' });
    items.push({ type: 'sep' });
    items.push({ label: 'Track Wallet', icon: '路棌', action: 'track' });
  }
  if (context.symbol) {
    items.push({ label: `View ${context.symbol} Chart`, icon: '路柌', action: 'chart' });
    items.push({ label: 'Smart Money Signals', icon: '路棄', action: 'signals' });
  }

  m.innerHTML = items.map(item => {
    if (item.type === 'sep') return '<div class="context-menu-sep"></div>';
    return `<div class="context-menu-item" data-action="${item.action}">
      <span>${item.icon} ${item.label}</span>
    </div>`;
  }).join('');

  m.style.left = `${e.clientX}px`;
  m.style.top = `${e.clientY}px`;
  m.classList.remove('hidden');

  m.querySelectorAll('.context-menu-item').forEach(el => {
    el.addEventListener('click', () => handleAction(el.dataset.action));
  });
}

function handleAction(action) {
  hideContextMenu();
  if (!currentContext) return;
  const store = window.mefaiStore;

  switch (action) {
    case 'audit':
    case 'profile':
      store?.focusToken({
        symbol: currentContext.symbol || '',
        address: currentContext.address || '',
        chain: currentContext.chain || '',
      });
      break;
    case 'copy-address':
      if (currentContext.address) {
        navigator.clipboard.writeText(currentContext.address).catch(() => {});
        showToast('Address copied');
      }
      break;
    case 'track':
      store?.focusWallet({
        address: currentContext.address,
        chain: currentContext.chain || '',
      });
      break;
    case 'chart':
      store?.focusToken({
        symbol: currentContext.symbol,
        address: currentContext.address || '',
        chain: currentContext.chain || '',
      });
      break;
    case 'signals':
      store?.focusToken({
        symbol: currentContext.symbol,
        address: currentContext.address || '',
        chain: currentContext.chain || '',
      });
      break;
  }
}

function showToast(msg) {
  const container = document.getElementById('toast-container');
  if (!container) return;
  const toast = document.createElement('div');
  toast.className = 'toast';
  toast.textContent = msg;
  container.appendChild(toast);
  setTimeout(() => toast.remove(), 3000);
}

export function hideContextMenu() {
  menu()?.classList.add('hidden');
}

// Close on click outside
document.addEventListener('click', () => hideContextMenu());
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') hideContextMenu(); });

export default { showContextMenu, hideContextMenu };
