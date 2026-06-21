// src/vendors/renderer.js
// Renders the vendor tracking UI: vendor subtabs, item list, planner panel.

import { VENDORS } from './registry.js';
import { state, selectVendor } from './state.js';
import {
  loadVendorState,
  togglePartCopy,
  toggleUnique,
  setArcaneCount,
  setCurrencyInventory,
  setWarframeMode,
  setAverageYield,
  computePlanner,
  setAcquisitionChoice,
  dismissAcquisitionPanel,
} from './loader.js';
import { getWarframeMode } from './schema.js';
import { t, tArcaneName } from '../i18n.js';

// ─── Container ──────────────────────────────────────────────────────

let container = null;
// Planner visibility — only meaningful on mobile, where the planner is a
// slide-in drawer; on desktop the planner is always visible and this flag
// has no visual effect. Module-level so it persists across re-renders.
let plannerOpen = false;

export function init(containerElement) {
  container = containerElement;
}

export async function renderVendors() {
  if (!container) return;
  await loadVendorState();

  const html = buildVendorsHTML();
  container.innerHTML = html;
  attachEvents(container);
}

// ─── Helpers ────────────────────────────────────────────────────────

// Category labels: reuse existing locale keys where they already exist.
const CATEGORY_KEY_MAP = {
  warframe: 'filters.warframe',
  weapons:  'category.weapon',
  arcanes:  'menus-nav.mode.arcanes',
  cosmetics: 'category.cosmetics',
  decorations: 'category.decorations',
  others:   'category.misc',
};
function _tCategory(catId) {
  return t(CATEGORY_KEY_MAP[catId] ?? `tabs.vendor.ui.category.${catId}`);
}

const VENDOR_LOCALE_GROUP = {
  hunhow: 'u43',
};

function _vendorLocaleGroup(vendor) {
  return VENDOR_LOCALE_GROUP[vendor.id] ?? vendor.id;
}

// Slot labels: map slot ids to component.* keys where they exist.
const SLOT_COMPONENT_MAP = {
  blueprint:  'general.component.blueprint',
  neuroptics: 'general.component.neuroptics',
  chassis:    'general.component.chassis',
  systems:    'general.component.systems',
  handle:     'general.component.handle',
  blade:      'general.component.blade',
};
function _tSlot(slot) {
  return t(SLOT_COMPONENT_MAP[slot] ?? `tabs.vendor.ui.slot.${slot}`);
}

// Resolve the display name for a part: "{ParentName} {Component}"
// Uses crossParent if set (for cross-recipe parts like Wrath Blade in Pride recipe).
function _tPartName(item, vendor) {
  const resolvedParentId = item.crossParent ?? item.parentId;
  const parent = vendor.parents.find(p => p.id === resolvedParentId);
  if (!parent) return t('tabs.vendor.ui.unknown_part');
  const parentName = parent.type === 'weapon'
    ? t(`general.game.arsenal.${parent.name}`)
    : t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.warframe`);
  return `${parentName} ${_tSlot(item.slot)}`;
}

// ─── Build HTML ──────────────────────────────────────────────────────

function buildVendorsHTML() {
  let html = `<div class="vendors-container">`;

  html += `<button id="plannerToggle" class="planner-toggle" aria-label="${t('tabs.vendor.ui.planner')}" title="${t('tabs.vendor.ui.planner')}">📊</button>`;
  html += `<div id="plannerBackdrop" class="planner-backdrop${plannerOpen ? ' visible' : ''}"></div>`;

  html += `<div class="vendors-tabs">`;
  for (const vendor of VENDORS) {
    const active = vendor.id === state.selectedVendorId ? 'active' : '';
    html += `<button class="vendor-tab ${active}" data-vendor-id="${vendor.id}">${t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.name`)}</button>`;
  }
  html += `</div>`;

  const selectedVendor = VENDORS.find(v => v.id === state.selectedVendorId) || VENDORS[0];
  if (selectedVendor) {
    if (!state.selectedVendorId) state.selectedVendorId = selectedVendor.id;
    html += `<div class="vendors-content">`;
    html += buildVendorContent(selectedVendor);
    html += `</div>`;
  } else {
    html += `<div class="vendors-empty">${t('tabs.vendor.ui.no_vendors')}</div>`;
  }

  html += `</div>`;
  return html;
}

