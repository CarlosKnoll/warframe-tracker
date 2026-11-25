// src/vendors/ui/shell.js
// Layout skeleton + one delegated event handler. The skeleton is built once;
// only the selector list, item list and planner are re-rendered, so search
// boxes keep focus and scroll position survives every action.

import { VENDORS, getVendor, defaultVendor } from '../registry.js';
import { store, subscribe, stateOf, ctxFor, saveUi, selectVendor,
  setStatus, addCopy, undoCopy, setArcaneCount, setBalance, setYield, setMinutes,
  setWarframeMode, setPayWith } from '../store.js';
import { computePlan, progressOf } from '../model/planner.js';
import { T, vendorName } from '../labels.js';
import { selectorListHTML, currentLabel } from './selector.js';
import { itemsHTML } from './items.js';
import { plannerHTML } from './planner.js';
import { esc } from './util.js';

let root = null;
let unsubscribe = null;
let plannerOpen = false;   // mobile drawer; no visual effect on desktop
let selectorOpen = false;  // mobile dropdown
let vendorQuery = '';
let itemQuery = '';

const $ = (sel) => root?.querySelector(sel);

export function mount(container) {
  unmount();
  root = container;
  root.innerHTML = skeleton();
  root.addEventListener('click', onClick);
  root.addEventListener('change', onChange);
  root.addEventListener('input', onInput);
  unsubscribe = subscribe(render);
}

export function unmount() {
  unsubscribe?.();
  unsubscribe = null;
  if (root) {
    root.removeEventListener('click', onClick);
    root.removeEventListener('change', onChange);
    root.removeEventListener('input', onInput);
  }
}

function skeleton() {
  return `<div class="vx-layout">
    <button id="plannerToggle" class="planner-toggle" aria-label="${esc(T('planner', 'Planner'))}" title="${esc(T('planner', 'Planner'))}">📊</button>
    <div id="plannerBackdrop" class="planner-backdrop"></div>
    <aside class="vx-selector" id="vxSelector">
      <button class="vx-sel-toggle" data-act="sel-toggle" aria-expanded="false"><span id="vxSelCurrent" class="vx-sel-current"></span><span class="vx-chevron open">▾</span></button>
      <div class="vx-sel-body" id="vxSelBody">
        <input id="vxVendorSearch" class="vx-search" type="search" data-input="vendor-search" autocomplete="off">
        <div id="vxSelList"></div>
      </div>
    </aside>
    <main class="vx-main">
      <div class="vx-toolbar" id="vxToolbar"></div>
      <div id="vxItems"></div>
    </main>
    <div id="plannerPanel" class="vendor-planner"></div>
  </div>`;
}

// ── Render ─────────────────────────────────────────────────────────────────

function progressFn(v) {
  const vs = stateOf(v.id);
  return progressOf(v, vs, ctxFor(vs));
}

export function render() {
  if (!root || !$('#vxSelList')) return;
  const vendor = getVendor(store.selectedVendorId) ?? defaultVendor();

  $('#vxVendorSearch').placeholder = T('search_vendors', 'Search vendors…');
  $('#vxSelList').innerHTML = VENDORS.length
    ? selectorListHTML({ vendors: VENDORS, selectedId: vendor?.id, query: vendorQuery, collapsed: store.ui.collapsedFamilies, progress: progressFn, showExpired: store.ui.showExpired })
    : `<div class="vx-empty">${esc(T('no_vendors', 'No vendors'))}</div>`;
  $('#vxSelCurrent').innerHTML = currentLabel(vendor);
  $('#vxSelector').classList.toggle('open', selectorOpen);
  $('.vx-sel-toggle').setAttribute('aria-expanded', String(selectorOpen));

  if (!vendor) { $('#vxItems').innerHTML = ''; return; }

  const vs = stateOf(vendor.id);
  const ctx = ctxFor(vs);
  const { badge, title } = vendorName(vendor);
  const prog = progressFn(vendor);

  const filters = [['all', T('filter_all', 'All')], ['missing', T('filter_missing', 'Missing')], ['owned', T('filter_owned', 'Complete')]];
  $('#vxToolbar').innerHTML =
    `<div class="vx-title"><span class="vx-sel-badge">${esc(badge)}</span><h2>${esc(title)}</h2><span class="vx-count-pill">${prog.done}/${prog.total}</span></div>` +
    `<div class="vx-filters">` +
    filters.map(([id, label]) => `<button class="vx-chip${store.ui.filter === id ? ' active' : ''}" data-act="filter" data-filter="${id}">${esc(label)}</button>`).join('') +
    `<input id="vxItemSearch" class="vx-search vx-search-items" type="search" data-input="item-search" autocomplete="off" placeholder="${esc(T('search_items', 'Search items…'))}" value="${esc(itemQuery)}"></div>`;
  // keep focus if the user is typing in the item search
  const focusSearch = document.activeElement?.id === 'vxItemSearch';
  if (focusSearch) $('#vxItemSearch')?.focus();

  $('#vxItems').innerHTML = itemsHTML({ vendor, vs, ctx, filter: store.ui.filter, query: itemQuery, collapsedCats: store.ui.collapsedCats });

  const plan = computePlan(vendor, vs, ctx);
  const panel = $('#plannerPanel');
  panel.className = `vendor-planner${plannerOpen ? ' open' : ''}`;
  panel.innerHTML = plannerHTML(vendor, vs, plan);
  $('#plannerBackdrop').classList.toggle('visible', plannerOpen);
  $('#plannerToggle').classList.toggle('active', plannerOpen);

  applyPendingFocus();
}

