// Source: official drop tables — "Deep Archimedea Silver / Gold / Legendary Rewards"
// Verified: 2026-10-15
// Which tier you get depends on how well you do (the "A/B/C" tables).
export default {
  tabs: [
    { id: 'silver', groups: [
      { rewards: [
        { name: 'Melee Duplicate', chance: 10 },
        { name: 'Melee Crescendo', chance: 10 },
        { name: 'Melee Arcane Adapter', chance: 15 },
        { name: 'Crimson Archon Shard', chance: 17.5 },
        { name: 'Azure Archon Shard', chance: 17.5 },
        { name: 'Amber Archon Shard', chance: 17.5 },
        { name: 'Tauforged Crimson Archon Shard', chance: 4.17 },
        { name: 'Tauforged Azure Archon Shard', chance: 4.17 },
        { name: 'Tauforged Amber Archon Shard', chance: 4.17 },
      ] },
    ] },
    { id: 'gold', groups: [
      { rewards: [
        { name: 'Melee Duplicate', chance: 15 },
        { name: 'Melee Crescendo', chance: 15 },
        { name: 'Melee Arcane Adapter', chance: 5 },
        { name: 'Crimson Archon Shard', chance: 13.13 },
        { name: 'Azure Archon Shard', chance: 13.13 },
        { name: 'Amber Archon Shard', chance: 13.13 },
        { name: 'Tauforged Crimson Archon Shard', chance: 8.54 },
        { name: 'Tauforged Azure Archon Shard', chance: 8.54 },
        { name: 'Tauforged Amber Archon Shard', chance: 8.54 },
      ] },
    ] },
    { id: 'legendary', groups: [
      { rewards: [
        { name: 'Melee Duplicate', chance: 25 },
        { name: 'Melee Crescendo', chance: 25 },
        { name: 'Tauforged Crimson Archon Shard', chance: 16.67 },
        { name: 'Tauforged Azure Archon Shard', chance: 16.67 },
        { name: 'Tauforged Amber Archon Shard', chance: 16.67 },
      ] },
    ] },
  ],
};
