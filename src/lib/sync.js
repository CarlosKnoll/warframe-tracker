// src/lib/sync.js
// Full sync logic – pull on start, debounced push on changes, conflict resolution
import {
  getOwned, setOwned,
  getTasksCache, setTasksCache,
  getCustomDrops, setCustomDrops,
  getSyncMeta, setSyncMeta
} from './storage.js';
import { isConnected } from './auth.js';
import { driveUpload, driveDownload } from './drive.js';
import { t } from '../i18n.js';

const SYNC_FILES = {
  owned:       'owned.json',
  tasksCache:  'tasksCache.json',
  customDrops: 'customDrops.json',
  syncMeta:    'sync_meta.json',
};

let _pushTimer = null;
let _syncListeners = [];
let _reloadFn = null;
let _syncInFlight = false;

export function isSyncInFlight() { return _syncInFlight; }
export function onSyncStatus(fn) { _syncListeners.push(fn); }

function emit(status, detail = null) {
  _syncListeners.forEach(fn => { try { fn(status, detail); } catch {} });
}

export function registerReloadFn(fn) { _reloadFn = fn; }

function isOnline() { return navigator.onLine !== false; }

function safeParse(str) {
  try { return str ? JSON.parse(str) : null; } catch { return null; }
}

function isValidOwned(data) {
  return data && typeof data === 'object' && !Array.isArray(data) && 'owned' in data;
}
function isValidTasksCache(data) {
  return data && typeof data === 'object' && Array.isArray(data.tasks);
}
function isValidCustomDrops(data) {
  return data && typeof data === 'object' && !Array.isArray(data);
}

function summarise(owned, tasksCache, customDrops) {
  const itemCount   = Object.keys(owned?.owned ?? {}).length;
  const ignoredCount = (owned?.ignoredPrimes?.length ?? 0) + (owned?.ignoredMasteryItems?.length ?? 0);
  const taskCount   = tasksCache?.tasks?.length ?? 0;
  const dropCount   = Object.keys(customDrops ?? {}).length;

  const parts = [];
  if (itemCount)    parts.push(t(itemCount   !== 1 ? 'sync.conflict.summary.items'   : 'sync.conflict.summary.item',   { n: itemCount }));
  if (ignoredCount) parts.push(t('sync.conflict.summary.ignored', { n: ignoredCount }));
  if (taskCount)    parts.push(t(taskCount   !== 1 ? 'sync.conflict.summary.tasks'   : 'sync.conflict.summary.task',   { n: taskCount }));
  if (dropCount)    parts.push(t(dropCount   !== 1 ? 'sync.conflict.summary.drops'   : 'sync.conflict.summary.drop',   { n: dropCount }));
  return parts.length ? parts.join(' · ') : t('sync.conflict.summary.empty');
}

