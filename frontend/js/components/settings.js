// MEFAI Settings — Overlay component for user preferences

import store from '../store.js';

const overlay = document.getElementById('settings-overlay');
const closeBtn = document.getElementById('settings-close');

function openSettings() {
  overlay?.classList.remove('hidden');
  syncUI();
}

function closeSettings() {
  overlay?.classList.add('hidden');
}

function syncUI() {
  // Theme
  setActive('theme', store.get('theme') || 'dark');

  // Font size
  setActive('fontSize', store.getPref('fontSize') || 'normal');

  // Default layout
  setActive('defaultLayout', store.getPref('defaultLayout') || 'overview');

  // Compact mode
  const compact = store.getPref('compactMode');
  const toggle = document.getElementById('compact-toggle');
  if (toggle) toggle.classList.toggle('on', !!compact);
}

function setActive(setting, value) {
  const group = overlay?.querySelector(`[data-setting="${setting}"]`);
  if (!group) return;
  group.querySelectorAll('.settings-option').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.value === String(value));
  });
}

// Handle option clicks
overlay?.addEventListener('click', (e) => {
  const option = e.target.closest('.settings-option');
  if (option) {
    const group = option.closest('[data-setting]');
    const setting = group?.dataset.setting;
    const value = option.dataset.value;
    if (!setting || !value) return;

    if (setting === 'theme') {
      store.set('theme', value);
      // Also persist theme preference
      store.savePref('theme', value);
    } else if (setting === 'fontSize') {
      store.savePref('fontSize', value);
      // Apply immediately
      if (value === 'large') {
        document.documentElement.setAttribute('data-size', 'large');
      } else {
        document.documentElement.removeAttribute('data-size');
      }
    } else if (setting === 'defaultLayout') {
      store.savePref('defaultLayout', value);
      // Apply layout immediately
      if (window.setLayout) window.setLayout(value);
    } else {
      store.savePref(setting, value);
    }

    syncUI();
    return;
  }

  // Compact toggle
  const toggle = e.target.closest('.toggle-switch');
  if (toggle && toggle.id === 'compact-toggle') {
    const current = !!store.getPref('compactMode');
    const next = !current;
    store.savePref('compactMode', next);
    // Apply immediately
    if (next) {
      document.documentElement.setAttribute('data-compact', 'true');
    } else {
      document.documentElement.removeAttribute('data-compact');
    }
    syncUI();
    return;
  }
});

// Close button
closeBtn?.addEventListener('click', closeSettings);

// Click outside to close
overlay?.addEventListener('click', (e) => {
  if (e.target === overlay) closeSettings();
});

// Settings button in header
document.getElementById('settings-btn')?.addEventListener('click', openSettings);

// Escape closes settings
document.addEventListener('keydown', (e) => {
  if (e.key === 'Escape' && !overlay?.classList.contains('hidden')) {
    closeSettings();
  }
});

export { openSettings, closeSettings };
