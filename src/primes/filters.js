// primes/filters.js - Filter state management and UI wiring

import { state } from './state.js';
import { renderPrimes } from './renderer.js';

export function initFilters() {
  const searchInput = document.getElementById("primeSearch");
  const clearBtn = document.getElementById("clearPrimeSearch");

  clearBtn.style.display = 'none';

  searchInput.oninput = e => {
    state.searchText = e.target.value.toLowerCase();
    clearBtn.style.display = state.searchText ? 'block' : 'none';
    renderPrimes();
  };

  clearBtn.onclick = () => {
    searchInput.value = '';
    state.searchText = '';
    clearBtn.style.display = 'none';
    renderPrimes();
  };

  document.querySelectorAll("#primeFilters button").forEach(btn => {
    btn.onclick = () => {
      state.category = btn.dataset.cat;
      document.querySelectorAll("#primeFilters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPrimes();
    };
  });

  document.querySelectorAll("#primeVaultFilter button").forEach(btn => {
    btn.onclick = () => {
      state.vaultStatus = btn.dataset.vault;
      document.querySelectorAll("#primeVaultFilter button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPrimes();
    };
  });

  document.getElementById("founderToggle").onclick = e => {
    state.showFounderItems = e.target.checked;
    renderPrimes();
  };

  document.getElementById("specialToggle").onclick = e => {
    state.showSpecialItems = e.target.checked;
    renderPrimes();
  };
}

export function updateCategoryFilters() {
  const categoryCounts = {};
  state.allPrimes.forEach(prime => {
    categoryCounts[prime.category] = (categoryCounts[prime.category] || 0) + 1;
  });

  document.querySelectorAll("#primeFilters button").forEach(btn => {
    const category = btn.dataset.cat;
    if (category === "All") {
      btn.style.display = "inline-block";
    } else {
      const count = categoryCounts[category] || 0;
      btn.style.display = count > 0 ? "inline-block" : "none";
    }
  });
}