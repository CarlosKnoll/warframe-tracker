// src/vendors/ownership.js
// The ONLY place vendors touch Arcane ownership. Counts live in the same
// `owned[uniqueName]` object the Arcanes tab edits, and are saved with the
// same save() (which also schedules the Drive push). Writes are absolute
// ("set to N"), never increments, so repeating one cannot double-apply.
//
// main.js owns that object and REPLACES it on startup, so we always go through
// getOwned() instead of caching it. Wire it with one line in main.js:
//     vendorsModule.bindOwnership({ getOwned: () => owned, save })
// If that line is missing we fall back to importing main.js lazily.

let bound = null;

export function bindOwnership(b) { bound = b; }

export async function ready() {
  if (bound) return true;
  try {
    const m = await import('../main.js');
    if (m.owned && typeof m.save === 'function') {
      bound = { getOwned: () => m.owned, save: m.save };
    }
  } catch (err) {
    console.warn('[vendors] shared Arcane ownership unavailable:', err);
  }
  return !!bound;
}

export const available = () => !!bound;

/** Current shared count (sync, for rendering). */
export function peek(uid) {
  const o = bound?.getOwned?.();
  const n = Number(o?.[uid]);
  return Number.isFinite(n) && n > 0 ? n : 0;
}

/** Set the shared count to exactly `n` and persist. */
export async function setCount(uid, n) {
  const o = bound?.getOwned?.();
  if (!o) throw new Error('Arcane ownership is not bound');
  if ((Number(o[uid]) || 0) === n) return false;
  o[uid] = n;
  await bound.save();
  return true;
}
