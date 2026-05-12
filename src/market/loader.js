// market/loader.js
// Fetches the full order dump via the Rust streaming command.
// All orders are stored in state.allOrders; the renderer slices and sorts
// from that list client-side for "load more" and column sorting.

import { state, orderCache, CACHE_TTL_MS } from './state.js';

const invoke = window.__TAURI_INTERNALS__?.invoke
  ?? window.__TAURI__?.core?.invoke
  ?? window.__TAURI__?.tauri?.invoke
  ?? null;

// Initial visible count and how many to add on "load more".
const INITIAL_COUNT = 10;

// Incremented on every new search and on cancel so stale in-flight results
// are silently discarded instead of overwriting a newer search.
let searchGeneration = 0;

export function getSlug(itemName, type = 'prime') {
  let result = itemName.toLowerCase()
    .replace(/[^a-z0-9\s-]/g, '')
    .trim()
    .replace(/\s+/g, '_');

  // Append _set only for full prime sets (slug ends exactly with "_prime").
  // Components like "ash_prime_neuroptics" are left unchanged.
  if (type === 'prime' && result.endsWith('_prime') && !result.includes('_set')) {
    result = result + '_set';
  }

  return result;
}

export function getDisplayNameFromSlug(slug) {
  return slug.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase());
}

// Normalize a raw CompactOrder from Rust into the shape the renderer expects.
function formatOrder(o, displayName) {
  return {
    platinum: o.platinum,
    quantity: o.quantity,
    rank:     o.rank || 0,
    orderType: o.order_type, // 'sell' or 'buy'
    user:     { name: o.user_name, status: o.status },
    orderId:  o.id,
    itemName: displayName,
  };
}

async function fetchOrders(slug, displayName, targetCount, rankFilter = 'all') {
  // For 'maxed', pass the stored maxRank value to Rust so it can filter server-side.
  // state.maxRank is 0 on the very first fetch (no prior data), so we pass null and
  // let Rust return all ranks — renderer will then set state.maxRank, and subsequent
  // 'maxed' fetches will pass the correct value.
  const rankFilterValue = (rankFilter === 'maxed' && state.maxRank > 0)
    ? state.maxRank
    : null;

  const result = await invoke('fetch_market_orders_stream', {
    url: `https://api.warframe.market/v2/orders/item/${slug}`,
    targetSellCount: targetCount,
    targetBuyCount:  targetCount,
    rankFilter: rankFilterValue,
  });

  console.log('[market] stream result:', result);

  const sellOrders = Array.isArray(result?.new_sell_orders) ? result.new_sell_orders : [];
  const buyOrders  = Array.isArray(result?.new_buy_orders)  ? result.new_buy_orders  : [];

  return {
    sell: sellOrders.map(o => formatOrder(o, displayName)),
    buy:  buyOrders.map(o => formatOrder(o, displayName)),
    totalProcessed: result?.total_processed || 0,
    ingameCount:    result?.ingame_count    || 0,
    stoppedReason:  result?.stopped_reason  || '',
  };
}

// Compute max rank from both sides of an order set and update state.maxRank.
function updateMaxRank(sellOrders, buyOrders) {
  const all = [...sellOrders, ...buyOrders];
  const discovered = all.reduce((max, o) => Math.max(max, o.rank ?? 0), 0);
  if (discovered > 0) state.maxRank = discovered;
}

export async function performSearch(slug, callback, targetCount = 50, rankFilter = 'all') {
  if (!slug) {
    state.currentResults = null;
    state.allOrders = null;
    state.loading = false;
    callback?.(null);
    return;
  }

  const myGen = ++searchGeneration;

  // Cache key includes rankFilter so 'all' and 'maxed' are stored separately.
  const cacheKey = `${slug}::${rankFilter}`;

  // Serve from cache if still fresh.
  const cached = orderCache.get(cacheKey);
  if (cached && (Date.now() - cached.timestamp) < CACHE_TTL_MS) {
    state.allOrders = cached.allOrders;
    state.currentResults = cached.data;
    state.loading = false;
    if (cached.maxRank) state.maxRank = cached.maxRank;
    _resetDisplayState();
    callback?.(cached.data, false);
    return;
  }

  state.loading = true;
  state.error = null;

  try {
    const displayName = getDisplayNameFromSlug(slug);
    const orders = await fetchOrders(slug, displayName, targetCount, rankFilter);

    if (searchGeneration !== myGen) return;

    state.allOrders = { sell: orders.sell, buy: orders.buy };
    // Discover and persist the max rank for this item (used for server-side filtering).
    updateMaxRank(orders.sell, orders.buy);

    const results = {
      slug,
      displayName,
      totalSellCount: orders.sell.length,
      totalBuyCount:  orders.buy.length,
      streamingStats: {
        processed:     orders.totalProcessed,
        ingameFound:   orders.ingameCount,
        stoppedReason: orders.stoppedReason,
      },
      lastUpdated: Date.now(),
    };

    orderCache.set(cacheKey, { data: results, allOrders: state.allOrders, maxRank: state.maxRank, timestamp: Date.now() });
    state.currentResults = results;
    state.loading = false;

    _resetDisplayState();
    callback?.(results, false);

  } catch (err) {
    if (searchGeneration !== myGen) return;
    console.error('[market] search error:', err);
    state.error = typeof err === 'string' ? err : 'Failed to fetch market data';
    state.loading = false;
    callback?.(null, false, state.error);
  }
}

function _resetDisplayState() {
  state.visibleCount = { sell: INITIAL_COUNT, buy: INITIAL_COUNT };
  state.sort = {
    sell: { key: 'platinum', dir: 'asc'  },
    buy:  { key: 'platinum', dir: 'desc' },
  };
}

export function cancelMarketSearch() {
  searchGeneration++;
}