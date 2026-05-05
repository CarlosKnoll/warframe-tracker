import { initI18n, setLanguage } from './i18n.js';

const invoke = window.__TAURI_INTERNALS__.invoke;

let activeMode = "tasks";
let owned = {};
let ignoredPrimes = new Set();
let ignoredMasteryItems = new Set();
let masteryMastered = {};

let arcanesModule = null;
let primesModule = null;
let masteryModule = null;
let modsModule = null;
let modsInitialized = false;
let arcanesInitialized = false;
let primesInitialized = false;
let masteryInitialized = false;

let tasksModule = null;
let tasksInitialized = false;

// ─── Mastery nav group toggle ──────────────────────────────────────────────────

const masteryToggle = document.getElementById('masteryToggle');
const masteryNavItems = document.getElementById('masteryItems');

if (masteryToggle && masteryNavItems) {
  masteryToggle.onclick = () => {
    const expanded = masteryToggle.getAttribute('aria-expanded') === 'true';
    masteryToggle.setAttribute('aria-expanded', String(!expanded));
    masteryNavItems.classList.toggle('open', !expanded);
  };
}

// ─── Active state helpers ──────────────────────────────────────────────────────

function setActiveNavButton(section) {
  document.querySelectorAll('.nav-btn, .nav-sub-btn').forEach(b => b.classList.remove('active'));
  masteryToggle?.classList.remove('has-active');

  if (section.startsWith('mastery-')) {
    const subBtn = document.querySelector(`.nav-sub-btn[data-section="${section}"]`);
    subBtn?.classList.add('active');
    masteryToggle?.classList.add('has-active');
  } else {
    const btn = document.querySelector(`.nav-btn[data-section="${section}"]`);
    btn?.classList.add('active');
  }
}

// ─── Language switcher ─────────────────────────────────────────────────────────

document.querySelectorAll('.lang-btn').forEach(btn => {
  btn.onclick = async () => { await setLanguage(btn.dataset.lang); };
  btn.onkeydown = async (e) => {
    if (e.key === 'Enter' || e.key === ' ') await setLanguage(btn.dataset.lang);
  };
});

window.addEventListener('langchange', async () => {
  if (activeMode === 'arcanes' && arcanesInitialized) {
    arcanesModule.renderArcanes();
  } else if (activeMode === 'primes' && primesInitialized) {
    primesModule.renderPrimes();
  } else if (activeMode.startsWith('mastery-') && masteryInitialized) {
    masteryModule.renderMastery();
  } else if (activeMode === 'mods' && modsInitialized) {
    modsModule.renderMods();
  } else if (activeMode === 'tasks' && tasksInitialized) {
    tasksModule.renderTasks();
  }
});

// ─── Sidebar navigation ────────────────────────────────────────────────────────

document.querySelectorAll("#sidebar button[data-section]").forEach(btn => {
  btn.onclick = async () => {
    const section = btn.dataset.section;
    activeMode = section;

    setActiveNavButton(section);
    document.querySelectorAll(".tracker-section").forEach(s => s.classList.remove("active"));

    if (section === "arcanes") {
      document.getElementById("arcanesSection").classList.add("active");
      if (!arcanesInitialized) {
        arcanesModule = await import('./arcanes.js');
        await arcanesModule.initArcanes(owned, save);
        arcanesInitialized = true;
      } else {
        arcanesModule.renderArcanes();
      }

    } else if (section === "primes") {
      document.getElementById("primesSection").classList.add("active");
      if (!primesInitialized) {
        primesModule = await import('./primes/index.js');
        await primesModule.initPrimes(owned, ignoredPrimes, save);
        primesInitialized = true;
      } else {
        primesModule.renderPrimes();
      }

    } else if (section.startsWith("mastery-")) {
      document.getElementById("masterySection").classList.add("active");
      if (!masteryInitialized) {
        masteryModule = await import('./mastery/index.js');
        // Pass live getter functions instead of object references
      await masteryModule.initMastery(owned, masteryMastered, ignoredMasteryItems, save, section);
      masteryInitialized = true;
      masteryModule.renderMastery();
      } else {
        masteryModule.setMasterySection(section);
      }
    } else if (section === 'mods') {
      document.getElementById('modsSection').classList.add('active');
      if (!modsInitialized) {
        modsModule = await import('./mods/index.js');
        await modsModule.initMods();
        modsInitialized = true;
      } else {
        modsModule.renderMods();
      }
    } else if (section === "tasks") {
      document.getElementById("tasksSection").classList.add("active");
      if (!tasksInitialized) {
        tasksModule = await import('./tasks/index.js');
        await tasksModule.initTasks();
        tasksInitialized = true;
      } else {
        tasksModule.renderTasks();
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
        ignoredPrimes: Array.from(ignoredPrimes),
        ignoredMasteryItems: Array.from(ignoredMasteryItems),
        masteryMastered,
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
    await initI18n();
    const version = await window.__TAURI__.app.getVersion();
    document.getElementById('app-version').textContent = `v${version}`;

    const stored = await invoke("load_owned");
    owned                = stored.owned                || {};
    ignoredPrimes        = new Set(stored.ignoredPrimes        || []);
    ignoredMasteryItems  = new Set(stored.ignoredMasteryItems  || []);
    masteryMastered      = stored.masteryMastered      || {};

    // Tasks is the new default tab
    tasksModule = await import('./tasks/index.js');
    await tasksModule.initTasks();
    tasksInitialized = true;
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

// ─── Grid size slider ──────────────────────────────────────────────────────────

const gridSlider = document.getElementById('gridSizeSlider');

const GRID_COLS_KEY = 'gridCols';
const savedCols = localStorage.getItem(GRID_COLS_KEY);
if (savedCols) {
  gridSlider.value = savedCols;
  document.documentElement.style.setProperty('--grid-cols', savedCols);
}

gridSlider.addEventListener('input', () => {
  const val = gridSlider.value;
  document.documentElement.style.setProperty('--grid-cols', val);
  localStorage.setItem(GRID_COLS_KEY, val);
});

export { owned, ignoredPrimes, masteryMastered, save };

init();

// ─── Responsive slider range ───────────────────────────────────────────────────

function updateSliderRange() {
  const contentWidth = document.getElementById('contentArea').offsetWidth;

  // Clamp so cards never get smaller than ~60px or larger than ~300px
  const minCols = 8
  const maxCols = Math.floor(contentWidth / 95);

  gridSlider.min = minCols;
  gridSlider.max = maxCols;

  // Clamp current value into the new range
  const current = parseInt(gridSlider.value);
  if (current < minCols) gridSlider.value = minCols;
  if (current > maxCols) gridSlider.value = maxCols;

  // Re-apply in case value was clamped
  const val = gridSlider.value;
  document.documentElement.style.setProperty('--grid-cols', val);
  localStorage.setItem(GRID_COLS_KEY, val);
}

window.addEventListener('resize', updateSliderRange);
updateSliderRange(); // run once on init