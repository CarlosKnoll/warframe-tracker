// src/vendors/define.js
// Authoring helpers for vendor data files. These only build plain objects;
// all validation and derivation lives in catalog.js, so a data file stays a
// flat, readable list.
//
// Every item MUST declare `actions`, the controls it renders, e.g.
//   { actions: ['bought', 'drop', 'owned'] }   collectible, buyable or droppable
//   { actions: ['bought'] }                    common resource: no 'Dropped' button
//   { actions: ['drop', 'owned'] }             not buyable here (cost may be {})
//
//   either({ emerald: 275, crimson: 275 })  -> pay ONE of the listed currencies
//   { emerald: 25, crimson: 25 }            -> pay ALL listed currencies (default)

/** Marks a cost as "pay one of these currencies". */
export const either = (amounts) => ({ mode: 'any', amounts });

/** Normalises a plain amounts object (or an either() result) to {mode, amounts}. */
export const asCost = (c) =>
  c && typeof c === 'object' && c.amounts
    ? { mode: c.mode === 'any' ? 'any' : 'all', amounts: { ...c.amounts } }
    : { mode: 'all', amounts: { ...(c ?? {}) } };

/** Convenience: every control. Each item still has to list its own `actions`. */
export const ALL_ACTIONS = ['bought', 'drop', 'owned'];

export const vendor = (def) => def;

/** currency('moonflesh', 'Moonflesh') - label is the English fallback. */
export const currency = (id, label, extra = {}) => ({ id, label, ...extra });

/** A group of parts that make one weapon or warframe. */
export const parent = (id, categoryId, type, name, extra = {}) => ({ id, categoryId, type, name, ...extra });

/** A single recipe part. Category comes from its parent. */
export const part = (id, parentId, slot, cost, extra = {}) =>
  ({ kind: 'part', id, parentId, slot, cost: asCost(cost), ...extra });

/** A one-time purchase (cosmetic, blueprint, scene...). `label` = English fallback. */
export const unique = (id, categoryId, cost, label, extra = {}) =>
  ({ kind: 'unique', id, categoryId, cost: asCost(cost), label, ...extra });

/**
 * A repeatable purchase (resources, packs...). Supports `limit` and `target`.
 *   limit:  { max: 5 }                                  permanent cap
 *           { max: 3, reset: { every: 'week' } }        resetting cap
 *   target: copies the planner should budget for (default: limit.max when the
 *           cap is permanent, otherwise 0 = not budgeted).
 */
export const stock = (id, categoryId, cost, label, extra = {}) =>
  ({ kind: 'stock', id, categoryId, cost: asCost(cost), label, ...extra });

/**
 * An Arcane with N copies to rank. `cost` is either a flat cost object or a
 * function (ownedCount) => cost. The shared Arcane ownership entry is found
 * through arcane-ids.js by English name (override with { uid }).
 */
export const arcane = (id, name, cost, extra = {}) => ({
  kind: 'arcane', id, name, categoryId: 'arcanes', maxCopies: 21,
  costAt: typeof cost === 'function' ? (n) => asCost(cost(n)) : () => asCost(cost),
  ...extra,
});
