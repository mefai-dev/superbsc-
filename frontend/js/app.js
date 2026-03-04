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
  'alpha-radar': 'alpha-radar-panel',
  'signal-pnl': 'signal-pnl-panel',
  'futures-pulse': 'futures-pulse-panel',
  'sm-acceleration': 'sm-acceleration-panel',
  'token-scout': 'token-scout-panel',
  'funding-arb': 'funding-arb-panel',
  'social-divergence': 'social-divergence-panel',
  'whale-intel': 'whale-intel-panel',
  'order-book-intel': 'order-book-intel-panel',
  'token-grad': 'token-grad-panel',
  'liquidation-heatmap': 'liquidation-heatmap-panel',
  'dex-intel': 'dex-intel-panel',
  'goplus-scanner': 'goplus-scanner-panel',
  'multi-chain-wallet': 'multi-chain-wallet-panel',
  'liquidity-lifecycle': 'liquidity-lifecycle-panel',
  'capital-rotation': 'capital-rotation-panel',
  'contract-mutation': 'contract-mutation-panel',
  'yield-radar': 'yield-radar-panel',
  'stablecoin-flow': 'stablecoin-flow-panel',
  'protocol-tvl': 'protocol-tvl-panel',
  'market-pulse': 'market-pulse-panel',
  'launch-scanner': 'launch-scanner-panel',
  'dex-volume': 'dex-volume-panel',
  'protocol-revenue': 'protocol-revenue-panel',
  'chain-growth': 'chain-growth-panel',
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
    panels: ['whale-intel', 'smart-flow', 'smart-signals', 'smart-inflow'],
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
  'alpha': {
    name: 'Alpha',
    grid: 'grid-2x2',
    panels: ['alpha-radar', 'signal-pnl', 'smart-signals', 'trending-tokens'],
  },
  'futures': {
    name: 'Futures',
    grid: 'grid-2x2',
    panels: ['futures-pulse', 'funding-arb', 'market-overview', 'smart-signals'],
  },
  'discovery': {
    name: 'Discovery',
    grid: 'grid-2x3',
    panels: ['token-scout', 'sm-acceleration', 'social-divergence', 'alpha-radar', 'trending-tokens', 'meme-rank'],
  },
  'intel': {
    name: 'Intel',
    grid: 'grid-2x3',
    panels: ['whale-intel', 'order-book-intel', 'token-grad', 'top-traders', 'smart-signals', 'alpha-radar'],
  },
  'defi': {
    name: 'DeFi',
    grid: 'grid-2x2',
    panels: ['dex-intel', 'goplus-scanner', 'token-audit', 'multi-chain-wallet'],
  },
  'risk': {
    name: 'Risk',
    grid: 'grid-2x2',
    panels: ['liquidation-heatmap', 'futures-pulse', 'funding-arb', 'order-book-intel'],
  },
  'security': {
    name: 'Security',
    grid: 'grid-2x2',
    panels: ['contract-mutation', 'liquidity-lifecycle', 'goplus-scanner', 'capital-rotation'],
  },
  'analytics': {
    name: 'Analytics',
    grid: 'grid-2x2',
    panels: ['market-pulse', 'protocol-tvl', 'stablecoin-flow', 'yield-radar'],
  },
  'launch': {
    name: 'Launch',
    grid: 'grid-2x2',
    panels: ['launch-scanner', 'goplus-scanner', 'dex-intel', 'liquidity-lifecycle'],
  },
  'ecosystem': {
    name: 'Ecosystem',
    grid: 'grid-2x2',
    panels: ['chain-growth', 'dex-volume', 'protocol-revenue', 'protocol-tvl'],
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
    'alpha-radar', 'signal-pnl',
    'futures-pulse', 'sm-acceleration', 'token-scout', 'funding-arb', 'social-divergence',
    'whale-intel', 'order-book-intel', 'token-grad',
    'liquidation-heatmap', 'dex-intel', 'goplus-scanner', 'multi-chain-wallet',
    'liquidity-lifecycle', 'capital-rotation', 'contract-mutation',
    'yield-radar', 'stablecoin-flow', 'protocol-tvl', 'market-pulse', 'launch-scanner',
    'dex-volume', 'protocol-revenue', 'chain-growth',
  ];
  await Promise.allSettled(
    panelModules.map(name =>
      import(`./panels/${name}.js?v=1709580000`).catch(e => console.warn(`Panel ${name} not loaded:`, e.message))
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

  // Update nav (desktop + dropdown items + mobile + hamburger)
  document.querySelectorAll('.layout-btn[data-layout]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === layoutKey);
  });
  document.querySelectorAll('.nav-dropdown-item[data-layout]').forEach(item => {
    item.classList.toggle('active', item.dataset.layout === layoutKey);
  });
  // Highlight dropdown trigger if any child layout is active
  document.querySelectorAll('.nav-dropdown').forEach(dd => {
    const items = dd.querySelectorAll('.nav-dropdown-item[data-layout]');
    const hasActive = Array.from(items).some(i => i.dataset.layout === layoutKey);
    dd.querySelector('.nav-dropdown-trigger')?.classList.toggle('active', hasActive);
  });
  document.querySelectorAll('.mobile-nav-btn[data-layout]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === layoutKey);
  });
  document.querySelectorAll('.hamburger-item[data-layout]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.layout === layoutKey);
  });

  // Update status bar
  const sb = document.querySelector('status-bar');
  if (sb?.setLayout) sb.setLayout(layout.name);

  store.set('layout', layoutKey);

  // Persist last layout as default
  store.savePref('defaultLayout', layoutKey);

  // Apply translations to newly created panel titles
  if (window.mefaiI18n?.applyTranslations) {
    requestAnimationFrame(() => window.mefaiI18n.applyTranslations());
  }
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

  // Escape — close overlays + dropdowns
  if (e.key === 'Escape') {
    closeSearch();
    closePalette();
    document.getElementById('help-overlay')?.classList.add('hidden');
    document.getElementById('settings-overlay')?.classList.add('hidden');
    document.getElementById('hamburger-drawer')?.classList.add('hidden');
    document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('open'));
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
  if (num >= 1 && num <= 14) {
    const keys = Object.keys(layouts);
    if (keys[num - 1]) setLayout(keys[num - 1]);
    return;
  }
});

