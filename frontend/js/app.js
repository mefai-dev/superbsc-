// MEFAI App — Panel registry, layout engine, keyboard shortcuts

import store from './store.js';
import { openSearch, closeSearch, isSearchOpen } from './components/search-bar.js';
import { openPalette, closePalette, isPaletteOpen } from './components/command-palette.js';

// Panel registry — maps panel names to their tag names
const panelRegistry = {
  'market-overview': 'market-overview-panel',
  'order-book': 'order-book-panel',
  'price-chart': 'price-chart-panel',
  'spot-trading': 'spot-trading-panel',
  'meme-rush': 'meme-rush-panel',
  'topic-rush': 'topic-rush-panel',
  'wallet-tracker': 'wallet-tracker-panel',
  'smart-signals': 'smart-signals-panel',
  'social-hype': 'social-hype-panel',
  'trending-tokens': 'trending-tokens-panel',
  'smart-inflow': 'smart-inflow-panel',
  'meme-rank': 'meme-rank-panel',
  'top-traders': 'top-traders-panel',
  'token-audit': 'token-audit-panel',
  'token-search': 'token-search-panel',
  'token-profile': 'token-profile-panel',
  'dex-chart': 'dex-chart-panel',
  'auto-scanner': 'auto-scanner-panel',
  'smart-flow': 'smart-flow-panel',
  'all-skills': 'all-skills-panel',
};

// Layout presets
const layouts = {
  'mefai': {
    name: 'MEFAI',
    grid: 'grid-2x3',
    panels: ['all-skills', 'auto-scanner', 'market-overview', 'smart-signals', 'trending-tokens', 'meme-rank'],
  },
  'overview': {
    name: 'Overview',
    grid: 'grid-2x2',
    panels: ['market-overview', 'trending-tokens', 'smart-signals', 'token-profile'],
  },
  'meme-hunter': {
    name: 'Meme Hunter',
    grid: 'grid-2x2',
    panels: ['meme-rush', 'topic-rush', 'meme-rank', 'auto-scanner'],
  },
  'whale-watcher': {
    name: 'Whale Watcher',
    grid: 'grid-2x2',
    panels: ['top-traders', 'smart-flow', 'smart-signals', 'smart-inflow'],
  },
  'deep-dive': {
    name: 'Deep Dive',
    grid: 'grid-2x3',
    panels: ['token-profile', 'dex-chart', 'token-audit', 'social-hype', 'smart-signals', 'wallet-tracker'],
  },
  'trader': {
    name: 'Trader',
    grid: 'grid-2x2',
    panels: ['market-overview', 'order-book', 'price-chart', 'spot-trading'],
  },
  'scanner': {
    name: 'Scanner',
    grid: 'grid-2x2',
    panels: ['auto-scanner', 'token-audit', 'token-profile', 'smart-signals'],
  },
};

const grid = document.getElementById('grid');

// Load all panel modules dynamically — returns when all loaded
async function loadPanels() {
  const panelModules = [
    'market-overview', 'order-book', 'price-chart', 'spot-trading',
    'meme-rush', 'topic-rush', 'wallet-tracker', 'smart-signals',
    'social-hype', 'trending-tokens', 'smart-inflow', 'meme-rank',
    'top-traders', 'token-audit', 'token-search', 'token-profile',
    'dex-chart', 'auto-scanner', 'smart-flow', 'all-skills',
  ];
  await Promise.allSettled(
    panelModules.map(name =>
      import(`./panels/${name}.js?v=1709520000`).catch(e => console.warn(`Panel ${name} not loaded:`, e.message))
    )
  );
}

function setLayout(layoutKey) {
  const layout = layouts[layoutKey];
  if (!layout) return;

  // Clear grid
  grid.innerHTML = '';
  grid.className = `grid ${layout.grid}`;

  // Create panels
  layout.panels.forEach(panelName => {
    const tagName = panelRegistry[panelName];
    if (tagName && customElements.get(tagName)) {
      const el = document.createElement(tagName);
      grid.appendChild(el);
    } else {
      // Placeholder for unregistered panels
      const div = document.createElement('div');
      div.className = 'panel';
      div.innerHTML = `
        <div class="panel-header">
          <span class="panel-title">${panelName}</span>
        </div>
        <div class="panel-body">
          <div class="panel-loading">Panel not loaded</div>
        </div>
      `;
      grid.appendChild(div);
    }
  });

  // Update nav (desktop + mobile)
  document.querySelectorAll('.layout-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === layoutKey);
  });
  document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === layoutKey);
  });

  // Update status bar
  const sb = document.querySelector('status-bar');
  if (sb?.setLayout) sb.setLayout(layout.name);

  store.set('layout', layoutKey);

  // Persist last layout as default
  store.savePref('defaultLayout', layoutKey);
}

// Keyboard shortcuts
document.addEventListener('keydown', (e) => {
  // Ignore if typing in an input
  if (e.target.tagName === 'INPUT' || e.target.tagName === 'TEXTAREA') {
    if (e.key === 'Escape') {
      closeSearch();
      closePalette();
      document.getElementById('help-overlay')?.classList.add('hidden');
      document.getElementById('settings-overlay')?.classList.add('hidden');
    }
    return;
  }

  // Cmd+K / Ctrl+K — Search
  if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
    e.preventDefault();
    if (isSearchOpen()) closeSearch();
    else openSearch();
    return;
  }

  // Escape — close overlays
  if (e.key === 'Escape') {
    closeSearch();
    closePalette();
    document.getElementById('help-overlay')?.classList.add('hidden');
    document.getElementById('settings-overlay')?.classList.add('hidden');
    return;
  }

  // / — command palette
  if (e.key === '/') {
    e.preventDefault();
    if (isPaletteOpen()) closePalette();
    else openPalette();
    return;
  }

  // ? — help
  if (e.key === '?') {
    const help = document.getElementById('help-overlay');
    help?.classList.toggle('hidden');
    return;
  }

  // d — toggle theme
  if (e.key === 'd') {
    const current = store.get('theme');
    store.set('theme', current === 'dark' ? 'light' : 'dark');
    return;
  }

  // r — refresh all panels
  if (e.key === 'r') {
    document.querySelectorAll('.panel').forEach(p => { if (p.refresh) p.refresh(); });
    return;
  }

  // 1-7 — switch layout
  const num = parseInt(e.key);
  if (num >= 1 && num <= 7) {
    const keys = Object.keys(layouts);
    if (keys[num - 1]) setLayout(keys[num - 1]);
    return;
  }
});

// Layout nav clicks (desktop)
document.querySelectorAll('.layout-btn').forEach(btn => {
  btn.addEventListener('click', () => setLayout(btn.dataset.layout));
});

// Mobile bottom nav clicks
document.querySelectorAll('.mobile-nav-btn').forEach(btn => {
  btn.addEventListener('click', () => setLayout(btn.dataset.layout));
});

// Header buttons
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = store.get('theme');
  store.set('theme', current === 'dark' ? 'light' : 'dark');
});
document.getElementById('search-trigger')?.addEventListener('click', () => openSearch());
document.getElementById('help-btn')?.addEventListener('click', () => {
  document.getElementById('help-overlay')?.classList.toggle('hidden');
});

// Init
async function init() {
  await loadPanels();

  // Restore saved layout from preferences
  const savedLayout = store.getPref('defaultLayout');
  setLayout(savedLayout && layouts[savedLayout] ? savedLayout : 'mefai');
}

document.addEventListener('DOMContentLoaded', init);

window.setLayout = setLayout;
export { setLayout, layouts, panelRegistry };
