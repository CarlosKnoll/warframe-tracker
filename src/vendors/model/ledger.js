// src/vendors/model/ledger.js
// Purchase records and currency balance. Pure: every function takes the
// per-vendor state object (`vs`) and mutates/reads only that. No storage, no
// DOM, no clock (callers pass `at`), so the rules are easy to test.
//
// MODEL
//   vs.wallet[cur]  = { value, at }   balance the player typed, and when
//   vs.records[pid] = { item, slot, gen, how, paid, at, voidedAt?, period?, nb? }
//
//   how   'bought' | 'drop' | 'owned'     (owned = got it, source not tracked)
//   paid  { cur: amount }   exactly what was spent (empty unless bought)
//
//   balance(cur) = wallet.value
//                  - paid by active purchases made AFTER the balance was typed
//                  + paid by purchases made BEFORE it that were undone AFTER it
//
// Because a balance is derived from immutable records, an action can never be
// applied twice: setting a status to what it already is changes nothing, and
// an undo refunds the recorded amounts, never the current price list.

import { periodId } from './limits.js';

const isActive = (r) => !r.voidedAt;

export const pidOf = (item, slot, gen) => `${item}:${slot}#${gen}`;

export function emptyVendorState() {
  return { v: 2, wallet: {}, records: {}, yields: {}, mode: {}, payWith: 'auto', arcaneLocal: {} };
}

// ── Records ────────────────────────────────────────────────────────────────

export function recordsFor(vs, itemId, slot) {
  const out = [];
  for (const [pid, r] of Object.entries(vs.records ?? {})) {
    if (r.item === itemId && (slot === undefined || r.slot === slot)) out.push([pid, r]);
  }
  return out;
}

/** Newest non-voided record of an item slot, as [pid, record] or null. */
export function activeRecord(vs, itemId, slot) {
  let best = null;
  for (const [pid, r] of recordsFor(vs, itemId, slot)) {
    if (isActive(r) && (!best || r.gen > best[1].gen)) best = [pid, r];
  }
  return best;
}

function nextGen(vs, itemId, slot) {
  let g = 0;
  for (const [, r] of recordsFor(vs, itemId, slot)) g = Math.max(g, r.gen);
  return g + 1;
}

export function addRecord(vs, { item, slot, how, paid = {}, at, period, nb }) {
  const gen = nextGen(vs, item, slot);
  const pid = pidOf(item, slot, gen);
  const rec = { item, slot, gen, how, paid: { ...paid }, at };
  if (period) rec.period = period;
  if (nb) rec.nb = 1;
  (vs.records ??= {})[pid] = rec;
  return pid;
}

export function voidRecord(vs, pid, at) {
  const r = vs.records?.[pid];
  if (r && !r.voidedAt) r.voidedAt = at;
  return !!r;
}

export function removeRecord(vs, pid) {
  if (vs.records) delete vs.records[pid];
}

// ── Balance ────────────────────────────────────────────────────────────────

export function balance(vs, cur) {
  const w = vs.wallet?.[cur];
  const base = w?.value ?? 0;
  const baseAt = w?.at ?? 0;
  let bal = base;
  for (const r of Object.values(vs.records ?? {})) {
    if (r.nb || r.how !== 'bought') continue;
    const amt = r.paid?.[cur];
    if (!amt) continue;
    if (isActive(r)) {
      if (r.at > baseAt) bal -= amt;                          // spent since the balance was typed
    } else if (r.at <= baseAt && r.voidedAt > baseAt) {
      bal += amt;                                             // typed balance had it deducted; undone later
    }
  }
  return bal;
}

export function setBalance(vs, cur, value, at) {
  const num = Number(value);
  (vs.wallet ??= {})[cur] = { value: Number.isFinite(num) ? num : 0, at };
}

// ── Payment ────────────────────────────────────────────────────────────────

/**
 * What a purchase of `cost` actually spends.
 * 'all' pays every listed currency; 'any' pays exactly one (the one asked for,
 * or the only one if there is just one option).
 */
