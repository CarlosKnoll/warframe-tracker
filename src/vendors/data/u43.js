// src/vendors/data/u43.js
// Hunhow vendor — Update 43.0
//
// Two currencies: Emerald Talent (emerald) and Crimson Talent (crimson).
// Warframe: Sirius & Orion — 4 parts, mode-toggle supported.
// Weapons: Pride (4 parts), Wrath (4 parts) — cross-recipe blades.
// Cosmetics: unique items.
// Arcanes: 4 arcanes, 21 copies each, flat cost per copy.

/** @type {import('../schema.js').Vendor} */
export const siriusAndOrion = {
  id:          'hunhow',
  updateLabel: 'U43.0',

  currencies: [
    { id: 'emerald', iconKey: 'emeraldTalent' },
    { id: 'crimson', iconKey: 'crimsonTalent' },
  ],

  categories: [
    { id: 'warframe',     sortOrder: 0 },
    { id: 'weapons',      sortOrder: 1 },
    { id: 'arcanes',      sortOrder: 2 },
    { id: 'cosmetics',    sortOrder: 3 },
    { id: 'decorations',  sortOrder: 4 },
    { id: 'others',       sortOrder: 5 },
  ],

  parents: [
    {
      id:         'warframe-main',
      vendorId:   'hunhow',
      categoryId: 'warframe',
      name:       'Sirius & Orion',
      type:       'warframe',
      partIds:    ['wf-blueprint', 'wf-neuroptics', 'wf-chassis', 'wf-systems'],
    },
    {
      id:         'weapon-pride',
      vendorId:   'hunhow',
      categoryId: 'weapons',
      name:       'Pride',
      type:       'weapon',
      partIds:    ['pride-blueprint', 'pride-handle', 'pride-blade', 'wrath-blade-in-pride'],
    },
    {
      id:         'weapon-wrath',
      vendorId:   'hunhow',
      categoryId: 'weapons',
      name:       'Wrath',
      type:       'weapon',
      partIds:    ['wrath-blueprint', 'wrath-handle', 'wrath-blade', 'pride-blade-in-wrath'],
    },
  ],

  items: [
    // ── Warframe parts ─────────────────────────────────────────────────────
    { kind: 'part', id: 'wf-blueprint',  vendorId: 'hunhow', parentId: 'warframe-main', parentType: 'warframe', slot: 'blueprint',  costs: { emerald: 275, crimson: 275 }, costMode: 'choice' },
    { kind: 'part', id: 'wf-neuroptics', vendorId: 'hunhow', parentId: 'warframe-main', parentType: 'warframe', slot: 'neuroptics', costs: { emerald: 90,  crimson: 90  }, costMode: 'choice' },
    { kind: 'part', id: 'wf-chassis',    vendorId: 'hunhow', parentId: 'warframe-main', parentType: 'warframe', slot: 'chassis',    costs: { emerald: 90,  crimson: 90  }, costMode: 'choice' },
    { kind: 'part', id: 'wf-systems',    vendorId: 'hunhow', parentId: 'warframe-main', parentType: 'warframe', slot: 'systems',    costs: { emerald: 90,  crimson: 90  }, costMode: 'choice' },

    // ── Pride weapon parts ─────────────────────────────────────────────────
    // Pride recipe: Pride Blueprint + Pride Handle + Pride Blade + Wrath Blade
    { kind: 'part', id: 'pride-blueprint',      vendorId: 'hunhow', parentId: 'weapon-pride', parentType: 'weapon', slot: 'blueprint', costs: { emerald: 90 } },
    { kind: 'part', id: 'pride-handle',         vendorId: 'hunhow', parentId: 'weapon-pride', parentType: 'weapon', slot: 'handle',    costs: { emerald: 45 } },
    { kind: 'part', id: 'pride-blade',          vendorId: 'hunhow', parentId: 'weapon-pride', parentType: 'weapon', slot: 'blade',     costs: { emerald: 45 } },
    { kind: 'part', id: 'wrath-blade-in-pride', vendorId: 'hunhow', parentId: 'weapon-pride', parentType: 'weapon', slot: 'blade',     costs: { crimson: 45 }, crossParent: 'weapon-wrath' },

    // ── Wrath weapon parts ─────────────────────────────────────────────────
    // Wrath recipe: Wrath Blueprint + Wrath Handle + Wrath Blade + Pride Blade
    { kind: 'part', id: 'wrath-blueprint',      vendorId: 'hunhow', parentId: 'weapon-wrath', parentType: 'weapon', slot: 'blueprint', costs: { crimson: 90 } },
    { kind: 'part', id: 'wrath-handle',         vendorId: 'hunhow', parentId: 'weapon-wrath', parentType: 'weapon', slot: 'handle',    costs: { crimson: 45 } },
    { kind: 'part', id: 'wrath-blade',          vendorId: 'hunhow', parentId: 'weapon-wrath', parentType: 'weapon', slot: 'blade',     costs: { crimson: 45 } },
    { kind: 'part', id: 'pride-blade-in-wrath', vendorId: 'hunhow', parentId: 'weapon-wrath', parentType: 'weapon', slot: 'blade',     costs: { emerald: 45 }, crossParent: 'weapon-pride' },
    
    { kind: 'unique', id: 'hunhow-weapon',            vendorId: 'hunhow', categoryId: 'weapons', costs: { emerald: 12, crimson: 12 } },

    // ── Cosmetics ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'syandana',                 vendorId: 'hunhow', categoryId: 'cosmetics', costs: { emerald: 50, crimson: 50 } },
    { kind: 'unique', id: 'liset-skin-blades',        vendorId: 'hunhow', categoryId: 'cosmetics', costs: { emerald: 100 } },
    { kind: 'unique', id: 'liset-skin-blood',         vendorId: 'hunhow', categoryId: 'cosmetics', costs: { crimson: 100 } },
    { kind: 'unique', id: 'ephemera-blades',          vendorId: 'hunhow', categoryId: 'cosmetics', costs: { emerald: 100 } },
    { kind: 'unique', id: 'ephemera-blood',           vendorId: 'hunhow', categoryId: 'cosmetics', costs: { crimson: 100 } },
    { kind: 'unique', id: 'weapon-skin-vectis',       vendorId: 'hunhow', categoryId: 'cosmetics', costs: { emerald: 60  } },
    { kind: 'unique', id: 'weapon-skin-kunai',        vendorId: 'hunhow', categoryId: 'cosmetics', costs: { emerald: 60  } },
    { kind: 'unique', id: 'weapon-skin-karyst',       vendorId: 'hunhow', categoryId: 'cosmetics', costs: { emerald: 60  } },
    { kind: 'unique', id: 'weapon-skin-braton',       vendorId: 'hunhow', categoryId: 'cosmetics', costs: { emerald: 60  } },
    { kind: 'unique', id: 'weapon-skin-nagantaka',    vendorId: 'hunhow', categoryId: 'cosmetics', costs: { crimson: 60  } },
    { kind: 'unique', id: 'weapon-skin-ballistica',   vendorId: 'hunhow', categoryId: 'cosmetics', costs: { crimson: 60  } },
    { kind: 'unique', id: 'weapon-skin-venka',        vendorId: 'hunhow', categoryId: 'cosmetics', costs: { crimson: 60  } },
    
    // ── Decorations ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'domestik-drone-blood',     vendorId: 'hunhow', categoryId: 'decorations', costs: { crimson: 50  } },
    { kind: 'unique', id: 'domestik-drone-blades',    vendorId: 'hunhow', categoryId: 'decorations', costs: { emerald: 50  } },
    { kind: 'unique', id: 'poster-blades',            vendorId: 'hunhow', categoryId: 'decorations', costs: { emerald: 20  } },
    { kind: 'unique', id: 'poster-blood',             vendorId: 'hunhow', categoryId: 'decorations', costs: { crimson: 20  } },
    
    // ── Others ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'crewmate-ryoku',           vendorId: 'hunhow', categoryId: 'others', costs: { emerald: 50  } },
    { kind: 'unique', id: 'crewmate-vena',            vendorId: 'hunhow', categoryId: 'others', costs: { crimson: 50  } },
    { kind: 'unique', id: 'crewmate-latrox-une',      vendorId: 'hunhow', categoryId: 'others', costs: { emerald: 25, crimson: 25  } },
    { kind: 'unique', id: 'crewmate-jarka-lar',       vendorId: 'hunhow', categoryId: 'others', costs: { emerald: 25, crimson: 25  } },
    { kind: 'unique', id: 'theme-song-blades',        vendorId: 'hunhow', categoryId: 'others', costs: { emerald: 60  } },
    { kind: 'unique', id: 'theme-song-blood',         vendorId: 'hunhow', categoryId: 'others', costs: { crimson: 60  } },
    { kind: 'unique', id: 'scene-blades',             vendorId: 'hunhow', categoryId: 'others', costs: { emerald: 50  } },
    { kind: 'unique', id: 'scene-blood',              vendorId: 'hunhow', categoryId: 'others', costs: { crimson: 50  } },
    { kind: 'unique', id: 'scene-combined',           vendorId: 'hunhow', categoryId: 'others', costs: { emerald: 25, crimson: 25 } },
    

    // ── Arcanes ────────────────────────────────────────────────────────────
    // 21 copies to fully rank. Flat cost per copy.
    // Real arcane names (matching arcane.* locale keys):
    //   Primary Compression, Arcane Sculptor, Secondary Cryogenic, Melee Assimilation
    {
      kind: 'arcane', id: 'arcane-primary-compression', vendorId: 'hunhow', categoryId: 'arcanes',
      name: 'Primary Compression',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ emerald: 15, crimson: 15 }),
    },
    {
      kind: 'arcane', id: 'arcane-sculptor', vendorId: 'hunhow', categoryId: 'arcanes',
      name: 'Arcane Sculptor',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ emerald: 10, crimson: 10 }),
    },
    {
      kind: 'arcane', id: 'arcane-secondary-cryogenic', vendorId: 'hunhow', categoryId: 'arcanes',
      name: 'Secondary Cryogenic',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ emerald: 10, crimson: 10 }),
    },
    {
      kind: 'arcane', id: 'arcane-melee-assimilation', vendorId: 'hunhow', categoryId: 'arcanes',
      name: 'Melee Assimilation',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ emerald: 10, crimson: 10 }),
    },
  ],
};