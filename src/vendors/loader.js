// src/vendors/loader.js
// Loads vendor state from storage, provides mutation functions, and saves.

import { getVendorState, setVendorState } from '../lib/storage.js';
import { state } from './state.js';
import { VENDORS } from './registry.js';
import { getWarframeMode } from './schema.js';

// ─── Load ──────────────────────────────────────────────────────────────

export async function loadVendorState() {
  const stored = await getVendorState();
  state.vendorState = stored || {};
  if (!state.selectedVendorId && VENDORS.length) {
    state.selectedVendorId = VENDORS[VENDORS.length - 1].id;
  }
  return state.vendorState;
}

async function saveVendorState() {
  await setVendorState(state.vendorState);
}

// ─── Update helpers ─────────────────────────────────────────────────

async function updateVendor(vendorId, updater) {
  const vendor = state.vendorState[vendorId] || getDefaultVendorState();
  const updated = updater(vendor);
  state.vendorState[vendorId] = updated;
  await saveVendorState();
}

function getDefaultVendorState() {
  return {
    currencyInventory: {},
    warframeMode: {},
    partProgress: {},
    uniqueProgress: {},
    arcaneProgress: {},
    avgYield: {},
    acquisitionChoice: {},   // { itemId: { currency: string|null, type: 'paid'|'drop' } }
    acqDismissed: {},        // { itemId: true } — panel was shown and dismissed (timer or button),
                              // independent of whether a choice was ever recorded. Persists across
                              // reloads so a missed/timed-out panel never reappears on its own.
  };
}

// Helper: find an item by id across all vendor items
function findItem(vendorId, itemId) {
  const vendor = VENDORS.find(v => v.id === vendorId);
  if (!vendor) return null;
  return vendor.items.find(i => i.id === itemId);
}

// ─── Part progress ─────────────────────────────────────────────────

export async function togglePartCopy(vendorId, itemId, copyNumber, checked) {
  await updateVendor(vendorId, (vendor) => {
    const progress = vendor.partProgress || {};
    const entry = progress[itemId] || { copy1: false };
    if (copyNumber === 1) entry.copy1 = !!checked;
    else if (copyNumber === 2) entry.copy2 = !!checked;
    progress[itemId] = entry;
    vendor.partProgress = progress;

    // If unchecking, clear acquisition choice and refund any paid cost.
    // copy2 uses its own choice key (itemId__copy2).
    if (!checked) {
      const choiceKey = copyNumber === 2 ? `${itemId}__copy2` : itemId;
      const oldChoice = vendor.acquisitionChoice?.[choiceKey];
      if (oldChoice?.type === 'paid' && oldChoice.currency) {
        const item = findItem(vendorId, itemId);
        if (item) {
          const inv = vendor.currencyInventory || {};
          const cost = item.costs?.[oldChoice.currency] ?? 0;
          inv[oldChoice.currency] = (inv[oldChoice.currency] || 0) + cost;
          vendor.currencyInventory = inv;
        }
      }
      if (vendor.acquisitionChoice) {
        delete vendor.acquisitionChoice[choiceKey];
      }
      if (vendor.acqDismissed) {
        delete vendor.acqDismissed[choiceKey];
      }
    }
    return vendor;
  });
}

// ─── Unique progress ─────────────────────────────────────────────────

export async function toggleUnique(vendorId, itemId, checked) {
  await updateVendor(vendorId, (vendor) => {
    const progress = vendor.uniqueProgress || {};
    progress[itemId] = !!checked;
    vendor.uniqueProgress = progress;

    if (!checked) {
      const oldChoice = vendor.acquisitionChoice?.[itemId];
      if (oldChoice?.type === 'paid') {
        const item = findItem(vendorId, itemId);
        if (item) {
          const inv = vendor.currencyInventory || {};
          if (oldChoice.currency) {
            // choice item: refund only the chosen currency
            const cost = item.costs?.[oldChoice.currency] ?? 0;
            inv[oldChoice.currency] = (inv[oldChoice.currency] || 0) + cost;
          } else {
            // sum item: refund all currencies
            for (const [curr, cost] of Object.entries(item.costs)) {
              inv[curr] = (inv[curr] || 0) + cost;
            }
          }
          vendor.currencyInventory = inv;
        }
      }
      if (vendor.acquisitionChoice) {
        delete vendor.acquisitionChoice[itemId];
      }
      if (vendor.acqDismissed) {
        delete vendor.acqDismissed[itemId];
      }
    }
    return vendor;
  });
}

