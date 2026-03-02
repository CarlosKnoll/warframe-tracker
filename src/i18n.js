// i18n.js - Internationalization module

const STORAGE_KEY = 'wf-tracker-lang';
const SUPPORTED_LANGS = ['en', 'pt'];
const DEFAULT_LANG = 'en';

let currentLang = DEFAULT_LANG;
let uiStrings = {};
let arcaneNamesMap = {};
let locationsMap = {};

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function initI18n() {
  const stored = localStorage.getItem(STORAGE_KEY);
  currentLang = SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;

  await loadLocale(currentLang);
  applyDomTranslations();
}

async function loadLocale(lang) {
  // Step 1: always load English as the baseline
  // Step 2: overlay the target language on top (missing keys fall through to EN)
  // Step 3: t() falls back to the key string itself if still not found
  const [enStrings, targetStrings, arcaneNames, locations] = await Promise.all([
    fetch(`./locales/en/en.json`).then(r => r.json()).catch(() => ({})),
    lang === 'en'
      ? Promise.resolve({})
      : fetch(`./locales/${lang}/${lang}.json`).then(r => r.json()).catch(() => ({})),
    lang === 'en'
      ? Promise.resolve({})
      : fetch(`./locales/pt/arcane-names.pt.json`).then(r => r.json()).catch(() => ({})),
    lang === 'en'
      ? Promise.resolve({})
      : fetch(`./locales/pt/dropLocations.pt.json`).then(r => r.json()).catch(() => ({})),
  ]);

  // Target language keys override English; absent keys transparently use EN values
  uiStrings = { ...enStrings, ...targetStrings };
  arcaneNamesMap = arcaneNames;
  // Strip prefixes (mission., planet., gameMode.) for substring matching
  locationsMap = Object.fromEntries(
    Object.entries(locations).map(([k, v]) => [
      k.replace(/^(mission|planet|gameMode)\./, ''),
      v
    ])
  );
}

// ─── Language switching ────────────────────────────────────────────────────────

export async function setLanguage(lang) {
  if (!SUPPORTED_LANGS.includes(lang)) return;
  currentLang = lang;
  localStorage.setItem(STORAGE_KEY, lang);
  await loadLocale(lang);
  applyDomTranslations();
  window.dispatchEvent(new CustomEvent('langchange', { detail: { lang } }));
}

export function getLanguage() {
  return currentLang;
}

// ─── DOM translation ───────────────────────────────────────────────────────────

// Translates all elements with data-i18n attributes
export function applyDomTranslations() {
  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    const val = t(key);
    if (val) el.textContent = val;
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    const val = t(key);
    if (val) el.placeholder = val;
  });

  document.querySelectorAll('[data-i18n-title]').forEach(el => {
    const key = el.getAttribute('data-i18n-title');
    const val = t(key);
    if (val) el.title = val;
  });

  // Update lang attribute on <html>
  document.documentElement.lang = currentLang === 'pt' ? 'pt-BR' : 'en';

  // Update lang toggle button active state
  document.querySelectorAll('.lang-btn').forEach(btn => {
    btn.classList.toggle('active', btn.dataset.lang === currentLang);
  });
}

// ─── Translation functions ─────────────────────────────────────────────────────

/**
 * Translate a UI string key. Falls back to the key itself if not found.
 * Supports simple interpolation: t('key', { count: 5 }) replaces {{count}}
 */
