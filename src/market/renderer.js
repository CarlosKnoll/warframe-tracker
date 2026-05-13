// market/renderer.js - Render market search results

import { state } from './state.js';
import { t } from '../i18n.js';

let currentResults = null;
let currentContainer = null;
let copiedStates = new Map();

// Store whisper messages in a JS Map instead of HTML attributes so that
// quotes and special characters in item names are never HTML-escaped/truncated.
const whisperMessages = new Map(); // orderId → message string

export function renderMarketResults(container, results) {
  if (!container) return;

  currentResults = results;
  currentContainer = container;

  if (state.loading) {
    container.innerHTML = `<div class="market-loading">${t('market.loading')}</div>`;
    return;
  }

  if (state.error) {
    container.innerHTML = `<div class="market-error">${state.error}</div>`;
    return;
  }

  const allOrders = state.allOrders;
  if (!results || !allOrders ||
      (!allOrders.sell?.length && !allOrders.buy?.length)) {
    container.innerHTML = `<div class="market-empty">${t('market.noResults')}</div>`;
    return;
  }

  const view = state.currentView; // 'sell' or 'buy'
  const allViewOrders = allOrders[view] ?? [];

  if (allViewOrders.length === 0) {
    container.innerHTML = `<div class="market-empty">${
      view === 'sell' ? t('market.noSellOrders') : t('market.noBuyOrders')
    }</div>`;
    return;
  }

  // ── Rank filter visibility — decided from actual data, not query heuristic ──
  // Check both sides so the toggle doesn't flicker when switching sell/buy tab.
  const allBothSides = [...(allOrders.sell ?? []), ...(allOrders.buy ?? [])];
  const globalMaxRank = allBothSides.reduce((max, o) => Math.max(max, o.rank ?? 0), 0);

  updateRankFilterVisibility(globalMaxRank > 0);
  updateViewToggle(view);

  // Orders are already rank-filtered server-side; just sort and paginate.
  const sorted    = sortOrders(allViewOrders, state.sort[view]);
  const visible   = state.visibleCount[view];
  const displayed = sorted.slice(0, visible);
  const hasMore   = sorted.length > visible;

  // Push count into the controls row (lives outside #marketResults).
  updateOrderCount(displayed.length, sorted.length);
  updateViewToggle(view);

  // Rebuild whisper map for displayed orders.
  whisperMessages.clear();
  displayed.forEach((order, index) => {
    const orderId = makeOrderId(order, index);
    const msg     = buildWhisperMsg(order, results.displayName, view);
    whisperMessages.set(orderId, msg);
  });

  // ── Sort indicators ───────────────────────────────────────────────────────
  const s = state.sort[view];
  const arrow    = (col) => s.key === col ? (s.dir === 'asc' ? ' ↑' : ' ↓') : '';
  const hdrClass = (col) => s.key === col ? 'sorted' : '';

  const imgHtml = results.imgUrl
  ? `<img class="market-item-img" src="${results.imgUrl}" alt="${escapeHtml(results.displayName)}" draggable="false" />`
  : '';

  let html = `
    <div class="market-item-header">
        ${imgHtml}
        <div class="market-item-name">${escapeHtml(results.displayName)}</div>
    </div>
    <div class="market-list-header">
      <span class="sortable ${hdrClass('user')}"     data-sort="user"     >${t('market.colSeller')}${arrow('user')}</span>
      <span class="sortable ${hdrClass('status')}"   data-sort="status"   >${t('market.colStatus')}${arrow('status')}</span>
      <span class="sortable ${hdrClass('platinum')}" data-sort="platinum" >${t('market.colPrice')}${arrow('platinum')}</span>
      <span class="sortable ${hdrClass('quantity')}" data-sort="quantity" >${t('market.colQuantity')}${arrow('quantity')}</span>
      <span></span>
    </div>
    <div class="market-list" id="marketList">
  `;

  displayed.forEach((order, index) => {
    html += renderOrderRow(order, index, view, globalMaxRank);
  });

  html += `</div>`;

  if (hasMore) {
    const remaining = sorted.length - visible;
    html += `
      <button class="market-load-more-btn" id="marketLoadMore">
        ${t('market.loadMore') || 'Load more'} (${remaining} ${t('market.remaining') || 'remaining'})
      </button>
    `;
  }

  container.innerHTML = html;
  bindEvents(container);
}

// ── Controls-row helpers (elements live outside #marketResults) ───────────────

// Show or hide the entire rank-filter control group (label + buttons).
function updateRankFilterVisibility(hasRanks) {
  const group = document.getElementById('marketRankFilterGroup');
  if (group) group.style.display = hasRanks ? 'flex' : 'none';
}

// Write the order count into the dedicated span in the controls row.
function updateOrderCount(shown, total) {
  const el = document.getElementById('marketOrderCount');
  if (el) el.textContent = `${shown} / ${total} ${t('market.orders')}`;
}

// ── Order sorting ─────────────────────────────────────────────────────────────

function sortOrders(orders, { key, dir }) {
  const mul = dir === 'asc' ? 1 : -1;
  return [...orders].sort((a, b) => {
    let av, bv;
    if (key === 'user') {
      av = a.user?.name?.toLowerCase() ?? '';
      bv = b.user?.name?.toLowerCase() ?? '';
    } else if (key === 'status') {
      const rank = s => s === 'ingame' ? 0 : s === 'online' ? 1 : 2;
      av = rank(a.user?.status); bv = rank(b.user?.status);
    } else if (key === 'platinum') { av = a.platinum; bv = b.platinum; }
    else if (key === 'quantity')   { av = a.quantity; bv = b.quantity; }
    else { return 0; }

    if (av < bv) return -1 * mul;
    if (av > bv) return  1 * mul;
    return 0;
  });
}

