// src/vendors/registry.js
// Explicit vendor registry — import each vendor data file here and add it to
// the array.  The renderer iterates this list to build vendor subtabs.
// To add a new vendor: import its file and append to VENDORS.  Nothing else.

import { siriusAndOrion } from './data/sirius-and-orion.js';

/** @type {import('./schema.js').Vendor[]} */
export const VENDORS = [
  siriusAndOrion,
  // futureVendor,
];