function showConflictDialog(localTime, remoteTime, localSummary, remoteSummary) {
  return new Promise(resolve => {
    let dialog = document.getElementById('syncConflictDialog');
    if (!dialog) {
      dialog = document.createElement('dialog');
      dialog.id = 'syncConflictDialog';
      dialog.innerHTML = `
        <div class="sync-conflict">
          <h3>${t('sync.conflict.title')}</h3>
          <p class="sync-conflict-desc">${t('sync.conflict.desc')}</p>
          <div class="sync-conflict-options">
            <button class="sync-conflict-option" id="syncConflictLocal">
              <span class="sco-badge">${t('sync.conflict.thisDevice')}</span>
              <span class="sco-time" id="syncConflictLocalTime"></span>
              <span class="sco-summary" id="syncConflictLocalSummary"></span>
            </button>
            <button class="sync-conflict-option" id="syncConflictCloud">
              <span class="sco-badge">${t('sync.conflict.cloud')}</span>
              <span class="sco-time" id="syncConflictCloudTime"></span>
              <span class="sco-summary" id="syncConflictCloudSummary"></span>
            </button>
          </div>
          <button class="sync-conflict-merge" id="syncConflictMerge">
            ${t('sync.conflict.merge')}
            <span class="sync-conflict-merge-note">${t('sync.conflict.mergeNote')}</span>
          </button>
          <p class="sync-conflict-dismiss">
            <button class="sync-conflict-cancel" id="syncConflictCancel">${t('sync.conflict.cancel')}</button>
          </p>
        </div>
      `;
      document.body.appendChild(dialog);
      dialog.addEventListener('click', e => { if (e.target === dialog) { dialog.close(); resolve(null); } });
    }

    const fmt = iso => iso ? new Date(iso).toLocaleString(undefined, { month:'short', day:'numeric', hour:'2-digit', minute:'2-digit' }) : 'Unknown';
    dialog.querySelector('#syncConflictLocalTime').textContent = fmt(localTime);
    dialog.querySelector('#syncConflictCloudTime').textContent = fmt(remoteTime);
    dialog.querySelector('#syncConflictLocalSummary').textContent = localSummary;
    dialog.querySelector('#syncConflictCloudSummary').textContent = remoteSummary;

    ['syncConflictLocal','syncConflictCloud','syncConflictMerge','syncConflictCancel'].forEach(id => {
      const el = dialog.querySelector(`#${id}`);
      const clone = el.cloneNode(true);
      el.replaceWith(clone);
    });
    dialog.querySelector('#syncConflictLocal').addEventListener('click', () => { dialog.close(); resolve('local'); });
    dialog.querySelector('#syncConflictCloud').addEventListener('click', () => { dialog.close(); resolve('cloud'); });
    dialog.querySelector('#syncConflictMerge').addEventListener('click', () => { dialog.close(); resolve('merge'); });
    dialog.querySelector('#syncConflictCancel').addEventListener('click', () => { dialog.close(); resolve(null); });
    dialog.showModal();
  });
}

function mergeTasksCache(local, remote) {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  const localTasks = local.tasks ?? [];
  const remoteTasks = remote.tasks ?? [];
  const remoteById = new Map(remoteTasks.map(t => [t.id, t]));
  const mergedTasks = [];
  for (const lt of localTasks) {
    const rt = remoteById.get(lt.id);
    if (!rt) mergedTasks.push(lt);
    else {
      mergedTasks.push({
        ...lt,
        checked: lt.checked || rt.checked,
        ...(lt.id === 'daily.forma' ? { formaExpiry: lt.formaExpiry ?? rt.formaExpiry ?? null } : {}),
      });
      remoteById.delete(lt.id);
    }
  }
  for (const [,rt] of remoteById) mergedTasks.push(rt);
  const laterReset = (a,b) => { if (!a) return b; if (!b) return a; return new Date(a) >= new Date(b) ? a : b; };
  return {
    ...local,
    tasks: mergedTasks,
    lastDailyReset: laterReset(local.lastDailyReset, remote.lastDailyReset),
    lastWeeklyReset: laterReset(local.lastWeeklyReset, remote.lastWeeklyReset),
    circuitObtained: [...new Set([...(local.circuitObtained ?? []), ...(remote.circuitObtained ?? [])])],
  };
}

function mergeCustomDrops(local, remote) {
  if (!local && !remote) return null;
  if (!local) return remote;
  if (!remote) return local;
  return { ...remote, ...local };
}

function mergeOwned(local, remote) {
  const allKeys = new Set([...Object.keys(local?.owned ?? {}), ...Object.keys(remote?.owned ?? {})]);
  const mergedOwned = {};
  for (const key of allKeys) {
    const l = local?.owned?.[key] ?? 0;
    const r = remote?.owned?.[key] ?? 0;
    mergedOwned[key] = typeof l === 'number' || typeof r === 'number' ? Math.max(Number(l), Number(r)) : (l || r);
  }
  const mergeArrays = (a,b) => [...new Set([...(a??[]), ...(b??[])])];
  const allMasteryKeys = new Set([...Object.keys(local?.masteryMastered ?? {}), ...Object.keys(remote?.masteryMastered ?? {})]);
  const mergedMastery = {};
  for (const key of allMasteryKeys) {
    const l = local?.masteryMastered?.[key] ?? 0;
    const r = remote?.masteryMastered?.[key] ?? 0;
    mergedMastery[key] = Math.max(Number(l), Number(r));
  }
  return {
    owned: mergedOwned,
    ignoredPrimes: mergeArrays(local?.ignoredPrimes, remote?.ignoredPrimes),
    ignoredMasteryItems: mergeArrays(local?.ignoredMasteryItems, remote?.ignoredMasteryItems),
    masteryMastered: mergedMastery,
  };
}

