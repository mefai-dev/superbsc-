// MEFAI Search Bar — Cmd+K global token search

import { debounce } from '../utils.js';

const overlay = () => document.getElementById('search-overlay');
const input = () => document.getElementById('search-input');
const results = () => document.getElementById('search-results');

let activeIndex = -1;
let items = [];

export function openSearch() {
  overlay().classList.remove('hidden');
  input().value = '';
  results().innerHTML = '';
  input().focus();
  activeIndex = -1;
  items = [];
}

export function closeSearch() {
  overlay().classList.add('hidden');
}

export function isSearchOpen() {
  return !overlay().classList.contains('hidden');
}

const doSearch = debounce(async (query) => {
  if (!query || query.length < 2) {
    results().innerHTML = '';
    items = [];
    return;
  }
  try {
    const data = await window.mefaiApi.token.search(query);
    items = data?.data || data || [];
    renderResults();
  } catch (e) {
    results().innerHTML = `<div class="search-result">Search error: ${e.message}</div>`;
    items = [];
  }
}, 300);

function renderResults() {
  if (!items.length) {
    results().innerHTML = '<div class="search-result" style="color:var(--text-muted)">No results</div>';
    return;
  }
  results().innerHTML = items.slice(0, 10).map((item, i) => `
    <div class="search-result ${i === activeIndex ? 'active' : ''}" data-index="${i}">
      <div>
        <span class="token-name">${item.symbol || item.name || '—'}</span>
        <span class="token-chain">${item.chain || item.network || ''}</span>
      </div>
      <span class="token-price">${item.address ? item.address.slice(0, 10) + '...' : ''}</span>
    </div>
  `).join('');

  results().querySelectorAll('.search-result').forEach(el => {
    el.addEventListener('click', () => selectResult(parseInt(el.dataset.index)));
  });
}

function selectResult(idx) {
  const item = items[idx];
  if (!item) return;
  window.mefaiStore?.focusToken({
    symbol: item.symbol || item.name,
    address: item.address || item.contractAddress,
    chain: item.chain || item.network,
  });
  closeSearch();
}

function handleKeydown(e) {
  if (e.key === 'ArrowDown') {
    e.preventDefault();
    activeIndex = Math.min(activeIndex + 1, items.length - 1);
    renderResults();
  } else if (e.key === 'ArrowUp') {
    e.preventDefault();
    activeIndex = Math.max(activeIndex - 1, 0);
    renderResults();
  } else if (e.key === 'Enter' && activeIndex >= 0) {
    selectResult(activeIndex);
  }
}

// Init
document.addEventListener('DOMContentLoaded', () => {
  input()?.addEventListener('input', (e) => doSearch(e.target.value));
  input()?.addEventListener('keydown', handleKeydown);
  overlay()?.addEventListener('click', (e) => {
    if (e.target === overlay()) closeSearch();
  });
});

export default { openSearch, closeSearch, isSearchOpen };
