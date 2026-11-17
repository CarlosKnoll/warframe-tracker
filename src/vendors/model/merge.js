// src/vendors/model/merge.js
// Drive-sync merge for vendorState. Replaces mergeVendorState() in lib/sync.js.
//
//   records  union by id; an undo (voidedAt) on either side wins
//   wallet   newest typed balance per currency wins
//   others   (yields, mode, minutes, payWith) newest side wins per key
//   v1 input is migrated first, so mixed-version devices still merge
//
// Unlike the old merge, nothing is dropped: every field survives.

import { migrateVendor, writeMirrors } from './migrate.js';
import { emptyVendorState, balance } from './ledger.js';
import { getVendor } from '../registry.js';

const minDefined = (a, b) => (a && b ? Math.min(a, b) : a || b || undefined);

function toV2(vs, id, now) {
  if (!vs || vs.v === 2) return vs;
  const vendor = getVendor(id);
  return vendor ? migrateVendor(vs, vendor, now) : vs;
}

export function mergeVendorStates(l, r, localIsNewer) {
  const newer = localIsNewer ? l : r;
  const older = localIsNewer ? r : l;
  const out = emptyVendorState();

  // wallet: highest `at` wins
  for (const cur of new Set([...Object.keys(l.wallet ?? {}), ...Object.keys(r.wallet ?? {})])) {
    const a = l.wallet?.[cur], b = r.wallet?.[cur];
    out.wallet[cur] = !a ? b : !b ? a : (b.at > a.at ? b : a.at > b.at ? a : (newer.wallet?.[cur] ?? a));
  }

  // records: union, void-wins
  for (const pid of new Set([...Object.keys(l.records ?? {}), ...Object.keys(r.records ?? {})])) {
    const a = l.records?.[pid], b = r.records?.[pid];
    if (!a || !b) { out.records[pid] = { ...(a ?? b) }; continue; }
    const base = { ...(newer.records?.[pid] ?? a) };
    const voided = minDefined(a.voidedAt, b.voidedAt);
    if (voided) base.voidedAt = voided; else delete base.voidedAt;
    out.records[pid] = base;
  }

  // keyed settings: older first, newer overwrites
  for (const k of ['yields', 'mode']) out[k] = { ...(older[k] ?? {}), ...(newer[k] ?? {}) };
  out.arcaneLocal = { ...(older.arcaneLocal ?? {}) };
  for (const [k, n] of Object.entries(newer.arcaneLocal ?? {})) {
    out.arcaneLocal[k] = Math.max(out.arcaneLocal[k] ?? 0, n);
  }
  out.payWith = newer.payWith ?? older.payWith ?? 'auto';
  const minutes = newer.minutes ?? older.minutes;
  if (minutes !== undefined) out.minutes = minutes;
  out.arcaneSynced = !!(l.arcaneSynced && r.arcaneSynced);
  return out;
}

/**
 * Drop-in for sync.js: (localState, remoteState, localIsNewer) -> merged state.
 * Vendors only one side knows are kept as they are.
 */
export function mergeVendorState(local, remote, localIsNewer, now = Date.now()) {
  const L = local ?? {}, R = remote ?? {};
  const out = {};
  for (const id of new Set([...Object.keys(L), ...Object.keys(R)])) {
    const a = toV2(L[id], id, now), b = toV2(R[id], id, now);
    if (!a || !b) { out[id] = a ?? b; continue; }
    if (a.v !== 2 || b.v !== 2) { out[id] = localIsNewer ? a : b; continue; }   // unknown vendor, v1 on both
    const merged = mergeVendorStates(a, b, localIsNewer);
    const vendor = getVendor(id);
    if (vendor) writeMirrors(merged, vendor, (c) => balance(merged, c), (item) => merged.arcaneLocal?.[item.id] ?? 0);
    out[id] = merged;
  }
  return out;
}
