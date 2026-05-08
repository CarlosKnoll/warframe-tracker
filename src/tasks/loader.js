import { state, DEFAULT_TASKS } from './state.js';
import { getLanguage } from '../i18n.js';

const invoke = window.__TAURI_INTERNALS__.invoke;

function getLastDailyReset() {
  const now = new Date();
  return new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate())).toISOString();
}

function getLastWeeklyReset() {
  const now = new Date();
  const day = now.getUTCDay();
  const daysBack = day === 0 ? 6 : day - 1;
  const monday = Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() - daysBack);
  return new Date(monday).toISOString();
}

export async function loadTasksCache() {
  const raw = await invoke('load_tasks_cache');      // returns null if file absent
  const currentDailyReset = getLastDailyReset();
  const currentWeeklyReset = getLastWeeklyReset();

  if (!raw || !Array.isArray(raw.tasks)) {
    // First run — seed from DEFAULT_TASKS, write to disk
    state.tasks = DEFAULT_TASKS.map(t => ({ ...t, checked: false }));
    state.lastDailyReset = currentDailyReset;
    state.lastWeeklyReset = currentWeeklyReset;
    state.circuitObtained = [];
    state.worldstateCache = {};
    await saveTasksCache();
    return;
  }

  // Reset detection — same logic as before, but now acts on task objects
  const dailyExpired  = raw.lastDailyReset  !== currentDailyReset;
  const weeklyExpired = raw.lastWeeklyReset !== currentWeeklyReset;

  // Merge: built-in tasks may have been added in a new app version.
  // Walk DEFAULT_TASKS; if a matching id exists in raw.tasks, keep its checked state.
  // If not found in raw.tasks, append the new default (unchecked).
  const builtInIds = new Set(DEFAULT_TASKS.map(t => t.id));
  const cachedById = Object.fromEntries(raw.tasks.map(t => [t.id, t]));

  const builtIns = DEFAULT_TASKS.map(def => {
    const cached = cachedById[def.id];
    const shouldReset =
      (def.tier === 'daily'  && dailyExpired)  ||
      (def.tier === 'weekly' && weeklyExpired);
    return {
      ...def,
      checked: cached ? (shouldReset ? false : cached.checked) : false,
    };
  });

  // Custom tasks: preserved as-is, except reset their checked state if tier expired
  const customs = raw.tasks
    .filter(t => t.custom === true)
    .map(t => ({
      ...t,
      checked: (
        (t.tier === 'daily'  && dailyExpired)  ||
        (t.tier === 'weekly' && weeklyExpired)
      ) ? false : t.checked,
    }));

  state.tasks = [...builtIns, ...customs];
  state.lastDailyReset = currentDailyReset;
  state.lastWeeklyReset = currentWeeklyReset;

  // circuitObtained is permanent — never reset, just carry forward as-is.
  // Guard against missing key in older cache files.
  state.circuitObtained = Array.isArray(raw.circuitObtained) ? raw.circuitObtained : [];

  // worldstateCache — absent in older cache files; treat missing as empty object.
  // Entries are validated lazily in fetchWorldstate(), so we just carry them forward as-is.
  state.worldstateCache = (raw.worldstateCache && typeof raw.worldstateCache === 'object' && !Array.isArray(raw.worldstateCache))
    ? raw.worldstateCache
    : {};

  // Always write back — timestamps may have updated, or merge may have added tasks
  await saveTasksCache();
}

