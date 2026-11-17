// src/vendors/model/planner.js
// Everything the planner panel and the vendor selector display, derived from
// (vendor catalog, vendor state, arcane counts). Pure: no storage, no DOM.
//
// Cost handling
//   - Items whose cost mode is 'all' add every listed currency to its need.
//   - Items whose cost mode is 'any' (and have >1 option) are FLEXIBLE: one
//     currency pays for the item. They are allocated to a single currency
//     (the vendor's "pay with" choice, or automatically the currency with the
//     most spare balance) instead of being added to every currency.
//
// Estimates never produce Infinity/NaN: when something needed is missing the
// result carries a `state` ('needs-yield' | 'needs-minutes') for the UI.

import { copiesNeeded, partSlots } from '../schema.js';
import { activeRecord, activeCopies, balance } from './ledger.js';

const add = (acc, amounts, n = 1) => {
  for (const [cur, amt] of Object.entries(amounts)) acc[cur] = (acc[cur] || 0) + amt * n;
};

const isFlexible = (cost) => cost.mode === 'any' && Object.keys(cost.amounts).length > 1;

/** Copies of `item` the player owns (parts/unique: slots, arcane: shared count, stock: records). */
export function ownedCopies(vendor, vs, item, ctx) {
  switch (item.kind) {
    case 'part': {
      const n = copiesNeeded(vendor.parentById.get(item.parentId), vs.mode);
      return partSlots(n).filter((s) => activeRecord(vs, item.id, s)).length;
    }
    case 'unique':
      return activeRecord(vs, item.id, 'u') ? 1 : 0;
    case 'arcane':
      return Math.min(item.maxCopies, ctx.arcaneCount(item));
    case 'stock':
      return activeCopies(vs, item.id).length;
  }
  return 0;
}

/** Copies the item wants in total (what "complete" means). */
export function wantedCopies(vendor, vs, item) {
  switch (item.kind) {
    case 'part': return copiesNeeded(vendor.parentById.get(item.parentId), vs.mode);
    case 'unique': return 1;
    case 'arcane': return item.maxCopies;
    case 'stock': return item.target ?? (item.limit && !item.limit.reset ? item.limit.max : 0);
  }
  return 0;
}

/** { done, total } item counts for progress bars and the Missing/Owned filter. */
export function progressOf(vendor, vs, ctx) {
  let done = 0, total = 0;
  for (const item of vendor.items) {
    const want = wantedCopies(vendor, vs, item);
    if (!want) continue;
    total++;
    if (ownedCopies(vendor, vs, item, ctx) >= want) done++;
  }
  return { done, total };
}

export const isComplete = (vendor, vs, item, ctx) => {
  const want = wantedCopies(vendor, vs, item);
  return want > 0 && ownedCopies(vendor, vs, item, ctx) >= want;
};

/** Mission minutes in effect: the player's override, else the vendor default. */
export function missionMinutes(vendor, vs) {
  const user = Number(vs.minutes);
  if (Number.isFinite(user) && user > 0) return { value: user, source: 'user' };
  if (vendor.missionMinutes) return { value: vendor.missionMinutes, source: 'data' };
  return { value: null, source: null };
}

/** Spread flexible costs over single currencies. */
function allocate(flex, payWith, need, balances) {
  const alloc = {};
  const sorted = [...flex].sort((a, b) => Math.max(...Object.values(b.amounts)) - Math.max(...Object.values(a.amounts)));
  for (const f of sorted) {
    const opts = Object.keys(f.amounts);
    for (let i = 0; i < f.n; i++) {
      let cur;
      if (payWith && payWith !== 'auto' && opts.includes(payWith)) {
        cur = payWith;
      } else {
        // most spare balance after what is already assigned; ties: cheaper, then declared order
        cur = opts.reduce((best, c) => {
          const spare = (balances[c] ?? 0) - (need[c] ?? 0) - (alloc[c] ?? 0);
          const bestSpare = (balances[best] ?? 0) - (need[best] ?? 0) - (alloc[best] ?? 0);
          if (spare > bestSpare) return c;
          if (spare === bestSpare && f.amounts[c] < f.amounts[best]) return c;
          return best;
        }, opts[0]);
      }
      alloc[cur] = (alloc[cur] || 0) + f.amounts[cur];
    }
  }
  return alloc;
}

