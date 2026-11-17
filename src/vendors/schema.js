// src/vendors/schema.js
// Shared contract: JSDoc types, parent-type behaviour table and small helpers.
// Nothing here is runtime state.

/**
 * @typedef {Object} Cost
 * @property {'all'|'any'} mode   'all' = pay every listed currency, 'any' = pay ONE of them
 * @property {Object<string, number>} amounts   currencyId -> amount
 */

/**
 * @typedef {Object} Limit
 * @property {number} max
 * @property {Object} [reset]   see model/limits.js; absent = permanent
 */

/**
 * @typedef {Object} VendorItem   (normalised by catalog.js)
 * @property {string} id
 * @property {'part'|'unique'|'arcane'|'stock'} kind
 * @property {string} categoryId
 * @property {string} [label]       English fallback name
 * @property {string|string[]} [nameKey]  any locale key(s), resolved before vendor-scoped keys
 * @property {string[]} actions   REQUIRED. Subset of ['bought','drop','owned'] this item renders
 * @property {Cost}   cost          cost of the (first) copy (may be {} when 'bought' is not offered)
 * @property {(n:number)=>Cost} [costAt]   arcane: cost of the copy bought when n are owned
 * @property {number} [maxCopies]   arcane
 * @property {string} [uid]         arcane: WFCD uniqueName (shared ownership key)
 * @property {string} [parentId]    part
 * @property {string} [slot]        part
 * @property {string} [crossParent] part: display the name of another parent
 * @property {Limit}  [limit]       arcane/stock
 * @property {number} [target]      stock: copies to budget for
 */

/**
 * @typedef {Object} Vendor   (normalised by catalog.js)
 * @property {string} id
 * @property {string} since           first game version, e.g. "44.1.2" (sorting)
 * @property {string} badge           short label, e.g. "U44.0"
 * @property {string} family          selector group id (see registry FAMILIES)
 * @property {string} title           English fallback title
 * @property {string} localeGroup     legacy locale namespace tabs.vendor.ui.<group>.*
 * @property {number|null} missionMinutes   default minutes per mission (user can override)
 * @property {'parallel'|'sequential'} runModel
 */

// Behaviour differences between part-parent types live here, not in branches.
export const PARENT_CONFIG = {
  warframe: { hasModeToggle: true, defaultMode: 'subsume' },
  weapon:   { hasModeToggle: false },
};

/** Effective keep/subsume mode for a warframe parent. */
export function getWarframeMode(parentId, modeMap) {
  return modeMap?.[parentId] ?? PARENT_CONFIG.warframe.defaultMode;
}

/** How many copies of each part of `parent` are needed. */
export function copiesNeeded(parent, modeMap) {
  if (!parent || !PARENT_CONFIG[parent.type]?.hasModeToggle) return 1;
  return getWarframeMode(parent.id, modeMap) === 'subsume' ? 2 : 1;
}

/** Slot ids a part item tracks, in order. */
export const partSlots = (copies) => (copies > 1 ? ['c1', 'c2'] : ['c1']);

/** Controls an item can offer. Every item must list the ones it offers (catalog enforces it). */
export const ACTIONS = ['bought', 'drop', 'owned'];

export const MISSION_RUN_MODELS = ['parallel', 'sequential'];
export const FAMILY_DEFAULT = 'update';
