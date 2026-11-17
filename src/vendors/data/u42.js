// src/vendors/data/u42.js
// zorba - Aspirant Zorba (U42)

import { vendor, currency, parent, part, unique, stock, arcane, either } from '../define.js';

// Controls each item renders (every item must declare its own actions).
const ALL = ['bought', 'drop', 'owned'];   // collectible: buyable, droppable or already owned
const BD  = ['bought', 'drop'];            // arcanes: counted, bought or dropped
const BO  = ['bought', 'owned'];

export default vendor({
  id:            'zorba',
  since:         '42.0',
  badge:         'U42',
  family:        'update',
  title:         'Aspirant Zorba',          // English fallback; translations come from the locale files
  localeGroup:   'u42',
  missionMinutes: 13,                  // default minutes per mission (editable per vendor in the planner)
  // runModel: 'parallel',             // 'sequential' if each currency needs its own missions

  currencies: [
    currency('atramentum', 'Atramentum'),
  ],

  categories: ['warframe', 'weapons', 'mods', 'decorations', 'others'],

  parents: [
    parent('warframe-main', 'warframe', 'warframe', 'Follie'),
    parent('weapon-enkaus', 'weapons', 'weapon', 'Enkaus'),
  ],

  items: [
    // ── warframe ──
    part('wf-blueprint', 'warframe-main', 'blueprint', { atramentum: 1200 }, { actions: ALL }),
    part('wf-neuroptics', 'warframe-main', 'neuroptics', { atramentum: 400 }, { actions: ALL }),
    part('wf-chassis', 'warframe-main', 'chassis', { atramentum: 400 }, { actions: ALL }),
    part('wf-systems', 'warframe-main', 'systems', { atramentum: 400 }, { actions: ALL }),
    // ── weapons ──
    part('enkaus-blueprint', 'weapon-enkaus', 'blueprint', { atramentum: 1200 }, { actions: ALL }),
    part('enkaus-barrel', 'weapon-enkaus', 'barrel', { atramentum: 400 }, { actions: ALL }),
    part('enkaus-receiver', 'weapon-enkaus', 'receiver', { atramentum: 400 }, { actions: ALL }),
    part('enkaus-stock', 'weapon-enkaus', 'stock', { atramentum: 400 }, { actions: ALL }),
    // ── mods ──
    unique('truths-flame', 'mods', { atramentum: 360 }, 'Truth\'s Flame', { actions: BO }),
    // ── decorations ──
    unique('follie-prex', 'decorations', { atramentum: 600 }, 'Follie Prex', { actions: BO }),
    // ── others ──
    unique('chromatic-atramentum', 'others', { atramentum: 360 }, 'Chromatic Atramentum', { actions: BO }),
    unique('drip', 'others', { atramentum: 200 }, 'Drip', { actions: BO }),
    unique('stained-vespers', 'others', { atramentum: 200 }, 'Satined Vespers', { actions: BO }),
    unique('dreadnaught', 'others', { atramentum: 200 }, 'Dreadnaught', { actions: BO }),
    unique('relay-scene', 'others', { atramentum: 600 }, 'Haunted Vesper Relay Scene', { actions: BO }),
  ],
});
