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

  // Always write back — timestamps may have updated, or merge may have added tasks
  await saveTasksCache();
}

export async function fetchWorldstate() {
  const BASE = 'https://api.warframestat.us';
  const lang = getLanguage();

  const [sortieResult, archonResult, steelResult, duviriResult, calendarResult, archimedeasResult, baroResult] = await Promise.allSettled([
    fetch(`${BASE}/pc/${lang}/sortie`).then(r => r.json()),
    fetch(`${BASE}/pc/${lang}/archonHunt`).then(r => r.json()),
    fetch(`${BASE}/pc/${lang}/steelPath`).then(r => r.json()),
    fetch(`${BASE}/pc/${lang}/duviriCycle`).then(r => r.json()),
    fetch(`${BASE}/pc/${lang}/calendar`).then(r => r.json()),
    fetch(`${BASE}/pc/${lang}/archimedeas/`).then(r => r.json()),
    fetch(`${BASE}/pc/voidTrader`).then(r => r.json()),
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