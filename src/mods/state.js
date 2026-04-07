// mods/state.js

export const state = {
  allMods:    [],
  searchText: '',
  category:   'All',
  polarity:   'All',
};

export const MODS_URLS = {
  Mods: 'https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Mods.json',
};

// Base URL for warframe.market full card images
export const WM_STATIC_BASE = 'https://warframe.market/static/assets/';
// WM items list — single fetch at init, returns all items with thumb hashes
export const WM_ITEMS_URL   = 'https://api.warframe.market/v2/items';
// WFCD thumbnail fallback
export const WFCD_IMG_BASE  = 'https://cdn.warframestat.us/img/';