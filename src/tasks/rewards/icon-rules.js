// src/tasks/rewards/icon-rules.js
//
// Reward NAME -> icon-registry key (see lib/icons.js and the assets repo's icons.src.json).
// Pure data + one function, no imports, so scripts/check-rewards.mjs can use it without a DOM.
//
// Rules run top to bottom, first match wins — so specific rules go BEFORE general ones
// (e.g. "Resource Drop Chance Booster" before "Resource Booster", boosters before "credit").
// Short words use \b (whole-word) matches: /endo/ alone would also catch "Melee Cresc-endo".
// A name that matches nothing gets the placeholder icon; the checker script lists those.

const COLOR = '(amber|azure|crimson|emerald|topaz|violet)';

// Arcane names that don't start with "Arcane " (Duviri arcanes, Archimedea/Descendia arcanes).
const ARCANE_PREFIXED = /^(primary|secondary|melee|shotgun|magus|akimbo|longbow)\s+(?!arcane adapter|riven)/i;

export const ICON_RULES = [
  // shards
  [new RegExp(`tauforged ${COLOR} archon shard`, 'i'), m => `reward.tauforged-${m[1].toLowerCase()}-archon-shard`],
  [new RegExp(`${COLOR} archon shard`, 'i'),           m => `reward.${m[1].toLowerCase()}-archon-shard`],
  [/archon shard/i,                                    () => 'reward.crimson-archon-shard'],   // generic "Archon Shard" (Phase 6 cycles the colors)

  // rivens
  [/riven splicer/i,     () => 'reward.riven-splicer'],
  [/riven transmuter/i,  () => 'reward.riven-transmuter'],
  [/riven cipher/i,      () => 'reward.riven-cipher'],
  [/riven/i,             () => 'reward.riven'],

  // adapters
  [/exilus warframe adapter/i,  () => 'reward.exilus-warframe-adapter'],
  [/exilus weapon adapter/i,    () => 'reward.exilus-weapon-adapter'],
  [/primary arcane adapter/i,   () => 'reward.primary-arcane-adapter'],
  [/secondary arcane adapter/i, () => 'reward.secondary-arcane-adapter'],
  [/melee arcane adapter/i,     () => 'reward.melee-arcane-adapter'],
  [/archgun arcane adapter/i,   () => 'reward.archgun-arcane-adapter'],
  [/amp arcane adapter/i,       () => 'reward.amp-arcane-adapter'],

  // formas (Omni Forma uses the aura-forma picture)
  [/umbra forma/i,             () => 'reward.umbra-forma'],
  [/omni forma|aura forma/i,   () => 'reward.aura-forma'],
  [/stance forma/i,            () => 'reward.stance-forma'],
  [/\bforma\b/i,               () => 'reward.forma'],

  // boosters BEFORE credits/resources
  [/affinity booster/i,             () => 'reward.affinity-booster'],
  [/mod drop chance booster/i,      () => 'reward.mod-drop-chance-booster'],
  [/resource drop chance booster/i, () => 'reward.resource-drop-chance-booster'],
  [/resource booster/i,             () => 'reward.resource-booster'],
  [/credit booster/i,               () => 'reward.credit-booster'],

  // single items
  [/orokin reactor/i,     () => 'reward.orokin-reactor'],
  [/orokin catalyst/i,    () => 'reward.orokin-catalyst'],
  [/legendary core/i,     () => 'reward.legendary-core'],
  [/steel essence/i,      () => 'reward.steel-essence'],
  [/incarnon genesis/i,   () => 'reward.incarnon-genesis'],
  [/elemental vice/i,     () => 'reward.elemental-vice'],
  [/eidolon.*lens/i,      () => 'reward.eidolon-lens'],
  [/ayatan|anasa/i,       () => 'reward.ayatan-anasa-sculpture'],
  [/\bkuva\b/i,           () => 'reward.kuva'],
  [/\bendo\b/i,           () => 'reward.endo'],
  [/\bvosfor\b/i,         () => 'reward.vosfor'],
  [/\bcredits?\b/i,       () => 'reward.credits'],
  [/relic pack/i,         () => 'reward.relic-pack'],

  // warframe parts
  [/warframe neuroptics/i, () => 'reward.warframe-neuroptics'],
  [/warframe chassis/i,    () => 'reward.warframe-chassis'],
  [/warframe systems/i,    () => 'reward.warframe-systems'],
  [/warframe blueprint/i,  () => 'reward.warframe-blueprint'],
  [/warframe augment/i,    () => 'reward.warframe-augment'],

  // arcanes last ("Arcane Reaper", "Common Warframe Arcane", "Melee Duplicate", …)
  [/arcane/i,             () => 'reward.arcane-enhancement'],
  [ARCANE_PREFIXED,       () => 'reward.arcane-enhancement'],


];

export function iconKeyForReward(name) {
  if (!name || typeof name !== 'string') return null;
  for (const [re, key] of ICON_RULES) {
    const m = name.match(re);
    if (m) return key(m);
  }
  return null;
}