export function resolvePayment(cost, currency) {
  const entries = Object.entries(cost.amounts);
  if (cost.mode === 'any') {
    let cur = currency;
    if (!cur) {
      if (entries.length !== 1) return { ok: false, reason: 'currency' };
      cur = entries[0][0];
    }
    const amt = cost.amounts[cur];
    if (amt == null) return { ok: false, reason: 'currency' };
    return { ok: true, paid: { [cur]: amt } };
  }
  return { ok: true, paid: { ...cost.amounts } };
}

const samePaid = (a, b) => {
  const ka = Object.keys(a), kb = Object.keys(b);
  return ka.length === kb.length && ka.every((k) => a[k] === b[k]);
};

// ── Limits ─────────────────────────────────────────────────────────────────

/** Purchases counted against an item's limit in the period containing `now`. */
export function usage(vs, item, now, excludePid) {
  if (!item.limit) return { used: 0, max: Infinity, left: Infinity, capped: false };
  const period = periodId(item.limit.reset, now);
  let used = 0;
  for (const [pid, r] of recordsFor(vs, item.id)) {
    if (pid === excludePid || r.how !== 'bought' || !isActive(r)) continue;
    if ((r.period ?? 'perm') === period) used++;
  }
  const left = Math.max(0, item.limit.max - used);
  return { used, max: item.limit.max, left, capped: left === 0 };
}

// ── Slot items (part copies, unique items) ─────────────────────────────────

/**
 * Move one slot to `want` = { how: 'none'|'owned'|'drop'|'bought', currency? }.
 * Handles refund of the old purchase and charge of the new one atomically, and
 * is a no-op when the slot is already in that state.
 * @returns {{ok:boolean, changed?:boolean, reason?:string}}
 */
export function setSlotStatus(vs, item, slot, want, at) {
  const cur = activeRecord(vs, item.id, slot);
  const curRec = cur?.[1];

  if (want.how === 'none') {
    if (!curRec) return { ok: true, changed: false };
    voidRecord(vs, cur[0], at);
    return { ok: true, changed: true };
  }

  let paid = {};
  if (want.how === 'bought') {
    const p = resolvePayment(item.cost, want.currency);
    if (!p.ok) return p;
    paid = p.paid;
  }

  if (curRec && curRec.how === want.how && samePaid(curRec.paid ?? {}, paid)) {
    return { ok: true, changed: false };
  }

  if (cur) voidRecord(vs, cur[0], at);
  addRecord(vs, { item: item.id, slot, how: want.how, paid, at });
  return { ok: true, changed: true };
}

// ── Repeatable items (arcane copies, stock) ────────────────────────────────

const slotSeq = (slot) => Number(String(slot).replace(/^n/, '')) || 0;

function nextSeq(vs, itemId) {
  let s = 0;
  for (const [, r] of recordsFor(vs, itemId)) s = Math.max(s, slotSeq(r.slot));
  return s + 1;
}

export const activeCopies = (vs, itemId) =>
  recordsFor(vs, itemId).filter(([, r]) => isActive(r));

/**
 * Record one more copy. `cost` is the cost of THIS copy.
 * Enforces the item's limit here, in the mutation layer.
 */
export function addCopy(vs, item, { how, currency, cost, at }) {
  let paid = {};
  let period;
  if (how === 'bought') {
    const u = usage(vs, item, at);
    if (u.capped) return { ok: false, reason: 'limit' };
    const p = resolvePayment(cost, currency);
    if (!p.ok) return p;
    paid = p.paid;
    if (item.limit) period = periodId(item.limit.reset, at);
  }
  const pid = addRecord(vs, { item: item.id, slot: `n${nextSeq(vs, item.id)}`, how, paid, at, period });
  return { ok: true, changed: true, pid };
}

/** Undo the most recent active copy (refunds exactly what it spent). */
export function undoCopy(vs, itemId, at) {
  let best = null;
  for (const [pid, r] of activeCopies(vs, itemId)) {
    if (!best || slotSeq(r.slot) > slotSeq(best[1].slot)) best = [pid, r];
  }
  if (!best) return { ok: true, changed: false };
  voidRecord(vs, best[0], at);
  return { ok: true, changed: true, pid: best[0] };
}