function buildVendorContent(vendor) {
  const vendorState = state.vendorState[vendor.id] || {};
  const planner = computePlanner(vendor.id);

  let html = `<div class="vendor-panel" data-vendor-id="${vendor.id}">`;

  // Items list. The planner panel renders alongside it (outside this div,
  // see below) as a fixed column that's always visible on desktop, and a
  // toggleable slide-in drawer on mobile (toggled via #plannerToggle).
  html += `<div class="vendor-items">`;

  // Build category → items map
  const categoryMap = new Map();
  for (const item of vendor.items) {
    let catId;
    if (item.kind === 'part') {
      const parent = vendor.parents.find(p => p.id === item.parentId);
      if (parent) catId = parent.categoryId;
    } else {
      catId = item.categoryId;
    }
    if (!catId) continue;
    if (!categoryMap.has(catId)) categoryMap.set(catId, []);
    categoryMap.get(catId).push(item);
  }

  const categories = vendor.categories || [];
  for (const cat of categories) {
    const items = categoryMap.get(cat.id) || [];
    if (items.length === 0) continue;
    html += `<div class="vendor-category" data-category-id="${cat.id}">`;
    html += `<div class="vendor-category-header">`;
    html += `<h3 class="vendor-category-title">${_tCategory(cat.id)}</h3>`;
    html += _buildCategoryModeToggle(cat, vendor, vendorState);
    html += `</div>`;
    html += `<div class="vendor-items-list">`;
    for (const item of items) {
      const { row, acqRows } = buildItemRow(item, vendor, vendorState);
      html += row;
      for (const acq of acqRows) html += acq;
    }
    html += `</div></div>`;
  }

  html += `</div>`; // vendor-items
  html += `</div>`; // vendor-panel

  // Planner panel — fixed column, always visible on desktop; becomes a
  // slide-in drawer on mobile (see mobile.css), gated by plannerOpen there.
  html += `<div id="plannerPanel" class="vendor-planner${plannerOpen ? ' open' : ''}">`;
  html += buildPlanner(vendor, vendorState, planner);
  html += `</div>`;

  return html;
}

// Category-level Keep/Subsume toggle, targeted at a specific warframe parent
// by id rather than "all warframe parents in this category" — there's only
// ever one per vendor today, and targeting by id keeps the renderer simple
// if that assumption ever needs revisiting per-vendor.
const CATEGORY_MODE_TOGGLE_TARGET = {
  warframe: 'warframe-main',
};

function _buildCategoryModeToggle(cat, vendor, vendorState) {
  const targetParentId = CATEGORY_MODE_TOGGLE_TARGET[cat.id];
  if (!targetParentId) return '';

  const parent = vendor.parents.find(p => p.id === targetParentId);
  if (!parent) return '';

  const { warframeMode } = vendorState;
  const mode = getWarframeMode(parent.id, warframeMode);
  const isSubsume = mode === 'subsume';

  return `<span class="warframe-mode-toggle">` +
    `<button class="mode-btn ${!isSubsume ? 'active' : ''}" data-warframe-id="${parent.id}" data-mode="keep">${t('tabs.vendor.ui.keep')}</button>` +
    `<button class="mode-btn ${isSubsume ? 'active' : ''}" data-warframe-id="${parent.id}" data-mode="subsume">${t('tabs.vendor.ui.subsume')}</button>` +
    `</span>`;
}