async function applyRemoteData(ownedRaw, tasksCacheRaw, customDropsRaw) {
  const ownedData = safeParse(ownedRaw);
  const tasksCacheData = safeParse(tasksCacheRaw);
  const customDropsData = safeParse(customDropsRaw);
  let wroteAny = false;
  if (ownedData && isValidOwned(ownedData)) { await setOwned(ownedData, { fromSync: true }); wroteAny = true; }
  else if (ownedRaw !== null) console.warn('[sync] Remote owned.json invalid – keeping local');
  if (tasksCacheData && isValidTasksCache(tasksCacheData)) {
    const localTasksCache = await getTasksCache();
    const worldstateCache = localTasksCache?.worldstateCache;
    const toWrite = worldstateCache !== undefined ? { ...tasksCacheData, worldstateCache } : tasksCacheData;
    await setTasksCache(toWrite, { fromSync: true }); wroteAny = true;
  } else if (tasksCacheRaw !== null) console.warn('[sync] Remote tasksCache.json invalid – keeping local');
  if (customDropsData && isValidCustomDrops(customDropsData)) { await setCustomDrops(customDropsData, { fromSync: true }); wroteAny = true; }
  else if (customDropsRaw !== null) console.warn('[sync] Remote customDrops.json invalid – keeping local');
  return wroteAny;
}

export async function pullFromDrive() {
  if (_syncInFlight) return;
  if (!isOnline()) { emit('offline'); return; }
  _syncInFlight = true;
  try {
    if (!(await isConnected())) return;
    emit('syncing');
    const localMeta = await getSyncMeta();
    const syncMetaRaw = await driveDownload(SYNC_FILES.syncMeta);
    if (!syncMetaRaw) {
      if (localMeta.lastModifiedAt) await _pushToDriveInternal();
      emit('idle'); return;
    }
    const remoteMeta = safeParse(syncMetaRaw);
    const remoteModifiedAt = remoteMeta?.lastModifiedAt ?? null;
    const localModifiedAt = localMeta.lastModifiedAt ?? null;
    const localSyncedAt = localMeta.lastSyncedAt ?? null;
    const remoteIsAhead = remoteModifiedAt && (!localSyncedAt || new Date(remoteModifiedAt) > new Date(localSyncedAt));
    const localIsAhead = localMeta.hasPendingPush === true;
    if (!remoteIsAhead) {
      if (localIsAhead) await pushToDrive();
      emit('idle'); return;
    }
    const [ownedRaw, tasksCacheRaw, customDropsRaw] = await Promise.all([
      driveDownload(SYNC_FILES.owned),
      driveDownload(SYNC_FILES.tasksCache),
      driveDownload(SYNC_FILES.customDrops),
    ]);
    if (!localIsAhead) {
      const wroteAny = await applyRemoteData(ownedRaw, tasksCacheRaw, customDropsRaw);
      await setSyncMeta({ ...localMeta, lastModifiedAt: remoteModifiedAt ?? localMeta.lastModifiedAt, lastSyncedAt: new Date().toISOString(), hasPendingPush: false });
      if (wroteAny && _reloadFn) await _reloadFn();
      emit(wroteAny ? 'updated' : 'synced');
      return;
    }
    // Both have changes – conflict
    const [localOwned, localTasksCache, localCustomDrops] = await Promise.all([getOwned(), getTasksCache(), getCustomDrops()]);
    const remoteOwned = safeParse(ownedRaw);
    const remoteTasksCache = safeParse(tasksCacheRaw);
    const remoteCustomDrops = safeParse(customDropsRaw);
    const drift = Math.abs(new Date(remoteModifiedAt).getTime() - new Date(localModifiedAt).getTime());
    if (drift < 120000) { // small overlap – auto-merge
      const merged = mergeOwned(localOwned, remoteOwned);
      const mergedTasksCache = mergeTasksCache(localTasksCache, remoteTasksCache);
      const mergedCustomDrops = mergeCustomDrops(localCustomDrops, remoteCustomDrops);
      await setOwned(merged, { fromSync: true });
      await setTasksCache(mergedTasksCache, { fromSync: true });
      await setCustomDrops(mergedCustomDrops, { fromSync: true });
      await _pushToDriveInternal();
      if (_reloadFn) await _reloadFn();
      emit('updated');
      return;
    }
    emit('idle');
    const localSummary = summarise(localOwned, localTasksCache, localCustomDrops);
    const remoteSummary = summarise(remoteOwned, remoteTasksCache, remoteCustomDrops);
    const choice = await showConflictDialog(localModifiedAt, remoteModifiedAt, localSummary, remoteSummary);
    if (!choice) return;
    if (choice === 'local') { await _pushToDriveInternal(); return; }
    if (choice === 'merge') {
      const merged = mergeOwned(localOwned, remoteOwned);
      const mergedTasksCache = mergeTasksCache(localTasksCache, remoteTasksCache);
      const mergedCustomDrops = mergeCustomDrops(localCustomDrops, remoteCustomDrops);
      await setOwned(merged, { fromSync: true });
      await setTasksCache(mergedTasksCache, { fromSync: true });
      await setCustomDrops(mergedCustomDrops, { fromSync: true });
      await _pushToDriveInternal();
      if (_reloadFn) await _reloadFn();
      emit('updated');
      return;
    }
    // choice === 'cloud': fall through to overwrite local
    const wroteAny = await applyRemoteData(ownedRaw, tasksCacheRaw, customDropsRaw);
    await setSyncMeta({ ...localMeta, lastModifiedAt: remoteModifiedAt ?? localMeta.lastModifiedAt, lastSyncedAt: new Date().toISOString(), hasPendingPush: false });
    if (wroteAny && _reloadFn) await _reloadFn();
    emit(wroteAny ? 'updated' : 'synced');
  } catch (err) {
    console.error('[sync] Pull failed:', err);
    emit('error', err.message);
  } finally { _syncInFlight = false; }
}

