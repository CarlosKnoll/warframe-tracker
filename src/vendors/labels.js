// src/vendors/labels.js
// Every user-visible name goes through here. Translation never changes data:
// a vendor works with zero locale entries because every label has an English
// fallback in its data file.
//
// Item name lookup order (first hit wins):
//   1. item.nameKey     any key (or list of keys) in the locale document,
//                       e.g. 'general.game.arcane.Melee Retaliation'
//   2. automatic        arcanes -> tArcaneName(name); weapon parents -> resolveWeaponName
//   3. legacy scoped    tabs.vendor.ui.<localeGroup>.item.<id>
//   4. item.label       English fallback from the data file
//   5. the id, prettified

import { t, tArcaneName, resolveWeaponName } from '../i18n.js';
import { CATEGORY_KEY_MAP, SLOT_COMPONENT_MAP } from './registry.js';

/** t() that reports a miss as undefined (t returns the key when unresolved). */
export function tr(key, vars) {
  if (!key) return undefined;
  const s = t(key, vars);
  return s && s !== key ? s : undefined;
}

/** UI string with an English fallback, so new strings work before a locale release. */
export const T = (key, fallback, vars) => {
  const s = tr(`tabs.vendor.ui.${key}`, vars);
  if (s !== undefined) return s;
  return fallback.replace(/\{\{(\w+)\}\}/g, (_, k) => vars?.[k] ?? '');
};

const firstHit = (keys) => {
  for (const k of [].concat(keys ?? [])) { const s = tr(k); if (s) return s; }
  return undefined;
};

export const prettify = (id) =>
  String(id).replace(/[-_]+/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());

export function vendorName(v) {
  const full = tr(`tabs.vendor.ui.${v.localeGroup}.name`);
  if (full) {
    const m = full.match(/^(.*?):\s+(.*)$/);
    return m ? { badge: m[1], title: m[2] } : { badge: v.badge, title: full };
  }
  return { badge: v.badge, title: v.title || prettify(v.id) };
}

export function currencyLabel(v, cur) {
  return firstHit(cur.nameKey) ?? tr(`tabs.vendor.ui.${v.localeGroup}.currencies.${cur.id}`) ?? cur.label;
}

export function categoryLabel(v, cat) {
  return firstHit(cat.nameKey)
    ?? tr(CATEGORY_KEY_MAP[cat.id])
    ?? tr(`tabs.vendor.ui.category.${cat.id}`)
    ?? prettify(cat.id);
}

export function familyLabel(f) {
  return tr(f.key) ?? f.fallback;
}

function slotLabel(slot) {
  return tr(SLOT_COMPONENT_MAP[slot]) ?? tr(`tabs.vendor.ui.slot.${slot}`) ?? prettify(slot);
}

function parentName(v, parent) {
  const g = v.localeGroup;
  const hit = firstHit(parent.nameKey);
  if (hit) return hit;
  if (parent.type === 'warframe') return tr(`tabs.vendor.ui.${g}.warframe`) ?? parent.name;
  return resolveWeaponName(parent.name) ?? parent.name;
}

export function itemLabel(v, item) {
  const hit = firstHit(item.nameKey);
  if (hit) return hit;
  if (item.kind === 'arcane') return tArcaneName(item.name);
  if (item.kind === 'part') {
    const parent = v.parentById.get(item.crossParent ?? item.parentId);
    const base = parent ? parentName(v, parent) : tr('tabs.vendor.ui.unknown_part') ?? 'Part';
    return `${base} ${slotLabel(item.slot)}`.trim();
  }
  return tr(`tabs.vendor.ui.${v.localeGroup}.item.${item.id}`) ?? item.label ?? prettify(item.id);
}