// ─── Arcane progress ─────────────────────────────────────────────────

export async function setArcaneCount(vendorId, itemId, ownedCount) {
  const count = Math.max(0, Math.min(ownedCount, 21));

  await updateVendor(vendorId, (vendor) => {
    const progress = vendor.arcaneProgress || {};
    progress[itemId] = count;
    vendor.arcaneProgress = progress;

    const vendorData = VENDORS.find(v => v.id === vendorId);
    const item = vendorData?.items.find(i => i.id === itemId);
    const maxCopies = item?.maxCopies || 21;

    // If no longer fully owned, clear acquisition choice and refund any paid cost
    if (count < maxCopies && vendor.acquisitionChoice?.[itemId]) {
      const oldChoice = vendor.acquisitionChoice[itemId];
      if (oldChoice && oldChoice.type === 'paid' && item && item.kind === 'arcane') {
        const inv = vendor.currencyInventory || {};
        const totalCosts = {};
        for (let i = 0; i < maxCopies; i++) {
          const costMap = item.costAtOwnedCount(i);
          for (const [curr, amt] of Object.entries(costMap)) {
            totalCosts[curr] = (totalCosts[curr] || 0) + amt;
          }
        }
        for (const [curr, amt] of Object.entries(totalCosts)) {
          inv[curr] = (inv[curr] || 0) + amt;
        }
        vendor.currencyInventory = inv;
      }
      delete vendor.acquisitionChoice[itemId];
    }
    if (count < maxCopies && vendor.acqDismissed?.[itemId]) {
      delete vendor.acqDismissed[itemId];
    }

    return vendor;
  });
}

// ─── Currency inventory ──────────────────────────────────────────────

export async function setCurrencyInventory(vendorId, currencyId, amount) {
  const num = Number(amount) || 0;
  await updateVendor(vendorId, (vendor) => {
    const inv = vendor.currencyInventory || {};
    inv[currencyId] = num;
    vendor.currencyInventory = inv;
    return vendor;
  });
}

// ─── Warframe mode ──────────────────────────────────────────────────

export async function setWarframeMode(vendorId, warframeId, mode) {
  if (!['keep', 'subsume'].includes(mode)) return;
  await updateVendor(vendorId, (vendor) => {
    const modes = vendor.warframeMode || {};
    modes[warframeId] = mode;
    vendor.warframeMode = modes;
    return vendor;
  });
}

// ─── Average yield ──────────────────────────────────────────────────

export async function setAverageYield(vendorId, currencyId, yieldPerRun) {
  const num = Number(yieldPerRun) || 0;
  await updateVendor(vendorId, (vendor) => {
    const yields = vendor.avgYield || {};
    yields[currencyId] = num;
    vendor.avgYield = yields;
    return vendor;
  });
}

// ─── Select vendor ──────────────────────────────────────────────────

export function selectVendor(vendorId) {
  state.selectedVendorId = vendorId;
}

// ─── Planner computation (derived) ─────────────────────────────────

