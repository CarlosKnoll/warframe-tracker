// src/vendors/data/u40.js
// Nightcap vendor — Update 40.0
//
// Currency: Fergolyte
// Warframe: Nokko.
// Weapons: Arbucep (4 parts)
// Cosmetics: unique items.
// Arcanes: 4 arcanes, 21 copies each, flat cost per copy.

/** @type {import('../schema.js').Vendor} */
export const nokko = {
  id:          'nightcap',
  updateLabel: 'U40.0',

  currencies: [
    { id: 'fergolyte', iconKey: 'fergolyte' },
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
      vendorId:   'nightcap',
      categoryId: 'warframe',
      name:       'Nokko',
      type:       'warframe',
      partIds:    ['wf-blueprint', 'wf-neuroptics', 'wf-chassis', 'wf-systems'],
    },
    {
      id:         'weapon-arbucep',
      vendorId:   'nightcap',
      categoryId: 'weapons',
      name:       'Arbucep',
      type:       'weapon',
      partIds:    ['arbucep-blueprint', 'arbucep-barrel', 'arbucep-stock', 'arbucep-receiver'],
    },
  ],

  items: [
    // ── Warframe parts ─────────────────────────────────────────────────────
    { kind: 'part', id: 'wf-blueprint',  vendorId: 'nightcap', parentId: 'warframe-main', parentType: 'warframe', slot: 'blueprint',  costs: { fergolyte: 240 } },
    { kind: 'part', id: 'wf-neuroptics', vendorId: 'nightcap', parentId: 'warframe-main', parentType: 'warframe', slot: 'neuroptics', costs: { fergolyte: 160 } },
    { kind: 'part', id: 'wf-chassis',    vendorId: 'nightcap', parentId: 'warframe-main', parentType: 'warframe', slot: 'chassis',    costs: { fergolyte: 160 } },
    { kind: 'part', id: 'wf-systems',    vendorId: 'nightcap', parentId: 'warframe-main', parentType: 'warframe', slot: 'systems',    costs: { fergolyte: 160 } },

    // ── Arbucep weapon parts ─────────────────────────────────────────────────
    { kind: 'part', id: 'arbucep-blueprint',      vendorId: 'nightcap', parentId: 'weapon-arbucep', parentType: 'weapon', slot: 'blueprint', costs: { fergolyte: 220 } },
    { kind: 'part', id: 'arbucep-barrel',         vendorId: 'nightcap', parentId: 'weapon-arbucep', parentType: 'weapon', slot: 'barrel',    costs: { fergolyte: 150 } },
    { kind: 'part', id: 'arbucep-receiver',       vendorId: 'nightcap', parentId: 'weapon-arbucep', parentType: 'weapon', slot: 'receiver',  costs: { fergolyte: 150 } },
    { kind: 'part', id: 'arbucep-stock',          vendorId: 'nightcap', parentId: 'weapon-arbucep', parentType: 'weapon', slot: 'stock',     costs: { fergolyte: 150 } },


    // ── Cosmetics ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'ephemera-rizoma',          vendorId: 'nightcap', categoryId: 'cosmetics', costs: { fergolyte: 150 } },
    { kind: 'unique', id: 'skin-onemind',             vendorId: 'nightcap', categoryId: 'cosmetics', costs: { fergolyte: 25  } },
    { kind: 'unique', id: 'skin-roots',               vendorId: 'nightcap', categoryId: 'cosmetics', costs: { fergolyte: 25  } },
    { kind: 'unique', id: 'skin-shooms',              vendorId: 'nightcap', categoryId: 'cosmetics', costs: { fergolyte: 25  } },
    
    // ── Decorations ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'poster-onemind',           vendorId: 'nightcap', categoryId: 'decorations', costs: { fergolyte: 25  } },
    { kind: 'unique', id: 'poster-roots',             vendorId: 'nightcap', categoryId: 'decorations', costs: { fergolyte: 25  } },
    { kind: 'unique', id: 'poster-shooms',            vendorId: 'nightcap', categoryId: 'decorations', costs: { fergolyte: 25  } },
    
    // ── Others ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'scene-caves',               vendorId: 'nightcap', categoryId: 'others', costs: { fergolyte: 60  } },
    { kind: 'unique', id: 'scene-forward',             vendorId: 'nightcap', categoryId: 'others', costs: { fergolyte: 60  } },
    { kind: 'unique', id: 'scene-lab',                 vendorId: 'nightcap', categoryId: 'others', costs: { fergolyte: 60  } },
    { kind: 'unique', id: 'scene-nutrient',            vendorId: 'nightcap', categoryId: 'others', costs: { fergolyte: 60  } },
    { kind: 'unique', id: 'scene-deepmines',           vendorId: 'nightcap', categoryId: 'others', costs: { fergolyte: 60  } },
    
    

    // ── Arcanes ────────────────────────────────────────────────────────────
    // 21 copies to fully rank. Flat cost per copy.
    // Real arcane names (matching arcane.* locale keys):
    //   Primary Compression, Arcane Sculptor, Secondary Cryogenic, Melee Assimilation
    {
      kind: 'arcane', id: 'arcane-conjunction-voltage', vendorId: 'nightcap', categoryId: 'arcanes',
      name: 'Conjunction Voltage',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ fergolyte: 10 }),
    },
    {
      kind: 'arcane', id: 'arcane-primary-blight', vendorId: 'nightcap', categoryId: 'arcanes',
      name: 'Primary Blight',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ fergolyte: 10 }),
    },
    {
      kind: 'arcane', id: 'arcane-primary-frostbite', vendorId: 'nightcap', categoryId: 'arcanes',
      name: 'Primary Frostbite',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ fergolyte: 10 }),
    },
    {
      kind: 'arcane', id: 'arcane-secondary-encumber', vendorId: 'nightcap', categoryId: 'arcanes',
      name: 'Secondary Encumber',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ fergolyte: 10 }),
    },
    {
      kind: 'arcane', id: 'arcane-secondary-fortifier', vendorId: 'nightcap', categoryId: 'arcanes',
      name: 'Secondary Fortifier',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ fergolyte: 10 }),
    },
  ],
};