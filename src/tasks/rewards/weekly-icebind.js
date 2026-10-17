// Source: https://wiki.warframe.com/w/The_Icebind + official drop tables ("The Icebind: Crested Frozen Chests / Frozen Chests")
// Verified: 2026-10-15
// Crested chest: opened with the key everyone gets on arrival. Frozen chests: opened with keys from side objectives.
// Chests can be opened up to 3 times per week (one run per Cryobell).
export default {
  tabs: [
    { id: 'crested', groups: [
      { id: 'guaranteed', label: 'Guaranteed', rewards: [
        { name: 'Riven Splicer' },
      ] },
      { id: 'kuva', label: 'Kuva', kind: 'one', rewards: [
        { name: 'Kuva', qty: 7500, chance: 69 },
        { name: 'Kuva', qty: 17500, chance: 30 },
        { name: 'Kuva', qty: 100000, chance: 1 },
      ] },
      { id: 'additional', label: 'Additional reward', kind: 'one', rewards: [
        { name: 'Riven Transmuter', chance: 5 },
        { name: 'Veiled Riven Cipher', chance: 5 },
        { name: 'Omni Forma', chance: 10 },
        { name: 'Forma', qty: 3, chance: 10 },
        { name: 'Melee Riven Mod', chance: 10.5 },
        { name: 'Pistol Riven Mod', chance: 8.75 },
        { name: 'Rifle Riven Mod', chance: 8.75 },
        { name: 'Shotgun Riven Mod', chance: 4.55 },
        { name: 'Archgun Riven Mod', chance: 1.22 },
        { name: 'Companion Weapon Riven Mod', chance: 1.22 },
        { name: 'Azure Archon Shard', chance: 11.67 },
        { name: 'Crimson Archon Shard', chance: 11.67 },
        { name: 'Amber Archon Shard', chance: 11.67 },
      ] },
    ] },
    { id: 'frozen', groups: [
      { id: 'guaranteed', label: 'Guaranteed', kind: 'one', rewards: [
        { name: 'Kuva', qty: 1750, chance: 65 },
        { name: 'Kuva', qty: 3500, chance: 30 },
        { name: 'Kuva', qty: 7500, chance: 5 },
      ] },
      { id: 'additional', label: 'Additional reward', kind: 'one', rewards: [
        { name: 'Crimson Archon Shard', chance: 3.33 },
        { name: 'Azure Archon Shard', chance: 3.33 },
        { name: 'Amber Archon Shard', chance: 3.33 },
        { name: 'Forma', chance: 16.88 },
        { name: 'Vosfor', qty: 200, chance: 16.88 },
        { name: '3 Day Affinity Booster', chance: 5.63 },
        { name: '3 Day Resource Drop Chance Booster', chance: 5.63 },
        { name: '3 Day Resource Booster', chance: 5.63 },
        { name: '3 Day Credit Booster', chance: 5.63 },
        { name: 'Melee Riven Mod', chance: 11.81 },
        { name: 'Pistol Riven Mod', chance: 8.44 },
        { name: 'Rifle Riven Mod', chance: 8.44 },
        { name: 'Shotgun Riven Mod', chance: 5.06 },
      ] },
    ] },
  ],
};
