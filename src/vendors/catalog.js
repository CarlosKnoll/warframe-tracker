// src/vendors/catalog.js
// Turns an authored vendor definition (define.js helpers, or the old raw
// `costs`/`costMode` shape) into the runtime vendor the rest of the module
// uses: derived ids, resolved parents, validated costs and limits.
//
// Problems are collected on `vendor.problems` (and logged once by the
// registry) instead of throwing, so one bad entry never blanks the tab.

import { asCost } from './define.js';
import { validateReset } from './model/limits.js';
import { ARCANE_UID } from './arcane-ids.js';
import { ACTIONS, FAMILY_DEFAULT, MISSION_RUN_MODELS } from './schema.js';

const KINDS = ['part', 'unique', 'arcane', 'stock'];

/** "44.1.2" -> [44,1,2]; used only for ordering vendors. */
export function sinceKey(since) {
  const m = String(since ?? '').match(/\d+(\.\d+)*/);
  return m ? m[0].split('.').map(Number) : [0];
}

/** Descending comparison of two since keys (newest first). */
export function compareSince(a, b) {
  const n = Math.max(a.length, b.length);
  for (let i = 0; i < n; i++) {
    const d = (b[i] ?? 0) - (a[i] ?? 0);
    if (d) return d;
  }
  return 0;
}

function normCost(raw, legacyCosts, legacyMode) {
  if (raw) return asCost(raw);
  if (legacyCosts) {
    const c = asCost(legacyCosts);
    c.mode = legacyMode === 'choice' ? 'any' : 'all';
    return c;
  }
  return { mode: 'all', amounts: {} };
}

/** actions is mandatory: no default, so nothing renders by accident. */
function normActions(raw, itemId, problems) {
  if (!Array.isArray(raw)) {
    problems.push(`${itemId}: actions is required - list which of ${ACTIONS.join(' / ')} this item offers`);
    return null;
  }
  const bad = raw.filter((a) => !ACTIONS.includes(a));
  if (bad.length) problems.push(`${itemId}: unknown action(s) ${bad.map((b) => `"${b}"`).join(', ')}`);
  const out = ACTIONS.filter((a) => raw.includes(a));          // canonical order, de-duplicated
  if (!out.length) { problems.push(`${itemId}: actions is empty - the item could not be marked at all`); return null; }
  return out;
}

function normLimit(raw, itemId, problems) {
  if (!raw) return null;
  if (!Number.isInteger(raw.max) || raw.max < 1) {
    problems.push(`${itemId}: limit.max must be an integer >= 1`);
    return null;
  }
  const err = validateReset(raw.reset);
  if (err) {
    // Never guess: an unverifiable schedule means NO automatic reset.
    problems.push(`${itemId}: ${err} - treating the limit as permanent`);
    return { max: raw.max, reset: null };
  }
  return { max: raw.max, reset: raw.reset ?? null };
}

/**
 * @param {Object} def  authored vendor definition
 * @returns {import('./schema.js').Vendor & Object}
 */
