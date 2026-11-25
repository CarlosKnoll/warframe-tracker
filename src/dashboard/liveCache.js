// src/dashboard/liveCache.js
// Per-device cache of the live worldstate payloads (alerts, events).
//
// localStorage on purpose:
//  - It needs no import. The web build is bundled, but the Tauri build serves src/ as plain
//    ES modules (no bundler), where a bare specifier like 'idb-keyval' cannot resolve.
//  - It stays outside lib/storage.js: everything that goes through storage.js calls
//    touchModified() + schedulePush(), which would upload the user's data to Drive on every
//    poll and bump lastModifiedAt on every device. This cache is never synced.
//
// Shape: { alerts: { data: [...], fetchedAt: ms }, events: { data: [...], fetchedAt: ms } }

const KEY = 'wf-live-cache';

export async function readLiveCache() {
  try {
    const v = JSON.parse(localStorage.getItem(KEY));
    return v && typeof v === 'object' ? v : {};
  } catch {
    return {};
  }
}

export async function writeLiveCache(cache) {
  try { localStorage.setItem(KEY, JSON.stringify(cache)); } catch { /* full or blocked — cache is best-effort */ }
}
