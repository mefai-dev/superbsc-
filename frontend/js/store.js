// MEFAI Store — Pub/sub state management (~50 lines)

const state = {
  theme: localStorage.getItem('mefai-theme') || 'dark',
  layout: 'overview',
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
};

// Apply theme on load
document.documentElement.setAttribute('data-theme', state.theme);
store.subscribe('theme', (theme) => {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('mefai-theme', theme);
});

window.mefaiStore = store;
export default store;
