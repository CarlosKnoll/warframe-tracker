// mastery/filters.js - Filter state management and UI wiring for mastery

import { masteryState } from './state.js';
import { renderMastery } from './renderer.js';
import { t } from '../i18n.js';

// ─── Search ────────────────────────────────────────────────────────────────────

export function initMasteryFilters() {
  const searchInput = document.getElementById('masterySearch');
  const clearBtn    = document.getElementById('clearMasterySearch');

  clearBtn.style.display = 'none';

  searchInput.oninput = e => {
    masteryState.searchText = e.target.value;
    clearBtn.style.display = masteryState.searchText ? 'block' : 'none';
    renderMastery();
  };

  clearBtn.onclick = () => {
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

  if (masteryState.activeSection === 'mastery-misc') {
    el.textContent = '';
    return;
  }

  const SECTION_MAP = {
    'mastery-warframes':   'Warframe',
    'mastery-primaries':   'Primary',
    'mastery-secondaries': ['Secondary', 'Kitgun'],
    'mastery-melees':      ['Melee', 'Zaw'],
    'mastery-robotic':     ['Robotic', 'SentinelWeapon'],
    'mastery-companions':  'Companion',
    'mastery-vehicles':    ['Vehicle', 'Archwing'],
    'mastery-archgun':     'Arch-Gun',
    'mastery-archmelee':   'Arch-Melee',
    'mastery-amps':        'Amp',
  };

  const sectionValue = SECTION_MAP[masteryState.activeSection] ?? masteryState.activeSection;

  const sectionItems = masteryState.items.filter(item =>
    Array.isArray(sectionValue)
      ? sectionValue.includes(item.section)
      : item.section === sectionValue
  );

  const totalItems    = sectionItems.length;
  const masteredCount = sectionItems.filter(i => !!masteryState.masteryMastered[i.uniqueName]).length;

  if (totalItems === 0) {
    el.textContent = '';
    return;
  }

  el.textContent = `${masteredCount} / ${totalItems} ${t('mastery.progress.mastered')}`;
}