// src/vendors/store.js
// Runtime state + every mutation. All rules live in model/*; this file only
// wires them to storage and to shared Arcane ownership.
//
// Guarantees
//   - Mutations run one at a time (a queue), so two quick clicks can never
//     interleave their read-modify-write.
//   - Each mutation is a function of the CURRENT state, and ledger operations
//     are idempotent ("make this slot Bought" twice changes nothing).
//   - Arcane counts are written to the shared ownership object as absolute
//     values, then the vendor ledger is updated.

import { getVendorState, setVendorState } from '../lib/storage.js';
import { VENDORS, getVendor, defaultVendor } from './registry.js';
import { statusOfVendor } from './availability.js';
import * as L from './model/ledger.js';
import { migrateVendor, writeMirrors } from './model/migrate.js';
import { copiesNeeded, partSlots } from './schema.js';
import * as own from './ownership.js';

// ── State ──────────────────────────────────────────────────────────────────

export const store = {
  vendors: {},            // vendorId -> per-vendor state (v2)
  selectedVendorId: null,
  ui: loadUi(),           // device-local view preferences (not synced)
};

const listeners = new Set();
export const subscribe = (fn) => { listeners.add(fn); return () => listeners.delete(fn); };
const emit = () => listeners.forEach((fn) => fn());

// Monotonic millisecond clock, so records made in the same ms still order.
let lastStamp = 0;
export const stamp = () => (lastStamp = Math.max(Date.now(), lastStamp + 1));

export const stateOf = (vendorId) => store.vendors[vendorId] ?? L.emptyVendorState();

export function arcaneCount(vs, item) {
  if (item.uid && own.available()) return own.peek(item.uid);
  return Number(vs.arcaneLocal?.[item.id]) || 0;
}

/** Read-only context the model/ui need (clock + Arcane counts). */
export const ctxFor = (vs) => ({ now: Date.now(), arcaneCount: (item) => arcaneCount(vs, item) });

// ── Device-local UI preferences ────────────────────────────────────────────

const UI_KEY = 'wf-vendors-ui';

function loadUi() {
  try {
    const u = JSON.parse(localStorage.getItem(UI_KEY) || '{}');
    return { selected: u.selected ?? null, collapsedFamilies: u.collapsedFamilies ?? {}, collapsedCats: u.collapsedCats ?? {}, filter: u.filter ?? 'all', showExpired: u.showExpired === true };
  } catch {
    return { selected: null, collapsedFamilies: {}, collapsedCats: {}, filter: 'all', showExpired: false };
  }
}

export function saveUi() {
  try { localStorage.setItem(UI_KEY, JSON.stringify(store.ui)); } catch { /* storage unavailable */ }
}

export function selectVendor(id) {
  store.selectedVendorId = id;
  store.ui.selected = id;
  saveUi();
  emit();
}

// ── Queue + persistence ────────────────────────────────────────────────────

let chain = Promise.resolve();
const enqueue = (fn) => {
  const run = chain.then(fn, fn);
  chain = run.catch(() => {});
  return run;
};

const persist = () => setVendorState(store.vendors);

function finalize(vs, vendor) {
  writeMirrors(vs, vendor, (c) => L.balance(vs, c), (item) => arcaneCount(vs, item));
}

async function mutate(vendorId, fn) {
  return enqueue(async () => {
    const vendor = getVendor(vendorId);
    if (!vendor) return { ok: false, reason: 'vendor' };
    const vs = (store.vendors[vendorId] ??= L.emptyVendorState());
    let res;
    try {
      res = await fn(vs, vendor, stamp);
      if (res?.changed) {
        finalize(vs, vendor);
        await persist();
      }
    } catch (err) {
      console.error('[vendors] action failed:', err);
      res = { ok: false, reason: 'error' };
    }
    emit();
    return res ?? { ok: true };
  });
}

// ── Load ───────────────────────────────────────────────────────────────────

/** Reload from storage (also after a Drive pull), migrating v1 state. */
export function reload() {
  return enqueue(async () => {
    await own.ready();
    const raw = (await getVendorState()) ?? {};
    const out = {};
    let dirty = false;
    const t0 = stamp();
    for (const [id, v] of Object.entries(raw)) {
      const vendor = getVendor(id);
      if (vendor && v?.v !== 2) { out[id] = migrateVendor(v, vendor, t0); dirty = true; }
      else out[id] = v;
    }

    // One-time: fold the old vendor-local Arcane counts into the shared
    // ownership (never lowers a count).
    if (own.available()) {
      for (const vendor of VENDORS) {
        const vs = out[vendor.id];
        if (!vs || vs.arcaneSynced) continue;
        for (const item of vendor.items) {
          if (item.kind !== 'arcane' || !item.uid) continue;
          const legacy = Math.min(item.maxCopies, Number(vs.arcaneLocal?.[item.id]) || 0);
          if (legacy > own.peek(item.uid)) await own.setCount(item.uid, legacy);
        }
        vs.arcaneSynced = true;
        dirty = true;
      }
    }

    store.vendors = out;
    for (const vendor of VENDORS) if (out[vendor.id]) finalize(out[vendor.id], vendor);

    if (!store.selectedVendorId || !getVendor(store.selectedVendorId)) {
      // A saved selection that has since ended falls back to the newest active vendor
      // (unless the user chose to show ended vendors).
      const saved = getVendor(store.ui.selected);
      const usable = saved && (store.ui.showExpired || statusOfVendor(saved) !== 'ended');
      store.selectedVendorId = usable ? saved.id : defaultVendor()?.id ?? null;
    }
    if (dirty) await setVendorState(out, { fromSync: true });   // migration is not a user edit
    emit();
  });
}

