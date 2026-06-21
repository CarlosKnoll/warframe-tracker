// src/vendors/schema.js
// Static schema: JSDoc type definitions and the PARENT_CONFIG behavior table.
// Nothing here is runtime state — this is the shared contract for loader.js,
// state.js, and renderer.js to import from.

// ─────────────────────────────────────────────────────────────────────────────
// Types (JSDoc — no TS compiler needed, but IDEs will enforce these)
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @typedef {Object} Currency
 * @property {string} id       - Stable key, e.g. "emeraldTalent"
 * @property {string} name     - Display name, e.g. "Emerald Talent"
 * @property {string} iconKey  - Icon identifier for renderer
 */

/**
 * @typedef {Object} Category
 * @property {string} id
 * @property {string} label
 * @property {number} sortOrder
 */

/**
 * @typedef {"warframe"|"weapon"} PartParentType
 * Extend with new literals as new parent types are introduced (e.g. "companion").
 * Adding a new literal here + a PARENT_CONFIG entry is all that's needed —
 * no renderer or state logic needs a new branch.
 */

/**
 * @typedef {Object} PartParent
 * @property {string}         id
 * @property {string}         vendorId
 * @property {string}         categoryId
 * @property {string}         name
 * @property {PartParentType} type
 * @property {string[]}       partIds  - Ordered list of child item IDs
 */

/**
 * @typedef {Object} CostMap
 * Map of currencyId → amount.  An item costing both Emerald and Crimson
 * simply has two keys.  An item costing only one has one key.
 * @type {Object.<string, number>}
 */

/**
 * @typedef {Object} PartItem
 * @property {"part"}         kind
 * @property {string}         id
 * @property {string}         vendorId
 * @property {string}         parentId      - ID of the owning PartParent
 * @property {PartParentType} parentType
 * @property {string}         [slot]        - e.g. "mainBp", "neuroptics", "Handle", "Blade 1"
 *                                            Required+meaningful for warframes; freeform label for weapons.
 * @property {CostMap}        costs
 * @property {"sum"|"choice"} [costMode]   // "sum" = pay all (default), "choice" = pick one
 */

/**
 * @typedef {Object} UniqueItem
 * @property {"unique"}  kind
 * @property {string}    id
 * @property {string}    vendorId
 * @property {string}    categoryId
 * @property {string}    name
 * @property {CostMap}   costs
 */

/**
 * @typedef {Object} ArcaneItem
 * @property {"arcane"}               kind
 * @property {string}                 id
 * @property {string}                 vendorId
 * @property {string}                 categoryId
 * @property {string}                 name
 * @property {number}                 maxCopies         - Total copies needed to fully rank (e.g. 21)
 * @property {function(number):CostMap} costAtOwnedCount  - Given current owned count, returns cost of next copy
 */

/**
 * @typedef {PartItem|UniqueItem|ArcaneItem} VendorItem
 */

/**
 * @typedef {Object} Vendor
 * @property {string}     id
 * @property {string}     name
 * @property {string}     updateLabel  - e.g. "U43.0"
 * @property {Currency[]} currencies
 * @property {Category[]} categories
 * @property {PartParent[]} parents    - All warframe/weapon parent groups
 * @property {VendorItem[]} items      - All items (parts, uniques, arcanes)
 */

// ─────────────────────────────────────────────────────────────────────────────
// PARENT_CONFIG
// The single source of truth for behavior differences between parent types.
// Renderer and state code read from this table rather than branching on type.
// To add a new parent type: add a new entry here.  Nothing else changes.
// ─────────────────────────────────────────────────────────────────────────────

/**
 * @type {Record<PartParentType, {
 *   hasModeToggle: boolean,
 *   defaultMode?:  "keep"|"subsume",
 *   fixedSlots?:   string[],
 * }>}
 */
export const PARENT_CONFIG = {
  warframe: {
    hasModeToggle: true,
    defaultMode:   'subsume',
    fixedSlots:    ['mainBp', 'neuroptics', 'chassis', 'systems'],
  },
  weapon: {
    hasModeToggle: false,
    // fixedSlots intentionally absent — weapon part count varies per weapon
  },
};

/**
 * Returns the effective mode for a given warframe parent.
 * Reads from the user's vendorState; falls back to PARENT_CONFIG default.
 *
 * @param {string}  warframeId
 * @param {Object}  warframeMode   - The vendorState[vendorId].warframeMode map
 * @returns {"keep"|"subsume"}
 */
export function getWarframeMode(warframeId, warframeMode) {
  return warframeMode?.[warframeId] ?? PARENT_CONFIG.warframe.defaultMode;
}

/**
 * Returns whether copy2 should be rendered/tracked for a part.
 * For weapon parts (no mode toggle) this is always false.
 * For warframe parts it depends on the current mode.
 *
 * @param {PartItem}        item
 * @param {PartParent}      parent
 * @param {Object}          warframeMode   - vendorState[vendorId].warframeMode
 * @returns {boolean}
 */
export function needsCopy2(item, parent, warframeMode) {
  const config = PARENT_CONFIG[parent.type];
  if (!config.hasModeToggle) return false;
  return getWarframeMode(parent.id, warframeMode) === 'subsume';
}