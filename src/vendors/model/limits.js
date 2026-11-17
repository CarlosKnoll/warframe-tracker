// src/vendors/model/limits.js
// Purchase-limit periods. Pure functions of (reset spec, time): no state.
//
// A limit is { max, reset? }. Without `reset` it is permanent.
// A reset spec is one of (all times UTC):
//   { every: 'day',   hourUtc? }
//   { every: 'week',  weekday?: 0-6 (0 = Sunday, default 1), hourUtc? }
//   { every: 'month', day?: 1-28 (default 1), hourUtc? }
//   { every: 'custom', hours: N, anchor: ISO date }   // fixed rotation length
//
// Nothing here guesses a schedule: an unknown or invalid spec is reported by
// validateReset() and the catalog refuses to auto-reset on it.

const HOUR = 36e5;
const DAY = 24 * HOUR;

export function validateReset(r) {
  if (r == null) return null;
  if (typeof r !== 'object') return 'reset must be an object';
  const h = r.hourUtc ?? 0;
  if (!(Number.isFinite(h) && h >= 0 && h < 24)) return 'hourUtc must be 0-23';
  switch (r.every) {
    case 'day': return null;
    case 'week': {
      const w = r.weekday ?? 1;
      return Number.isInteger(w) && w >= 0 && w <= 6 ? null : 'weekday must be 0-6';
    }
    case 'month': {
      const d = r.day ?? 1;
      return Number.isInteger(d) && d >= 1 && d <= 28 ? null : 'day must be 1-28';
    }
    case 'custom':
      if (!(Number.isFinite(r.hours) && r.hours > 0)) return 'custom.hours must be > 0';
      if (!Number.isFinite(Date.parse(r.anchor))) return 'custom.anchor must be an ISO date';
      return null;
    default:
      return `unknown reset.every "${r.every}"`;
  }
}

/** Start (ms) of the period containing `now`. */
export function periodStart(reset, now) {
  const shift = (reset.hourUtc ?? 0) * HOUR;
  const base = now - shift;
  switch (reset.every) {
    case 'day':
      return Math.floor(base / DAY) * DAY + shift;
    case 'week': {
      const wd = reset.weekday ?? 1;
      const d = Math.floor(base / DAY);
      const dow = (d + 4) % 7;                 // 1970-01-01 was a Thursday
      return (d - ((dow - wd + 7) % 7)) * DAY + shift;
    }
    case 'month': {
      const day = reset.day ?? 1;
      const b = new Date(base);
      let y = b.getUTCFullYear(), m = b.getUTCMonth();
      if (b.getUTCDate() < day) { m -= 1; if (m < 0) { m = 11; y -= 1; } }
      return Date.UTC(y, m, day) + shift;
    }
    case 'custom': {
      const len = reset.hours * HOUR;
      const anchor = Date.parse(reset.anchor);
      return anchor + Math.floor((now - anchor) / len) * len;
    }
  }
  return 0;
}

/** Start of the NEXT period (ms), or null for permanent limits. */
export function nextReset(reset, now) {
  if (!reset) return null;
  const start = periodStart(reset, now);
  const shift = (reset.hourUtc ?? 0) * HOUR;
  switch (reset.every) {
    case 'day': return start + DAY;
    case 'week': return start + 7 * DAY;
    case 'month': {
      const s = new Date(start - shift);
      return Date.UTC(s.getUTCFullYear(), s.getUTCMonth() + 1, reset.day ?? 1) + shift;
    }
    case 'custom': return start + reset.hours * HOUR;
  }
  return null;
}

/** Stable period identifier stored on each purchase ("perm" = never resets). */
export function periodId(reset, now) {
  return reset ? String(periodStart(reset, now)) : 'perm';
}
