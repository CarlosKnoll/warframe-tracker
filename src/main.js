// main.js - Main orchestrator with lazy loading
const invoke = window.__TAURI_INTERNALS__.invoke;

// Global state
let activeMode = "arcanes";
let owned = {};
let ignoredPrimes = new Set();

// Module loading state
let arcanesModule = null;
let primesModule = null;
let arcanesInitialized = false;
let primesInitialized = false;

// Mode switching with lazy loading
document.querySelectorAll("#modeSelector button").forEach(btn => {
  btn.onclick = async () => {
    activeMode = btn.dataset.mode;
    document.querySelectorAll("#modeSelector button").forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    document.querySelectorAll(".tracker-section").forEach(section => section.classList.remove("active"));
    
    if (activeMode === "arcanes") {
      document.getElementById("arcanesSection").classList.add("active");
      // Load and initialize arcanes module if not already done
      if (!arcanesInitialized) {
        console.log("Loading arcanes module...");
        arcanesModule = await import('./arcanes.js');
        await arcanesModule.initArcanes(owned, save);
        arcanesInitialized = true;
        console.log("Arcanes module loaded and initialized");
      }
    } else {
      document.getElementById("primesSection").classList.add("active");
      // Load and initialize primes module if not already done
      if (!primesInitialized) {
        console.log("Loading primes module...");
        primesModule = await import('./primes.js');
        await primesModule.initPrimes(owned, ignoredPrimes, save);
        primesInitialized = true;
        console.log("Primes module loaded and initialized");
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
    console.log("Loading saved data...");
    // Load owned data
    const stored = await invoke("load_owned");
    owned = stored.owned || {};
    ignoredPrimes = new Set(stored.ignoredPrimes || []);
    console.log("Saved data loaded");
    
    // Only initialize the arcanes module by default (since it's the default active tab)
    console.log("Loading arcanes module...");
    arcanesModule = await import('./arcanes.js');
    await arcanesModule.initArcanes(owned, save);
    arcanesInitialized = true;
    console.log("Arcanes module loaded and initialized");
    
    // Primes will be loaded when the user switches to that tab
    
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

export { owned, ignoredPrimes, save };

init();