function buildItemRow(item, vendor, vendorState) {
  const { partProgress, uniqueProgress, arcaneProgress, warframeMode, acqDismissed } = vendorState;
  const acqRows = [];

  let rowHtml = `<div class="vendor-item" data-item-id="${item.id}" data-kind="${item.kind}">`;

  // Display name
  let displayName;
  if (item.kind === 'part') {
    displayName = _tPartName(item, vendor);
  } else if (item.kind === 'arcane') {
    displayName = tArcaneName(item.name);
  } else {
    displayName = t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.item.${item.id}`);
  }
  rowHtml += `<span class="vendor-item-name">${displayName}</span>`;

  // Cost display
  const costsHtml = Object.entries(item.costs || {}).map(([curr, amt]) => {
    const curData = vendor.currencies.find(c => c.id === curr);
    const label = curData ? t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.currencies.${curData.id}`) : curr;
    return `<span class="vendor-cost"><span class="currency-icon">${label}</span>${amt}</span>`;
  }).join(' ');
  rowHtml += `<span class="vendor-item-costs">${costsHtml}</span>`;

  if (item.kind === 'part') {
    const parent = vendor.parents.find(p => p.id === item.parentId);
    if (!parent) {
      rowHtml += `<span class="vendor-item-error">${t('tabs.vendor.ui.missing_parent')}</span>`;
    } else {
      const mode = getWarframeMode(parent.id, warframeMode);
      const entry = partProgress?.[item.id] || {};
      const copy1Checked = entry.copy1 ? 'checked' : '';
      const showCopy2 = parent.type === 'warframe' ? (mode === 'subsume') : false;
      const copy2Checked = (entry.copy2 && showCopy2) ? 'checked' : '';

      const copy1Owned = !!entry.copy1;
      const copy2Owned = showCopy2 && !!entry.copy2;

      rowHtml += `<div class="vendor-item-controls">`;
      if (parent.type === 'warframe') {
        // Warframe parts: copy1/copy2 labels matter — subsume mode needs two
        // independently-tracked copies, surfaced via the category-level toggle.
        rowHtml += `<label><input type="checkbox" class="part-copy1" data-item-id="${item.id}" ${copy1Checked}> ${t('tabs.vendor.ui.copy_1')}</label>`;
        if (showCopy2) {
          rowHtml += `<label><input type="checkbox" class="part-copy2" data-item-id="${item.id}" ${copy2Checked}> ${t('tabs.vendor.ui.copy_2')}</label>`;
        }
      } else {
        // Weapon parts never have a copy2 — render like a unique's single
        // "Owned" checkbox. Still flows through the same copy1 data path.
        rowHtml += `<label><input type="checkbox" class="part-copy1" data-item-id="${item.id}" ${copy1Checked}> ${t('tabs.vendor.ui.owned')}</label>`;
      }
      rowHtml += `</div>`;

      // Acquisition panels emitted as separate rows after the item row —
      // only while not yet dismissed (button click or timer expiry), so
      // they don't resurrect on every re-render (language change, mode
      // toggle, etc.) and stay gone even if the timer ran out unanswered.
      if (copy1Owned && !acqDismissed?.[item.id]) {
        acqRows.push(buildAcqRow(item, vendor, vendorState, item.id));
      }
      if (copy2Owned && !acqDismissed?.[`${item.id}__copy2`]) {
        acqRows.push(buildAcqRow(item, vendor, vendorState, `${item.id}__copy2`));
      }
    }
  } else if (item.kind === 'unique') {
    const checked = uniqueProgress?.[item.id] ? 'checked' : '';
    rowHtml += `<div class="vendor-item-controls">`;
    rowHtml += `<label><input type="checkbox" class="unique-checkbox" data-item-id="${item.id}" ${checked}> ${t('tabs.vendor.ui.owned')}</label>`;
    rowHtml += `</div>`;

    if (checked && !acqDismissed?.[item.id]) acqRows.push(buildAcqRowUnique(item, vendor, vendorState));

  } else if (item.kind === 'arcane') {
    const owned = arcaneProgress?.[item.id] || 0;
    const isFullyOwned = owned >= item.maxCopies;
    rowHtml += `<div class="vendor-item-controls">`;
    rowHtml += `<label>${t('tabs.vendor.ui.owned_copies')}: <input type="number" class="arcane-count" data-item-id="${item.id}" min="0" max="${item.maxCopies}" value="${owned}"></label>`;
    rowHtml += ` / ${item.maxCopies}`;
    rowHtml += `</div>`;

    if (isFullyOwned && !acqDismissed?.[item.id]) acqRows.push(buildAcqRowArcane(item, vendorState));
  }

  rowHtml += `</div>`;
  return { row: rowHtml, acqRows };
}

// ─── Acquisition row builders ────────────────────────────────────────────────
// Each returns a full-width .acq-row element rendered after the item row.
// A unique data-acq-id drives the 10s auto-dismiss timer in attachEvents.

let _acqIdCounter = 0;
function _acqId() { return `acq-${++_acqIdCounter}`; }

function _acqRowWrap(acqId, choiceKey, buttonsHtml, labelKey) {
  return `<div class="acq-row" data-acq-id="${acqId}" data-item-id="${choiceKey}">` +
    `<span class="acq-row-label">${t(labelKey)}</span>` +
    `<div class="acq-row-btns">${buttonsHtml}</div>` +
    `</div>`;
}

// Part copy (copy1 or copy2)
function buildAcqRow(item, vendor, vendorState, choiceKey) {
  const isCopy2 = choiceKey.endsWith('__copy2');
  const acqId = _acqId();
  let btns = '';

  if (item.costMode === 'choice') {
    for (const [curr, amt] of Object.entries(item.costs)) {
      const currLabel = t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.currencies.${curr}`);
      btns += `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${choiceKey}" data-currency="${curr}" data-type="paid">${currLabel} (${amt})</button>`;
    }
  } else {
    const [[curr]] = Object.entries(item.costs);
    btns += `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${choiceKey}" data-currency="${curr}" data-type="paid">${t('tabs.vendor.ui.bought')}</button>`;
  }
  btns += `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${choiceKey}" data-currency="" data-type="drop">${t('tabs.vendor.ui.drop')}</button>`;

  const labelKey = isCopy2 ? 'tabs.vendor.ui.how_obtained_copy2' : 'tabs.vendor.ui.how_obtained';
  return _acqRowWrap(acqId, choiceKey, btns, labelKey);
}

