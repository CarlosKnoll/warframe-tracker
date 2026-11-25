// src/vendors/registry.js
// Explicit vendor list. To add a vendor:
//   1. create data/<file>.js (or events/<file>.js) with vendor({...})
//   2. import it below and add it to DEFINITIONS
// Nothing else: grouping, ordering, selector entries, locale lookup and the
// planner all derive from the definition itself.

import { normalizeVendor, compareSince } from './catalog.js';
import { pickDefault } from './availability.js';

import praghasa from './events/u44-1-2.js';
import narin from './data/u44.js';
import siriusAndOrion from './data/u43.js';
import follie from './data/u42.js';
import uriel from './data/u41.js';
import nokko from './data/u40.js';

const DEFINITIONS = [
  praghasa,
  narin,
  siriusAndOrion,
  follie,
  uriel,
  nokko,
  // futureVendor,
];

/** Selector groups, in display order. A vendor picks one with `family`. */
export const FAMILIES = [
  { id: 'event',  key: 'tabs.vendor.ui.family_event',  fallback: 'Events' },
  { id: 'update', key: 'tabs.vendor.ui.family_update', fallback: 'Update vendors' },
];

/** All vendors, newest first. */
export const VENDORS = DEFINITIONS.map(normalizeVendor).sort((a, b) => compareSince(a.sinceKey, b.sinceKey));

for (const v of VENDORS) for (const p of v.problems) console.warn(`[vendors] ${v.id}: ${p}`);

const BY_ID = new Map(VENDORS.map((v) => [v.id, v]));
export const getVendor = (id) => BY_ID.get(id);

/** Vendor shown when nothing (valid) is selected: the newest one that is still available. */
export const defaultVendor = () => pickDefault(VENDORS);

/** Category id -> existing shared locale key (reused instead of per-vendor duplicates). */
export const CATEGORY_KEY_MAP = {
  warframe: 'filters.warframe',
  weapons: 'category.weapon',
  mods: 'menus-nav.mode.mods',
  arcanes: 'menus-nav.mode.arcanes',
  cosmetics: 'category.cosmetics',
  decorations: 'category.decorations',
  others: 'category.misc',
  standing: 'category.standing',
  resources: 'category.resource',
  'non-exclusive': 'category.non-exclusive',
};

/** Part slot -> existing shared component locale key. */
export const SLOT_COMPONENT_MAP = {
  blueprint: 'general.component.blueprint',
  neuroptics: 'general.component.neuroptics',
  chassis: 'general.component.chassis',
  systems: 'general.component.systems',
  handle: 'general.component.handle',
  blade: 'general.component.blade',
  barrel: 'general.component.barrel',
  receiver: 'general.component.receiver',
  stock: 'general.component.stock',
  'upper-limb': 'general.component.upper_limb',
  'lower-limb': 'general.component.lower_limb',
  string: 'general.component.string',
  grip: 'general.component.grip',
  // Akimbos
  barrel1: 'general.component.barrel',
  barrel2: 'general.component.barrel',
  receiver1: 'general.component.receiver',
  receiver2: 'general.component.receiver',
  link: 'general.component.link',
};
