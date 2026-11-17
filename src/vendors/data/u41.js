// src/vendors/data/u41.js
// roathe - Roathe (U41)

import { vendor, currency, parent, part, unique, stock, arcane, either } from '../define.js';

// Controls each item renders (every item must declare its own actions).
const ALL = ['bought', 'drop', 'owned'];   // collectible: buyable, droppable or already owned
const BD  = ['bought', 'drop'];            // arcanes: counted, bought or dropped
const BO  = ['bought', 'owned'];

export default vendor({
  id:            'roathe',
  since:         '41.0',
  badge:         'U41',
  family:        'update',
  title:         'Roathe',          // English fallback; translations come from the locale files
  localeGroup:   'u41',
  missionMinutes: 13,                  // default minutes per mission (editable per vendor in the planner)
  // runModel: 'parallel',             // 'sequential' if each currency needs its own missions

  currencies: [
    currency('maphica', 'Maphica'),
  ],

  categories: ['warframe', 'weapons', 'arcanes', 'others'],

  parents: [
    parent('warframe-main', 'warframe', 'warframe', 'Uriel'),
    parent('weapon-vinquibus', 'weapons', 'weapon', 'Vinquibus'),
    parent('weapon-galariak', 'weapons', 'weapon', 'Galariak Prime'),
    parent('weapon-sagek', 'weapons', 'weapon', 'Sagek Prime'),
  ],

  items: [
    // ── warframe ──
    part('wf-blueprint', 'warframe-main', 'blueprint', { maphica: 75 }, { actions: ALL }),
    part('wf-neuroptics', 'warframe-main', 'neuroptics', { maphica: 25 }, { actions: ALL }),
    part('wf-chassis', 'warframe-main', 'chassis', { maphica: 25 }, { actions: ALL }),
    part('wf-systems', 'warframe-main', 'systems', { maphica: 25 }, { actions: ALL }),
    // ── weapons ──
    part('vinquibus-blueprint', 'weapon-vinquibus', 'blueprint', { maphica: 35 }, { actions: ALL }),
    part('vinquibus-barrel', 'weapon-vinquibus', 'barrel', { maphica: 25 }, { actions: ALL }),
    part('vinquibus-blade', 'weapon-vinquibus', 'blade', { maphica: 25 }, { actions: ALL }),
    part('vinquibus-receiver', 'weapon-vinquibus', 'receiver', { maphica: 25 }, { actions: ALL }),
    part('vinquibus-stock', 'weapon-vinquibus', 'stock', { maphica: 25 }, { actions: ALL }),
    part('galariak-blueprint', 'weapon-galariak', 'blueprint', { maphica: 35 }, { actions: ALL }),
    part('galariak-handle', 'weapon-galariak', 'handle', { maphica: 25 }, { actions: ALL }),
    part('galariak-blade', 'weapon-galariak', 'blade', { maphica: 25 }, { actions: ALL }),
    part('sagek-blueprint', 'weapon-sagek', 'blueprint', { maphica: 35 }, { actions: ALL }),
    part('sagek-receiver', 'weapon-sagek', 'receiver', { maphica: 25 }, { actions: ALL }),
    part('sagek-barrel', 'weapon-sagek', 'barrel', { maphica: 25 }, { actions: ALL }),
    // ── others ──
    unique('scene-makvos', 'others', { maphica: 100 }, 'Makvos Cannon Scene', { actions: BO }),
    unique('scene-boro', 'others', { maphica: 100 }, 'Boro Overlook Scene', { actions: BO }),
    unique('scene-seeder', 'others', { maphica: 100 }, 'World-Seeder Scene', { actions: BO }),
    unique('scene-tennadis', 'others', { maphica: 100 }, 'Fort Tennadis Scene', { actions: BO }),
    unique('scene-perita', 'others', { maphica: 100 }, 'Perita Manifestation Scene', { actions: BO }),
    unique('scene-lyon', 'others', { maphica: 100 }, 'Lyon\'s Room Scene', { actions: BO }),
    unique('scene-marie', 'others', { maphica: 100 }, 'Marie\'s Room Scene', { actions: BO }),
    unique('simulacrum-roathe', 'others', { maphica: 150 }, 'Roathe\'s Oblivion Arena', { actions: BO }),
    // ── arcanes ──
    arcane('arcane-primary-bulwark', 'Primary Bulwark', { maphica: 5 }, { actions: BD }),
    arcane('arcane-primary-overcharge', 'Primary Overcharge', { maphica: 5 }, { actions: BD }),
    arcane('arcane-expertise', 'Arcane Expertise', { maphica: 5 }, { actions: BD }),
    arcane('arcane-persistence', 'Arcane Persistence', { maphica: 5 }, { actions: BD }),
    arcane('arcane-melee-careen', 'Melee Careen', { maphica: 5 }, { actions: BD }),
    arcane('arcane-circumvent', 'Arcane Circumvent', { maphica: 5 }, { actions: BD }),
    arcane('arcane-secondary-irradiate', 'Secondary Irradiate', { maphica: 5 }, { actions: BD }),
    arcane('arcane-concentration', 'Arcane Concentration', { maphica: 5 }, { actions: BD }),
    arcane('arcane-primary-debilitate', 'Primary Debilitate', { maphica: 5 }, { actions: BD }),
  ],
});
