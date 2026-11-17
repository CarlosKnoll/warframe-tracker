// src/vendors/data/u43.js
// hunhow - Hunhow (U43)

import { vendor, currency, parent, part, unique, stock, arcane, either } from '../define.js';

// Controls each item renders (every item must declare its own actions).
const ALL = ['bought', 'drop', 'owned'];   // collectible: buyable, droppable or already owned
const BD  = ['bought', 'drop'];            // arcanes: counted, bought or dropped
const BO  = ['bought', 'owned'];

export default vendor({
  id:            'hunhow',
  since:         '43.0',
  badge:         'U43',
  family:        'update',
  title:         'Hunhow',          // English fallback; translations come from the locale files
  localeGroup:   'u43',
  missionMinutes: 13,                  // default minutes per mission (editable per vendor in the planner)
  // runModel: 'parallel',             // 'sequential' if each currency needs its own missions

  currencies: [
    currency('emerald', 'Emerald Talent'),
    currency('crimson', 'Crimson Talent'),
  ],

  categories: ['warframe', 'weapons', 'arcanes', 'cosmetics', 'decorations', 'others'],

  parents: [
    parent('warframe-main', 'warframe', 'warframe', 'Sirius & Orion'),
    parent('weapon-pride', 'weapons', 'weapon', 'Pride'),
    parent('weapon-wrath', 'weapons', 'weapon', 'Wrath'),
  ],

  items: [
    // ── warframe ──
    part('wf-blueprint', 'warframe-main', 'blueprint', either({ emerald: 275, crimson: 275 }), { actions: ALL }),
    part('wf-neuroptics', 'warframe-main', 'neuroptics', either({ emerald: 90, crimson: 90 }), { actions: ALL }),
    part('wf-chassis', 'warframe-main', 'chassis', either({ emerald: 90, crimson: 90 }), { actions: ALL }),
    part('wf-systems', 'warframe-main', 'systems', either({ emerald: 90, crimson: 90 }), { actions: ALL }),
    // ── weapons ──
    part('pride-blueprint', 'weapon-pride', 'blueprint', { emerald: 90 }, { actions: ALL }),
    part('pride-handle', 'weapon-pride', 'handle', { emerald: 45 }, { actions: ALL }),
    part('pride-blade', 'weapon-pride', 'blade', { emerald: 45 }, { actions: ALL }),
    part('wrath-blade-in-pride', 'weapon-pride', 'blade', { crimson: 45 }, { crossParent: 'weapon-wrath', actions: ALL }),
    part('wrath-blueprint', 'weapon-wrath', 'blueprint', { crimson: 90 }, { actions: ALL }),
    part('wrath-handle', 'weapon-wrath', 'handle', { crimson: 45 }, { actions: ALL }),
    part('wrath-blade', 'weapon-wrath', 'blade', { crimson: 45 }, { actions: ALL }),
    part('pride-blade-in-wrath', 'weapon-wrath', 'blade', { emerald: 45 }, { crossParent: 'weapon-pride', actions: ALL }),
    unique('hunhow-weapon', 'weapons', { emerald: 12, crimson: 12 }, 'Hunhow\'s Trinket Blueprint', { actions: ALL }),
    // ── cosmetics ──
    unique('syandana', 'cosmetics', { emerald: 50, crimson: 50 }, 'Jade\'s Victory Syandana', { actions: BO }),
    unique('liset-skin-blades', 'cosmetics', { emerald: 100 }, 'Bladeswarm Liset Skin', { actions: BO }),
    unique('liset-skin-blood', 'cosmetics', { crimson: 100 }, 'Bloodfrenzy Liset Skin', { actions: BO }),
    unique('ephemera-blades', 'cosmetics', { emerald: 100 }, 'Syndir Ephemera', { actions: BO }),
    unique('ephemera-blood', 'cosmetics', { crimson: 100 }, 'Viserakta Ephemera', { actions: BO }),
    unique('weapon-skin-vectis', 'cosmetics', { emerald: 60 }, 'Bladeswarm Vectis Skin', { actions: BO }),
    unique('weapon-skin-kunai', 'cosmetics', { emerald: 60 }, 'Bladeswarm Kunai Skin', { actions: BO }),
    unique('weapon-skin-karyst', 'cosmetics', { emerald: 60 }, 'Bladeswarm Karyst Skin', { actions: BO }),
    unique('weapon-skin-braton', 'cosmetics', { emerald: 60 }, 'Bladeswarm Braton Skin', { actions: BO }),
    unique('weapon-skin-nagantaka', 'cosmetics', { crimson: 60 }, 'Bloodfrenzy Nagantaka Skin', { actions: BO }),
    unique('weapon-skin-ballistica', 'cosmetics', { crimson: 60 }, 'Bloodfrenzy Ballistica Skin', { actions: BO }),
    unique('weapon-skin-venka', 'cosmetics', { crimson: 60 }, 'Bloodfrenzy Venka Skin', { actions: BO }),
    // ── decorations ──
    unique('domestik-drone-blood', 'decorations', { crimson: 50 }, 'Bloodfrenzy Domestik Drone', { actions: BO }),
    unique('domestik-drone-blades', 'decorations', { emerald: 50 }, 'Bladeswarm Domestik Drone', { actions: BO }),
    unique('poster-blades', 'decorations', { emerald: 20 }, 'Cloning 101 Poster', { actions: BO }),
    unique('poster-blood', 'decorations', { crimson: 20 }, 'Relationship Goals Poster', { actions: BO }),
    // ── others ──
    unique('crewmate-ryoku', 'others', { emerald: 50 }, 'Ryoku', { actions: BO }),
    unique('crewmate-vena', 'others', { crimson: 50 }, 'Vena', { actions: BO }),
    unique('crewmate-latrox-une', 'others', { emerald: 25, crimson: 25 }, 'Latrox Une', { actions: BO }),
    unique('crewmate-jarka-lar', 'others', { emerald: 25, crimson: 25 }, 'Jarka Lar', { actions: BO }),
    unique('theme-song-blades', 'others', { emerald: 60 }, 'Sacred Lights', { actions: BO }),
    unique('theme-song-blood', 'others', { crimson: 60 }, 'Celestial Clash', { actions: BO }),
    unique('scene-blades', 'others', { emerald: 50 }, 'Scoria\'s Angel Scene', { actions: BO }),
    unique('scene-blood', 'others', { crimson: 50 }, 'Kuva Wytch Scene', { actions: BO }),
    unique('scene-combined', 'others', { emerald: 25, crimson: 25 }, 'Pontis Tower Scene', { actions: BO }),
    // ── arcanes ──
    arcane('arcane-primary-compression', 'Primary Compression', { emerald: 15, crimson: 15 }, { actions: BD }),
    arcane('arcane-sculptor', 'Arcane Sculptor', { emerald: 10, crimson: 10 }, { actions: BD }),
    arcane('arcane-secondary-cryogenic', 'Secondary Cryogenic', { emerald: 10, crimson: 10 }, { actions: BD }),
    arcane('arcane-melee-assimilation', 'Melee Assimilation', { emerald: 10, crimson: 10 }, { actions: BD }),
  ],
});
