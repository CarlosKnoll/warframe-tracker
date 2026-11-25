// src/dashboard/labels.js
// Strings for the live sections.
//
//   dt(key, fallback, vars)  UI text. Keys live in tabs.tasks.ui as flat dotted keys ("live.title"),
//                            like the other task-tab strings. Plurals follow the existing convention:
//                            "<key>" for one and "<key>.plural" for the rest. Every string has an
//                            English fallback, so the dashboard works before the keys are released.
//
//   missionTypeLabel / nodeLabel / factionLabel / titleLabel
//                            Game data from the API (always fetched in English). They reuse what the
//                            app already translates and fall back to the English text.

import { t, tOrRaw, tGameMode, tLocation } from '../i18n.js';

const cache = new Map();   // everything below is cleared on language change
if (typeof window !== 'undefined') window.addEventListener('langchange', () => cache.clear());

function memo(bucket, raw, compute) {
  const key = `${bucket}\u0000${raw}`;
  if (!cache.has(key)) cache.set(key, compute());
  return cache.get(key);
}

export function dt(key, fallback, vars = {}) {
  const full = `tabs.tasks.ui.live.${key}`;
  const hit = memo('ui', full, () => {
    const out = t(full);                 // t() returns the key itself on a miss
    return out !== full ? out : null;
  });
  return (hit ?? fallback).replace(/\{\{(\w+)\}\}/g, (_, k) => vars[k] ?? '');
}

// Exact lookup in a group of general.game (no partial matching: a title must never be rewritten
// piecemeal). Misses return the English text unchanged.
const lookup = (bucket, group, raw) =>
  raw ? memo(bucket, raw, () => tOrRaw(`general.game.${group}.${raw}`, raw)) : raw;

/** "Interception" -> general.game.gameMode.* (the same table the sortie/archon cards use). */
export const missionTypeLabel = (raw) => (raw ? memo('type', raw, () => tGameMode(raw)) : raw);

/** "Cinxia (Ceres)" -> planet and special-node names via the app's location map. */
export const nodeLabel = (raw) => (raw ? memo('node', raw, () => tLocation(raw)) : raw);

/** "Grineer" -> general.game.faction.* */
export const factionLabel = (raw) => lookup('faction', 'faction', raw);

/** Alert / event names ("Tenno United Alert", "Epoch Operation: Taubound") -> general.game.events.* */
export const titleLabel = (raw) => lookup('title', 'events', raw);