// Unique item
function buildAcqRowUnique(item, vendor, vendorState) {
  const acqId = _acqId();
  let btns = '';

  if (item.costMode === 'choice') {
    for (const [curr, amt] of Object.entries(item.costs)) {
      btns += `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${item.id}" data-currency="${curr}" data-type="paid">${t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.currencies.${curr}`)} (${amt})</button>`;
    }
  } else {
    btns += `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${item.id}" data-currency="" data-type="paid">${t('tabs.vendor.ui.bought')}</button>`;
  }
  btns += `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${item.id}" data-currency="" data-type="drop">${t('tabs.vendor.ui.drop')}</button>`;

  return _acqRowWrap(acqId, item.id, btns, 'tabs.vendor.ui.how_obtained');
}

// Arcane (fully owned)
function buildAcqRowArcane(item, vendorState) {
  const acqId = _acqId();
  const btns =
    `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${item.id}" data-currency="" data-type="paid">${t('tabs.vendor.ui.bought')}</button>` +
    `<button class="acq-btn" data-acq-id="${acqId}" data-item-id="${item.id}" data-currency="" data-type="drop">${t('tabs.vendor.ui.drop')}</button>`;

  return _acqRowWrap(acqId, item.id, btns, 'tabs.vendor.ui.how_obtained');
}


function buildPlanner(vendor, vendorState, planner) {
  if (!planner) return `<div class="planner-error">${t('tabs.vendor.ui.no_planner_data')}</div>`;

  const { currencyInventory, avgYield } = vendorState;
  const { remainingCost, remainingAfterInventory, runs, hours, totalCost } = planner;

  let html = `<div class="planner-panel">`;
  html += `<div class="planner-panel-header">`;
  html += `<h3>${t('tabs.vendor.ui.planner')}</h3>`;
  html += `<button id="plannerClose" class="planner-close">✕</button>`;
  html += `</div>`;

  html += `<div class="planner-inventory">`;
  for (const cur of vendor.currencies) {
    const inv = currencyInventory?.[cur.id] || 0;
    const curName = t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.currencies.${cur.id}`);
    html += `<div class="planner-row">`;
    html += `<label>${t('tabs.vendor.ui.inventory', { name: curName })}</label>`;
    html += `<input type="number" class="currency-inventory" data-currency-id="${cur.id}" value="${inv}" min="0">`;
    html += `</div>`;
  }
  html += `</div>`;

  html += `<div class="planner-yield">`;
  for (const cur of vendor.currencies) {
    const yld = avgYield?.[cur.id] || 0;
    const curName = t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.currencies.${cur.id}`);
    html += `<div class="planner-row">`;
    html += `<label>${t('tabs.vendor.ui.avg_yield', { name: curName })}</label>`;
    html += `<input type="number" class="avg-yield" data-currency-id="${cur.id}" value="${yld}" min="0" step="0.1">`;
    html += `</div>`;
  }
  html += `</div>`;

  html += `<div class="planner-totals">`;
  for (const cur of vendor.currencies) {
    const total = totalCost[cur.id] || 0;
    const afterInv = remainingAfterInventory[cur.id] || 0;
    const runCount = runs[cur.id] !== undefined ? runs[cur.id] : '∞';
    const hrs = hours[cur.id] !== undefined ? hours[cur.id].toFixed(1) : '∞';
    const curName = t(`tabs.vendor.ui.${_vendorLocaleGroup(vendor)}.currencies.${cur.id}`);
    html += `<div class="planner-currency-summary">`;
    html += `<strong>${curName}</strong><br>`;
    html += `${t('tabs.vendor.ui.total_needed')}: ${total}<br>`;
    html += `${t('tabs.vendor.ui.remaining')}: ${afterInv}<br>`;
    html += `${t('tabs.vendor.ui.runs_needed')}: ${typeof runCount === 'number' ? Math.ceil(runCount) : runCount}<br>`;
    html += `${t('tabs.vendor.ui.hours')}: ${hrs}`;
    html += `</div>`;
  }
  html += `</div>`;

  html += `</div>`;
  return html;
}

// ─── Event handling ──────────────────────────────────────────────────

