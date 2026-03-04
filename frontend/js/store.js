// MEFAI Store — Pub/sub state management + preferences persistence

const PREFS_KEY = 'mefai-prefs';

const defaultPrefs = {
  defaultLayout: 'overview',
  fontSize: 'normal',
  compactMode: false,
};

function loadPrefs() {
  try {
    const raw = localStorage.getItem(PREFS_KEY);
    if (raw) return { ...defaultPrefs, ...JSON.parse(raw) };
  } catch (e) { /* ignore */ }
  return { ...defaultPrefs };
}

function savePrefs(prefs) {
  try { localStorage.setItem(PREFS_KEY, JSON.stringify(prefs)); } catch (e) { /* ignore */ }
}

const prefs = loadPrefs();

const state = {
  theme: localStorage.getItem('mefai-theme') || 'dark',
  layout: prefs.defaultLayout || 'overview',
  focusedToken: null,    // { symbol, address, chain, platform }
  focusedWallet: null,   // { address, chain }
  scannerRunning: false,
  scannerResults: [],
  connected: true,
};

const listeners = new Map();

export const store = {
  get(key) {
    return state[key];
  },

  set(key, value) {
    const old = state[key];
    state[key] = value;
    if (old !== value) this._notify(key, value, old);
  },

  subscribe(key, fn) {
    if (!listeners.has(key)) listeners.set(key, new Set());
    listeners.get(key).add(fn);
    return () => listeners.get(key).delete(fn);
  },

  _notify(key, value, old) {
    const subs = listeners.get(key);
    if (subs) subs.forEach(fn => fn(value, old));
  },

  // Cross-panel intelligence: focus a token everywhere
  focusToken(token) {
    this.set('focusedToken', token);
  },

  // Cross-panel: focus a wallet
  focusWallet(wallet) {
    this.set('focusedWallet', wallet);
  },

  // Preferences
  getPrefs() {
    return { ...prefs };
  },

  getPref(key) {
    return prefs[key];
  },

  savePref(key, value) {
    prefs[key] = value;
    savePrefs(prefs);
    this._notify('pref:' + key, value);
  },
};

// Apply theme on load
document.documentElement.setAttribute('data-theme', state.theme);
store.subscribe('theme', (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mefai-theme', theme);
});

// Apply font size on load
if (prefs.fontSize === 'large') {
  document.documentElement.setAttribute('data-size', 'large');
}
store.subscribe('pref:fontSize', (size) => {
  if (size === 'large') document.documentElement.setAttribute('data-size', 'large');
  else document.documentElement.removeAttribute('data-size');
});

// Apply compact mode on load
if (prefs.compactMode) {
  document.documentElement.setAttribute('data-compact', 'true');
}
store.subscribe('pref:compactMode', (on) => {
  if (on) document.documentElement.setAttribute('data-compact', 'true');
  else document.documentElement.removeAttribute('data-compact');
});

window.mefaiStore = store;
export default store;
