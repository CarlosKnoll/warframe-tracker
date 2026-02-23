import { initI18n, setLanguage } from './i18n.js';

// main.js - Main orchestrator with lazy loading
const invoke = window.__TAURI_INTERNALS__.invoke;

let activeMode = "arcanes";
let owned = {};
let ignoredPrimes = new Set();

let arcanesModule = null;
let primesModule = null;
let arcanesInitialized = false;
let primesInitialized = false;

// ─── Language switcher ─────────────────────────────────────────────────────────

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.onclick = async () => {
    await setLanguage(btn.dataset.lang);
  };
  btn.onkeydown = async (e) => {
    if (e.key === 'Enter' || e.key === ' ') await setLanguage(btn.dataset.lang);
  };
});

// Re-render active module when language changes
window.addEventListener('langchange', async () => {
  if (activeMode === 'arcanes' && arcanesInitialized) {
    arcanesModule.renderArcanes();
  } else if (activeMode === 'primes' && primesInitialized) {
    primesModule.renderPrimes();
  }
});

// ─── Mode selector ─────────────────────────────────────────────────────────────

document.querySelectorAll("#modeSelector button[data-mode]").forEach(btn => {
  btn.onclick = async () => {
    activeMode = btn.dataset.mode;
    document.querySelectorAll("#modeSelector button[data-mode]").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    document.querySelectorAll(".tracker-section").forEach(section => section.classList.remove("active"));
    
    if (activeMode === "arcanes") {
      document.getElementById("arcanesSection").classList.add("active");
      if (!arcanesInitialized) {
        arcanesModule = await import('./arcanes.js');
        await arcanesModule.initArcanes(owned, save);
        arcanesInitialized = true;
      } else {
        arcanesModule.renderArcanes();
      }
    } else {
      document.getElementById("primesSection").classList.add("active");
      if (!primesInitialized) {
        primesModule = await import('./primes/index.js');
        await primesModule.initPrimes(owned, ignoredPrimes, save);
        primesInitialized = true;
      } else {
        primesModule.renderPrimes();
      }
    }
  };
});

// ─── Save ──────────────────────────────────────────────────────────────────────

async function save() {
  try {
    const result = await invoke("save_owned", { 
      data: { 
        owned,
        ignoredPrimes: Array.from(ignoredPrimes)
      } 
    });
    return result;
  } catch (err) {
    console.error("Save error:", err);
    throw err;
  }
}

// ─── Init ──────────────────────────────────────────────────────────────────────

async function init() {
  try {
    // i18n must initialize before anything renders
    await initI18n();
    const version = await window.__TAURI__.app.getVersion();
    document.getElementById('app-version').textContent = `v${version}`;

    const stored = await invoke("load_owned");
    owned = stored.owned || {};
    ignoredPrimes = new Set(stored.ignoredPrimes || []);
    
    arcanesModule = await import('./arcanes.js');
    await arcanesModule.initArcanes(owned, save);
    arcanesInitialized = true;
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

export { owned, ignoredPrimes, save };

init();