async function _pushToDriveInternal() {
  if (!(await isConnected())) return;
  emit('syncing');
  const [owned, tasksCache, customDrops, meta] = await Promise.all([getOwned(), getTasksCache(), getCustomDrops(), getSyncMeta()]);
  const now = new Date().toISOString();
  const syncMetaPayload = { lastModifiedAt: now, deviceId: meta.deviceId };
  const tasksCacheForUpload = tasksCache ? (({ worldstateCache: _, ...rest }) => rest)(tasksCache) : null;
  await Promise.all([
    owned ? driveUpload(SYNC_FILES.owned, JSON.stringify(owned)) : Promise.resolve(),
    tasksCacheForUpload ? driveUpload(SYNC_FILES.tasksCache, JSON.stringify(tasksCacheForUpload)) : Promise.resolve(),
    customDrops ? driveUpload(SYNC_FILES.customDrops, JSON.stringify(customDrops)) : Promise.resolve(),
    driveUpload(SYNC_FILES.syncMeta, JSON.stringify(syncMetaPayload)),
  ]);
  console.log('[sync] Uploading owned:', JSON.stringify(owned));
  await setSyncMeta({ ...meta, lastModifiedAt: now, lastSyncedAt: now, hasPendingPush: false });
  emit('synced');
}

export async function pushToDrive() {
  if (_syncInFlight) return;
  if (!isOnline()) { emit('offline'); return; }
  _syncInFlight = true;
  try { await _pushToDriveInternal(); } catch (err) { console.error('[sync] Push failed:', err); emit('error', err.message); } finally { _syncInFlight = false; }
}

export function schedulePush() {
  console.log('[sync] Change detected, scheduling push...');
  if (_pushTimer) clearTimeout(_pushTimer);
  _pushTimer = setTimeout(() => { _pushTimer = null; pushToDrive(); }, 5_000);
}

export function flushPush() {
  if (_pushTimer) { clearTimeout(_pushTimer); _pushTimer = null; pushToDrive(); }
}

document.addEventListener('visibilitychange', () => { if (document.visibilityState === 'hidden') flushPush(); });
window.addEventListener('langchange', () => { const dialog = document.getElementById('syncConflictDialog'); if (dialog) dialog.remove(); });