// src/vendors/ui/items.js
// Item rows and category sections for the selected vendor.
//
// One consistent control per kind, no timers:
//   part / unique   a segmented control per copy:  [Bought][Dropped][Owned]
//                   (Bought splits per currency when the cost is "pay one of")
//   arcane / stock  [-] count [+ Bought][+ Dropped]  (+ limit badge)
// Clicking the active segment clears it, so every state is reversible.

import { PARENT_CONFIG, getWarframeMode } from '../schema.js';
import { activeRecord, usage } from '../model/ledger.js';
import { nextReset } from '../model/limits.js';
import { ownedCopies, isComplete } from '../model/planner.js';
import { slotsOf } from '../store.js';
import { itemLabel, categoryLabel, currencyLabel, T } from '../labels.js';
import { esc, fmt } from './util.js';

// ── Pieces ─────────────────────────────────────────────────────────────────

function costChips(vendor, cost) {
  const sep = cost.mode === 'any' ? ' / ' : ' + ';
  const parts = Object.entries(cost.amounts).map(
    ([cur, amt]) => `<span class="vx-cost">${esc(currencyLabel(vendor, vendor.currencies.find((c) => c.id === cur) ?? { id: cur, label: cur }))} ${fmt(amt)}</span>`,
  );
  return `<span class="vx-costs">${parts.join(`<span class="vx-cost-sep">${sep}</span>`)}</span>`;
}

const flexible = (cost) => cost.mode === 'any' && Object.keys(cost.amounts).length > 1;

/** "Bought" buttons: one, or one per currency for pay-one-of costs. */
function boughtButtons(vendor, cost, attrs, isActive, disabled, prefix = '') {
  const dis = disabled ? ' disabled' : '';
  const bought = prefix + T('bought', 'Bought');
  if (!flexible(cost)) {
    return `<button class="vx-seg-btn${isActive(null) ? ' active' : ''}" ${attrs} data-how="bought"${dis}>${esc(bought)}</button>`;
  }
  return Object.entries(cost.amounts).map(([cur, amt]) => {
    const label = currencyLabel(vendor, vendor.currencies.find((c) => c.id === cur) ?? { id: cur, label: cur });
    return `<button class="vx-seg-btn${isActive(cur) ? ' active' : ''}" ${attrs} data-how="bought" data-cur="${esc(cur)}"${dis} ` +
           `title="${esc(bought)}: ${esc(label)} ${fmt(amt)}">${esc(bought)} · ${esc(label)}</button>`;
  }).join('');
}

function limitBadge(vs, item, nowMs) {
  if (!item.limit) return '';
  const u = usage(vs, item, nowMs);
  let html = `<span class="vx-limit${u.capped ? ' capped' : ''}">${esc(T('limit_used', '{{used}} / {{max}} purchased', { used: u.used, max: u.max }))}`;
  if (item.limit.reset) {
    const next = nextReset(item.limit.reset, nowMs);
    if (next) html += ` <span class="vx-limit-reset">· ${esc(T('limit_resets', 'resets {{date}}', { date: new Date(next).toLocaleString([], { dateStyle: 'short', timeStyle: 'short' }) }))}</span>`;
  } else {
    html += ` <span class="vx-limit-reset">· ${esc(T('limit_permanent', 'permanent'))}</span>`;
  }
  return html + `</span>`;
}

// ── Rows ───────────────────────────────────────────────────────────────────

/** Marker shown instead of controls when an item forgot to declare `actions`. */
const missingActions = () =>
  `<span class="vx-missing-actions" title="Set { actions: [...] } on this item in its data file">⚠ ${esc(T('actions_missing', 'Actions not set'))}</span>`;

function slotRow(vendor, vs, item) {
  if (item.actionsMissing) return missingActions();
  const slots = slotsOf(vendor, vs, item);
  const multi = slots.length > 1;
  let ctl = '';
  for (const slot of slots) {
    const rec = activeRecord(vs, item.id, slot)?.[1];
    // Only what the item declares, plus the state it is already in (so legacy
    // or migrated state can always be cleared).
    const allowed = new Set(item.actions);
    if (rec) allowed.add(rec.how);
    const attrs = `data-act="status" data-item="${esc(item.id)}" data-slot="${slot}"`;
    const isBought = (cur) => rec?.how === 'bought' && (cur == null || rec.paid?.[cur] != null);
    const label = slot === 'c2' ? T('copy_2', 'Copy 2') : T('copy_1', 'Copy 1');
    ctl += `<div class="vx-slot">${multi ? `<span class="vx-slot-label">${esc(label)}</span>` : ''}<div class="vx-seg">` +
      (allowed.has('bought') ? boughtButtons(vendor, item.cost, attrs, isBought, false) : '') +
      (allowed.has('drop') ? `<button class="vx-seg-btn${rec?.how === 'drop' ? ' active' : ''}" ${attrs} data-how="drop">${esc(T('drop', 'Dropped'))}</button>` : '') +
      (allowed.has('owned') ? `<button class="vx-seg-btn${rec?.how === 'owned' ? ' active' : ''}" ${attrs} data-how="owned">${esc(T('owned', 'Owned'))}</button>` : '') +
      `</div></div>`;
  }
  return ctl;
}

