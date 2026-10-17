// Source: https://wiki.warframe.com/w/Steel_Essence + https://primagames.com/tips/how-to-unlock-the-steel-path-in-warframe — Verified: 2026-10-15
// Steel Path Honors. `liveOnly`: the modal shows only this week's offer, straight from the API.
// The pool below is the FALLBACK, shown only when the API has nothing (offline / fetch failed).
// The Steel Path rotation does not include Pistol or Melee Rivens.
export default {
  tabs: [{ id: 'main', groups: [
    { id: 'weekly-offer', label: 'Weekly rotating offer', kind: 'one', live: 'teshin.rotation', liveOnly: true, rewards: [
      { name: 'Umbra Forma Blueprint' },
      { name: 'Kuva', qty: 50000 },
      { name: 'Forma', qty: 3 },
      { name: 'Endo', qty: 30000 },
      { name: 'Riven Mod', options: ['Rifle', 'Zaw', 'Kitgun', 'Shotgun'] },
    ] },
    { id: 'evergreen', label: 'Always available', rewards: [
      { name: 'Veiled Riven Cipher' },
      { name: 'Kuva', qty: 10000 },
      { name: 'Primary Arcane Adapter' },
      { name: 'Secondary Arcane Adapter' },
      { name: 'Stance Forma Blueprint' },
      { name: 'Relic Pack' },
    ] },
  ] }],
};