export async function fetchWorldstate() {
  const BASE = 'https://api.warframestat.us';
  const lang = getLanguage();
  const now  = Date.now();

  const fetchJson = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  });

  const nextDailyReset = new Date(state.lastDailyReset);
  nextDailyReset.setUTCDate(nextDailyReset.getUTCDate() + 1);
  const nextWeeklyReset = new Date(state.lastWeeklyReset);
  nextWeeklyReset.setUTCDate(nextWeeklyReset.getUTCDate() + 7);

  const dailyExpiry  = nextDailyReset.toISOString();
  const weeklyExpiry = nextWeeklyReset.toISOString();

  // Language-aware helpers
  const getCacheKey = (endpoint) => `${endpoint}_${lang}`;
  
  const isFresh = (endpoint) => {
    const entry = state.worldstateCache[getCacheKey(endpoint)];
    if (!entry || !entry.validUntil || !entry.data) return false;
    return now < new Date(entry.validUntil).getTime();
  };

  const store = (endpoint, data, validUntil) => {
    state.worldstateCache[getCacheKey(endpoint)] = { data, validUntil };
  };

  // ── Per-endpoint fetch-or-reuse with language keys ──

  // sortie — daily
  if (isFresh('sortie')) {
    state.sortieData = state.worldstateCache[getCacheKey('sortie')].data;
  } else {
    try {
      const data = await fetchJson(`${BASE}/pc/${lang}/sortie`);
      state.sortieData = data;
      store('sortie', data, dailyExpiry);
    } catch { state.sortieData = null; }
  }

  // archonHunt — weekly
  if (isFresh('archonHunt')) {
    state.archonHuntData = state.worldstateCache[getCacheKey('archonHunt')].data;
  } else {
    try {
      const data = await fetchJson(`${BASE}/pc/${lang}/archonHunt`);
      state.archonHuntData = data;
      store('archonHunt', data, weeklyExpiry);
    } catch { state.archonHuntData = null; }
  }

  // steelPath — weekly
  if (isFresh('steelPath')) {
    state.steelPathData = state.worldstateCache[getCacheKey('steelPath')].data;
  } else {
    try {
      const data = await fetchJson(`${BASE}/pc/${lang}/steelPath`);
      state.steelPathData = data;
      store('steelPath', data, weeklyExpiry);
    } catch { state.steelPathData = null; }
  }

  // duviriCycle — weekly
  if (isFresh('duviriCycle')) {
    state.duviriCycleData = state.worldstateCache[getCacheKey('duviriCycle')].data;
  } else {
    try {
      const data = await fetchJson(`${BASE}/pc/${lang}/duviriCycle`);
      state.duviriCycleData = data;
      store('duviriCycle', data, weeklyExpiry);
    } catch { state.duviriCycleData = null; }
  }

  // calendar — weekly
  if (isFresh('calendar')) {
    state.calendarData = state.worldstateCache[getCacheKey('calendar')].data;
  } else {
    try {
      const data = await fetchJson(`${BASE}/pc/${lang}/calendar`);
      state.calendarData = data;
      store('calendar', data, weeklyExpiry);
    } catch { state.calendarData = null; }
  }

  // archimedeas — weekly
  if (isFresh('archimedeas')) {
    state.archimedeasData = state.worldstateCache[getCacheKey('archimedeas')].data;
  } else {
    try {
      const data = await fetchJson(`${BASE}/pc/${lang}/archimedeas/`);
      state.archimedeasData = data;
      store('archimedeas', data, weeklyExpiry);
    } catch { state.archimedeasData = null; }
  }

  // baro — special expiry logic
  if (isFresh('baro')) {
    state.baroData = state.worldstateCache[getCacheKey('baro')].data;
  } else {
    try {
      const data = await fetchJson(`${BASE}/pc/voidTrader`); // Baro doesn't use {lang} in URL
      state.baroData = data;
      let baroValidUntil = dailyExpiry; 
      if (data && data.activation && data.expiry) {
        const activation = new Date(data.activation).getTime();
        const expiry = new Date(data.expiry).getTime();
        if (now < activation) baroValidUntil = data.activation;
        else if (now < expiry) baroValidUntil = data.expiry;
      }
      store('baro', data, baroValidUntil);
    } catch { state.baroData = null; }
  }

  await saveTasksCache();
}

export async function saveTasksCache() {
  const payload = {
    lastDailyReset: state.lastDailyReset,
    lastWeeklyReset: state.lastWeeklyReset,
    tasks: state.tasks,
    circuitObtained: state.circuitObtained,
    worldstateCache: state.worldstateCache,
  };
  await invoke('save_tasks_cache', { data: payload });
}

export async function addCustomTask(customLabel, tier, group = null) {
  const newTask = {
    id: `custom.${Date.now()}`,
    tier,
    group,
    subgroup: null,
    pulsesCost: null,
    labelKey: null,
    descKey: null,
    liveData: null,
    custom: true,
    customLabel,
    checked: false,
  };
  state.tasks.push(newTask);
  await saveTasksCache();
  return newTask;
}

export async function removeCustomTask(taskId) {
  state.tasks = state.tasks.filter(t => t.id !== taskId);
  await saveTasksCache();
}

export async function toggleTask(taskId) {
  const task = state.tasks.find(t => t.id === taskId);
  if (!task) return;
  task.checked = !task.checked;
  await saveTasksCache();
}

export async function toggleCircuitWeapon(weaponName) {
  const idx = state.circuitObtained.indexOf(weaponName);
  if (idx === -1) {
    state.circuitObtained.push(weaponName);
  } else {
    state.circuitObtained.splice(idx, 1);
  }
  await saveTasksCache();
}