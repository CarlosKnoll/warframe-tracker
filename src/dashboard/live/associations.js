// src/dashboard/live/associations.js
// Curated links from a live event/alert to the vendor that belongs to it. Matching is by
// rule (not by event id: ids are generated when the event spawns, so they cannot be known
// when the vendor is authored).
//
// To add one for a new event: play with the console open — each new event logs
// "[live] event seen { tag, title, ... }". Match on that `tag` where possible.
// A rule may also carry `itemId` to scroll straight to one item in the vendor.

import { getVendor } from '../../vendors/registry.js';

const RULES = [
  // Epoch Operation: Taubound (ended 2026-11-17). Matched on tag OR title because the real
  // tag was never observed; tighten this to the tag if the event ever returns.
  { vendorId: 'praghasa', match: (e) => e.kind === 'event' && /taubound/i.test(`${e.tag ?? ''} ${e.title ?? ''}`) },
];

/** @returns {{vendorId: string, itemId: string|null} | null} */
export function vendorLinkFor(entry) {
  for (const rule of RULES) {
    let hit = false;
    try { hit = Boolean(rule.match(entry)); } catch { /* a bad rule never breaks the strip */ }
    if (hit && getVendor(rule.vendorId)) return { vendorId: rule.vendorId, itemId: rule.itemId ?? null };
  }
  return null;
}
