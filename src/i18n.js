// i18n.js - Internationalization module

const STORAGE_KEY = 'wf-tracker-lang';
const SUPPORTED_LANGS = ['en', 'pt'];
const DEFAULT_LANG = 'en';

let currentLang = DEFAULT_LANG;
let uiStrings = {};
// Derived from loc.* keys in uiStrings after each locale load.
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
  const [enStrings, targetStrings] = await Promise.all([
    fetch(`./locales/en/en.json`).then(r => r.json()).catch(() => ({})),
    lang === 'en'
      ? Promise.resolve({})
      : fetch(`./locales/${lang}/${lang}.json`).then(r => r.json()).catch(() => ({})),
  ]);

  // Target language keys override English; absent keys transparently use EN values
  uiStrings = { ...enStrings, ...targetStrings };

  // Rebuild locationsMap from keys whose prefix is in LOCATION_PREFIXES.
  // Add any new prefix here to have it participate in tLocation() translation.
  const LOCATION_PREFIXES = ['loc.', 'mission.', 'quests.', 'planet.', 'gameMode.', 
                            'dropSource.', 'events.', 'syndicateRank.', 'syndicate.', 
                            'npc.', 'enemy.'];
  locationsMap = Object.fromEntries(
    Object.entries(uiStrings)
      .filter(([k]) => LOCATION_PREFIXES.some(p => k.startsWith(p)))
      .map(([k, v]) => {
        const prefix = LOCATION_PREFIXES.find(p => k.startsWith(p));
        return [k.slice(prefix.length), v];
      })
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
  return uiStrings[`arcane.${name}`] ?? name;
}

/**
 * Translate a mastery item name (weapons, companions).
 *
 * Resolution order:
 *   1. Explicit map: "item.<n>" in uiStrings
 *      Only true exceptions where the base word itself changes:
 *      Flux Rifle, Coda Bassocyst, Bubonic, Dread, Evensong.
 *   2. Suffix translate: "Base Vandal" -> "Base Vandalizada"
 *                        "Base Wraith"  -> "Base Quimérica"
 *   3. Clean prefix swap: "Prefix Base" -> "TranslatedBase Prefix"
 *      Base is resolved through the item map first, so
 *      "Tenet Flux Rifle" -> "Rifle de Fluxo Tenet" falls out automatically.
 *      Covers: Kuva, Tenet, Prisma, Coda, Vaykor, Secura, Sancti, Rakta, Synoid, Dex.
 *   4. Translated prefix swap: "Prefix Base" -> "Base TranslatedPrefix"
 *      Covers: Mutalist -> Mutalista, Proboscis -> Probóscide, Carmine -> Carmesim.
 *   5. tPrimeName fallback for "Dual X Prime" patterns.
 *   6. Original name unchanged.
 */
