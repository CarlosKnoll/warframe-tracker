// src/dashboard/live/rewards.js
// Orders an entry's rewards so the ones a player cares about show first when only a few fit.
// Pure display order: nothing is dropped, and ties keep the API's own order.
//
// Rank 0 = shown first. Rules are matched against the English reward name (the API is fetched
// in English). Edit the table freely; an unmatched reward gets DEFAULT_RANK.

const DEFAULT_RANK = 2;

const RULES = [
  // Build-defining unlocks and rare drops
  [0, /\b(exilus|arcane adapter|adapter|catalyst|reactor|forma|slot|archon shard|tauforged|riven|incarnon|legendary core|vosfor)\b/i],
  // Cosmetics, blueprints, mods, arcanes
  [1, /\b(blueprint|glyph|syandana|skin|sigil|emblem|helmet|armor|mod|arcane|ephemera|sugatra|floof)\b/i],
  // Currencies / consumables
  [3, /\b(endo|kuva|ayatan|booster|resource|moonflesh)\b/i],
  // Credits are the least interesting line
  [9, /^credits$/i],
];

export function rankOf(reward) {
  const name = reward?.name ?? '';
  for (const [rank, re] of RULES) if (re.test(name)) return rank;
  return DEFAULT_RANK;
}

/** Stable sort by rank; returns a new array. */
export function prioritize(rewards) {
  return rewards
    .map((r, i) => ({ r, i, rank: rankOf(r) }))
    .sort((a, b) => a.rank - b.rank || a.i - b.i)
    .map((x) => x.r);
}
