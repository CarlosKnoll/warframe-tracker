import { loadTasksCache, saveTasksCache, fetchWorldstate } from './loader.js';
import { renderTasks } from './renderer.js';
import { state } from './state.js';

const RETRY_INTERVAL_MS = 60_000;

let retryTimeout = null;

function worldstateFailed() {
  // Consider the fetch failed if every live-data field is null
  return (
    state.sortieData     === null &&
    state.archonHuntData === null &&
    state.steelPathData  === null &&
    state.duviriCycleData === null &&
    state.calendarData   === null &&
    state.archimedeasData === null
  );
}

export function stopWorldstateRetry() {
  if (retryTimeout !== null) {
    clearTimeout(retryTimeout);
    retryTimeout = null;
  }
}

function scheduleRetry() {
  stopWorldstateRetry();
  retryTimeout = setTimeout(async () => {
    retryTimeout = null;
    await fetchWorldstate();
    renderTasks();
    if (worldstateFailed()) {
      scheduleRetry();
    }
  }, RETRY_INTERVAL_MS);
}

export async function initTasks() {
  // 1. Load + validate cache from disk (resets stale tiers)
  await loadTasksCache();

  // 2. Initial render with static data immediately
  renderTasks();

  // 3. Fetch live worldstate — re-render when done, retry if it fails
  await fetchWorldstate();
  renderTasks();
  if (worldstateFailed()) {
    scheduleRetry();
  }
}

// Called when the user re-enters the tasks tab after having left
export async function refreshTasks() {
  stopWorldstateRetry();
  await fetchWorldstate();
  renderTasks();
  if (worldstateFailed()) {
    scheduleRetry();
  }
}

window.addEventListener('langchange', () => {
  fetchWorldstate().then(() => renderTasks());
});

export { renderTasks };
export { addCustomTask, removeCustomTask } from './loader.js';