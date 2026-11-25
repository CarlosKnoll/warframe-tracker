// src/dashboard/index.js
// Live events + alerts for the Tasks tab. Owns its own cache, fetching and timers;
// nothing here touches tasksCache, Drive sync or the task state.
//
//   initLive()     once, at startup          – paint the cached data, then refresh
//   refreshLive()  on re-entering the tab    – throttled refresh
//   stopLive()     on leaving the tab        – clear timers

import { readLiveCache, writeLiveCache } from './liveCache.js';
import { fetchLive } from './live/loader.js';
import { normalizeAlerts, normalizeEvents, statusOf } from './live/normalize.js';
import { renderLive } from './renderer.js';

const MIN_REFETCH_MS = 60_000;      // re-entering the tab never refetches more often than this
const POLL_MS        = 5 * 60_000;  // only while an active event reports progress
const RETRY_MS       = 60_000;      // after a failed fetch
const MAX_TIMER_MS   = 6 * 3_600_000;

let cache    = {};
let stale    = false;
let active   = false;     // tab is showing
let timer    = null;
let busy     = false;
let started  = false;
const seenEvents = new Set();

function model() {
  const now = Date.now();
  const keep  = e => statusOf(e, now) !== 'expired';           // a cached entry that ended never shows
  const byEnd = (a, b) => (a.end ?? Infinity) - (b.end ?? Infinity);
  return {
    events: normalizeEvents(cache.events?.data).filter(keep).sort(byEnd),
    alerts: normalizeAlerts(cache.alerts?.data).filter(keep).sort(byEnd),
    stale,
    hasData: Boolean(cache.alerts?.data || cache.events?.data),
  };
}

function render() {
  try {
    renderLive(model());
  } catch (err) {
    console.warn('[live] render failed', err);
  }
}

// Lets you learn the real `tag` of an event the first time it shows up, which is what
// the (Phase 2) event -> vendor associations will key on.
function logNewEvents(events) {
  for (const e of events) {
    if (seenEvents.has(e.id)) continue;
    seenEvents.add(e.id);
    console.info('[live] event seen', { tag: e.tag, title: e.title, start: e.start, end: e.end });
  }
}

function schedule() {
  clearTimeout(timer);
  timer = null;
  if (!active) return;

  const now = Date.now();
  const { events, alerts } = model();
  let next = Infinity;

  for (const e of [...events, ...alerts]) {
    if (e.start != null && e.start > now) next = Math.min(next, e.start);
    if (e.end   != null && e.end   > now) next = Math.min(next, e.end);
  }
  if (events.some(e => e.progress && statusOf(e, now) === 'active')) next = Math.min(next, now + POLL_MS);
  if (stale) next = Math.min(next, now + RETRY_MS);
  if (next === Infinity) return;

  const delay = Math.min(Math.max(next - now, 1000), MAX_TIMER_MS);
  timer = setTimeout(async () => {
    timer = null;
    render();                 // statuses are recomputed, so anything that just ended disappears at once
    await refresh(true);
  }, delay);
}

async function refresh(force = false) {
  if (busy) return;
  busy = true;
  try {
    const t = Math.min(cache.alerts?.fetchedAt ?? 0, cache.events?.fetchedAt ?? 0);
    const fresh = !force && t > 0 && Date.now() - t < MIN_REFETCH_MS;
    if (!fresh) {
      const res = await fetchLive(cache);
      cache = res.cache;
      stale = res.failed;
      await writeLiveCache(cache);
      logNewEvents(normalizeEvents(cache.events?.data));
    }
  } catch (err) {
    console.warn('[live] refresh failed', err);
    stale = true;
  } finally {
    busy = false;
  }
  render();
  schedule();
}

export async function initLive() {
  if (started) return;
  started = true;
  active = true;

  cache = await readLiveCache();
  render();                   // paint whatever we have immediately, then refresh

  window.addEventListener('langchange', render);
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible' && active) refresh(false);
  });

  await refresh(true);
}

export async function refreshLive() {
  active = true;
  render();
  await refresh(false);
}

export function stopLive() {
  active = false;
  clearTimeout(timer);
  timer = null;
}