// ── Actions ────────────────────────────────────────────────────────────────

/** Slot ids an item currently tracks (parts: Copy 1/2 by mode; unique: one). */
export function slotsOf(vendor, vs, item) {
  if (item.kind === 'unique') return ['u'];
  if (item.kind === 'part') return partSlots(copiesNeeded(vendor.parentById.get(item.parentId), vs.mode));
  return [];
}

/** Part / unique: set a slot to none | owned | drop | bought (+currency). */
export const setStatus = (vendorId, itemId, slot, want) =>
  mutate(vendorId, (vs, vendor, now) => {
    const item = vendor.byId.get(itemId);
    if (!item || !['part', 'unique'].includes(item.kind)) return { ok: false, reason: 'item' };
    if (want.how !== 'none' && !item.actions.includes(want.how)) return { ok: false, reason: 'action' };
    if (!slotsOf(vendor, vs, item).includes(slot) && !(item.kind === 'part' && slot === 'c2')) {
      return { ok: false, reason: 'slot' };
    }
    return L.setSlotStatus(vs, item, slot, want, now());
  });

/** Arcane / stock: add one copy, bought (+currency) or dropped. */
export const addCopy = (vendorId, itemId, how, currency) =>
  mutate(vendorId, async (vs, vendor, now) => {
    const item = vendor.byId.get(itemId);
    if (!item || !['arcane', 'stock'].includes(item.kind)) return { ok: false, reason: 'item' };
    if (!item.actions.includes(how)) return { ok: false, reason: 'action' };
    const have = item.kind === 'arcane' ? arcaneCount(vs, item) : 0;
    if (item.kind === 'arcane' && have >= item.maxCopies) return { ok: false, reason: 'max' };
    const cost = item.kind === 'arcane' ? item.costAt(have) : item.cost;
    const r = L.addCopy(vs, item, { how, currency, cost, at: now() });
    if (!r.ok) return r;
    if (item.kind === 'arcane') {
      try { await writeArcane(vs, item, have + 1); }
      catch (err) { L.removeRecord(vs, r.pid); throw err; }
    }
    return r;
  });

/** Arcane / stock: undo the latest copy (refunds what it recorded). */
export const undoCopy = (vendorId, itemId) =>
  mutate(vendorId, async (vs, vendor, now) => {
    const item = vendor.byId.get(itemId);
    if (!item || !['arcane', 'stock'].includes(item.kind)) return { ok: false, reason: 'item' };
    const have = item.kind === 'arcane' ? arcaneCount(vs, item) : 0;
    if (item.kind === 'arcane' && have <= 0 && !L.activeCopies(vs, item.id).length) return { ok: true, changed: false };
    const r = L.undoCopy(vs, item.id, now());
    if (item.kind === 'arcane' && have > 0) { await writeArcane(vs, item, have - 1); return { ok: true, changed: true }; }
    return r;
  });

/** Arcane: type an exact count (a correction: no currency changes). */
export const setArcaneCount = (vendorId, itemId, value) =>
  mutate(vendorId, async (vs, vendor) => {
    const item = vendor.byId.get(itemId);
    if (!item || item.kind !== 'arcane') return { ok: false, reason: 'item' };
    const n = Math.max(0, Math.min(item.maxCopies, Math.floor(Number(value) || 0)));
    if (n === arcaneCount(vs, item)) return { ok: true, changed: false };
    await writeArcane(vs, item, n);
    return { ok: true, changed: true };
  });

async function writeArcane(vs, item, n) {
  if (item.uid && own.available()) await own.setCount(item.uid, n);
  else (vs.arcaneLocal ??= {})[item.id] = n;
}

export const setBalance = (vendorId, cur, value) =>
  mutate(vendorId, (vs, _v, now) => { L.setBalance(vs, cur, value, now()); return { ok: true, changed: true }; });

export const setYield = (vendorId, cur, value) =>
  mutate(vendorId, (vs) => {
    const n = Number(value);
    vs.yields[cur] = Number.isFinite(n) && n > 0 ? n : 0;
    return { ok: true, changed: true };
  });

export const setMinutes = (vendorId, value) =>
  mutate(vendorId, (vs) => {
    const n = Number(value);
    if (Number.isFinite(n) && n > 0) vs.minutes = n; else delete vs.minutes;
    return { ok: true, changed: true };
  });

export const setWarframeMode = (vendorId, parentId, mode) =>
  mutate(vendorId, (vs) => {
    if (!['keep', 'subsume'].includes(mode)) return { ok: false };
    vs.mode[parentId] = mode;
    return { ok: true, changed: true };
  });

export const setPayWith = (vendorId, value) =>
  mutate(vendorId, (vs) => { vs.payWith = value || 'auto'; return { ok: true, changed: true }; });
