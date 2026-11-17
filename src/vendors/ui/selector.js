// src/vendors/ui/selector.js
// Vendor picker: grouped by family, searchable, with per-vendor progress.
// Entirely driven by the registry; a new vendor appears with no UI change.

import { FAMILIES } from '../registry.js';
import { vendorName, familyLabel, currencyLabel, T } from '../labels.js';
import { esc } from './util.js';

function matches(vendor, q) {
  if (!q) return true;
  const { badge, title } = vendorName(vendor);
  const hay = [badge, title, vendor.id, ...vendor.currencies.map((c) => currencyLabel(vendor, c))].join(' ').toLowerCase();
  return q.toLowerCase().split(/\s+/).every((w) => hay.includes(w));
}

export function currentLabel(vendor) {
  if (!vendor) return '';
  const { badge, title } = vendorName(vendor);
  return `<span class="vx-sel-badge">${esc(badge)}</span><span class="vx-sel-title">${esc(title)}</span>`;
}

/**
 * @param {Object} o
 * @param {Object[]} o.vendors  newest first
 * @param {string}  o.selectedId
 * @param {string}  o.query
 * @param {Object}  o.collapsed   familyId -> bool
 * @param {Function} o.progress   vendor -> {done,total}
 */
export function selectorListHTML({ vendors, selectedId, query, collapsed, progress }) {
  const shown = vendors.filter((v) => matches(v, query));
  if (!shown.length) return `<div class="vx-empty">${esc(T('no_results', 'No vendors found'))}</div>`;

  let html = '';
  const families = [...FAMILIES];
  // vendors naming an unregistered family still show up
  for (const v of shown) if (!families.some((f) => f.id === v.family)) families.push({ id: v.family, fallback: v.family });

  for (const fam of families) {
    const list = shown.filter((v) => v.family === fam.id);
    if (!list.length) continue;
    const isCollapsed = !query && collapsed[fam.id];
    html += `<section class="vx-sel-family">`;
    html += `<button class="vx-sel-group" data-act="toggle-family" data-family="${esc(fam.id)}" aria-expanded="${!isCollapsed}">` +
            `<span class="vx-chevron${isCollapsed ? '' : ' open'}">▸</span>${esc(familyLabel(fam))}<span class="vx-count-pill">${list.length}</span></button>`;
    if (!isCollapsed) {
      for (const v of list) {
        const { badge, title } = vendorName(v);
        const p = progress(v);
        const pct = p.total ? Math.round((p.done / p.total) * 100) : 0;
        html += `<button class="vx-sel-item${v.id === selectedId ? ' active' : ''}${pct === 100 ? ' is-done' : ''}" data-act="select" data-vendor="${esc(v.id)}">` +
                `<span class="vx-sel-badge">${esc(badge)}</span>` +
                `<span class="vx-sel-title">${esc(title)}</span>` +
                `<span class="vx-sel-meta">${pct === 100 ? '✓' : `${p.done}/${p.total}`}</span>` +
                `<span class="vx-sel-bar"><i style="width:${pct}%"></i></span></button>`;
      }
    }
    html += `</section>`;
  }
  return html;
}
