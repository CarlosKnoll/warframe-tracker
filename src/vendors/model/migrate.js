// src/vendors/model/migrate.js
// v1 (partProgress/uniqueProgress/acquisitionChoice/currencyInventory...) ->
// v2 (wallet + purchase records), and the reverse "mirror" fields.
//
// Migration is idempotent and derived only from the legacy fields, so it is
// safe to re-run on state that an older client has rewritten.

import { emptyVendorState, addRecord } from './ledger.js';
import { copiesNeeded } from '../schema.js';

/**
 * @param {Object} legacy  stored v1 vendor state (or anything without v:2)
 * @param {Object} vendor  normalised catalog vendor
 * @param {number} at      timestamp for migrated records / balances
 */
export function migrateVendor(legacy, vendor, at) {
  const vs = emptyVendorState();
  const l = legacy ?? {};

  // The old inventory WAS the live balance, so it becomes the typed balance.
  for (const [cur, val] of Object.entries(l.currencyInventory ?? {})) {
    vs.wallet[cur] = { value: Number(val) || 0, at };
  }
  Object.assign(vs.yields, l.avgYield ?? {});
  Object.assign(vs.mode, l.warframeMode ?? {});
  Object.assign(vs.arcaneLocal, l.arcaneProgress ?? {});
  vs.arcaneSynced = false;

  const choices = l.acquisitionChoice ?? {};

  const migrateSlot = (item, slot, choiceKey) => {
    const ch = choices[choiceKey];
    if (ch?.type === 'drop') {
      addRecord(vs, { item: item.id, slot, how: 'drop', at });
    } else if (ch?.type === 'paid') {
      const amounts = ch.currency
        ? (item.cost.amounts[ch.currency] != null ? { [ch.currency]: item.cost.amounts[ch.currency] } : {})
        : { ...item.cost.amounts };
      // `at` equals the typed-balance time, so the old (already deducted) price
      // is not charged twice, but a later undo still refunds it.
      // Second copies were never charged by the old code (nb = not billed), so
      // undoing them must not refund money that was never taken.
      addRecord(vs, { item: item.id, slot, how: 'bought', paid: amounts, at, nb: slot === 'c2' });
    } else {
      addRecord(vs, { item: item.id, slot, how: 'owned', at });
    }
  };

  for (const item of vendor.items) {
    if (item.kind === 'part') {
      const entry = l.partProgress?.[item.id];
      if (entry?.copy1) migrateSlot(item, 'c1', item.id);
      if (entry?.copy2) migrateSlot(item, 'c2', `${item.id}__copy2`);
    } else if (item.kind === 'unique') {
      if (l.uniqueProgress?.[item.id]) migrateSlot(item, 'u', item.id);
    }
  }
  return vs;
}

/**
 * Write the v1-shaped fields next to the v2 data so an older client that
 * syncs this state still shows ownership, balances and yields. Remove once
 * every client runs the new module.
 */
export function writeMirrors(vs, vendor, balanceOf, arcaneCountOf) {
  const inv = {};
  for (const c of vendor.currencies) inv[c.id] = balanceOf(c.id);
  vs.currencyInventory = inv;
  vs.avgYield = { ...vs.yields };
  vs.warframeMode = { ...vs.mode };

  const parts = {}, uniques = {}, arcanes = {};
  for (const item of vendor.items) {
    if (item.kind === 'part') {
      const n = copiesNeeded(vendor.parentById.get(item.parentId), vs.mode);
      const has = (slot) => Object.values(vs.records).some((r) => r.item === item.id && r.slot === slot && !r.voidedAt);
      if (has('c1') || (n > 1 && has('c2'))) parts[item.id] = { copy1: has('c1'), ...(n > 1 ? { copy2: has('c2') } : {}) };
    } else if (item.kind === 'unique') {
      if (Object.values(vs.records).some((r) => r.item === item.id && !r.voidedAt)) uniques[item.id] = true;
    } else if (item.kind === 'arcane') {
      const c = arcaneCountOf(item);
      if (c > 0) arcanes[item.id] = c;
    }
  }
  vs.partProgress = parts;
  vs.uniqueProgress = uniques;
  vs.arcaneProgress = arcanes;
  return vs;
}
