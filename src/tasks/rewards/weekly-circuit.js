// Source: https://wiki.warframe.com/w/The_Circuit ("Tiers and Weekly Rewards") — Verified: 2026-10-15
// 10 tiers per mode. `meta` = Circuit Progress needed for that tier. Tier 11+ repeats.
// Rows with `live` show this week's picks from the API under the item.
//   normal : 3 Warframe blueprints per week (12-week rotation)
//   sp     : 2 of 5 Incarnon Genesis adapters per week (9-week rotation, A–I)
const NORMAL_RESOURCE_POOL = [
  { name: 'Endo' },
  { name: 'Common Warframe Arcane' },
];

const SP_STARTER_POOL = [
  { name: 'Duviri Arcane' },
  { name: 'Kuva', qty: 6000 },
  { name: 'Endo', qty: 6000 },
  { name: 'Exilus Warframe Adapter Blueprint' },
  { name: 'Exilus Weapon Adapter Blueprint' },
  { name: 'Forma Blueprint' },
];

const SP_ARCANE_TRIO = [
  { name: 'Arcane Reaper' },
  { name: 'Secondary Shiver' },
  { name: 'Longbow Sharpshot' },
];

const SP_MID_POOL = [...SP_ARCANE_TRIO, { name: 'Veiled Riven Mod' }];

const SP_GENESIS_NOTE = 'With Opportunity Rank 9: or a Rifle, Pistol or Melee Riven Mod, or 20,000 Kuva';

export default {
  tabs: [
    { id: 'normal', groups: [
      { id: 'tier', n: 1, meta: 190, kind: 'one', rewards: [...NORMAL_RESOURCE_POOL, { name: 'Credits', qty: 10000 }] },
      { id: 'tier', n: 2, meta: 210, rewards: [{ name: 'Warframe Neuroptics Blueprint', live: 'circuit.normal' }] },
      { id: 'tier', n: 3, meta: 230, kind: 'one', rewards: [...NORMAL_RESOURCE_POOL, { name: 'Credits', qty: 10000 }] },
      // { id: 'tier', n: 4, meta: 260, rewards: [{ name: 'Rare Mod' }] },
      { id: 'tier', n: 5, meta: 300, rewards: [{ name: 'Warframe Chassis Blueprint', live: 'circuit.normal' }] },
      { id: 'tier', n: 6, meta: 350, kind: 'one', rewards: [
        { name: 'Endo' }, { name: 'Common Warframe Arcane' }, { name: 'Credits', qty: 50000 },
      ] },
      { id: 'tier', n: 7, meta: 410, rewards: [{ name: 'Warframe Augment Mod', live: 'circuit.normal' }] },
      { id: 'tier', n: 8, meta: 480, rewards: [{ name: 'Warframe Systems Blueprint', live: 'circuit.normal' }] },
      { id: 'tier', n: 9, meta: 560, rewards: [{ name: 'Common Warframe Arcane' }] },
      { id: 'tier', n: 10, meta: 650, rewards: [{ name: 'Warframe Blueprint', live: 'circuit.normal' }] },
      { id: 'tier-repeat', label: 'Tier 11 and up', meta: 900, kind: 'one', rewards: [{ name: 'Credits', qty: 1500 }, { name: 'Endo', qty: 250 }] },
    ] },
    { id: 'sp', groups: [
      { id: 'tier', n: 1, meta: 285, kind: 'one', rewards: SP_STARTER_POOL },
      { id: 'tier', n: 2, meta: 315, kind: 'one', rewards: SP_ARCANE_TRIO },
      { id: 'tier', n: 3, meta: 345, kind: 'one', rewards: SP_STARTER_POOL },
      { id: 'tier', n: 4, meta: 390, kind: 'one', rewards: SP_STARTER_POOL },
      { id: 'tier', n: 5, meta: 450, rewards: [{ name: 'Incarnon Genesis', live: 'circuit.hard', note: SP_GENESIS_NOTE }] },
      { id: 'tier', n: 6, meta: 525, kind: 'one', rewards: SP_MID_POOL },
      { id: 'tier', n: 7, meta: 615, kind: 'one', rewards: SP_MID_POOL },
      { id: 'tier', n: 8, meta: 720, kind: 'one', rewards: SP_ARCANE_TRIO },
      { id: 'tier', n: 9, meta: 840, rewards: [{ name: 'Steel Essence', qty: 25 }] },
      { id: 'tier', n: 10, meta: 975, rewards: [{ name: 'Incarnon Genesis', live: 'circuit.hard', note: SP_GENESIS_NOTE }] },
      { id: 'tier-repeat', label: 'Tier 11 and up', meta: 1400, kind: 'one', rewards: [
        { name: 'Secondary Outburst' }, { name: 'Primary Blight' }, { name: 'Akimbo Slip Shot' },
        { name: 'Arcane Power Ramp' }, { name: 'Arcane Intention' }, { name: 'Shotgun Vendetta' },
        { name: 'Primary Obstruct' }, { name: 'Magus Aggress' }, { name: 'Primary Exhilarate' },
        { name: 'Endo', qty: 1000 }, { name: 'Credits', qty: 50000 },
      ] },
    ] },
  ],
};
