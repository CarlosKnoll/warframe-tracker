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

  // Always write back — timestamps may have updated, or merge may have added tasks
  await saveTasksCache();
}

export async function fetchWorldstate() {
  const BASE = 'https://api.warframestat.us';
  const lang = getLanguage();

  const fetchJson = url => fetch(url).then(r => {
    if (!r.ok) throw new Error(`${r.status} ${r.statusText}`);
    return r.json();
  });

  const [sortieResult, archonResult, steelResult, duviriResult, calendarResult, archimedeasResult, baroResult] = await Promise.allSettled([
    fetchJson(`${BASE}/pc/${lang}/sortie`),
    fetchJson(`${BASE}/pc/${lang}/archonHunt`),
    fetchJson(`${BASE}/pc/${lang}/steelPath`),
    fetchJson(`${BASE}/pc/${lang}/duviriCycle`),
    fetchJson(`${BASE}/pc/${lang}/calendar`),
    fetchJson(`${BASE}/pc/${lang}/archimedeas/`),
    fetchJson(`${BASE}/pc/voidTrader`),
  ]);

  state.sortieData    = sortieResult.status  === 'fulfilled' ? sortieResult.value  : null;
  state.archonHuntData = archonResult.status === 'fulfilled' ? archonResult.value  : null;
  state.steelPathData  = steelResult.status  === 'fulfilled' ? steelResult.value   : null;
  state.duviriCycleData = duviriResult.status  === 'fulfilled' ? duviriResult.value : null;
  state.calendarData    = calendarResult.status === 'fulfilled' ? calendarResult.value : null;
  state.archimedeasData = archimedeasResult.status === 'fulfilled' ? archimedeasResult.value : null;
  state.baroData = baroResult.status === 'fulfilled' ? baroResult.value : null;
}

export async function saveTasksCache() {
  const payload = {
    lastDailyReset: state.lastDailyReset,
    lastWeeklyReset: state.lastWeeklyReset,
    tasks: state.tasks,
    circuitObtained: state.circuitObtained,
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