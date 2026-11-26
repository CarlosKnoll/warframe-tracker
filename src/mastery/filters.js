// mastery/filters.js - Filter state management and UI wiring for mastery

import { masteryState, MASTERY_FOUNDER_ITEMS, MASTERY_MISC_SECTION, itemInSection } from './state.js';
import { renderMastery } from './renderer.js';
import { t } from '../i18n.js';

// ─── Search ────────────────────────────────────────────────────────────────────

export function initMasteryFilters() {
  const searchInput = document.getElementById('masterySearch');
  const clearBtn    = document.getElementById('clearMasterySearch');

  clearBtn.style.display = 'none';

  // Debounced: each render re-sorts and rebuilds the grid, which is heavy in the "All" tab
  let searchTimer = null;
  searchInput.oninput = e => {
    masteryState.searchText = e.target.value;
    clearBtn.style.display = masteryState.searchText ? 'block' : 'none';
    clearTimeout(searchTimer);
    searchTimer = setTimeout(renderMastery, 150);
  };

  clearBtn.onclick = () => {
    clearTimeout(searchTimer);
    searchInput.value = '';
    masteryState.searchText = '';
    clearBtn.style.display = 'none';
    renderMastery();
  };

  // ── Status filter ──
  document.querySelectorAll('#masteryStatusFilter button').forEach(btn => {
    btn.onclick = () => {
      masteryState.statusFilter = btn.dataset.status;
      document.querySelectorAll('#masteryStatusFilter button').forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMastery();
    };
  });
}

// ─── Progress summary ──────────────────────────────────────────────────────────
// Shows "X / Y mastered  ·  Z,000 / W,000 XP" for the active section.
// Called after every render so the counts stay in sync.

export function updateMasteryProgress() {
  const el = document.getElementById('masteryProgress');
  if (!el) return;

  if (masteryState.activeSection === MASTERY_MISC_SECTION) {
    el.textContent = '';
    return;
  }

  const sectionItems = masteryState.items.filter(item => {
    if (!itemInSection(item, masteryState.activeSection)) return false;
    if (MASTERY_FOUNDER_ITEMS.has(item.name) && masteryState.ignoredMasteryItems.has(item.uniqueName)) return false;
    return true;
  });

  const totalItems    = sectionItems.length;
  const masteredCount = sectionItems.filter(i => !!masteryState.masteryMastered[i.uniqueName]).length;

  if (totalItems === 0) {
    el.textContent = '';
    return;
  }

  el.textContent = `${masteredCount} / ${totalItems} ${t('mastery.ui.progress.mastered')}`;
}