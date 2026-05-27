// src/settings.js
import { isConnected, getConnectedEmail, startOAuthFlow, disconnect, getUserProfile } from './lib/auth.js';
import { pullFromDrive, pushToDrive, onSyncStatus } from './lib/sync.js';
import { getSyncMeta } from './lib/storage.js';
import { t } from './i18n.js';

let _els = {};
let _statusListenerRegistered = false;

function q(id) { return document.getElementById(id); }

function relativeTime(isoString) {
  if (!isoString) return null;
  const diff  = Date.now() - new Date(isoString).getTime();
  const mins  = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days  = Math.floor(diff / 86400000);
  if (mins  <  1) return t('sync.time.justNow');
  if (mins  < 60) return t(mins  === 1 ? 'sync.time.minuteAgo' : 'sync.time.minutesAgo', { n: mins });
  if (hours < 24) return t(hours === 1 ? 'sync.time.hourAgo'   : 'sync.time.hoursAgo',   { n: hours });
  return             t(days  === 1 ? 'sync.time.dayAgo'    : 'sync.time.daysAgo',    { n: days });
}

async function renderSyncStatus() {
  const connected = await isConnected();
  const meta      = await getSyncMeta();

  _els.syncConnected.classList.toggle('hidden', !connected);
  _els.syncDisconnected.classList.toggle('hidden', connected);

  // ── Static labels (keys confirmed against en.json) ──────────────────────────
  _els.syncHeading.textContent          = t('sync.heading');
  _els.syncConnectBtn.textContent       = t('sync.connectBtn');
  _els.syncNowBtn.textContent           = t('sync.syncNowBtn');
  _els.syncDisconnectBtn.textContent    = t('sync.disconnectBtn');
  _els.syncDisconnectedText.textContent = t('sync.disconnectedText');
  _els.syncUnsyncedBadge.textContent    = t('sync.unsyncedBadge');

  if (connected) {
    try {
      const profile = await getUserProfile();
      _els.syncEmail.textContent = profile.email ?? '';
      if (_els.syncName)   _els.syncName.textContent = profile.name ?? '';
      if (_els.syncAvatar) {
        if (profile.picture) {
          _els.syncAvatar.src           = profile.picture;
          _els.syncAvatar.style.display = 'block';
        } else {
          _els.syncAvatar.style.display = 'none';
        }
      }
    } catch {
      _els.syncEmail.textContent = (await getConnectedEmail()) ?? 'Unknown';
    }

    const rel = relativeTime(meta?.lastSyncedAt);
    _els.syncLastTime.textContent = rel
      ? t('sync.lastSynced', { time: rel })
      : t('sync.neverSynced');

    const hasUnsyncedChanges =
      meta?.lastModifiedAt && meta?.lastSyncedAt &&
      (new Date(meta.lastModifiedAt) - new Date(meta.lastSyncedAt)) > 600000;
    _els.syncUnsyncedBadge.classList.toggle('hidden', !hasUnsyncedChanges);
  }
}

function setStatusIndicator(status, detail) {
  // Guard: settings tab may not be open yet when a background sync fires
  if (!_els.syncStatusIndicator) return;

  _els.syncStatusIndicator.className = `sync-status-indicator status-${status}`;
  const textMap = {
    idle:    '',
    syncing: t('sync.status.syncing'),
    synced:  t('sync.status.synced'),
    updated: t('sync.status.updated'),
    error:   t('sync.status.error', { detail: detail ?? t('sync.status.errorUnknown') }),
    offline: t('sync.status.offline'),
  };
  _els.syncStatusIndicator.textContent = textMap[status] ?? '';
  if (status === 'synced' || status === 'updated') renderSyncStatus();
}

export async function initSettings() {
  _els = {
    syncConnected:        q('syncConnected'),
    syncDisconnected:     q('syncDisconnected'),
    syncEmail:            q('syncEmail'),
    syncName:             q('syncName'),
    syncAvatar:           q('syncAvatar'),
    syncLastTime:         q('syncLastTime'),
    syncUnsyncedBadge:    q('syncUnsyncedBadge'),
    syncStatusIndicator:  q('syncStatusIndicator'),
    syncConnectBtn:       q('syncConnectBtn'),
    syncDisconnectBtn:    q('syncDisconnectBtn'),
    syncNowBtn:           q('syncNowBtn'),
    syncDisconnectedText: q('syncDisconnectedText'),
    syncHeading:          q('syncHeading'),
  };

  // Register the sync-status listener only once across all tab visits
  if (!_statusListenerRegistered) {
    onSyncStatus(setStatusIndicator);
    _statusListenerRegistered = true;
  }

  // Re-wire buttons each visit (cloneNode removes any stacked listeners)
  function rewire(key, handler) {
    const el = _els[key];
    if (!el) return;
    const fresh = el.cloneNode(true);
    el.replaceWith(fresh);
    _els[key] = fresh;
    fresh.addEventListener('click', handler);
  }

  rewire('syncConnectBtn', async () => {
    try {
      await startOAuthFlow();
      await renderSyncStatus();
      pullFromDrive().catch(console.warn);
    } catch (err) {
      setStatusIndicator('error', err.message);
    }
  });

  rewire('syncDisconnectBtn', async () => {
    await disconnect();
    await renderSyncStatus();
  });

  rewire('syncNowBtn', async () => {
    _els.syncNowBtn.disabled = true;
    await pushToDrive();
    _els.syncNowBtn.disabled = false;
  });

  await renderSyncStatus();
}

export async function refreshSettings() {
  await renderSyncStatus();
}