// ── Open a vendor (or one item) from outside this tab ──────────────────────

let pendingFocus = null;   // item id to scroll to + flash after the next render

/**
 * Selects a vendor and, optionally, brings one item into view. Everything that could hide the
 * item is reset first: the item search, the Missing/Complete filter and a collapsed category.
 */
export function focusItem(vendorId, itemId = null) {
  const vendor = getVendor(vendorId);
  if (!vendor) return;
  const item = itemId ? vendor.byId.get(itemId) : null;

  selectorOpen = false;
  itemQuery = '';
  store.ui.filter = 'all';
  store.ui.collapsedFamilies[vendor.family] = false;
  if (item) store.ui.collapsedCats[`${vendor.id}:${item.categoryId}`] = false;

  pendingFocus = item ? item.id : null;
  selectVendor(vendorId);   // persists the UI state and re-renders
}

function applyPendingFocus() {
  if (!pendingFocus) return;
  const id = pendingFocus;
  pendingFocus = null;
  const row = root?.querySelector(`[data-item-row="${CSS.escape(id)}"]`);
  if (!row) return;
  row.scrollIntoView({ block: 'center', behavior: 'smooth' });
  row.classList.add('vx-flash');
  setTimeout(() => row.classList.remove('vx-flash'), 2500);
}

// ── Events ─────────────────────────────────────────────────────────────────

function onClick(e) {
  if (e.target.closest('#plannerToggle')) { plannerOpen = !plannerOpen; return render(); }
  if (e.target.closest('#plannerBackdrop') || e.target.closest('#plannerClose')) { plannerOpen = false; return render(); }

  const el = e.target.closest('[data-act]');
  if (!el || el.disabled) return;
  const vid = store.selectedVendorId;
  const d = el.dataset;

  switch (d.act) {
    case 'select':
      selectorOpen = false;
      itemQuery = '';
      return selectVendor(d.vendor);
    case 'sel-toggle':
      selectorOpen = !selectorOpen;
      return render();
    case 'toggle-family':
      store.ui.collapsedFamilies[d.family] = !store.ui.collapsedFamilies[d.family];
      saveUi();
      return render();
    case 'toggle-cat':
      store.ui.collapsedCats[d.key] = !store.ui.collapsedCats[d.key];
      saveUi();
      return render();
    case 'toggle-expired':
      store.ui.showExpired = !store.ui.showExpired;
      saveUi();
      return render();
    case 'filter':
      store.ui.filter = d.filter;
      saveUi();
      return render();
    case 'status': {
      // Clicking the active segment clears it.
      const how = el.classList.contains('active') ? 'none' : d.how;
      return setStatus(vid, d.item, d.slot, { how, currency: d.cur });
    }
    case 'add':
      return addCopy(vid, d.item, d.how, d.cur);
    case 'undo':
      return undoCopy(vid, d.item);
    case 'mode':
      return setWarframeMode(vid, d.parent, d.mode);
  }
}

function onChange(e) {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  const vid = store.selectedVendorId;
  const d = el.dataset;
  switch (d.input) {
    case 'arcane-count': return setArcaneCount(vid, d.item, el.value);
    case 'balance': return setBalance(vid, d.cur, el.value);
    case 'yield': return setYield(vid, d.cur, el.value);
    case 'minutes': return setMinutes(vid, el.value);
    case 'pay-with': return setPayWith(vid, el.value);
  }
}

function onInput(e) {
  const el = e.target.closest('[data-input]');
  if (!el) return;
  if (el.dataset.input === 'vendor-search') { vendorQuery = el.value; return renderSelectorOnly(); }
  if (el.dataset.input === 'item-search') { itemQuery = el.value; return renderItemsOnly(); }
}

function renderSelectorOnly() {
  const vendor = getVendor(store.selectedVendorId) ?? defaultVendor();
  $('#vxSelList').innerHTML = selectorListHTML({ vendors: VENDORS, selectedId: vendor?.id, query: vendorQuery, collapsed: store.ui.collapsedFamilies, progress: progressFn, showExpired: store.ui.showExpired });
}

function renderItemsOnly() {
  const vendor = getVendor(store.selectedVendorId) ?? defaultVendor();
  if (!vendor) return;
  const vs = stateOf(vendor.id);
  $('#vxItems').innerHTML = itemsHTML({ vendor, vs, ctx: ctxFor(vs), filter: store.ui.filter, query: itemQuery, collapsedCats: store.ui.collapsedCats });
}