export function tMasteryItemName(name) {
  if (currentLang === 'en' || !name) return name;

  // 1. Explicit map — only true exceptions where the base word itself changes
  const fromMap = uiStrings[`item.${name}`];
  if (fromMap) return fromMap;

  // 2. Mk1-Base -> Base-Mk1
  if (name.startsWith('Mk1-')) return name.slice(4) + '-Mk1';

  // Coupund treatment
  const parts = name.split(' ');

  const SUFFIX_MAP = { 'Vandal': 'Vandalizada', 'Wraith': 'Quimérica'};

  const SUFFIX_TO_PREFIX = { 'Hound': 'Predador', 'Moa': 'Moa', 'Kavat': 'Kavat', 'Kubrow': 'Kubrow', 'Vulpaphyla': 'Vulpaphyla', 'Predasite': 'Predasite', 'Prism': 'Prisma' };
  
  const CLEAN_SWAP = new Set([
    'Kuva', 'Tenet', 'Prisma', 'Coda', 'Vaykor', 'Secura', 'Sancti', 'Rakta', 'Synoid', 'Dex', 'Telos', 'Mara', 'Gazal',
  ]);
  
  const TRANSLATED_SWAP = { 'Mutalist': 'Mutalista', 'Proboscis': 'Probóscide', 'Carmine': 'Carmesim', 'Twin': "Gêmeas", 'Dual': "Duplas" };
  const ALL_SWAP = new Set([...CLEAN_SWAP, ...Object.keys(TRANSLATED_SWAP)]);

  // Irregular base plurals (regular plural is base + 's')
  const IRREGULAR_PLURALS = { 'Torxica': 'Tórxicas' };
  const pluralize = base => IRREGULAR_PLURALS[base] ?? (base.endsWith('s') ? base : base + 's');


  // 3. Suffix translate
  const lastWord = parts[parts.length - 1];
  if (parts.length >= 2 && SUFFIX_MAP[lastWord]) {
    const remainingParts = parts.slice(0, -1);
    const translatedSuffix = SUFFIX_MAP[lastWord];
    // After removing the suffix, check if the first word is a TRANSLATED_SWAP prefix
    // e.g. 'Twin Vipers Wraith' -> remainingParts = ['Twin', 'Vipers']
    // Twin -> Gêmeas, so result is 'Vipers Gêmeas Quimérica'
    if (remainingParts.length >= 2 && TRANSLATED_SWAP[remainingParts[0]]) {
      const translatedPrefix = TRANSLATED_SWAP[remainingParts[0]];
      const base = remainingParts.slice(1).join(' ');
      return `${base} ${translatedPrefix} ${translatedSuffix}`;
    }
    const base = remainingParts.join(' ');
    return `${base} ${translatedSuffix}`;
  }


  // 3. Suffix translate and swap
  if (parts.length >= 2 && SUFFIX_TO_PREFIX[lastWord]) {
    const prefix = SUFFIX_TO_PREFIX[lastWord];
    const base = parts.slice(0, -1).join(' ');
    return `${prefix} ${base}`;
  }


  // 5. Three-word compound dual: one of the three words is Dual/Twin (→ Duplas/Gêmeas),
  //    one is a swap prefix, one is the base weapon.
  //    Position rule: if the swap prefix came BEFORE the base in the original,
  //    it stays after Duplas/Gêmeas; if it came AFTER, it stays after Duplas/Gêmeas too.
  //    Concretely:
  //      prefixIdx < baseIdx  ->  BasePlural DualWord Prefix
  //      prefixIdx > baseIdx  ->  BasePlural Prefix DualWord
  if (parts.length === 3) {
    const dualIdx   = parts.findIndex(w => w === 'Dual' || w === 'Twin' || w === 'Duplas' || w === 'Gêmeas');
    const prefixIdx = parts.findIndex((w, i) => i !== dualIdx && (CLEAN_SWAP.has(w) || (TRANSLATED_SWAP[w] && w !== 'Dual' && w !== 'Twin')));
    const baseIdx   = [0, 1, 2].find(i => i !== dualIdx && i !== prefixIdx);
    if (dualIdx !== -1 && prefixIdx !== -1 && baseIdx !== undefined) {
      const dualWord = TRANSLATED_SWAP[parts[dualIdx]] ?? parts[dualIdx]; // Dual->Duplas, Twin->Gêmeas
      const prefix   = TRANSLATED_SWAP[parts[prefixIdx]] ?? parts[prefixIdx];
      const basePl   = pluralize(uiStrings[`item.${parts[baseIdx]}`] ?? parts[baseIdx]);
      if (prefixIdx < baseIdx) return `${basePl} ${dualWord} ${prefix}`;
      else                     return `${basePl} ${prefix} ${dualWord}`;
    }
  }

  // 6. Clean prefix swap: Prefix Base -> TranslatedBase Prefix
  //    Base resolved through item map first (handles e.g. 'Tenet Flux Rifle').
  if (parts.length >= 2 && CLEAN_SWAP.has(parts[0])) {
    const base = parts.slice(1).join(' ');
    const translatedBase = uiStrings[`item.${base}`] ?? base;
    return `${translatedBase} ${parts[0]}`;
  }

  // 7. Translated prefix swap: Prefix Base -> Base TranslatedPrefix
  if (parts.length >= 2 && TRANSLATED_SWAP[parts[0]]) {
    // Let 'Dual/Twin X Prime' fall through to tPrimeName (rule 7)
    if (parts[parts.length - 1] === 'Prime') return tPrimeName(name);
    return parts.slice(1).join(' ') + ' ' + TRANSLATED_SWAP[parts[0]];
  }

  // 8. Dual Prime pattern ('Dual X Prime' -> 'Xs Duplas Prime')
  return tPrimeName(name);
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
    'Disc':        t('component.disc'),
    'Glove':       t('component.glove'),
    'Core':        t('component.core'),
    'Day Aspect':  t('component.day aspect'),
    'Night Aspect':t('component.night aspect'),
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
  // X Prime -> TranslatedX Prime
  if (name.endsWith(' Prime')) {
    const base = name.slice(0, -6);
    const translatedBase = uiStrings[`item.${base}`] ?? base;
    return `${translatedBase} Prime`;
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