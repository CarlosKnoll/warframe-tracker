// src/dashboard/live/loader.js
// Fetches the alerts and events endpoints. A failed endpoint keeps its previous cached
// payload (never treated as "the event ended"); the caller shows a stale note instead.

const BASE = 'https://api.warframestat.us';
const ENDPOINTS = ['alerts', 'events'];
const TIMEOUT_MS = 15_000;

async function getJson(url) {
  const opts = typeof AbortSignal !== 'undefined' && AbortSignal.timeout
    ? { signal: AbortSignal.timeout(TIMEOUT_MS) }
    : {};
  const res = await fetch(url, opts);
  if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
  return res.json();
}

/**
 * @param {Object} prev  previous cache ({alerts, events})
 * @returns {Promise<{cache: Object, failed: boolean}>}
 */
export async function fetchLive(prev) {
  // English on purpose: reward names are looked up by their English name (rewardLabel),
  // exactly like the Baro inventory.
  const results = await Promise.allSettled(ENDPOINTS.map(name => getJson(`${BASE}/en/${name}`)));
  const next = { ...prev };
  const now = Date.now();
  let failed = false;

  results.forEach((r, i) => {
    const name = ENDPOINTS[i];
    if (r.status === 'fulfilled' && Array.isArray(r.value)) {
      next[name] = { data: r.value, fetchedAt: now };
    } else {
      failed = true;
    }
  });

  return { cache: next, failed };
}
