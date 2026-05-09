import { loadTasksCache, saveTasksCache, fetchWorldstate, resetExpiredTasks } from './loader.js';
import { renderTasks } from './renderer.js';
import { state } from './state.js';

const RETRY_INTERVAL_MS = 60_000;

let retryTimeout  = null;
let expiryTimeout = null;

// ── Retry scheduling (failed fetches only) ────────────────────────────────────
// Fires only when at least one stale endpoint failed to fetch.

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
    const result = await fetchWorldstate();
    renderTasks();
    scheduleExpiryRefresh(result.nextExpiry);
    if (result.failedAny) scheduleRetry();
  }, RETRY_INTERVAL_MS);
}

// ── Expiry scheduling (cache rotation) ───────────────────────────────────────
// Fires at the nearest upcoming validUntil across all cached entries + forma.
// When it fires, it does a full fetch+render cycle, then reschedules itself.

function stopExpiryRefresh() {
  if (expiryTimeout !== null) {
    clearTimeout(expiryTimeout);
    expiryTimeout = null;
  }
}

function scheduleExpiryRefresh(nextExpiryMs) {
  stopExpiryRefresh();
  if (nextExpiryMs === null) return;

  const delay = nextExpiryMs - Date.now();
  if (delay <= 0) return; // already past — next fetchWorldstate will handle it

  expiryTimeout = setTimeout(async () => {
    expiryTimeout = null;
    await loadTasksCache();
    resetExpiredTasks();
    const result = await fetchWorldstate();
    renderTasks();
    scheduleExpiryRefresh(result.nextExpiry);
    if (result.failedAny) scheduleRetry();
  }, delay);
}

// ── Init / refresh ────────────────────────────────────────────────────────────

export async function initTasks() {
  // 1. Load + validate cache from disk (resets stale tiers)
  await loadTasksCache();

  // 2. Initial render with static data immediately
  renderTasks();

  // 3. Fetch live worldstate — re-render when done
  const result = await fetchWorldstate();
  renderTasks();
  scheduleExpiryRefresh(result.nextExpiry);
  if (result.failedAny) scheduleRetry();
}

// Called when the user re-enters the tasks tab after having left
export async function refreshTasks() {
  stopWorldstateRetry();
  stopExpiryRefresh();
  const result = await fetchWorldstate();
  renderTasks();
  scheduleExpiryRefresh(result.nextExpiry);
  if (result.failedAny) scheduleRetry();
}

window.addEventListener('langchange', async () => {
  stopExpiryRefresh();
  const result = await fetchWorldstate();
  renderTasks();
  scheduleExpiryRefresh(result.nextExpiry);
  if (result.failedAny) scheduleRetry();
});

export { renderTasks };
export { addCustomTask, removeCustomTask } from './loader.js';