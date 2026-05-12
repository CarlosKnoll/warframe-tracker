// market/state.js - Shared state for market module

export const state = {
  searchText: '',
  currentResults: null,  // full result object from loader
  allOrders: null,       // { sell: [...all...], buy: [...all...] } — full unsliced list
  loading: false,
  error: null,
  currentView: 'sell',   // 'sell' or 'buy'

  // How many orders to request from the API (and cap results to).
  maxOrders: 10,         // 10 | 30 | 50 | 100

  // Rank filter — only relevant for mods/arcanes.
  // 'all' shows every order; 'maxed' shows only orders where rank === maxRank.
  rankFilter: 'all',     // 'all' | 'maxed'

  // Discovered max rank for the current item (set after first fetch; 0 = not rankable).
  maxRank: 0,

  // How many rows are currently visible per view.
  visibleCount: { sell: 10, buy: 10 },
  LOAD_MORE_STEP: 10,

  // Sorting state per view.
  sort: {
    sell: { key: 'platinum', dir: 'asc' },
    buy:  { key: 'platinum', dir: 'desc' },
  },
};

// V2 API endpoint
export const MARKET_API_BASE = 'https://api.warframe.market/v2';
export const MARKET_ORDERS_URL = (slug) => `${MARKET_API_BASE}/orders/item/${slug}`;

// 10 minute cache TTL
export const CACHE_TTL_MS = 10 * 60 * 1000;

export const orderCache = new Map(); // key: slug, value: { data, timestamp }