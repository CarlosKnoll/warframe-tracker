// src/vendors/data/u44.js
// melica vendor — Update 44.0

/** @type {import('../schema.js').Vendor} */
export const narin = {
  id:          'melica',
  updateLabel: 'U44.0',

  currencies: [
    { id: 'enKuva', iconKey: 'enKuva' },
  ],

  categories: [
    { id: 'warframe',     sortOrder: 0 },
    { id: 'weapons',      sortOrder: 1 },
    { id: 'cosmetics',    sortOrder: 2 },
    { id: 'decorations',  sortOrder: 3 },
    { id: 'others',       sortOrder: 4 },
  ],

  parents: [
    {
      id:         'warframe-main',
      vendorId:   'melica',
      categoryId: 'warframe',
      name:       'Narin',
      type:       'warframe',
      partIds:    ['wf-blueprint', 'wf-neuroptics', 'wf-chassis', 'wf-systems'],
    },
    {
      id:         'weapon-nunchasa',
      vendorId:   'melica',
      categoryId: 'weapons',
      name:       'Nunchasa',
      type:       'weapon',
      partIds:    ['nunchasa-blueprint', 'nunchasa-upper-limb', 'nunchasa-string', 'nunchasa-grip', 'nunchasa-lower-limb'],
    },
    {
      id:         'weapon-aksondol',
      vendorId:   'melica',
      categoryId: 'weapons',
      name:       'Aksondol',
      type:       'weapon',
      partIds:    ['aksondol-blueprint', 'aksondol-link', 'aksondol-barrel1', 'aksondol-barrel2', 'aksondol-receiver1', 'aksondol-receiver2'],
    },
  ],

  items: [
    // ── Warframe parts ─────────────────────────────────────────────────────
    { kind: 'part', id: 'wf-blueprint',  vendorId: 'melica', parentId: 'warframe-main', parentType: 'warframe', slot: 'blueprint',  costs: { enKuva: 400 }, costMode: 'choice' },
    { kind: 'part', id: 'wf-neuroptics', vendorId: 'melica', parentId: 'warframe-main', parentType: 'warframe', slot: 'neuroptics', costs: { enKuva: 130  }, costMode: 'choice' },
    { kind: 'part', id: 'wf-chassis',    vendorId: 'melica', parentId: 'warframe-main', parentType: 'warframe', slot: 'chassis',    costs: { enKuva: 130  }, costMode: 'choice' },
    { kind: 'part', id: 'wf-systems',    vendorId: 'melica', parentId: 'warframe-main', parentType: 'warframe', slot: 'systems',    costs: { enKuva: 130  }, costMode: 'choice' },

    // ── Nunchasa weapon parts ─────────────────────────────────────────────────
    // Nunchasa recipe: Nunchasa Blueprint + Nunchasa Upper Limb + Nunchasa String + Nunchasa Grip + Nunchasa Lower Limb
    { kind: 'part', id: 'nunchasa-blueprint',      vendorId: 'melica', parentId: 'weapon-nunchasa', parentType: 'weapon', slot: 'blueprint',  costs: { enKuva: 200 } },
    { kind: 'part', id: 'nunchasa-string',         vendorId: 'melica', parentId: 'weapon-nunchasa', parentType: 'weapon', slot: 'string',     costs: { enKuva: 50 } },
    { kind: 'part', id: 'nunchasa-upper-limb',     vendorId: 'melica', parentId: 'weapon-nunchasa', parentType: 'weapon', slot: 'upper-limb', costs: { enKuva: 50 } },
    { kind: 'part', id: 'nunchasa-grip',           vendorId: 'melica', parentId: 'weapon-nunchasa', parentType: 'weapon', slot: 'grip',       costs: { enKuva: 50 } },
    { kind: 'part', id: 'nunchasa-lower-limb',     vendorId: 'melica', parentId: 'weapon-nunchasa', parentType: 'weapon', slot: 'lower-limb', costs: { enKuva: 50 } },

    // ── Aksondol weapon parts ─────────────────────────────────────────────────
    // Aksondol recipe: Aksondol Blueprint + 2x Aksondol Barrel + 2x Aksondol Receiver + Aksondol Link
    { kind: 'part', id: 'aksondol-blueprint',   vendorId: 'melica', parentId: 'weapon-aksondol', parentType: 'weapon', slot: 'blueprint',  costs: { enKuva: 200 } },
    { kind: 'part', id: 'aksondol-link',        vendorId: 'melica', parentId: 'weapon-aksondol', parentType: 'weapon', slot: 'link',       costs: { enKuva: 60 } },
    { kind: 'part', id: 'aksondol-barrel1',     vendorId: 'melica', parentId: 'weapon-aksondol', parentType: 'weapon', slot: 'barrel',     costs: { enKuva: 30 } },
    { kind: 'part', id: 'aksondol-barrel2',     vendorId: 'melica', parentId: 'weapon-aksondol', parentType: 'weapon', slot: 'barrel',     costs: { enKuva: 30 } },
    { kind: 'part', id: 'aksondol-receiver1',   vendorId: 'melica', parentId: 'weapon-aksondol', parentType: 'weapon', slot: 'receiver',   costs: { enKuva: 30 } },
    { kind: 'part', id: 'aksondol-receiver2',   vendorId: 'melica', parentId: 'weapon-aksondol', parentType: 'weapon', slot: 'receiver',   costs: { enKuva: 30 } },

    // ── Cosmetics ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'narin-sigil',             vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 250 } },
    { kind: 'unique', id: 'narin-ephemera',          vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 500 } },
    { kind: 'unique', id: 'narin-shoulder',          vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 80 } },
    { kind: 'unique', id: 'narin-chest',             vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 80 } },
    { kind: 'unique', id: 'narin-leg',               vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 80 } },
    { kind: 'unique', id: 'narin-skin-nepheri',      vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-dark-split',   vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-dark-dagg',    vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-dark-sword',   vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-paracesis',    vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-orvius',       vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-glaxion',      vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-quellor',      vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    { kind: 'unique', id: 'narin-skin-liset',        vendorId: 'melica', categoryId: 'cosmetics', costs: { enKuva: 150  } },
    
    // ── Decorations ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'narin-prex',     vendorId: 'melica', categoryId: 'decorations', costs: { enKuva: 500  } },
    { kind: 'unique', id: 'narin-sumdali',  vendorId: 'melica', categoryId: 'decorations', costs: { enKuva: 500  } },
    
    // ── Others ──────────────────────────────────────────────────────────
    { kind: 'unique', id: 'narin-honoria',     vendorId: 'melica', categoryId: 'others', costs: { enKuva: 500  } },
    { kind: 'unique', id: 'narin-scene1',      vendorId: 'melica', categoryId: 'others', costs: { enKuva: 500  } },
    { kind: 'unique', id: 'narin-scene2',      vendorId: 'melica', categoryId: 'others', costs: { enKuva: 500  } },
    { kind: 'unique', id: 'narin-song1',       vendorId: 'melica', categoryId: 'others', costs: { enKuva: 50  } },
    { kind: 'unique', id: 'narin-song2',       vendorId: 'melica', categoryId: 'others', costs: { enKuva: 50  } },
  ],
};