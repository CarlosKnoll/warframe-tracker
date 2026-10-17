// src/tasks/helpers.js
//
// Pure task logic shared by renderer.js (grid) and modal.js (detail view):
// shard buckets, colour tones, reset times, labels. Kept separate so the renderer
// and the modal can both use it without importing each other.

import { t } from '../i18n.js';
import { state } from './state.js';

// ─── Bucket resolvers for archon shards ───────────────────────────────────────────────────────────

export function calendarHasShard(cal) {
  if (!Array.isArray(cal?.days)) return null;   // null = unknown (fetch failed)
  return cal.days.some(d => d.events?.some(e => /ArchonCrystal/.test(e.uniqueName ?? '')));
}

export function shardBucket(task) {
  if (task.custom) return task.shards ?? null;          // custom: user's choice
  if (task.shards === 'dynamic') {
    const has = calendarHasShard(state.calendarData);
    return has === null ? 'potential' : has ? 'guaranteed' : null;  // null = standard list
  }
  return task.shards ?? null;
}

// Weekly bucket: 'guaranteed' | 'potential' | null (null = standard list).
// Custom archon tasks created before the destination selector have no `shards`.
export function weeklyBucket(task) {
  const b = shardBucket(task);
  if (b) return b;
  return task.custom && task.group === 'archon' ? 'guaranteed' : null;
}

// ─── Tones & categories ────────────────────────────────────────────────────────
// A tile's TONE decides its colour:  daily | weekly | maybe | archon
//   'maybe' is the intermediate tone between weekly and archon:
//     · Descendia (static override on the task definition)
//     · Calendar while this week's rewards are unknown (fetch failed)
// The legend and its counts use coarser CATEGORIES:
//   daily ← 'daily'      weekly ← 'weekly' + 'maybe'      archon ← 'archon'

export function toneOf(task) {
  if (task.tier === 'daily') return 'daily';
  if (task.tone) return task.tone;
  if (task.shards === 'dynamic') {                       // Calendar: depends on this week's rewards
    const has = calendarHasShard(state.calendarData);
    return has === null ? 'maybe' : has ? 'archon' : 'weekly';
  }
  return weeklyBucket(task) || task.group === 'archon' ? 'archon' : 'weekly';
}

const CATEGORY_BY_TONE = { daily: 'daily', weekly: 'weekly', maybe: 'weekly', archon: 'archon' };
export const categoryOf = task => CATEGORY_BY_TONE[toneOf(task)] ?? 'weekly';

// ─── Reset times ───────────────────────────────────────────────────────────────

export function getNextDailyReset() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next;
}

export function getNextWeeklyReset() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  return next;
}

export function formatCountdown(targetDate) {
  const diff = targetDate - Date.now();
  if (diff <= 0) return '00:00:00';

  const totalSeconds = Math.floor(diff / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

export function taskLabel(task) {
  return task.custom ? task.customLabel : t(task.labelKey);
}

// Epoch ms of the task's next reset, or null when there is nothing meaningful to count down to.
export function resetTargetFor(task) {
  if (task.id === 'daily.forma') {
    // Forma runs on its own 24h clock, started when it is ticked.
    return task.checked && task.formaExpiry ? Date.parse(task.formaExpiry) : null;
  }
  if (task.id === 'daily.sortie') {
    // Sortie rotates on its own API expiry (16:00 UTC), not at midnight.
    const own = Date.parse(state.sortieData?.expiry ?? '');
    if (Number.isFinite(own)) return own;
  }
  return (task.tier === 'daily' ? getNextDailyReset() : getNextWeeklyReset()).getTime();
}

// Translate with an English fallback, so new strings work before the locale files have the key.
// `{{var}}` placeholders in the fallback are filled the same way t() fills them.
export function tf(key, fallback, vars = {}) {
  const out = t(key, vars);
  if (out !== key) return out;
  return Object.entries(vars).reduce((s, [k, v]) => s.replace(`{{${k}}}`, v), fallback);
}
