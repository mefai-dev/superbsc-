// MEFAI Command Palette — / prefix commands

const overlay = () => document.getElementById('command-overlay');
const input = () => document.getElementById('command-input');
const results = () => document.getElementById('command-results');

const commands = [
  { name: '/scan', desc: 'Start/stop auto-scanner', action: () => toggleScanner() },
  { name: '/audit', desc: 'Audit token: /audit <address>', action: (args) => auditToken(args) },
  { name: '/track', desc: 'Track wallet: /track <address>', action: (args) => trackWallet(args) },
  { name: '/layout', desc: 'Switch layout: /layout <name>', action: (args) => switchLayout(args) },
  { name: '/theme', desc: 'Toggle dark/light theme', action: () => toggleTheme() },
  { name: '/search', desc: 'Search tokens', action: () => { closePalette(); import('../components/search-bar.js').then(m => m.openSearch()); } },
  { name: '/refresh', desc: 'Refresh all panels', action: () => refreshAll() },
  { name: '/clear', desc: 'Clear focused token', action: () => { window.mefaiStore?.set('focusedToken', null); closePalette(); } },
];

let filtered = [...commands];
let activeIndex = 0;

export function openPalette() {
  overlay().classList.remove('hidden');
  input().value = '/';
  filtered = [...commands];
  activeIndex = 0;
  renderCommands();
  input().focus();
  input().setSelectionRange(1, 1);
}

export function closePalette() {
  overlay().classList.add('hidden');
}

export function isPaletteOpen() {
  return !overlay().classList.contains('hidden');
}

function renderCommands() {
  results().innerHTML = filtered.map((cmd, i) => `
    <div class="command-item ${i === activeIndex ? 'active' : ''}" data-index="${i}">
      <span>${cmd.name}</span>
      <span style="color:var(--text-muted);font-size:11px">${cmd.desc}</span>
    </div>
  `).join('');

  results().querySelectorAll('.command-item').forEach(el => {
    el.addEventListener('click', () => executeCommand(parseInt(el.dataset.index)));
  });
}

function filterCommands(text) {
  const q = text.toLowerCase();
  filtered = commands.filter(c => c.name.includes(q) || c.desc.toLowerCase().includes(q));
  activeIndex = 0;
  renderCommands();
}

function executeCommand(idx) {
  const cmd = filtered[idx];
  if (!cmd) return;
  const val = input().value;
  const parts = val.split(/\s+/);
  const args = parts.slice(1).join(' ');
  cmd.action(args);
  closePalette();
}

function toggleScanner() {
  const running = window.mefaiStore?.get('scannerRunning');
  if (running) {
    window.mefaiApi?.scanner.stop();
    window.mefaiStore?.set('scannerRunning', false);
  } else {
    window.mefaiApi?.scanner.start();
    window.mefaiStore?.set('scannerRunning', true);
  }
}

function auditToken(address) {
  if (!address) return;
  window.mefaiStore?.focusToken({ address: address.trim(), symbol: '', chain: '' });
}

function trackWallet(address) {
  if (!address) return;
  window.mefaiStore?.focusWallet({ address: address.trim(), chain: '' });
}

function switchLayout(name) {
  if (!name) return;
  window.setLayout?.(name.trim());
}

function toggleTheme() {
  const current = window.mefaiStore?.get('theme');
  window.mefaiStore?.set('theme', current === 'dark' ? 'light' : 'dark');
}

function refreshAll() {
  document.querySelectorAll('.panel').forEach(p => {
    if (p.refresh) p.refresh();
  });
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  input()?.addEventListener('input', (e) => filterCommands(e.target.value));
  input()?.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown') { e.preventDefault(); activeIndex = Math.min(activeIndex + 1, filtered.length - 1); renderCommands(); }
    else if (e.key === 'ArrowUp') { e.preventDefault(); activeIndex = Math.max(activeIndex - 1, 0); renderCommands(); }
    else if (e.key === 'Enter') { executeCommand(activeIndex); }
  });
  overlay()?.addEventListener('click', (e) => { if (e.target === overlay()) closePalette(); });
});

export default { openPalette, closePalette, isPaletteOpen };
