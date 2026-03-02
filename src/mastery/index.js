// mastery/index.js - Initializes and ties all mastery modules together

import { masteryState } from './state.js';
import { loadMasteryItems } from './loader.js';
import { initMasteryImageCache, renderMastery, resetMasteryImageObserver } from './renderer.js';
import { initMasteryFilters, updateMasteryProgress } from './filters.js';
import { t } from '../i18n.js';

// ─── Init ──────────────────────────────────────────────────────────────────────

export async function initMastery(ownedData, masteryMasteredData, saveFn, initialSection = 'mastery-warframes') {
  masteryState.owned           = ownedData;
  masteryState.masteryMastered = masteryMasteredData;
  masteryState.saveFunction    = saveFn;
  masteryState.activeSection = initialSection;

  // Show loading state immediately
  const list = document.getElementById('masteryList');
  if (list) {
    list.innerHTML = `<div class="mastery-loading">${t('loading.mastery')}</div>`;
  }

  // Load image cache and item data in parallel — image cache is fast (disk read),
  // item data may trigger a network fetch on first launch
  await Promise.all([
    initMasteryImageCache(),
    loadMasteryItems(),
  ]);

  initMasteryFilters();
  renderMastery();
  updateMasteryProgress();
}

// ─── Section switching ─────────────────────────────────────────────────────────
// Called by main.js when the user clicks a mastery sub-section in the sidebar.

export function setMasterySection(section) {
  masteryState.activeSection = section;
  // Reset search when switching sections
  masteryState.searchText = '';
  const searchInput = document.getElementById('masterySearch');
  if (searchInput) searchInput.value = '';
  const clearBtn = document.getElementById('clearMasterySearch');
  if (clearBtn) clearBtn.style.display = 'none';

  renderMastery();
  updateMasteryProgress();
}

// ─── Force refresh ─────────────────────────────────────────────────────────────
// Triggered by the refresh button in the sidebar — bypasses disk cache.

export async function refreshMasteryData() {
  const list = document.getElementById('masteryList');
  if (list) {
    list.innerHTML = `<div class="mastery-loading">${t('loading.mastery')}</div>`;
  }

  resetMasteryImageObserver();
  await loadMasteryItems({ forceRefresh: true });

  renderMastery();
  updateMasteryProgress();
}

export { renderMastery };
export { masteryState } from './state.js';