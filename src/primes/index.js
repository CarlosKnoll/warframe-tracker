// primes/index.js - Initializes and ties all primes modules together

import { state } from './state.js';
import { loadPrimes } from './loader.js';
import { renderPrimes } from './renderer.js';
import { initFilters, updateCategoryFilters } from './filters.js';
import { t } from '../i18n.js';

export async function initPrimes(ownedData, ignoredData, saveFn) {
  state.owned = ownedData;
  state.ignoredPrimes = ignoredData;
  state.saveFunction = saveFn;

  document.getElementById("primeList").innerHTML =
    `<div style="text-align: center; padding: 40px; opacity: 0.6;">${t('loading.primes')}</div>`;

  initFilters();

  await loadPrimes();

  document.getElementById("founderToggle").checked = state.showFounderItems;
  document.getElementById("specialToggle").checked = state.showSpecialItems;
  document.getElementById("clearPrimeSearch").style.display = 'none';

  updateCategoryFilters();
  renderPrimes();
}

export { renderPrimes };