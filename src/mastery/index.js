// mastery/index.js - Initializes and ties all mastery modules together

import { masteryState, DEFAULT_MASTERY_SECTION, MASTERY_SUBSECTIONS } from './state.js';
import { loadMasteryItems } from './loader.js';
import { initMasteryImageCache, renderMastery, resetMasteryImageObserver } from './renderer.js';
import { initMasteryFilters, updateMasteryProgress } from './filters.js';
import { t } from '../i18n.js';

document.addEventListener('mastery-progress-update', updateMasteryProgress);

// ─── Init ──────────────────────────────────────────────────────────────────────

export async function initMastery(ownedData, masteryMasteredData, ignoredData, saveFn) {
  masteryState.owned              = ownedData;
  masteryState.masteryMastered    = masteryMasteredData;
  masteryState.ignoredMasteryItems = ignoredData;
  masteryState.saveFunction       = saveFn;
  masteryState.activeSection = DEFAULT_MASTERY_SECTION;

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

  buildMasterySubnav();
  initMasteryFilters();
  renderMastery();
  updateMasteryProgress();
}

// ─── Category tab bar ──────────────────────────────────────────────────────────
// Created once; labels and the active tab are synced by renderMastery().

function buildMasterySubnav() {
  const nav = document.getElementById('masterySubnav');
  if (!nav) return;
  nav.innerHTML = '';
  MASTERY_SUBSECTIONS.forEach(({ id }) => {
    const btn = document.createElement('button');
    btn.type = 'button';
    btn.className = 'mastery-subnav-btn';
    btn.dataset.masterySection = id;
    btn.setAttribute('role', 'tab');
    btn.onclick = () => { if (masteryState.activeSection !== id) setMasterySection(id); };
    nav.appendChild(btn);
  });
}

// ─── Section switching ─────────────────────────────────────────────────────────
// Called by the tab bar above when the user picks a category.

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
export { updateMasteryProgress };
export { masteryState } from './state.js';