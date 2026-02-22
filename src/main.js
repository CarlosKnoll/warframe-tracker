const { check } = window.__TAURI__.updater;
const { relaunch } = window.__TAURI__.process;

// main.js - Main orchestrator with lazy loading
const invoke = window.__TAURI_INTERNALS__.invoke;

let activeMode = "arcanes";
let owned = {};
let ignoredPrimes = new Set();

let arcanesModule = null;
let primesModule = null;
let arcanesInitialized = false;
let primesInitialized = false;

document.querySelectorAll("#modeSelector button").forEach(btn => {
  btn.onclick = async () => {
    activeMode = btn.dataset.mode;
    document.querySelectorAll("#modeSelector button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    document.querySelectorAll(".tracker-section").forEach(section => section.classList.remove("active"));
    
    if (activeMode === "arcanes") {
      document.getElementById("arcanesSection").classList.add("active");
      if (!arcanesInitialized) {
        arcanesModule = await import('./arcanes.js');
        await arcanesModule.initArcanes(owned, save);
        arcanesInitialized = true;
      }
    } else {
      document.getElementById("primesSection").classList.add("active");
      if (!primesInitialized) {
        primesModule = await import('./primes.js');
        await primesModule.initPrimes(owned, ignoredPrimes, save);
        primesInitialized = true;
      }
    }
  };
});

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

async function init() {
  try {
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

async function checkForUpdates() {
    const update = await check();
    if (update) {
        console.log(`Update available: ${update.version}`);
        await update.downloadAndInstall();
        await relaunch();
    }
}

checkForUpdates();

export { owned, ignoredPrimes, save };

init();