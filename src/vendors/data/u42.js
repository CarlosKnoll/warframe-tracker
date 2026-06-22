// src/vendors/data/u42.js
// Aspirant Zorba vendor — Update 42.0
//
// One currency: Atramentum.
// Warframe: Follie — 4 parts, mode-toggle supported.
// Weapon: Enkaus - 4 parts.
// Cosmetics: unique items.

/** @type {import('../schema.js').Vendor} */
export const follie = {
  id:          'zorba',
  updateLabel: 'U42.0',

  currencies: [
    { id: 'atramentum', iconKey: 'atramentum' },
  ],

  categories: [
    { id: 'warframe',     sortOrder: 0 },
    { id: 'weapons',      sortOrder: 1 },
    { id: 'mods',         sortOrder: 2 },
    { id: 'decorations',  sortOrder: 3 },
    { id: 'others',       sortOrder: 4 },
  ],

  parents: [
    {
      id:         'warframe-main',
      vendorId:   'zorba',
      categoryId: 'warframe',
      name:       'Follie',
      type:       'warframe',
      partIds:    ['wf-blueprint', 'wf-neuroptics', 'wf-chassis', 'wf-systems'],
    },
    {
      id:         'weapon-enkaus',
      vendorId:   'zorba',
      categoryId: 'weapons',
      name:       'Enkaus',
      type:       'weapon',
      partIds:    ['enkaus-blueprint', 'enkaus-barrel', 'enkaus-receiver', 'enkaus-stock'],
    },
  ],

  items: [
    // ── Warframe parts ─────────────────────────────────────────────────────
    { kind: 'part', id: 'wf-blueprint',  vendorId: 'zorba', parentId: 'warframe-main', parentType: 'warframe', slot: 'blueprint',  costs: { atramentum: 1200 } },
    { kind: 'part', id: 'wf-neuroptics', vendorId: 'zorba', parentId: 'warframe-main', parentType: 'warframe', slot: 'neuroptics', costs: { atramentum: 400 } },
    { kind: 'part', id: 'wf-chassis',    vendorId: 'zorba', parentId: 'warframe-main', parentType: 'warframe', slot: 'chassis',    costs: { atramentum: 400 } },
    { kind: 'part', id: 'wf-systems',    vendorId: 'zorba', parentId: 'warframe-main', parentType: 'warframe', slot: 'systems',    costs: { atramentum: 400 } },

    // ── Enkaus weapon parts ─────────────────────────────────────────────────
    // Pride recipe: Pride Blueprint + Pride Handle + Pride Blade + Wrath Blade
    { kind: 'part', id: 'enkaus-blueprint',      vendorId: 'zorba', parentId: 'weapon-enkaus', parentType: 'weapon', slot: 'blueprint', costs: { atramentum: 1200 } },
    { kind: 'part', id: 'enkaus-barrel',         vendorId: 'zorba', parentId: 'weapon-enkaus', parentType: 'weapon', slot: 'barrel',    costs: { atramentum: 400 } },
    { kind: 'part', id: 'enkaus-receiver',       vendorId: 'zorba', parentId: 'weapon-enkaus', parentType: 'weapon', slot: 'receiver',  costs: { atramentum: 400 } },
    { kind: 'part', id: 'enkaus-stock',          vendorId: 'zorba', parentId: 'weapon-enkaus', parentType: 'weapon', slot: 'stock',     costs: { atramentum: 400 } },
    
    // ── Mods ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'truths-flame',          vendorId: 'zorba', categoryId: 'mods', costs: { atramentum: 360 } },
    
    // ── Decorations ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'follie-prex',         vendorId: 'zorba', categoryId: 'decorations', costs: { atramentum: 600  } },
    
    // ── Others ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'chromatic-atramentum',           vendorId: 'zorba', categoryId: 'others', costs: { atramentum: 360  } },
    { kind: 'unique', id: 'drip',                           vendorId: 'zorba', categoryId: 'others', costs: { atramentum: 200  } },
    { kind: 'unique', id: 'stained-vespers',                vendorId: 'zorba', categoryId: 'others', costs: { atramentum: 200  } },
    { kind: 'unique', id: 'dreadnaught',                    vendorId: 'zorba', categoryId: 'others', costs: { atramentum: 200  } },
    { kind: 'unique', id: 'relay-scene',                    vendorId: 'zorba', categoryId: 'others', costs: { atramentum: 600  } },
    
  ],
};