function countRow(vendor, vs, item, ctx) {
  if (item.actionsMissing) return missingActions();
  const owned = ownedCopies(vendor, vs, item, ctx);
  const isArcane = item.kind === 'arcane';
  const cost = isArcane ? (owned < item.maxCopies ? item.costAt(owned) : null) : item.cost;
  const capped = usage(vs, item, ctx.now).capped;
  const full = isArcane && owned >= item.maxCopies;
  const attrs = `data-act="add" data-item="${esc(item.id)}"`;
  const has = (a) => item.actions.includes(a);

  let html = `<div class="vx-count">` +
    `<button class="vx-step" data-act="undo" data-item="${esc(item.id)}" title="${esc(T('undo', 'Undo last'))}" ${owned <= 0 ? 'disabled' : ''}>−</button>`;
  html += isArcane
    ? `<input class="vx-num" type="number" min="0" max="${item.maxCopies}" value="${owned}" data-input="arcane-count" data-item="${esc(item.id)}" aria-label="${esc(T('owned_copies', 'Owned copies'))}">` +
      `<span class="vx-of">/ ${item.maxCopies}</span>`
    : `<span class="vx-num-static">${owned}</span>`;

  const btns =
    (has('bought') && cost ? boughtButtons(vendor, cost, attrs, () => false, capped || full, '+ ') : '') +
    (has('drop') ? `<button class="vx-seg-btn" ${attrs} data-how="drop"${full ? ' disabled' : ''}>${esc('+ ' + T('drop', 'Dropped'))}</button>` : '') +
    (has('owned') ? `<button class="vx-seg-btn" ${attrs} data-how="owned"${full ? ' disabled' : ''}>${esc('+ ' + T('owned', 'Owned'))}</button>` : '');
  if (btns) html += `<div class="vx-seg">${btns}</div>`;
  return html + `</div>`;
}

export function rowHTML(vendor, vs, item, ctx) {
  const complete = isComplete(vendor, vs, item, ctx);
  const repeatable = item.kind === 'arcane' || item.kind === 'stock';
  const buyable = item.actions.includes('bought');
  const capped = repeatable && buyable && usage(vs, item, ctx.now).capped;
  let nextCost = null;
  if (buyable) {
    nextCost = item.kind === 'arcane'
      ? (ownedCopies(vendor, vs, item, ctx) < item.maxCopies ? item.costAt(ownedCopies(vendor, vs, item, ctx)) : null)
      : item.cost;
  }

  return `<div class="vx-row vx-${item.kind}${complete ? ' is-complete' : ''}${capped ? ' is-capped' : ''}${item.actionsMissing ? ' is-misconfigured' : ''}" data-item-row="${esc(item.id)}"${capped ? ' aria-disabled="true"' : ''}>` +
    `<div class="vx-row-head"><span class="vx-name">${esc(itemLabel(vendor, item))}</span>` +
    (nextCost ? costChips(vendor, nextCost) : '') +
    limitBadge(vs, item, ctx.now) +
    (capped ? `<span class="vx-capped-tag">${esc(T('limit_reached', 'Limit reached'))}</span>` : '') +
    `</div>` +
    `<div class="vx-row-ctl">${repeatable ? countRow(vendor, vs, item, ctx) : slotRow(vendor, vs, item)}</div></div>`;
}

// ── Sections ───────────────────────────────────────────────────────────────

function modeToggle(vendor, vs, cat) {
  let html = '';
  for (const p of vendor.parents) {
    if (p.categoryId !== cat.id || !PARENT_CONFIG[p.type]?.hasModeToggle) continue;
    const subsume = getWarframeMode(p.id, vs.mode) === 'subsume';
    html += `<span class="warframe-mode-toggle">` +
      `<button class="mode-btn${subsume ? '' : ' active'}" data-act="mode" data-parent="${esc(p.id)}" data-mode="keep">${esc(T('keep', 'Keep'))}</button>` +
      `<button class="mode-btn${subsume ? ' active' : ''}" data-act="mode" data-parent="${esc(p.id)}" data-mode="subsume">${esc(T('subsume', 'Subsume'))}</button></span>`;
  }
  return html;
}

export function itemsHTML({ vendor, vs, ctx, filter, query, collapsedCats }) {
  const q = query.trim().toLowerCase();
  let html = '';
  let shownAny = false;

  for (const { category, items } of vendor.sections) {
    const done = items.filter((i) => isComplete(vendor, vs, i, ctx)).length;
    const visible = items.filter((i) => {
      const c = isComplete(vendor, vs, i, ctx);
      if (filter === 'missing' && c) return false;
      if (filter === 'owned' && !c) return false;
      return !q || itemLabel(vendor, i).toLowerCase().includes(q);
    });
    if (!visible.length) continue;
    shownAny = true;

    const key = `${vendor.id}:${category.id}`;
    const collapsed = !q && collapsedCats[key];
    html += `<section class="vx-cat" data-category-id="${esc(category.id)}">` +
      `<div class="vx-cat-head"><button class="vx-cat-title" data-act="toggle-cat" data-key="${esc(key)}" aria-expanded="${!collapsed}">` +
      `<span class="vx-chevron${collapsed ? '' : ' open'}">▸</span>${esc(categoryLabel(vendor, category))}` +
      `<span class="vx-count-pill">${done}/${items.length}</span></button>${modeToggle(vendor, vs, category)}</div>`;
    if (!collapsed) html += `<div class="vx-list">${visible.map((i) => rowHTML(vendor, vs, i, ctx)).join('')}</div>`;
    html += `</section>`;
  }
  if (!shownAny) html = `<div class="vx-empty">${esc(T('no_items', 'Nothing to show with this filter'))}</div>`;
  return html;
}

