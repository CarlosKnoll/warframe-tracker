// Source: https://wiki.warframe.com/w/Acrithis — Verified: 2026-10-15
// Weekly rotation: 5 of the items below (resets Monday 00:00 UTC). One Duviri arcane per day on top.
const RIVEN_TYPES = ['Rifle', 'Pistol', 'Melee', 'Zaw', 'Kitgun', 'Shotgun', 'Companion Weapon'];

const DUVIRI_ARCANES = [
  'Arcane Intention', 'Arcane Power Ramp', 'Arcane Reaper', 'Longbow Sharpshot',
  'Primary Blight', 'Primary Exhilarate', 'Primary Obstruct', 'Shotgun Vendetta',
  'Akimbo Slip Shot', 'Secondary Shiver', 'Secondary Outburst', 'Magus Aggress',
];

export default {
  tabs: [{ id: 'main', groups: [
    { id: 'weekly-rotation', label: 'Weekly rotation', note: 'Five of these each week', rewards: [
      { name: 'Orokin Reactor Blueprint' },
      { name: 'Orokin Catalyst Blueprint' },
      { name: 'Exilus Warframe Adapter' },
      { name: 'Exilus Weapon Adapter' },
      { name: 'Primary Arcane Adapter' },
      { name: 'Secondary Arcane Adapter' },
      { name: 'Forma Blueprint' },
      { name: 'Riven Mod', options: RIVEN_TYPES },
      { name: 'Kuva', qty: 10000 },
    ] },
    { id: 'daily-arcane', label: 'Daily arcane', rewards: [
      { name: 'Duviri Arcane', options: DUVIRI_ARCANES },
    ] },
  ] }],
};
