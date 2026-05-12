// primes/filters.js - Filter state management and UI wiring

import { state } from './state.js';
import { renderPrimes } from './renderer.js';
import { t } from '../i18n.js';

// ─── Resurgence countdown ──────────────────────────────────────────────────────

let countdownInterval = null;

function formatCountdown(expiryIso) {
  const now = Date.now();
  const end = new Date(expiryIso).getTime();
  const diff = end - now;

  if (diff <= 0) return null;

  const totalSeconds = Math.floor(diff / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const pad = n => String(n).padStart(2, '0');

  if (days > 0) return `${days}d ${pad(hours)}h ${pad(minutes)}m`;
  return `${pad(hours)}h ${pad(minutes)}m ${pad(seconds)}s`;
}

function updateCountdown() {
  const el = document.getElementById('resurgenceCountdown');
  if (!el) return;

  if (!state.resurgenceExpiry) {
    el.textContent = '';
    el.hidden = true;
    return;
  }

  const label = formatCountdown(state.resurgenceExpiry);
  if (!label) {
    el.textContent = '';
    el.hidden = true;
    return;
  }

  el.hidden = false;
  el.textContent = t('resurgence.countdown', { time: label });
}

export function startResurgenceCountdown() {
  updateCountdown();
  if (countdownInterval) clearInterval(countdownInterval);
  countdownInterval = setInterval(updateCountdown, 1000);
}

// ─── Filter init ───────────────────────────────────────────────────────────────

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