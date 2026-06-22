// src/vendors/data/u41.js
// Roathe vendor — Update 41.0
//
// Currency: Maphica.
// Warframe: Uriel — 4 parts.
// Weapons: Vinquibus (5 parts), Galariak Prime (3 parts), Sagek Prime (3 parts).
// Cosmetics: unique items.
// Arcanes: 9 arcanes, 21 copies each, flat cost per copy.

/** @type {import('../schema.js').Vendor} */
export const uriel = {
  id:          'roathe',
  updateLabel: 'U41.0',

  currencies: [
    { id: 'maphica', iconKey: 'maphica' },
  ],

  categories: [
    { id: 'warframe',     sortOrder: 0 },
    { id: 'weapons',      sortOrder: 1 },
    { id: 'arcanes',      sortOrder: 2 },
    { id: 'others',       sortOrder: 3 },
  ],

  parents: [
    {
      id:         'warframe-main',
      vendorId:   'roathe',
      categoryId: 'warframe',
      name:       'Uriel',
      type:       'warframe',
      partIds:    ['wf-blueprint', 'wf-neuroptics', 'wf-chassis', 'wf-systems'],
    },
    {
      id:         'weapon-vinquibus',
      vendorId:   'roathe',
      categoryId: 'weapons',
      name:       'Vinquibus',
      type:       'weapon',
      partIds:    ['vinquibus-blueprint', 'vinquibus-barrel', 'vinquibus-blade', 'vinquibus-receiver', 'vinquibus-stock'],
    },
    {
      id:         'weapon-galariak',
      vendorId:   'roathe',
      categoryId: 'weapons',
      name:       'Galariak Prime',
      type:       'weapon',
      partIds:    ['galariak-blueprint', 'galariak-handle', 'galariak-blade'],
    },
    {
      id:         'weapon-sagek',
      vendorId:   'roathe',
      categoryId: 'weapons',
      name:       'Sagek Prime',
      type:       'weapon',
      partIds:    ['sagek-blueprint', 'sagek-receiver', 'sagek-barrel'],
    },
  ],

  items: [
    // ── Warframe parts ─────────────────────────────────────────────────────
    { kind: 'part', id: 'wf-blueprint',  vendorId: 'roathe', parentId: 'warframe-main', parentType: 'warframe', slot: 'blueprint',  costs: { maphica: 75 } },
    { kind: 'part', id: 'wf-neuroptics', vendorId: 'roathe', parentId: 'warframe-main', parentType: 'warframe', slot: 'neuroptics', costs: { maphica: 25 } },
    { kind: 'part', id: 'wf-chassis',    vendorId: 'roathe', parentId: 'warframe-main', parentType: 'warframe', slot: 'chassis',    costs: { maphica: 25 } },
    { kind: 'part', id: 'wf-systems',    vendorId: 'roathe', parentId: 'warframe-main', parentType: 'warframe', slot: 'systems',    costs: { maphica: 25 } },

    // ── Vinquibus weapon parts ─────────────────────────────────────────────────
    { kind: 'part', id: 'vinquibus-blueprint',      vendorId: 'roathe', parentId: 'weapon-vinquibus', parentType: 'weapon', slot: 'blueprint', costs: { maphica: 35 } },
    { kind: 'part', id: 'vinquibus-barrel',         vendorId: 'roathe', parentId: 'weapon-vinquibus', parentType: 'weapon', slot: 'barrel',    costs: { maphica: 25 } },
    { kind: 'part', id: 'vinquibus-blade',          vendorId: 'roathe', parentId: 'weapon-vinquibus', parentType: 'weapon', slot: 'blade',     costs: { maphica: 25 } },
    { kind: 'part', id: 'vinquibus-receiver',       vendorId: 'roathe', parentId: 'weapon-vinquibus', parentType: 'weapon', slot: 'receiver',  costs: { maphica: 25 } },
    { kind: 'part', id: 'vinquibus-stock',          vendorId: 'roathe', parentId: 'weapon-vinquibus', parentType: 'weapon', slot: 'stock',     costs: { maphica: 25 } },
    

    // ── Galariak Prime weapon parts ─────────────────────────────────────────────────
    { kind: 'part', id: 'galariak-blueprint',      vendorId: 'roathe', parentId: 'weapon-galariak', parentType: 'weapon', slot: 'blueprint', costs: { maphica: 35 } },
    { kind: 'part', id: 'galariak-handle',         vendorId: 'roathe', parentId: 'weapon-galariak', parentType: 'weapon', slot: 'handle',    costs: { maphica: 25 } },
    { kind: 'part', id: 'galariak-blade',          vendorId: 'roathe', parentId: 'weapon-galariak', parentType: 'weapon', slot: 'blade',     costs: { maphica: 25 } },
    
    // ── Sagek Prime weapon parts ─────────────────────────────────────────────────
    { kind: 'part', id: 'sagek-blueprint',      vendorId: 'roathe', parentId: 'weapon-sagek', parentType: 'weapon', slot: 'blueprint',  costs: { maphica: 35 } },
    { kind: 'part', id: 'sagek-receiver',       vendorId: 'roathe', parentId: 'weapon-sagek', parentType: 'weapon', slot: 'receiver',   costs: { maphica: 25 } },
    { kind: 'part', id: 'sagek-barrel',         vendorId: 'roathe', parentId: 'weapon-sagek', parentType: 'weapon', slot: 'barrel',     costs: { maphica: 25 } },

    // ── Others ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'scene-makvos',       vendorId: 'roathe', categoryId: 'others', costs: { maphica: 100  } },
    { kind: 'unique', id: 'scene-boro',         vendorId: 'roathe', categoryId: 'others', costs: { maphica: 100  } },
    { kind: 'unique', id: 'scene-seeder',       vendorId: 'roathe', categoryId: 'others', costs: { maphica: 100  } },
    { kind: 'unique', id: 'scene-tennadis',     vendorId: 'roathe', categoryId: 'others', costs: { maphica: 100  } },
    { kind: 'unique', id: 'scene-perita',       vendorId: 'roathe', categoryId: 'others', costs: { maphica: 100  } },
    { kind: 'unique', id: 'scene-lyon',         vendorId: 'roathe', categoryId: 'others', costs: { maphica: 100  } },
    { kind: 'unique', id: 'scene-marie',        vendorId: 'roathe', categoryId: 'others', costs: { maphica: 100  } },
    { kind: 'unique', id: 'simulacrum-roathe',  vendorId: 'roathe', categoryId: 'others', costs: { maphica: 150  } },
    

    // ── Arcanes ────────────────────────────────────────────────────────────
    // 21 copies to fully rank. Flat cost per copy.
    // Real arcane names (matching arcane.* locale keys):
    {
      kind: 'arcane', id: 'arcane-primary-bulwark', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Primary Bulwark',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-primary-overcharge', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Primary Overcharge',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-expertise', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Arcane Expertise',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-persistence', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Arcane Persistence',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-melee-careen', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Melee Careen',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-circumvent', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Arcane Circumvent',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-secondary-irradiate', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Secondary Irradiate',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-concentration', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Arcane Concentration',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
    {
      kind: 'arcane', id: 'arcane-primary-debilitate', vendorId: 'roathe', categoryId: 'arcanes',
      name: 'Primary Debilitate',
      maxCopies: 21,
      costAtOwnedCount: (_n) => ({ maphica: 5 }),
    },
  ],
};