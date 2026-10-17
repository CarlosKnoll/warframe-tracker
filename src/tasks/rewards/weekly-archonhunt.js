// Source: https://wiki.warframe.com/w/Archon_Hunt + official Sortie table — Verified: 2026-10-15
// Rewards are "similar to Sortie" with Endo and Kuva DOUBLED, plus a guaranteed shard of the Archon's color.
// NOTE: the layout sketch listed 4,000 Endo / 6,000 Kuva (the Sortie amounts). Wiki says double: 8,000 / 12,000.
// No per-item chances are published for this pool, so none are shown.
// `when: 'archon.<name>'` rows show only for the Archon the API reports this week (all three if it can't tell).
export default {
  tabs: [{ id: 'main', groups: [
    { id: 'guaranteed', label: 'Guaranteed', note: '80% regular, 20% Tauforged (+20% per miss)', rewards: [
      { name: 'Crimson Archon Shard', note: 'Archon Amar', when: 'archon.amar' },
      { name: 'Amber Archon Shard', note: 'Archon Nira', when: 'archon.nira' },
      { name: 'Azure Archon Shard', note: 'Archon Boreal', when: 'archon.boreal' },
    ] },
    { id: 'pool', label: 'Reward pool', kind: 'one', rewards: [
      { name: 'Ayatan Anasa Sculpture' },
      { name: 'Endo', qty: 8000 },
      { name: 'Kuva', qty: 12000 },
      { name: 'Riven Mod', options: ['Rifle', 'Pistol', 'Shotgun', 'Melee', 'Zaw', 'Kitgun'] },
      { name: 'Forma' },
      { name: 'Exilus Warframe Adapter' },
      { name: 'Orokin Reactor Blueprint' },
      { name: 'Orokin Catalyst Blueprint' },
      { name: '3 Day Affinity Booster' },
      { name: '3 Day Resource Drop Chance Booster' },
      { name: '3 Day Mod Drop Chance Booster' },
      { name: 'Legendary Core' },
    ] },
  ] }],
};