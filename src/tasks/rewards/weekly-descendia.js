// Source: official drop tables — "The Descendia: …" (Steel Path and normal)
// Verified: 2026-10-15
// Pools are rolled per floor; the arcane lists are uniform, so they are written once as `options`.
const SP_ARCANES = [
    'Primary Bulwark',
    'Melee Careen',
    'Primary Overcharge',
    'Arcane Expertise',
    'Arcane Persistence',
    'Arcane Circumvent',
    'Secondary Irradiate',
    'Arcane Concentration',
    'Primary Debilitate',
  ];

const NORMAL_ARCANES = [
    'Arcane Consequence',
    'Arcane Ice',
    'Arcane Momentum',
    'Arcane Nullifier',
    'Arcane Tempo',
    'Arcane Warmth',
    'Arcane Deflection',
    'Arcane Healing',
    'Arcane Resistance',
    'Arcane Victory',
    'Arcane Acceleration',
    'Arcane Agility',
    'Arcane Awakening',
    'Arcane Eruption',
    'Arcane Phantasm',
    'Arcane Strike',
    'Arcane Precision',
    'Arcane Pulse',
    'Arcane Ultimatum',
    'Arcane Trickery',
    'Arcane Velocity',
    'Arcane Arachne',
    'Arcane Avenger',
    'Arcane Fury',
    'Arcane Rage',
    'Arcane Aegis',
    'Arcane Guardian',
  ];

export default {
  tabs: [
    { id: 'sp', groups: [
      { id: 'steel-essence', label: 'Steel Essence', rewards: [
        { name: 'Steel Essence', qty: 25 },
      ] },
      // { id: 'common', label: 'Common', kind: 'one', rewards: [
      //   { name: 'Ignia', qty: 75, chance: 50 },
      //   { name: 'Maphica', qty: 15, chance: 50 },
      // ] },
      { id: 'uncommon', label: 'Uncommon', kind: 'one', rewards: [
        { name: 'Forma Blueprint', chance: 7.14 },
        { name: 'Melee Riven Mod', chance: 7.14 },
        { name: 'Pistol Riven Mod', chance: 7.14 },
        { name: 'Rifle Riven Mod', chance: 7.14 },
        { name: 'Shotgun Riven Mod', chance: 7.14 },
        { name: 'Zaw Riven Mod', chance: 7.14 },
        { name: 'Kitgun Riven Mod', chance: 7.14 },
        { name: 'Primary Arcane Adapter', chance: 7.14 },
        { name: 'Secondary Arcane Adapter', chance: 7.14 },
        { name: 'Melee Arcane Adapter', chance: 7.14 },
        { name: 'Amp Arcane Adapter', chance: 7.14 },
        { name: '3 Day Affinity Booster', chance: 7.14 },
        { name: '3 Day Resource Drop Chance Booster', chance: 7.14 },
        { name: '3 Day Mod Drop Chance Booster', chance: 7.14 },
      ] },
      { id: 'rare', label: 'Rare', kind: 'one', rewards: [
        { name: 'Orokin Catalyst Blueprint', chance: 19.36 },
        { name: 'Orokin Reactor Blueprint', chance: 19.36 },
        { name: 'Omni Forma Blueprint', chance: 19.36 },
        { name: 'Eidolon Lens Blueprint', chance: 19.36 },
        { name: 'Crimson Archon Shard', chance: 7.52 },
        { name: 'Azure Archon Shard', chance: 7.52 },
        { name: 'Amber Archon Shard', chance: 7.52 },
      ] },
      { id: 'arcane', label: 'Arcane (Infernum 6 and 13)', kind: 'one', rewards: [
        { name: 'Arcane Enhancement', options: SP_ARCANES },
      ] },
      { id: 'arcane-triple', label: 'Triple arcane (Infernum 20)', kind: 'one', rewards: [
        { name: 'Arcane Enhancement', qty: 3, options: SP_ARCANES },
      ] },
    ] },
    { id: 'normal', groups: [
      { id: 'arcane-triple', label: 'Triple arcane (Infernum 20)', kind: 'one', rewards: [
        { name: 'Arcane Enhancement', qty: 3, options: NORMAL_ARCANES },
      ] },
      // { id: 'roathe', label: 'Roathe (boss)', kind: 'one', rewards: [
      //   { name: 'Uriel Chassis Blueprint', chance: 12.5 },
      //   { name: 'Uriel Neuroptics Blueprint', chance: 12.5 },
      //   { name: 'Uriel Systems Blueprint', chance: 12.5 },
      //   { name: 'Vinquibus Barrel Blueprint', chance: 12.5 },
      //   { name: 'Vinquibus Blade Blueprint', chance: 12.5 },
      //   { name: 'Vinquibus Receiver Blueprint', chance: 12.5 },
      //   { name: 'Vinquibus Stock Blueprint', chance: 12.5 },
      //   { name: 'Vinquibus Blueprint', chance: 12.5 },
      // ] },
    ] },
  ],
};