export function normalizeVendor(def) {
  const problems = [];
  const id = def.id;
  const since = def.since ?? String(sinceKey(def.updateLabel).join('.'));

  const v = {
    id,
    since,
    sinceKey: sinceKey(since),
    badge: def.badge ?? def.updateLabel ?? '',
    family: def.family ?? FAMILY_DEFAULT,
    title: def.title ?? def.name ?? '',
    localeGroup: def.localeGroup ?? id,
    missionMinutes: Number.isFinite(def.missionMinutes) && def.missionMinutes > 0 ? def.missionMinutes : null,
    runModel: MISSION_RUN_MODELS.includes(def.runModel) ? def.runModel : 'parallel',
    currencies: (def.currencies ?? []).map((c) => ({
      id: c.id, label: c.label ?? c.name ?? c.id, nameKey: c.nameKey,
    })),
    categories: (def.categories ?? []).map((c, i) =>
      typeof c === 'string'
        ? { id: c, order: i }
        : { id: c.id, order: c.sortOrder ?? i, nameKey: c.nameKey }),
    parents: (def.parents ?? []).map((p) => ({
      id: p.id, categoryId: p.categoryId, type: p.type, name: p.name, nameKey: p.nameKey,
    })),
    items: [],
    byId: new Map(),
    parentById: new Map(),
    problems,
  };

  const currencyIds = new Set(v.currencies.map((c) => c.id));
  const categoryIds = new Set(v.categories.map((c) => c.id));
  v.parents.forEach((p) => v.parentById.set(p.id, p));

  for (const p of v.parents) {
    if (!categoryIds.has(p.categoryId)) problems.push(`parent ${p.id}: unknown category "${p.categoryId}"`);
  }

  const checkCost = (itemId, cost) => {
    const keys = Object.keys(cost.amounts);
    if (!keys.length) problems.push(`${itemId}: empty cost`);
    for (const [cur, amt] of Object.entries(cost.amounts)) {
      if (!currencyIds.has(cur)) problems.push(`${itemId}: unknown currency "${cur}"`);
      if (!(Number.isFinite(amt) && amt >= 0)) problems.push(`${itemId}: invalid amount for ${cur}`);
    }
  };

  for (const raw of def.items ?? []) {
    if (!KINDS.includes(raw.kind)) { problems.push(`${raw.id}: unknown kind "${raw.kind}"`); continue; }
    if (v.byId.has(raw.id)) { problems.push(`duplicate item id "${raw.id}"`); continue; }

    const item = {
      id: raw.id,
      kind: raw.kind,
      vendorId: id,
      label: raw.label ?? raw.name,
      nameKey: raw.nameKey,
      limit: normLimit(raw.limit, raw.id, problems),
      target: Number.isFinite(raw.target) ? raw.target : undefined,
    };

    const acts = normActions(raw.actions, raw.id, problems);
    item.actions = acts ?? [];
    item.actionsMissing = !acts;
    const buyable = item.actions.includes('bought');
    if (item.limit && !buyable) {
      problems.push(`${raw.id}: a limit only counts purchases, but 'bought' is not in actions - ignoring the limit`);
      item.limit = null;
    }

    if (raw.kind === 'part') {
      const parent = v.parentById.get(raw.parentId);
      if (!parent) problems.push(`${raw.id}: unknown parent "${raw.parentId}"`);
      item.parentId = raw.parentId;
      item.slot = raw.slot;
      item.crossParent = raw.crossParent;
      item.categoryId = parent?.categoryId ?? raw.categoryId;
      item.cost = normCost(raw.cost, raw.costs, raw.costMode);
      if (item.limit) { problems.push(`${raw.id}: limits apply to arcane/stock items only`); item.limit = null; }
    } else if (raw.kind === 'arcane') {
      item.categoryId = raw.categoryId;
      item.name = raw.name;
      item.maxCopies = raw.maxCopies ?? 21;
      const at = raw.costAt ?? (raw.costAtOwnedCount
        ? (n) => asCost(raw.costAtOwnedCount(n))
        : () => normCost(raw.cost, raw.costs, raw.costMode));
      item.costAt = (n) => asCost(at(n));
      item.cost = item.costAt(0);
      item.uid = raw.uid ?? ARCANE_UID[raw.name];
      if (!item.uid) problems.push(`${raw.id}: no uniqueName mapping for "${raw.name}" - using a vendor-local count`);
      if (buyable) for (let n = 0; n < item.maxCopies; n++) checkCost(`${raw.id}@${n}`, item.costAt(n));
    } else {
      item.categoryId = raw.categoryId;
      item.cost = normCost(raw.cost, raw.costs, raw.costMode);
      if (raw.kind === 'unique' && item.limit) {
        problems.push(`${raw.id}: limits apply to arcane/stock items only (use stock())`);
        item.limit = null;
      }
    }

    if (raw.kind !== 'arcane' && buyable) checkCost(raw.id, item.cost);
    if (!categoryIds.has(item.categoryId)) problems.push(`${raw.id}: unknown category "${item.categoryId}"`);

    v.items.push(item);
    v.byId.set(item.id, item);
  }

  // Category -> items, in authored order, categories in declared order.
  v.categories.sort((a, b) => a.order - b.order);
  v.sections = v.categories
    .map((cat) => ({ category: cat, items: v.items.filter((i) => i.categoryId === cat.id) }))
    .filter((s) => s.items.length);

  return v;
}
