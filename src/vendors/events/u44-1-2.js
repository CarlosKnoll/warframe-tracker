// src/vendors/events/u44-1-2.js
// praghasa - Epoch Operation: Taubound (U44.1.2)

import { vendor, currency, parent, part, unique, stock, arcane, either } from '../define.js';

// Controls each item renders (every item must declare its own actions).
const ALL = ['bought', 'drop', 'owned'];   // collectible: buyable, droppable or already owned
const BD  = ['bought', 'drop'];            // arcanes: counted, bought or dropped
const BO  = ['bought', 'owned'];

export default vendor({
  id:            'praghasa',
  since:         '44.1.2',
  badge:         'U44.1.2',
  family:        'event',
  title:         'Epoch Operation: Taubound',          // English fallback; translations come from the locale files
  localeGroup:   'u44.1.2',
  missionMinutes: 13,                  // default minutes per mission (editable per vendor in the planner)
  // runModel: 'parallel',             // 'sequential' if each currency needs its own missions

  currencies: [
    currency('moonflesh', 'Moonflesh'),
  ],

  categories: ['resources', 'weapons', 'arcanes', 'cosmetics', 'decorations', 'others', 'non-exclusive'],

  items: [
    // ── resources ──
    unique('core', 'resources', { moonflesh: 500 }, 'Legendary Core', { actions: ['bought'] }),
    unique('tauforged-crimson', 'resources', { moonflesh: 375 }, 'Tauforged Crimson Archon Shard', { actions: ['bought'] }),
    unique('tauforged-azure', 'resources', { moonflesh: 375 }, 'Tauforged Azure Archon Shard', { actions: ['bought'] }),
    unique('tauforged-amber', 'resources', { moonflesh: 375 }, 'Tauforged Amber Archon Shard', { actions: ['bought'] }),
    // Common resources drop everywhere, so no 'drop' button; capped purchases.
    stock('kuva', 'resources', { moonflesh: 20 }, 'Kuva', { actions: ['bought'], limit: { max: 25 } }),
    stock('credits', 'resources', { moonflesh: 3 }, 'Credits', { actions: ['bought'], limit: { max: 100 } }),
    stock('endo', 'resources', { moonflesh: 1 }, 'Endo', { actions: ['bought'], limit: { max: 300 } }),
    // ── weapons ──
    unique('haalvu', 'weapons', { moonflesh: 150 }, 'Haalvu', { actions: BO }),
    unique('spectra-vandal', 'weapons', { moonflesh: 150 }, 'Spectra Vandal', { actions: BO }),
    unique('basmu-blueprint', 'weapons', { moonflesh: 125 }, 'Basmu Blueprint', { actions: BO }),
    // ── arcanes ──
    arcane('arcane-melee-fortification', 'Melee Fortification', { moonflesh: 5 }, { actions: BD }),
    arcane('arcane-melee-retaliation', 'Melee Retaliation', { moonflesh: 5 }, { actions: BD }),
    arcane('arcane-battery', 'Arcane Battery', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-ice-storm', 'Arcane Ice Storm', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-melee-afflictions', 'Melee Afflictions', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-melee-animosity', 'Melee Animosity', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-melee-exposure', 'Melee Exposure', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-melee-influence', 'Melee Influence', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-melee-vortex', 'Melee Vortex', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-secondary-fortifier', 'Secondary Fortifier', { moonflesh: 8 }, { actions: BD }),
    arcane('arcane-secondary-surge', 'Secondary Surge', { moonflesh: 8 }, { actions: BD }),
    // ── cosmetics ──
    unique('taubound-cont-greaves', 'cosmetics', { moonflesh: 175 }, 'Contegorus Greaves', { actions: BO }),
    unique('taubound-cont-pauldrons', 'cosmetics', { moonflesh: 175 }, 'Contegorus Pauldrons', { actions: BO }),
    unique('taubound-cont-chestplate', 'cosmetics', { moonflesh: 175 }, 'Contegorus Chest Plate', { actions: BO }),
    unique('taubound-vacis', 'cosmetics', { moonflesh: 375 }, 'Vacis Amp Skin', { actions: BO }),
    unique('taubound-arturos', 'cosmetics', { moonflesh: 100 }, 'Arturos Vessel Glyph', { actions: BO }),
    unique('taubound-zioa', 'cosmetics', { moonflesh: 100 }, 'Zioa Vessel Glyph', { actions: BO }),
    unique('taubound-natah', 'cosmetics', { moonflesh: 100 }, 'Neolyst Natah Glyph', { actions: BO }),
    unique('taubound-dhampyre', 'cosmetics', { moonflesh: 500 }, 'Dhampyre Syandana', { actions: BO }),
    unique('taubound-sigil', 'cosmetics', { moonflesh: 100 }, 'Taubound Sigil', { actions: BO }),
    unique('taubound-emblem', 'cosmetics', { moonflesh: 100 }, 'Epoch Operation Vessel Emblem', { actions: BO }),
    // ── decorations ──
    unique('taubound-natah-floof', 'decorations', { moonflesh: 125 }, 'Neolyst Natah Floof', { actions: BO }),
    unique('taubound-sumdali', 'decorations', { moonflesh: 250 }, 'Khadati Sumdali', { actions: BO }),
    // ── others ──
    unique('taubound-song', 'others', { moonflesh: 125 }, 'Devourer', { actions: BO }),
    unique('taubound-honoria', 'others', { moonflesh: 175 }, 'The Moon Killer Honoria', { actions: BO }),
    // ── non-exclusive ──
    unique('valdurs', 'non-exclusive', { moonflesh: 175 }, 'Valdur\'s Syandana', { actions: BO }),
    unique('naktavyre-leg', 'non-exclusive', { moonflesh: 75 }, 'Naktavyre Leg Armor', { actions: BO }),
    unique('naktavyre-shoulder', 'non-exclusive', { moonflesh: 75 }, 'Naktavyre Shoulder Armor', { actions: BO }),
    unique('naktavyre-chestplate', 'non-exclusive', { moonflesh: 75 }, 'Naktavyre Chest Plate', { actions: BO }),
    unique('stone-emblem', 'non-exclusive', { moonflesh: 75 }, 'Sling Stone Emblem', { actions: BO }),
    unique('fear-emblem', 'non-exclusive', { moonflesh: 75 }, 'Arid Fear Emblem', { actions: BO }),
    unique('breeding-emblem', 'non-exclusive', { moonflesh: 75 }, 'Breeding Grounds Emblem', { actions: BO }),
    unique('rift', 'non-exclusive', { moonflesh: 75 }, 'Rift Sigil', { actions: BO }),
    unique('cortege', 'non-exclusive', { moonflesh: 125 }, 'Cortege Supulchrax Skin', { actions: BO }),
    unique('morgha', 'non-exclusive', { moonflesh: 125 }, 'Morgha Supulchrax Skin', { actions: BO }),
    unique('krios-signa', 'non-exclusive', { moonflesh: 100 }, 'Krios Signa', { actions: BO }),
    unique('phased-clan', 'non-exclusive', { moonflesh: 50 }, 'Phased Clan Sigil', { actions: BO }),
    unique('glyphed-clan', 'non-exclusive', { moonflesh: 50 }, 'Glyphed Clan Sigil', { actions: BO }),
    unique('gilded-clan', 'non-exclusive', { moonflesh: 50 }, 'Gilded Clan Sigil', { actions: BO }),
    unique('ballroom-simulacrum', 'non-exclusive', { moonflesh: 125 }, 'The Ballroom Simulacrum', { actions: BO }),
  ],
});