export function computePlanner(vendorId) {
  const vendorData = VENDORS.find(v => v.id === vendorId);
  if (!vendorData) return null;

  const vendorState = state.vendorState[vendorId] || getDefaultVendorState();
  const { currencyInventory, warframeMode, partProgress, uniqueProgress, arcaneProgress, avgYield, acquisitionChoice } = vendorState;

  // Helper: how many copies of a warframe part are needed given current mode.
  // Weapon parts always need exactly 1.
  const copiesNeeded = (item) => {
    if (item.parentType !== 'warframe') return 1;
    const parent = vendorData.parents.find(p => p.id === item.parentId);
    if (!parent) return 1;
    return getWarframeMode(parent.id, warframeMode) === 'subsume' ? 2 : 1;
  };

  // Helper: how many copies of a part the player has already obtained.
  const copiesOwned = (item) => {
    const entry = partProgress?.[item.id];
    if (!entry) return 0;
    return (entry.copy1 ? 1 : 0) + (entry.copy2 ? 1 : 0);
  };

  // Add item.costs to an accumulator for each unowned copy.
  // For choice-mode items, costs are added to ALL currencies — the currency
  // selection only affects which inventory bucket is deducted, not the total shown.
  const addCosts = (acc, costs, copies = 1) => {
    for (let i = 0; i < copies; i++) {
      for (const [curr, amt] of Object.entries(costs)) {
        acc[curr] = (acc[curr] || 0) + amt;
      }
    }
  };

  const remainingCost = {};
  const totalCost = {};

  // ── Parts ──
  for (const item of vendorData.items) {
    if (item.kind !== 'part') continue;
    const needed = copiesNeeded(item);
    const owned  = copiesOwned(item);

    // totalCost: full cost × copies needed
    addCosts(totalCost, item.costs, needed);

    // remainingCost: cost × still-needed copies
    const stillNeeded = Math.max(0, needed - owned);
    if (stillNeeded > 0) addCosts(remainingCost, item.costs, stillNeeded);
  }

  // ── Uniques ──
  for (const item of vendorData.items) {
    if (item.kind !== 'unique') continue;
    addCosts(totalCost, item.costs);
    if (!uniqueProgress?.[item.id]) addCosts(remainingCost, item.costs);
  }

  // ── Arcanes ──
  for (const item of vendorData.items) {
    if (item.kind !== 'arcane') continue;
    const owned = arcaneProgress?.[item.id] || 0;
    for (let i = 0; i < item.maxCopies; i++) {
      addCosts(totalCost, item.costAtOwnedCount(i));
    }
    for (let i = owned; i < item.maxCopies; i++) {
      addCosts(remainingCost, item.costAtOwnedCount(i));
    }
  }

  const inventory = currencyInventory || {};
  const remainingAfterInventory = {};
  for (const [curr, total] of Object.entries(remainingCost)) {
    remainingAfterInventory[curr] = Math.max(0, total - (inventory[curr] || 0));
  }

  const yields = avgYield || {};
  const RUN_TIME_MINUTES = 13;
  const runs = {};
  const hours = {};
  for (const [curr, remaining] of Object.entries(remainingAfterInventory)) {
    const yld = yields[curr] || 0;
    if (yld <= 0) {
      runs[curr]  = Infinity;
      hours[curr] = Infinity;
    } else {
      runs[curr]  = remaining / yld;
      hours[curr] = (runs[curr] * RUN_TIME_MINUTES) / 60;
    }
  }

  return {
    remainingCost,
    remainingAfterInventory,
    runs,
    hours,
    totalCost,
  };
}

// ─── Acquisition panel dismissal (timer expiry or button click) ─────────

// Marks the acquisition panel for this item/copy as dismissed so it never
// reappears on subsequent renders, independent of whether a choice was
// ever recorded (covers the "timer ran out, no choice made" case).
export async function dismissAcquisitionPanel(vendorId, itemId) {
  await updateVendor(vendorId, (vendor) => {
    const dismissed = vendor.acqDismissed || {};
    dismissed[itemId] = true;
    vendor.acqDismissed = dismissed;
    return vendor;
  });
}

// ─── Acquisition choice ──────────────────────────────────────────────

export async function setAcquisitionChoice(vendorId, itemId, choice) {
  // choice: { currency: string|null, type: 'paid'|'drop' }
  // - choice items:  currency is set — deduct/refund only that currency
  // - sum items:     currency is null — deduct/refund all currencies
  // - drop:          no inventory change either way
  await updateVendor(vendorId, (vendor) => {
    const oldChoice = vendor.acquisitionChoice?.[itemId];
    const choices = vendor.acquisitionChoice || {};

    // Refund the old paid cost if any
    if (oldChoice?.type === 'paid') {
      const item = findItem(vendorId, itemId);
      if (item) {
        const inv = vendor.currencyInventory || {};
        if (oldChoice.currency) {
          // choice item: refund only the previously chosen currency
          const cost = item.costs?.[oldChoice.currency] ?? 0;
          inv[oldChoice.currency] = (inv[oldChoice.currency] || 0) + cost;
        } else {
          // sum item: refund all currencies
          for (const [curr, cost] of Object.entries(item.costs)) {
            inv[curr] = (inv[curr] || 0) + cost;
          }
        }
        vendor.currencyInventory = inv;
      }
    }

    // Deduct the new paid cost
    if (choice.type === 'paid') {
      const item = findItem(vendorId, itemId);
      if (item) {
        const inv = vendor.currencyInventory || {};
        if (choice.currency) {
          // choice item: deduct only the chosen currency
          const cost = item.costs?.[choice.currency] ?? 0;
          inv[choice.currency] = (inv[choice.currency] || 0) - cost;
        } else {
          // sum item: deduct all currencies
          for (const [curr, cost] of Object.entries(item.costs)) {
            inv[curr] = (inv[curr] || 0) - cost;
          }
        }
        vendor.currencyInventory = inv;
      }
    }

    choices[itemId] = choice;
    vendor.acquisitionChoice = choices;
    return vendor;
  });
}