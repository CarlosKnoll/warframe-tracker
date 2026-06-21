// market/filters.js - Search input handling for market tab (button-triggered)

import { t } from '../i18n.js';
import { performSearch, cancelMarketSearch, getSlug } from './loader.js';
import { renderMarketResults } from './renderer.js';
import { state, orderCache } from './state.js';

let searchInput = null;
let clearBtn = null;
let searchBtn = null;
let resultsContainer = null;
let maxOrdersSelect = null;
let rankFilterContainer = null;
let lastSearchedSlug = '';

export function initMarketFilters() {
  searchInput      = document.getElementById('marketSearch');
  clearBtn         = document.getElementById('clearMarketSearch');
  searchBtn        = document.getElementById('marketSearchBtn');
  resultsContainer = document.getElementById('marketResults');
  maxOrdersSelect  = document.getElementById('marketMaxOrders');
  rankFilterContainer = document.getElementById('marketRankFilterGroup');

  // Bail only if the search input itself is missing.
  if (!searchInput) return;

  // Guard each optional element before touching it.
  if (clearBtn) clearBtn.style.display = 'none';


  // Max orders selector — bust cache and re-fetch when changed.
  if (maxOrdersSelect) {
    maxOrdersSelect.value = String(state.maxOrders);
    maxOrdersSelect.onchange = () => {
      state.maxOrders = Number(maxOrdersSelect.value);
      if (lastSearchedSlug) {
        orderCache.delete(`${lastSearchedSlug}::all`);
        orderCache.delete(`${lastSearchedSlug}::maxed`);
        runSearch(lastSearchedSlug);
      }
    };
  }

  // Rank filter buttons — purely client-side re-render, no network call.
  if (rankFilterContainer) {
    rankFilterContainer.querySelectorAll('[data-rank-filter]').forEach(btn => {
      btn.onclick = () => {
        if (state.rankFilter === btn.dataset.rankFilter) return; // no change
        state.rankFilter = btn.dataset.rankFilter;
        syncRankFilterUI();
        if (lastSearchedSlug) {
          runSearch(lastSearchedSlug);
        }
      };
    });
    syncRankFilterUI();
  }

  // Search button.
  if (searchBtn) {
    searchBtn.onclick = () => executeSearch();
  }

  // Enter key in the search field.
  searchInput.onkeypress = (e) => {
    if (e.key === 'Enter') executeSearch();
  };

  // Clear button.
  if (clearBtn) {
    clearBtn.onclick = () => {
      searchInput.value = '';
      clearBtn.style.display = 'none';
      cancelMarketSearch();
      resultsContainer.innerHTML = '';
      lastSearchedSlug = '';
      state.currentResults = null;
      state.allOrders = null;
      state.maxRank = 0;
      if (rankFilterContainer) rankFilterContainer.style.display = 'none';
      const countEl = document.getElementById('marketOrderCount');
      if (countEl) countEl.textContent = '';
    };
  }
}

function syncRankFilterUI() {
  if (!rankFilterContainer) return;
  rankFilterContainer.querySelectorAll('[data-rank-filter]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.rankFilter === state.rankFilter);
  });
}

function executeSearch() {
  const query = searchInput.value.trim();

  if (!query || query.length < 2) {
    resultsContainer.innerHTML = `<div class="market-error">${t('market.searchTooShort')}</div>`;
    return;
  }

  if (clearBtn) clearBtn.style.display = 'block';

  // Reset rank filter and maxRank to 'all' on each new search.
  state.rankFilter = 'all';
  state.maxRank = 0;
  syncRankFilterUI();

  const slug = getSlug(query, detectItemType(query));
  lastSearchedSlug = slug;
  runSearch(slug);
}

function runSearch(slug) {
  resultsContainer.innerHTML = `<div class="market-loading">${t('loading.market')}</div>`;

  // If 'maxed' is requested but we don't yet know the max rank, fetch 'all' first
  // to discover it, then immediately re-fetch with the known rank.
  const effectiveFilter = state.rankFilter;
  const needsDiscovery = effectiveFilter === 'maxed' && state.maxRank === 0;

  performSearch(slug, (results, loading, error) => {
    if (loading) {
      resultsContainer.innerHTML = `<div class="market-loading">${t('loading.market')}</div>`;
    } else if (error) {
      resultsContainer.innerHTML = `<div class="market-error">${error}</div>`;
    } else if (results) {
      if (needsDiscovery && state.maxRank > 0) {
        // maxRank was just discovered by renderer — re-run with the actual rank.
        runSearch(slug);
      } else {
        renderMarketResults(resultsContainer, results);
      }
    }
  }, state.maxOrders, needsDiscovery ? 'all' : effectiveFilter);
}

function detectItemType(query) {
  const lower = query.toLowerCase();
  if (lower.includes('arcane')) return 'arcane';
  if (lower.includes('prime') || lower.includes('set')) return 'prime';
  return 'mod';
}

// Called when clicking the market button from another tab.
export function autoSearchMarket(itemName, itemType = 'prime') {
  if (!searchInput) return;

  cancelMarketSearch();

  const slug = getSlug(itemName, itemType);
  searchInput.value = itemName;
  if (clearBtn) clearBtn.style.display = 'block';
  lastSearchedSlug = slug;

  state.rankFilter = 'all';
  state.maxRank = 0;
  syncRankFilterUI();

  runSearch(slug);
}