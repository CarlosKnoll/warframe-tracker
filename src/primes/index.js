// primes/index.js - Initializes and ties all primes modules together

import { state } from './state.js';
import { loadPrimes } from './loader.js';
import { renderPrimes as renderPrimeItems, initPrimeImageCache } from './renderer.js';
import { initFilters, updateCategoryFilters, startResurgenceCountdown } from './filters.js';
import { t } from '../i18n.js';
import { initRelics, renderRelics } from './relics.js';

let activeView = 'primes';
let navigationBound = false;

function applyView() {
  const isRelics = activeView === 'relics';
  document.getElementById('primeMainToolbar')?.toggleAttribute('hidden', isRelics);
  document.getElementById('primeMainList')?.toggleAttribute('hidden', isRelics);
  document.getElementById('relicFinder')?.toggleAttribute('hidden', !isRelics);
  document.querySelectorAll('[data-primes-view]').forEach(button => {
    const labelKey = button.dataset.primesView === 'relics' ? 'tabs.primes.relicFinder.tab' : 'tabs.primes.itemsTab';
    button.textContent = t(labelKey);
    const active = button.dataset.primesView === activeView;
    button.classList.toggle('active', active);
    button.setAttribute('aria-selected', String(active));
  });
}

export async function initPrimes(ownedData, ignoredData, saveFn) {
  state.owned = ownedData;
  state.ignoredPrimes = ignoredData;
  state.saveFunction = saveFn;

  document.getElementById("primeList").innerHTML =
    `<div style="text-align: center; padding: 40px; opacity: 0.6;">${t('loading.primes')}</div>`;

  initFilters();

  // Keep Tauri's existing disk-backed image cache and Rust-backed data loading.
  await initPrimeImageCache();
  await loadPrimes();

  startResurgenceCountdown();

  document.getElementById("founderToggle").checked = state.showFounderItems;
  document.getElementById("specialToggle").checked = state.showSpecialItems;
  document.getElementById("clearPrimeSearch").style.display = 'none';

  updateCategoryFilters();
  initRelics();
  bindRelicFinderNavigation();
  renderCurrentView();
}

export function setPrimesView(view) {
  activeView = view === 'relics' ? 'relics' : 'primes';
  applyView();
  renderCurrentView();
}

export function renderCurrentView() {
  applyView();
  if (activeView === 'relics') renderRelics();
  else renderPrimeItems();
}

// main.js calls renderPrimes() when returning to the Primes section. Route that
// through the active sub-view instead of forcing the Prime-items list visible.
export function renderPrimes() {
  renderCurrentView();
}

function bindRelicFinderNavigation() {
  if (navigationBound) return;
  navigationBound = true;
  document.querySelectorAll('[data-primes-view]').forEach(button => {
    button.onclick = () => setPrimesView(button.dataset.primesView);
  });
}
