// src/vendors/registry.js
// Explicit vendor registry — import each vendor data file here and add it to
// the array.  The renderer iterates this list to build vendor subtabs.
// To add a new vendor: import its file and append to VENDORS.  Nothing else.

import { siriusAndOrion } from './data/u43.js';
import { follie } from './data/u42.js';
import { uriel } from './data/u41.js';
import { nokko } from './data/u40.js';

/** @type {import('./schema.js').Vendor[]} */
export const VENDORS = [
  nokko,
  uriel,
  follie,
  siriusAndOrion,
  // futureVendor,
];

export const VENDOR_LOCALE_GROUP = {
  nightcap: 'u40',
  roathe: 'u41',
  zorba: 'u42',
  hunhow: 'u43',
};

export const CATEGORY_KEY_MAP = {
  warframe: 'filters.warframe',
  weapons:  'category.weapon',
  mods: 'menus-nav.mode.mods',
  arcanes:  'menus-nav.mode.arcanes',
  cosmetics: 'category.cosmetics',
  decorations: 'category.decorations',
  others:   'category.misc',
  standing: 'category.standing'
};

export const SLOT_COMPONENT_MAP = {
  blueprint:  'general.component.blueprint',
  neuroptics: 'general.component.neuroptics',
  chassis:    'general.component.chassis',
  systems:    'general.component.systems',
  handle:     'general.component.handle',
  blade:      'general.component.blade',
  barrel:     'general.component.barrel',
  receiver:   'general.component.receiver',
  stock:      'general.component.stock',
};