function attachEvents(container) {
  const plannerToggleBtn = container.querySelector('#plannerToggle');
  const plannerPanel = container.querySelector('#plannerPanel');
  const plannerBackdrop = container.querySelector('#plannerBackdrop');
  const plannerCloseBtn = container.querySelector('#plannerClose');

  const setPlannerOpen = (open) => {
    plannerOpen = open;
    plannerPanel?.classList.toggle('open', open);
    plannerBackdrop?.classList.toggle('visible', open);
    plannerToggleBtn?.classList.toggle('active', open);
  };

  plannerToggleBtn?.addEventListener('click', () => setPlannerOpen(!plannerOpen));
  plannerBackdrop?.addEventListener('click', () => setPlannerOpen(false));
  plannerCloseBtn?.addEventListener('click', () => setPlannerOpen(false));

  container.querySelectorAll('.vendor-tab').forEach(btn => {
    btn.addEventListener('click', async () => {
      const vendorId = btn.dataset.vendorId;
      if (vendorId && vendorId !== state.selectedVendorId) {
        selectVendor(vendorId);
        await renderVendors();
      }
    });
  });

  container.querySelectorAll('.part-copy1, .part-copy2').forEach(cb => {
    cb.addEventListener('change', async () => {
      const itemId = cb.dataset.itemId;
      const copyNumber = cb.classList.contains('part-copy1') ? 1 : 2;
      const checked = cb.checked;
      await togglePartCopy(state.selectedVendorId, itemId, copyNumber, checked);
      await renderVendors();
    });
  });

  container.querySelectorAll('.unique-checkbox').forEach(cb => {
    cb.addEventListener('change', async () => {
      const itemId = cb.dataset.itemId;
      const checked = cb.checked;
      await toggleUnique(state.selectedVendorId, itemId, checked);
      await renderVendors();
    });
  });

  container.querySelectorAll('.arcane-count').forEach(input => {
    input.addEventListener('change', async () => {
      const itemId = input.dataset.itemId;
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val >= 0) {
        await setArcaneCount(state.selectedVendorId, itemId, val);
        await renderVendors();
      }
    });
  });

  container.querySelectorAll('.mode-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const warframeId = btn.dataset.warframeId;
      const mode = btn.dataset.mode;
      if (warframeId && mode) {
        await setWarframeMode(state.selectedVendorId, warframeId, mode);
        await renderVendors();
      }
    });
  });

  container.querySelectorAll('.currency-inventory').forEach(input => {
    input.addEventListener('change', async () => {
      const currencyId = input.dataset.currencyId;
      const val = parseInt(input.value, 10);
      if (!isNaN(val) && val >= 0) {
        await setCurrencyInventory(state.selectedVendorId, currencyId, val);
        await renderVendors();
      }
    });
  });

  container.querySelectorAll('.avg-yield').forEach(input => {
    input.addEventListener('change', async () => {
      const currencyId = input.dataset.currencyId;
      const val = parseFloat(input.value);
      if (!isNaN(val) && val >= 0) {
        await setAverageYield(state.selectedVendorId, currencyId, val);
        await renderVendors();
      }
    });
  });

  // Acquisition rows: 10s auto-dismiss, immediate dismiss on button click.
  // Both paths persist the dismissal so the row never reappears, even if
  // the timer ran out with no choice made.
  const acqTimers = new Map(); // acqId -> timeoutId

  container.querySelectorAll('.acq-row').forEach(row => {
    const acqId = row.dataset.acqId;
    const itemId = row.dataset.itemId;
    const timerId = setTimeout(async () => {
      row.classList.add('acq-row--hiding');
      row.addEventListener('animationend', () => row.remove(), { once: true });
      acqTimers.delete(acqId);
      await dismissAcquisitionPanel(state.selectedVendorId, itemId);
    }, 10_000);
    acqTimers.set(acqId, timerId);
  });

  container.querySelectorAll('.acq-btn').forEach(btn => {
    btn.addEventListener('click', async () => {
      const acqId = btn.dataset.acqId;
      const itemId = btn.dataset.itemId;
      const type = btn.dataset.type;
      const currency = btn.dataset.currency || null;

      // Cancel timer and remove row immediately
      const timerId = acqTimers.get(acqId);
      if (timerId) { clearTimeout(timerId); acqTimers.delete(acqId); }
      const row = container.querySelector(`.acq-row[data-acq-id="${acqId}"]`);
      if (row) row.remove();

      await dismissAcquisitionPanel(state.selectedVendorId, itemId);

      await setAcquisitionChoice(state.selectedVendorId, itemId, { type, currency });
    });
  });
}