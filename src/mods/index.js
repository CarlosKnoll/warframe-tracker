// mods/index.js

import { state } from './state.js';
import { loadMods } from './loader.js';
import { renderMods } from './renderer.js';
import { initFilters } from './filters.js';
import { t } from '../i18n.js';

export async function initMods() {
  document.getElementById('modList').innerHTML =
    `<div class="mod-empty" style="opacity:0.6;">${t('loading.mods')}</div>`;

  initFilters();
  await loadMods();

  state.searchText = '';
  state.category   = 'All';
  state.polarity   = 'All';

  const searchEl = document.getElementById('modSearch');
  if (searchEl) searchEl.value = '';
  document.getElementById('clearModSearch').style.display = 'none';

  const firstCat = document.querySelector('#modCategoryFilters button[data-cat="All"]');
  if (firstCat) firstCat.classList.add('active');
  const firstPol = document.querySelector('#modPolarityFilters button[data-polarity="All"]');
  if (firstPol) firstPol.classList.add('active');

  renderMods();
}

export { renderMods };