export function computePlan(vendor, vs, ctx) {
  const balances = {};
  for (const c of vendor.currencies) balances[c.id] = balance(vs, c.id);

  const fixedTotal = {}, fixedRemaining = {};
  const flexTotal = [], flexRemaining = [];

  const put = (cost, totalCopies, remainingCopies) => {
    if (isFlexible(cost)) {
      if (totalCopies > 0) flexTotal.push({ amounts: cost.amounts, n: totalCopies });
      if (remainingCopies > 0) flexRemaining.push({ amounts: cost.amounts, n: remainingCopies });
    } else {
      add(fixedTotal, cost.amounts, totalCopies);
      add(fixedRemaining, cost.amounts, remainingCopies);
    }
  };

  for (const item of vendor.items) {
    if (!item.actions.includes('bought')) continue;       // cannot be bought: no currency demand
    if (item.kind === 'arcane') {
      const owned = Math.min(item.maxCopies, ctx.arcaneCount(item));
      for (let i = 0; i < item.maxCopies; i++) put(item.costAt(i), 1, i >= owned ? 1 : 0);
      continue;
    }
    const want = wantedCopies(vendor, vs, item);
    if (!want) continue;
    const owned = ownedCopies(vendor, vs, item, ctx);
    put(item.cost, want, Math.max(0, want - owned));
  }

  const needFixed = fixedRemaining;
  const alloc = allocate(flexRemaining, vs.payWith, needFixed, balances);

  const { value: minutes, source: minutesSource } = missionMinutes(vendor, vs);

  const rows = vendor.currencies.map((c) => {
    const need = (needFixed[c.id] || 0) + (alloc[c.id] || 0);
    const bal = balances[c.id];
    const short = Math.max(0, need - bal);
    const yld = Number(vs.yields?.[c.id]);
    let runs;
    if (short === 0) runs = { state: 'done', value: 0 };
    else if (Number.isFinite(yld) && yld > 0) runs = { state: 'ok', value: Math.ceil(short / yld) };
    else runs = { state: 'needs-yield', value: null };

    let hours;
    if (runs.state === 'done') hours = { state: 'done', value: 0 };
    else if (runs.state !== 'ok') hours = { state: runs.state, value: null };
    else if (minutes) hours = { state: 'ok', value: (runs.value * minutes) / 60 };
    else hours = { state: 'needs-minutes', value: null };

    return {
      id: c.id,
      balance: bal,
      fixedTotal: fixedTotal[c.id] || 0,
      fixedRemaining: needFixed[c.id] || 0,
      flexRemaining: alloc[c.id] || 0,
      need,
      short,
      yield: Number.isFinite(yld) && yld > 0 ? yld : 0,
      runs,
      hours,
    };
  });

  // Overall estimate. 'parallel' = every currency drops in the same mission
  // (missions = the slowest currency); 'sequential' = each currency needs its
  // own missions (times add up).
  const pending = rows.filter((r) => r.runs.state !== 'done');
  let overall;
  if (!pending.length) {
    overall = { state: 'done', runs: 0, hours: 0 };
  } else if (pending.some((r) => r.runs.state === 'needs-yield')) {
    overall = { state: 'needs-yield', runs: null, hours: null };
  } else if (!minutes) {
    overall = { state: 'needs-minutes', runs: null, hours: null };
  } else if (vendor.runModel === 'sequential') {
    const runs = pending.reduce((s, r) => s + r.runs.value, 0);
    overall = { state: 'ok', runs, hours: (runs * minutes) / 60 };
  } else {
    const runs = Math.max(...pending.map((r) => r.runs.value));
    overall = { state: 'ok', runs, hours: (runs * minutes) / 60 };
  }

  const flexSum = (list, pick) => list.reduce((s, f) => s + pick(Object.values(f.amounts)) * f.n, 0);
  const flexGroups = [];
  const seen = new Map();
  for (const f of flexRemaining) {
    const key = Object.keys(f.amounts).sort().join('|');
    const g = seen.get(key) ?? { options: Object.keys(f.amounts), remaining: 0 };
    g.remaining += Math.min(...Object.values(f.amounts)) * f.n;
    if (!seen.has(key)) { seen.set(key, g); flexGroups.push(g); }
  }

  return {
    rows,
    flex: {
      total: flexSum(flexTotal, (a) => Math.min(...a)),
      remaining: flexSum(flexRemaining, (a) => Math.min(...a)),
      groups: flexGroups,
      has: flexTotal.length > 0 || flexRemaining.length > 0,
    },
    minutes, minutesSource,
    runModel: vendor.runModel,
    overall,
  };
}
