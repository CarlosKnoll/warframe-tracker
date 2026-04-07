// mods/filters.js

import { state } from './state.js';
import { renderMods } from './renderer.js';

export function initFilters() {
  const search   = document.getElementById('modSearch');
  const clearBtn = document.getElementById('clearModSearch');

  clearBtn.style.display = 'none';

  search.oninput = e => {
    state.searchText = e.target.value.toLowerCase();
    clearBtn.style.display = state.searchText ? 'block' : 'none';
    renderMods();
  };

  clearBtn.onclick = () => {
    search.value       = '';
    state.searchText   = '';
    clearBtn.style.display = 'none';
    renderMods();
  };

  document.querySelectorAll('#modCategoryFilters button').forEach(btn => {
    btn.onclick = () => {
      state.category = btn.dataset.cat;
      document.querySelectorAll('#modCategoryFilters button')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMods();
    };
  });

  // Polarity: data-polarity values are Title-Case, matching normalised WFCD strings
  document.querySelectorAll('#modPolarityFilters button').forEach(btn => {
    btn.onclick = () => {
      state.polarity = btn.dataset.polarity;
      document.querySelectorAll('#modPolarityFilters button')
        .forEach(b => b.classList.remove('active'));
      btn.classList.add('active');
      renderMods();
    };
  });
}