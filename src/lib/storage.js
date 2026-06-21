// src/lib/storage.js
import { get, set, del } from './idb.js';   // changed from 'idb-keyval'

const invoke = window.__TAURI__.core.invoke;

// ── Sync metadata (IndexedDB) ──────────────────────────
export async function getSyncMeta() {
  const meta = await get('sync_meta');
  return meta || {
    lastModifiedAt: null,
    lastSyncedAt: null,
    deviceId: null,
    hasPendingPush: false,
  };
}

export async function setSyncMeta(meta) {
  await set('sync_meta', meta);
}

export async function getDeviceId() {
  let id = await get('deviceId');
  if (!id) {
    id = crypto.randomUUID();
    await set('deviceId', id);
  }
  return id;
}

// ── Owned data (file) ─────────────────────────────────
export async function getOwned() {
  return await invoke('load_owned');
}

export async function setOwned(data, { fromSync = false } = {}) {
  await invoke('save_owned', { data });
  if (!fromSync) {
    const { schedulePush } = await import('./sync.js');
    schedulePush();
  }
}

// ── Tasks cache (file) ────────────────────────────────
export async function getTasksCache() {
  return await invoke('load_tasks_cache');
}

export async function setTasksCache(data, { fromSync = false } = {}) {
  await invoke('save_tasks_cache', { data });
  if (!fromSync) {
    const { schedulePush } = await import('./sync.js');
    schedulePush();
  }
}

// ── Custom drops (file) ───────────────────────────────
export async function getCustomDrops() {
  return await invoke('load_custom_drops');
}

export async function setCustomDrops(data, { fromSync = false } = {}) {
  await invoke('save_custom_drops', { data: JSON.stringify(data) });
  if (!fromSync) {
    const { schedulePush } = await import('./sync.js');
    schedulePush();
  }
}

// ── vendor state ─────────────────────────────────────────────────────────────

export async function getVendorState() {
  return (await get('vendorState')) ?? {};
}

export async function setVendorState(data, options = {}) {
  await set('vendorState', data);

  if (!options.fromSync && !isSyncInFlight()) {
    await touchModified();
    schedulePush();
  }
}

// ── Image caches (IndexedDB) – not synced ─────────────
export async function getPrimesImageCache() { return await get('primesImageCache') || {}; }
export async function setPrimesImageCache(data) { await set('primesImageCache', data); }
export async function getMasteryImageCache() { return await get('masteryImageCache') || {}; }
export async function setMasteryImageCache(data) { await set('masteryImageCache', data); }
export async function getMasteryDataCache() { return await get('masteryDataCache') || null; }
export async function setMasteryDataCache(data) { await set('masteryDataCache', data); }
export async function getWmMapCache() { return await get('wmMapCache') || {}; }
export async function setWmMapCache(data) { await set('wmMapCache', data); }
export async function getResurgenceCache() { return await get('resurgenceCache') || null; }
export async function setResurgenceCache(data) { await set('resurgenceCache', data); }