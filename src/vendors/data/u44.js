// src/vendors/data/u44.js
// melica - Iceblades of Narin (U44)

import { vendor, currency, parent, part, unique, stock, arcane, either } from '../define.js';

// Controls each item renders (every item must declare its own actions).
const ALL = ['bought', 'drop', 'owned'];   // collectible: buyable, droppable or already owned
const BD  = ['bought', 'drop'];            // arcanes: counted, bought or dropped
const BO  = ['bought', 'owned'];

export default vendor({
  id:            'melica',
  since:         '44.0',
  badge:         'U44',
  family:        'update',
  title:         'Iceblades of Narin',          // English fallback; translations come from the locale files
  localeGroup:   'u44',
  missionMinutes: 13,                  // default minutes per mission (editable per vendor in the planner)
  // runModel: 'parallel',             // 'sequential' if each currency needs its own missions

  currencies: [
    currency('enKuva', 'Entropic Kuva'),
  ],

  categories: ['warframe', 'weapons', 'cosmetics', 'decorations', 'others'],

  parents: [
    parent('warframe-main', 'warframe', 'warframe', 'Narin'),
    parent('weapon-nunchasa', 'weapons', 'weapon', 'Nunchasa'),
    parent('weapon-aksondol', 'weapons', 'weapon', 'Aksondol'),
  ],

  items: [
    // ── warframe ──
    part('wf-blueprint', 'warframe-main', 'blueprint', either({ enKuva: 400 }), { actions: ALL }),
    part('wf-neuroptics', 'warframe-main', 'neuroptics', either({ enKuva: 130 }), { actions: ALL }),
    part('wf-chassis', 'warframe-main', 'chassis', either({ enKuva: 130 }), { actions: ALL }),
    part('wf-systems', 'warframe-main', 'systems', either({ enKuva: 130 }), { actions: ALL }),
    // ── weapons ──
    part('nunchasa-blueprint', 'weapon-nunchasa', 'blueprint', { enKuva: 200 }, { actions: BO }),
    part('nunchasa-string', 'weapon-nunchasa', 'string', { enKuva: 50 }, { actions: BO }),
    part('nunchasa-upper-limb', 'weapon-nunchasa', 'upper-limb', { enKuva: 50 }, { actions: BO }),
    part('nunchasa-grip', 'weapon-nunchasa', 'grip', { enKuva: 50 }, { actions: BO }),
    part('nunchasa-lower-limb', 'weapon-nunchasa', 'lower-limb', { enKuva: 50 }, { actions: BO }),
    part('aksondol-blueprint', 'weapon-aksondol', 'blueprint', { enKuva: 200 }, { actions: BO }),
    part('aksondol-link', 'weapon-aksondol', 'link', { enKuva: 60 }, { actions: BO }),
    part('aksondol-barrel1', 'weapon-aksondol', 'barrel', { enKuva: 30 }, { actions: BO }),
    part('aksondol-barrel2', 'weapon-aksondol', 'barrel', { enKuva: 30 }, { actions: BO }),
    part('aksondol-receiver1', 'weapon-aksondol', 'receiver', { enKuva: 30 }, { actions: BO }),
    part('aksondol-receiver2', 'weapon-aksondol', 'receiver', { enKuva: 30 }, { actions: BO }),
    // ── cosmetics ──
    unique('narin-sigil', 'cosmetics', { enKuva: 250 }, 'Glacium Sigil', { actions: BO }),
    unique('narin-ephemera', 'cosmetics', { enKuva: 500 }, 'Seonang Ephemera', { actions: BO }),
    unique('narin-shoulder', 'cosmetics', { enKuva: 80 }, 'Tidon Shoulder Medallion', { actions: BO }),
    unique('narin-chest', 'cosmetics', { enKuva: 80 }, 'Tidon Chest Medallion', { actions: BO }),
    unique('narin-leg', 'cosmetics', { enKuva: 80 }, 'Tidon Leg Medallion', { actions: BO }),
    unique('narin-skin-nepheri', 'cosmetics', { enKuva: 150 }, 'Niveus Nepheri Skin', { actions: BO }),
    unique('narin-skin-dark-split', 'cosmetics', { enKuva: 150 }, 'Niveus Dark Split-Sword Skin', { actions: BO }),
    unique('narin-skin-dark-dagg', 'cosmetics', { enKuva: 150 }, 'Niveus Dark Dagger Skin', { actions: BO }),
    unique('narin-skin-dark-sword', 'cosmetics', { enKuva: 150 }, 'Niveus Dark Sword Skin', { actions: BO }),
    unique('narin-skin-paracesis', 'cosmetics', { enKuva: 150 }, 'Niveus Paracesis Skin', { actions: BO }),
    unique('narin-skin-orvius', 'cosmetics', { enKuva: 150 }, 'Niveus Orvius Skin', { actions: BO }),
    unique('narin-skin-glaxion', 'cosmetics', { enKuva: 150 }, 'Niveus Glaxion Skin', { actions: BO }),
    unique('narin-skin-quellor', 'cosmetics', { enKuva: 150 }, 'Niveus Quellor Skin', { actions: BO }),
    unique('narin-skin-liset', 'cosmetics', { enKuva: 150 }, 'Niveus Liset Skin', { actions: BO }),
    // ── decorations ──
    unique('narin-prex', 'decorations', { enKuva: 500 }, 'Narin Prex', { actions: BO }),
    unique('narin-sumdali', 'decorations', { enKuva: 500 }, 'Niveus Sumdali', { actions: BO }),
    // ── others ──
    unique('narin-honoria', 'others', { enKuva: 500 }, 'On Wings Of Ice Honoria', { actions: BO }),
    unique('narin-scene1', 'others', { enKuva: 500 }, 'Yuvan Peak Scene', { actions: BO }),
    unique('narin-scene2', 'others', { enKuva: 500 }, 'Melica\'s Laboratory Scene', { actions: BO }),
    unique('narin-song1', 'others', { enKuva: 50 }, 'Neote\'s Dance', { actions: BO }),
    unique('narin-song2', 'others', { enKuva: 50 }, 'Ice Speaker', { actions: BO }),
  ],
});