// ── Row rendering ─────────────────────────────────────────────────────────────

function makeOrderId(order, index) {
  return `${order.user?.name || 'unknown'}_${order.platinum}_${index}`;
}

function buildWhisperMsg(order, displayName, view) {
  const user  = order.user?.name || 'Unknown';
  const price = order.platinum;
  const verb  = view === 'sell' ? 'buy' : 'sell';
  return `/w ${user} Hi! I want to ${verb}: "${displayName}" for ${price} platinum. (warframe.market)`;
}

function renderOrderRow(order, index, view, globalMaxRank = 0) {
  const orderId        = makeOrderId(order, index);
  const isCopied       = copiedStates.has(orderId);
  const statusClass    = order.user?.status === 'ingame' ? 'status-ingame' :
                         order.user?.status === 'online'  ? 'status-online' : 'status-offline';
  const statusText     = order.user?.status === 'ingame' ? t('market.status.ingame') :
                         order.user?.status === 'online'  ? t('market.status.online') : t('market.status.offline');
  // Show rank label for all orders in rankable item sets (mods/arcanes),
  // including rank 0 (unranked), so users can distinguish listings at a glance.
  const rankText       = globalMaxRank > 0 ? ` (${t('market.rank')} ${order.rank ?? 0})` : '';
  const buttonText     = isCopied ? '✓ ' + t('market.copied') : '📋 ' + t('market.copyWhisper');
  const buttonClass    = isCopied ? 'market-whisper-btn copied' : 'market-whisper-btn';
  const buttonDisabled = isCopied ? 'disabled' : '';

  const messageHtml = isCopied ? `
    <div class="market-whisper-message" data-order-id="${orderId}" style="display: flex;">
      <span class="market-whisper-icon">📋</span>
      <span class="market-whisper-text">${escapeHtml(whisperMessages.get(orderId) ?? '')}</span>
    </div>
  ` : '';

  return `
    <div class="market-row" data-order-id="${orderId}">
      <span class="market-seller" title="${escapeHtml(order.user?.name || 'Unknown')}">${escapeHtml(order.user?.name || 'Unknown')}</span>
      <span class="market-status ${statusClass}">${statusText}</span>
      <span class="market-price">${order.platinum} <span class="market-currency">${t('market.platinum')}${rankText}</span></span>
      <span class="market-quantity">${order.quantity}</span>
      <button class="${buttonClass}" data-order-id="${orderId}" ${buttonDisabled}>${buttonText}</button>
    </div>
    ${messageHtml}
  `;
}

// ── Event binding ─────────────────────────────────────────────────────────────

function bindEvents(container) {
  // View toggle
  const viewToggle = document.getElementById('marketViewToggle');
  if (viewToggle && !viewToggle.dataset.bound) {
    viewToggle.dataset.bound = 'true';
    viewToggle.querySelectorAll('[data-view]').forEach(btn => {
      btn.onclick = () => {
        state.currentView = btn.dataset.view;
        copiedStates.clear();
        renderMarketResults(currentContainer, currentResults);
      };
    });
  }

  // Sortable column headers
  container.querySelectorAll('.sortable').forEach(hdr => {
    hdr.style.cursor = 'pointer';
    hdr.onclick = () => {
      const view = state.currentView;
      const col  = hdr.dataset.sort;
      const cur  = state.sort[view];
      if (cur.key === col) {
        cur.dir = cur.dir === 'asc' ? 'desc' : 'asc';
      } else {
        state.sort[view] = {
          key: col,
          dir: col === 'platinum' ? (view === 'sell' ? 'asc' : 'desc') : 'asc',
        };
      }
      copiedStates.clear();
      renderMarketResults(container, currentResults);
    };
  });

  // Load more
  const loadMoreBtn = container.querySelector('#marketLoadMore');
  if (loadMoreBtn) {
    loadMoreBtn.onclick = () => {
      const view = state.currentView;
      state.visibleCount[view] += state.LOAD_MORE_STEP;
      renderMarketResults(container, currentResults);
    };
  }

  // Copy whisper buttons
  container.querySelectorAll('.market-whisper-btn').forEach(btn => {
    if (btn.dataset.bound === 'true') return;
    btn.dataset.bound = 'true';

    btn.onclick = async () => {
      const orderId = btn.dataset.orderId;
      const message = whisperMessages.get(orderId);

      if (message && orderId && !copiedStates.has(orderId)) {
        try {
          await navigator.clipboard.writeText(message);
          copiedStates.set(orderId, message);
          renderMarketResults(container, currentResults);
        } catch (err) {
          console.error('Failed to copy:', err);
          btn.textContent = '✗ ' + t('market.copyFailed');
          btn.classList.add('error');
          setTimeout(() => {
            if (!copiedStates.has(orderId)) {
              btn.textContent = '📋 ' + t('market.copyWhisper');
              btn.classList.remove('error');
            }
          }, 2000);
        }
      }
    };
  });
}

// ── Helpers ───────────────────────────────────────────────────────────────────

function escapeHtml(str) {
  if (!str) return '';
  return String(str).replace(/[&<>"']/g, m => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;',
  }[m]));
}

export function refreshCurrentMarketView(container) {
  if (currentResults && container) {
    copiedStates.clear();
    renderMarketResults(container, currentResults);
  }
}

function updateViewToggle(view) {
  const group = document.getElementById('marketViewToggle');
  if (!group) return;
  group.querySelectorAll('[data-view]').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.view === view);
  });
}