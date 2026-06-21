// src/vendors/state.js
// Runtime state for the vendors feature – mirrors tasks/state.js

export const state = {
  vendorState: {},          // loaded from IndexedDB via getVendorState()
  selectedVendorId: null,   // which vendor tab is active
};

// Must be exported so renderer.js can import it
export function selectVendor(vendorId) {
  state.selectedVendorId = vendorId;
}