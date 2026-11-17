// src/vendors/data/u40.js
// nightcap - Nightcap (U40)

import { vendor, currency, parent, part, unique, stock, arcane, either } from '../define.js';

// Controls each item renders (every item must declare its own actions).
const ALL = ['bought', 'drop', 'owned'];   // collectible: buyable, droppable or already owned
const BD  = ['bought', 'drop'];            // arcanes: counted, bought or dropped
const BO  = ['bought', 'owned'];

export default vendor({
  id:            'nightcap',
  since:         '40.0',
  badge:         'U40',
  family:        'update',
  title:         'Nightcap',          // English fallback; translations come from the locale files
  localeGroup:   'u40',
  missionMinutes: 13,                  // default minutes per mission (editable per vendor in the planner)
  // runModel: 'parallel',             // 'sequential' if each currency needs its own missions

  currencies: [
    currency('fergolyte', 'Fergolyte'),
  ],

  categories: ['warframe', 'weapons', 'arcanes', 'cosmetics', 'decorations', 'others'],

  parents: [
    parent('warframe-main', 'warframe', 'warframe', 'Nokko'),
    parent('weapon-arbucep', 'weapons', 'weapon', 'Arbucep'),
  ],

  items: [
    // ── warframe ──
    part('wf-blueprint', 'warframe-main', 'blueprint', { fergolyte: 240 }, { actions: ALL }),
    part('wf-neuroptics', 'warframe-main', 'neuroptics', { fergolyte: 160 }, { actions: ALL }),
    part('wf-chassis', 'warframe-main', 'chassis', { fergolyte: 160 }, { actions: ALL }),
    part('wf-systems', 'warframe-main', 'systems', { fergolyte: 160 }, { actions: ALL }),
    // ── weapons ──
    part('arbucep-blueprint', 'weapon-arbucep', 'blueprint', { fergolyte: 220 }, { actions: ALL }),
    part('arbucep-barrel', 'weapon-arbucep', 'barrel', { fergolyte: 150 }, { actions: ALL }),
    part('arbucep-receiver', 'weapon-arbucep', 'receiver', { fergolyte: 150 }, { actions: ALL }),
    part('arbucep-stock', 'weapon-arbucep', 'stock', { fergolyte: 150 }, { actions: ALL }),
    // ── cosmetics ──
    unique('ephemera-rizoma', 'cosmetics', { fergolyte: 150 }, 'Rizoma Ephemera', { actions: BO }),
    unique('skin-onemind', 'cosmetics', { fergolyte: 25 }, 'Onemind', { actions: BO }),
    unique('skin-roots', 'cosmetics', { fergolyte: 25 }, 'Roots N\' Fruits', { actions: BO }),
    unique('skin-shooms', 'cosmetics', { fergolyte: 25 }, 'Shooms', { actions: BO }),
    // ── decorations ──
    unique('poster-onemind', 'decorations', { fergolyte: 25 }, 'Onemind Poster', { actions: BO }),
    unique('poster-roots', 'decorations', { fergolyte: 25 }, 'Roots N\' Fruits Poster', { actions: BO }),
    unique('poster-shooms', 'decorations', { fergolyte: 25 }, 'Shooms Poster', { actions: BO }),
    // ── others ──
    unique('scene-caves', 'others', { fergolyte: 60 }, 'Deepmines Caves Scene', { actions: BO }),
    unique('scene-forward', 'others', { fergolyte: 60 }, 'Deepmines Forward Base Scene', { actions: BO }),
    unique('scene-lab', 'others', { fergolyte: 60 }, 'Deemines Lab Scene', { actions: BO }),
    unique('scene-nutrient', 'others', { fergolyte: 60 }, 'Deepmines Nutrient Plant Scene', { actions: BO }),
    unique('scene-deepmines', 'others', { fergolyte: 60 }, 'Deepmines Scene', { actions: BO }),
    // ── arcanes ──
    arcane('arcane-conjunction-voltage', 'Conjunction Voltage', { fergolyte: 10 }, { actions: BD }),
    arcane('arcane-primary-blight', 'Primary Blight', { fergolyte: 10 }, { actions: BD }),
    arcane('arcane-primary-frostbite', 'Primary Frostbite', { fergolyte: 10 }, { actions: BD }),
    arcane('arcane-secondary-encumber', 'Secondary Encumber', { fergolyte: 10 }, { actions: BD }),
    arcane('arcane-secondary-fortifier', 'Secondary Fortifier', { fergolyte: 10 }, { actions: BD }),
  ],
});
