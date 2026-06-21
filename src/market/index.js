// market/index.js - Market module entry point

import { state } from './state.js';
import { initMarketFilters, autoSearchMarket } from './filters.js';
import { renderMarketResults } from './renderer.js';
import { cancelMarketSearch } from './loader.js';
import { t } from '../i18n.js';

let initialized = false;
let resultsContainer = null;

export async function initMarket() {
  if (initialized) return;

  resultsContainer = document.getElementById('marketResults');
  if (!resultsContainer) return;

  resultsContainer.innerHTML = `<div class="market-placeholder">${t('market.ui.placeholder')}</div>`;

  initMarketFilters();
  initialized = true;
}

// Called by main.js on tab switch and on language change.
export function renderMarket() {
  if (!resultsContainer) return;

  if (state.currentResults) {
    // Re-render existing results with the (possibly new) language.
    renderMarketResults(resultsContainer, state.currentResults);
  } else {
    // No results yet — show or refresh the placeholder text.
    resultsContainer.innerHTML = `<div class="market-placeholder">${t('market.ui.placeholder')}</div>`;
  }
}

export function cleanupMarket() {
  cancelMarketSearch();
}

export { autoSearchMarket };