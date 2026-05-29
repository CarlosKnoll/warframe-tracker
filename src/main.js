import { initI18n, setLanguage, t } from './i18n.js';
import { registerReloadFn, pullFromDrive, flushPush, onSyncStatus, isSyncInFlight } from './lib/sync.js';
import { isConnected } from './lib/auth.js';
import { masteryState } from './mastery/state.js';
import { getSyncMeta, setSyncMeta } from './lib/storage.js';

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

let marketModule = null;
let marketInitialized = false;

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
    updateGridSliderVisibility(subBtn);
  } else {
    const btn = document.querySelector(`.nav-btn[data-section="${section}"]`);
    btn?.classList.add('active');
    updateGridSliderVisibility(btn);
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
  } else if (activeMode === 'market' && marketInitialized) {
    marketModule.renderMarket();
  }
});

// ─── Sidebar navigation ────────────────────────────────────────────────────────

document.querySelectorAll("#sidebar button[data-section]").forEach(btn => {
  btn.onclick = async () => {
    const section = btn.dataset.section;
    activeMode = section;

    // Stop any pending worldstate retry when leaving the tasks tab
    if (section !== 'tasks' && tasksModule) {
      tasksModule.stopWorldstateRetry();
      tasksModule.stopExpiryRefresh();
    }

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
        await tasksModule.refreshTasks();
      }
    } else if (section === "market") {
      document.getElementById("marketSection").classList.add("active");
      if (!marketInitialized) {
        marketModule = await import('./market/index.js');
        await marketModule.initMarket();
        marketInitialized = true;
      } else {
        marketModule.renderMarket();
      }
    } else if (section === "settings") {
      document.getElementById("settingsSection").classList.add("active");
      const settingsMod = await import('./settings.js');
      await settingsMod.initSettings();
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
    const { schedulePush } = await import('./lib/sync.js');
    schedulePush();
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

    const meta = await getSyncMeta();
    if (!meta.lastModifiedAt && Object.keys(owned).length > 0) {
      await setSyncMeta({ ...meta, lastModifiedAt: new Date().toISOString(), hasPendingPush: true });
    }

    masteryState.saveFunction       = save;
    masteryState.masteryMastered    = masteryMastered;
    masteryState.owned              = owned;
    masteryState.ignoredMasteryItems = ignoredMasteryItems;
    
    // Sync pull on startup (will only run if connected)
    registerReloadFn(async () => {
      const stored = await invoke('load_owned');
      Object.keys(owned).forEach(k => delete owned[k]);
      Object.assign(owned, stored.owned || {});

      ignoredPrimes.clear();
      (stored.ignoredPrimes || []).forEach(v => ignoredPrimes.add(v));

      ignoredMasteryItems.clear();
      (stored.ignoredMasteryItems || []).forEach(v => ignoredMasteryItems.add(v));

      Object.keys(masteryMastered).forEach(k => delete masteryMastered[k]);
      Object.assign(masteryMastered, stored.masteryMastered || {});

      const active = document.querySelector('#sidebar .nav-btn.active, #sidebar .nav-sub-btn.active');
      if (active) {
        const section = active.dataset.section;
        if (section === 'arcanes' && arcanesInitialized) arcanesModule.renderArcanes();
        else if (section === 'primes' && primesInitialized) primesModule.renderPrimes();
        else if (section.startsWith('mastery-') && masteryInitialized) masteryModule.renderMastery();
        else if (section === 'mods' && modsInitialized) modsModule.renderMods();
        else if (section === 'tasks' && tasksInitialized) await tasksModule.initTasks();
        else if (section === 'market' && marketInitialized) marketModule.renderMarket();
        else if (section === 'settings') import('./settings.js').then(m => m.refreshSettings());
      }
    });

    // Pull from Drive (if connected)
    pullFromDrive().catch(console.warn);

    // Flush pending pushes before app closes (if Tauri window API is available)
    try {
      const { getCurrentWindow } = window.__TAURI__.window;
      const currentWindow = getCurrentWindow();
      const unlisten = await currentWindow.listen('tauri://close-requested', async () => {
        unlisten();
        console.log("Flushing pending pushes before close...");
        await flushPush();
        console.log('flush done');
        await window.__TAURI__.process.exit(0);
      });
    } catch {
      window.addEventListener('beforeunload', () => { flushPush(); });
    }

    // Tasks is the new default tab
    tasksModule = await import('./tasks/index.js');
    await tasksModule.initTasks();
    tasksInitialized = true;
  } catch (err) {
    console.error("Initialization error:", err);
  }

  const initialActive = document.querySelector(
    ".nav-btn.active, .nav-sub-btn.active"
  );

  if (initialActive) {
    updateGridSliderVisibility(initialActive);
  }
}

// ─── Market cross-reference ────────────────────────────────────────────────────
// Fired by modal.js (and mods/modal.js) when the user clicks "Search in Market".
// Using an event keeps the modal files decoupled from the lazily-loaded market module.

window.addEventListener('open-in-market', async (e) => {
  const { name, itemType } = e.detail;

  // Switch to market tab. If it hasn't been initialised yet, the nav handler
  // does an async import + initMarket() before resolving — we need to wait for
  // that before calling autoSearchMarket, so we trigger init manually here and
  // let the nav handler handle the rest (active state, section visibility, etc).
  const marketBtn = document.querySelector('.nav-btn[data-section="market"]');
  if (!marketInitialized) {
    // Kick off the tab switch which will import + init the module.
    if (marketBtn) marketBtn.click();
    // Wait for initMarket to finish — poll until marketModule is ready.
    await new Promise(resolve => {
      const check = () => marketModule?.autoSearchMarket ? resolve() : requestAnimationFrame(check);
      check();
    });
  } else {
    if (marketBtn) marketBtn.click();
  }

  marketModule.autoSearchMarket(name, itemType);
});

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

// ─── Sync status indicator (Settings button) ─────────────────────────────────

const syncStatusIcon = document.getElementById('syncStatusIcon');

async function updateSyncIcon() {
  if (!syncStatusIcon) return;

  const connected = await isConnected();
  const inFlight = isSyncInFlight();

  // Remove all status classes
  syncStatusIcon.classList.remove('status-ok', 'status-syncing', 'status-disconnected', 'status-error');

  if (!connected) {
    syncStatusIcon.classList.add('status-disconnected');
    syncStatusIcon.title = t('sync.status.offline');
    //'Not connected to Google Drive';
    return;
  }

  if (inFlight) {
    syncStatusIcon.classList.add('status-syncing');
    syncStatusIcon.title = t('sync.status.syncing');
    //'Syncing...';
    return;
  }

  // Connected and idle
  syncStatusIcon.classList.add('status-ok');
  syncStatusIcon.title = t('sync.status.synced')
  //'Sync up to date';
}

// Listen to sync status events
onSyncStatus((status, detail) => {
  // Trigger update on any sync event
  updateSyncIcon();
});

// Also update on visibility change (to catch any missed state)
document.addEventListener('visibilitychange', () => {
  if (!document.hidden) updateSyncIcon();
});

// Initial update after DOM ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', updateSyncIcon);
} else {
  updateSyncIcon();
}

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

// ─── Grid Slider Visibility ───────────────────────────────────────────────────

const gridSizeControl = document.getElementById("gridSizeControl");

function updateGridSliderVisibility(activeButton) {
  const hasGrid = activeButton.dataset.hasGrid === "true";

  gridSizeControl.style.display = hasGrid ? "" : "none";
}