export function t(key, vars = {}) {
  let str = uiStrings[key] ?? key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{{${k}}}`, v);
  }
  return str;
}

/**
 * Translate an arcane name. Falls back to original English name.
 */
export function tArcaneName(name) {
  if (currentLang === 'en' || !name) return name;
  return arcaneNamesMap[name] ?? name;
}

/**
 * Translate a rarity label (Common, Uncommon, Rare, Unknown).
 */
export function tRarity(rarity) {
  if (!rarity) return rarity;
  return t(`rarity.${rarity.toLowerCase()}`) ?? rarity;
}

/**
 * Translate a category name (Warframe, Primary, Melee, etc.)
 */
export function tCategory(category) {
  if (!category) return category;
  return t(`category.${category.toLowerCase().replace(/[^a-z]/g, '_')}`) ?? category;
}

/**
 * Translate a drop source group label (Eidolons, Zariman, etc.)
 * These are the parsed/grouped source names, not raw API strings.
 */
export function tDropSource(source) {
  if (!source || currentLang === 'en') return source;
  return t(`dropSource.${source}`) ?? source;
}

/**
 * Translate a raw location string from the API.
 * Tries exact match first, then falls back to partial keyword replacement
 * sorted longest-first to avoid shorter keys clobbering longer matches.
 */
export function tLocation(location) {
  if (!location || currentLang === 'en') return location;

  // Strip (Caches) suffix, translate, then reappend
  const cachesSuffix = ' (Caches)';
  const hasCaches = location.endsWith(cachesSuffix);
  const locationKey = hasCaches ? location.slice(0, -cachesSuffix.length) : location;

  // Exact match
  if (locationsMap[locationKey]) {
    const translated = locationsMap[locationKey];
    return hasCaches ? `${translated}${cachesSuffix}` : translated;
  }

  // Partial keyword replacement — longest keys first to avoid partial clobber
  const sortedKeys = Object.keys(locationsMap).sort((a, b) => b.length - a.length);
  let translated = locationKey;
  for (const en of sortedKeys) {
    if (translated.includes(en)) {
      translated = translated.replace(en, locationsMap[en]);
    }
  }

  return hasCaches ? `${translated}${cachesSuffix}` : translated;
}

/**
 * Translate a relic reward item name from the API.
 *
 * API formats:
 *   "Ash Prime Systems Blueprint"  → "Diagrama de Sistemas Ash Prime"
 *   "Ash Prime Blueprint"          → "Diagrama Ash Prime"
 *   "Braton Prime Barrel"          → "Braton Prime Cano"
 *   "Forma Blueprint"              → "Diagrama Forma"
 */
export function tItemName(itemName) {
  if (!itemName || currentLang === 'en') return itemName;

  // Translate "Dual XXX Prime" weapon names before processing parts
  itemName = tPrimeName(itemName);  // ← add this

  // Component part translations
  const partMap = {
    'Neuroptics':  t('component.neuroptics'),
    'Chassis':     t('component.chassis'),
    'Systems':     t('component.systems'),
    'Carapace':    t('component.carapace'),
    'Cerebrum':    t('component.cerebrum'),
    'Wings':       t('component.wings'),
    'Barrel':      t('component.barrel'),
    'Receiver':    t('component.receiver'),
    'Stock':       t('component.stock'),
    'Blade':       t('component.blade'),
    'Blades':      t('component.blades'),
    'Handle':      t('component.handle'),
    'Grip':        t('component.grip'),
    'Pouch':       t('component.pouch'),
    'String':      t('component.string'),
    'Upper Limb':  t('component.upper_limb'),
    'Lower Limb':  t('component.lower_limb'),
    'Guard':       t('component.guard'),
    'Ornament':    t('component.ornament'),
    'Hilt':        t('component.hilt'),
    'Harness':     t('component.harness'),
    'Stars':       t('component.stars'),
    'Gauntlet':    t('component.gauntlet'),
    'Link':        t('component.link'),
    'Head':        t('component.head'),
  };

  const blueprint = t('component.blueprint'); // "Diagrama"

  // Case 1: "ITEM PART Blueprint" — Blueprint moves to front, part translates at end
  // e.g. "Ash Prime Systems Blueprint" → "Diagrama Ash Prime Sistemas"
  for (const [en, ptbr] of Object.entries(partMap)) {
    const suffix = `${en} Blueprint`;
    if (itemName.endsWith(` ${suffix}`)) {
      const base = itemName.slice(0, -(suffix.length + 1));
      return `${blueprint} ${base} ${ptbr}`;
    }
  }

  // Case 2: "ITEM Blueprint" — plain Blueprint moves to front
  // e.g. "Ash Prime Blueprint" → "Diagrama Ash Prime"
  if (itemName.endsWith(' Blueprint')) {
    const base = itemName.slice(0, -' Blueprint'.length);
    return `${blueprint} ${base}`;
  }

  // Case 3: "ITEM PART" — part stays at end, just translated
  // e.g. "Braton Prime Barrel" → "Braton Prime Cano"
  for (const [en, ptbr] of Object.entries(partMap)) {
    if (itemName.endsWith(` ${en}`)) {
      const base = itemName.slice(0, -(en.length + 1));
      return `${base} ${ptbr}`;
    }
  }

  return itemName;
}

/**
 * Translate a relic name from "Tier Name Relic" to "Relíquia Tier Name" in PT-BR.
 * e.g. "Axi A1 Relic" → "Relíquia Axi A1"
 */
export function tRelicName(name) {
  if (!name || currentLang === 'en') return name;
  return name.replace(/^(.+?)\s+Relic$/i, `${t('word.relic')} $1`);
}

/**
 * Translate a prime weapon name, handling "Dual XXX Prime" -> "XXXs Duplas Prime" in PT-BR.
 * e.g. "Dual Keres Prime" -> "Keres Duplas Prime"
 * Adds 's' to base name if it doesn't already end in one.
 */
export function tPrimeName(name) {
  if (!name || currentLang === 'en') return name;
  const dualMatch = name.match(/^Dual\s+(.+?)\s+Prime$/i);
  if (dualMatch) {
    const base = dualMatch[1];
    const baseLocalized = base.endsWith('s') ? base : `${base}s`;
    return `${baseLocalized} Duplas Prime`;
  }
  return name;
}

/**
 * Translate a prime component part name (Blueprint, Neuroptics, etc.)
 * Falls back to the original name if no mapping exists.
 */
export function tComponent(name) {
  if (!name || currentLang === 'en') return name;
  const key = `component.${name.toLowerCase().replace(/[^a-z]/g, '_')}`;
  return Object.prototype.hasOwnProperty.call(uiStrings, key) ? uiStrings[key] : name;
}

/**
 * Format a date using the current locale.
 */
export function formatDate(date, options = { year: 'numeric', month: 'short' }) {
  if (!date) return t('unknown');
  const locale = currentLang === 'pt' ? 'pt-BR' : 'en-US';
  return date.toLocaleDateString(locale, options);
}

export function tOrRaw(key, raw) {
  const result = t(key);
  return result === key ? raw : result;
}

export function tMission(raw) {
  const cachesSuffix = ' (Caches)';
  const hasCaches = raw.endsWith(cachesSuffix);
  const baseName = hasCaches ? raw.slice(0, -cachesSuffix.length) : raw;
  const translated = tOrRaw(`mission.${baseName}`, baseName);
  return hasCaches ? `${translated} ${tOrRaw('mission.caches', '(Caches)')}` : translated;
}

export function parseDropLocation(location) {
  if (!location) return { planet: '', mission: '', gameMode: '', rotation: '' };

  let rotation = '';
  let base = location;

  const rotationMatch = base.match(/,\s*Rotation\s+([A-Z])\s*$/i);
  if (rotationMatch) {
    rotation = rotationMatch[1];
    base = base.slice(0, rotationMatch.index).trim();
  }

  let planet = '';
  let mission = '';
  let gameMode = '';

  const slashIdx = base.indexOf('/');
  if (slashIdx !== -1) {
    planet = base.slice(0, slashIdx).trim();
    const rest = base.slice(slashIdx + 1).trim();
    const gameModeMatch = rest.match(/^(.*?)\s*\(([^)]+)\)\s*$/);
    if (gameModeMatch) {
      mission = gameModeMatch[1].trim();
      gameMode = gameModeMatch[2].trim();
    } else {
      mission = rest;
    }
  } else {
    mission = base;
  }

  return { planet, mission, gameMode, rotation };
}