// Layout nav clicks (desktop — direct buttons and dropdown items)
document.querySelectorAll('.layout-btn[data-layout]').forEach(btn => {
  btn.addEventListener('click', () => setLayout(btn.dataset.layout));
});

// Dropdown nav handlers
document.querySelectorAll('.nav-dropdown').forEach(dd => {
  const trigger = dd.querySelector('.nav-dropdown-trigger');
  const menu = dd.querySelector('.nav-dropdown-menu');
  if (!trigger || !menu) return;

  // Hover open/close
  dd.addEventListener('mouseenter', () => {
    document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('open'));
    menu.classList.add('open');
  });
  dd.addEventListener('mouseleave', () => menu.classList.remove('open'));

  // Click on dropdown items → select layout + close
  menu.querySelectorAll('[data-layout]').forEach(item => {
    item.addEventListener('click', (e) => {
      e.stopPropagation();
      setLayout(item.dataset.layout);
      document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('open'));
    });
  });
});

// Click outside closes all dropdowns
document.addEventListener('click', () => {
  document.querySelectorAll('.nav-dropdown-menu').forEach(m => m.classList.remove('open'));
});

// Mobile bottom nav clicks (quick tabs)
document.querySelectorAll('#mobile-nav .mobile-nav-btn[data-layout]').forEach(btn => {
  btn.addEventListener('click', () => setLayout(btn.dataset.layout));
});

// Hamburger menu
const hamburgerDrawer = document.getElementById('hamburger-drawer');
function openHamburger() { hamburgerDrawer?.classList.remove('hidden'); }
function closeHamburger() { hamburgerDrawer?.classList.add('hidden'); }

document.getElementById('hamburger-btn')?.addEventListener('click', (e) => {
  e.stopPropagation();
  openHamburger();
});
document.getElementById('hamburger-close')?.addEventListener('click', closeHamburger);
document.querySelector('.hamburger-backdrop')?.addEventListener('click', closeHamburger);

// Hamburger layout items
document.querySelectorAll('.hamburger-item[data-layout]').forEach(btn => {
  btn.addEventListener('click', () => {
    setLayout(btn.dataset.layout);
    closeHamburger();
  });
});

// (hamburger active state is updated inside setLayout via .mobile-nav-btn selector)

// Header buttons
document.getElementById('theme-toggle')?.addEventListener('click', () => {
  const current = store.get('theme');
  store.set('theme', current === 'dark' ? 'light' : 'dark');
});
document.getElementById('search-trigger')?.addEventListener('click', () => openSearch());
document.getElementById('help-btn')?.addEventListener('click', () => {
  document.getElementById('help-overlay')?.classList.toggle('hidden');
});

// Mobile action buttons (inside hamburger drawer)
document.getElementById('mobile-search')?.addEventListener('click', () => { closeHamburger(); openSearch(); });
document.getElementById('mobile-theme')?.addEventListener('click', () => {
  const current = store.get('theme');
  store.set('theme', current === 'dark' ? 'light' : 'dark');
});
document.getElementById('mobile-settings')?.addEventListener('click', () => {
  closeHamburger();
  document.getElementById('settings-overlay')?.classList.toggle('hidden');
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
