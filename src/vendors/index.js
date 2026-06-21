// src/vendors/index.js
// Entry point – mirrors tasks/index.js

import { renderVendors, init as initRenderer } from './renderer.js';
import { loadVendorState } from './loader.js';

export async function initVendors(container) {
  initRenderer(container);
  await loadVendorState();
  renderVendors();
}

export async function refreshVendors() {
  await loadVendorState();
  renderVendors();
}

export function stopVendors() {
  // nothing to stop
}

export { renderVendors };