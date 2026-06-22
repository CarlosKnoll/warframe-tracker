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