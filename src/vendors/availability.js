// src/vendors/availability.js
// Optional availability window for limited-time (event) vendors. The window lives in the
// vendor's own data file, so hiding an ended vendor works offline and never depends on
// the worldstate API (which forgets an event the moment it ends).
//
//   availability: { start: '2026-10-15', end: '2026-11-17' }
//
// Date-only values are whole UTC days and `end` is inclusive (ends when that day is over).
// Full ISO timestamps are used as written. Both edges are optional.
//
// Hiding only affects visibility: purchase records, balances and ownership are never touched.

const DAY = 86_400_000;
const DATE_ONLY = /^\d{4}-\d{2}-\d{2}$/;

function parseEdge(value, edge) {
  if (value == null) return null;
  if (typeof value !== 'string') return NaN;
  if (DATE_ONLY.test(value)) {
    const t = Date.parse(`${value}T00:00:00Z`);
    return Number.isFinite(t) ? (edge === 'end' ? t + DAY : t) : NaN;
  }
  const t = Date.parse(value);
  return Number.isFinite(t) ? t : NaN;
}

/** Authoring value -> { start, end } in ms (either may be null), or null when absent/invalid. */
export function normalizeAvailability(raw, problems, vendorId) {
  if (!raw) return null;
  const start = parseEdge(raw.start, 'start');
  const end = parseEdge(raw.end, 'end');
  if (Number.isNaN(start)) problems.push(`${vendorId}: availability.start is not a valid date`);
  if (Number.isNaN(end)) problems.push(`${vendorId}: availability.end is not a valid date`);
  const s = Number.isFinite(start) ? start : null;
  const e = Number.isFinite(end) ? end : null;
  if (s != null && e != null && e <= s) problems.push(`${vendorId}: availability.end is not after start`);
  return s == null && e == null ? null : { start: s, end: e };
}

/** 'active' | 'upcoming' | 'ended' — computed on demand, never stored. */
export function statusOfVendor(vendor, now = Date.now()) {
  const a = vendor?.availability;
  if (!a) return 'active';
  if (a.end != null && now >= a.end) return 'ended';
  if (a.start != null && now < a.start) return 'upcoming';
  return 'active';
}

/** Newest active vendor; then newest not-ended; then simply the first. `vendors` is newest first. */
export function pickDefault(vendors, now = Date.now()) {
  return vendors.find((v) => statusOfVendor(v, now) === 'active')
    ?? vendors.find((v) => statusOfVendor(v, now) !== 'ended')
    ?? vendors[0];
}
