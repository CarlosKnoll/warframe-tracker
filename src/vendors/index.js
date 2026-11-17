// src/vendors/index.js
// Public entry point. Same API as before so main.js needs no changes, plus
// bindOwnership() to share Arcane counts with the Arcanes tab.

import { mount, unmount } from './ui/shell.js';
import { reload } from './store.js';
import { bindOwnership } from './ownership.js';

export async function initVendors(container) {
  mount(container);
  await reload();
}

export async function refreshVendors() {
  await reload();
}

/** Re-draw from storage (language change, Drive pull). reload() notifies the view. */
export async function renderVendors() {
  await reload();
}

export function stopVendors() {
  unmount();
}

export { bindOwnership };
