// i18n.js - Internationalization module

const STORAGE_KEY = 'wf-tracker-lang';
const SUPPORTED_LANGS = ['en', 'pt'];
const DEFAULT_LANG = 'en';
const MANIFEST_URL = 'https://raw.githubusercontent.com/CarlosKnoll/warframe-tracker-locales/releases/manifest.json';
const LOCALE_CDN_BASE = 'https://cdn.jsdelivr.net/gh/CarlosKnoll/warframe-tracker-locales';

let currentLang = DEFAULT_LANG;
// uiStrings is now a NESTED object tree (was flat key->string before the
// 2026-06 locale restructure). Use resolvePath()/t() to read from it --
// never index it directly with a dotted string, since dots may be a real
// path (descend) or a literal key segment (e.g. "tabs.rarity.common" stored as
// one key inside tabs.rarity), and only resolvePath() disambiguates that.
let uiStrings = {};
// Derived from general.game.drops / mission / planet / gameMode / events /
// syndicate / syndicate.ranks / npc / enemy / general.drops.dropSource
// after each locale load. Same flat shape and same leaf key names as the
// pre-restructure locationsMap -- only the locations these are READ FROM
// changed (see LOCATION_SOURCE_PATHS below), not what's IN the map or how
// tLocation()/parseDropLocation() consume it.
let locationsMap = {};

// ─── Path resolution ──────────────────────────────────────────────────────────

/**
 * Recursively merges `source` into `target` (mutates target's clone, returns
 * a new object). Needed because uiStrings is now a deep tree: the old
 * `{ ...enStrings, ...targetStrings }` shallow spread would let a partial
 * pt.json overwrite an ENTIRE top-level branch from en.json (e.g. losing
 * every EN-only key under `tabs` just because pt.json's `tabs` branch
 * doesn't happen to repeat every EN leaf). Arrays and primitives are
 * replaced outright by source's value; only plain objects merge key-by-key.
 */
function deepMerge(base, override) {
  const result = { ...base };
  for (const [key, value] of Object.entries(override)) {
    const baseVal = result[key];
    if (
      value !== null && typeof value === 'object' && !Array.isArray(value) &&
      baseVal !== null && typeof baseVal === 'object' && !Array.isArray(baseVal)
    ) {
      result[key] = deepMerge(baseVal, value);
    } else {
      result[key] = value;
    }
  }
  return result;
}

/**
 * Walks `obj` along `path` (an array of key segments), returning the value
 * found or undefined. Used internally by resolvePath -- not exported, since
 * external callers should always go through resolvePath()/t() so the
 * literal-key / dot-path / suffix-fallback logic stays in one place.
 */
function walkSegments(obj, segments) {
  let cur = obj;
  for (const seg of segments) {
    if (cur == null || typeof cur !== 'object') return undefined;
    cur = cur[seg];
  }
  return cur;
}

/**
 * Recursively collects every leaf path (as a dot-joined string) and its
 * value from a nested object tree. Used only for the suffix-fallback search
 * in resolvePath -- this is an O(n) scan of the whole tree, so it's the
 * last resort, tried only after exact-key and full-dot-path lookups fail.
 */
function collectLeafPaths(obj, prefix, into) {
  for (const [key, value] of Object.entries(obj)) {
    const path = prefix ? `${prefix}.${key}` : key;
    if (value !== null && typeof value === 'object' && !Array.isArray(value)) {
      collectLeafPaths(value, path, into);
    } else {
      into.push([path, value]);
    }
  }
}

let leafPathCache = null; // invalidated on every locale load, see loadLocale()

function getLeafPaths() {
  if (!leafPathCache) {
    leafPathCache = [];
    collectLeafPaths(uiStrings, '', leafPathCache);
  }
  return leafPathCache;
}

/**
 * Resolves a key to its string value in uiStrings, trying in order:
 *   1. Literal top-level key (covers old-style single-segment keys, and
 *      any literal dotted-flat key passed exactly as stored, e.g. a call
 *      site that does uiStrings-shaped lookup with the EXACT stored key).
 *   2. Full dot-path descent (e.g. "tabs.vendor.ui.u43.item.syandana" --
 *      the normal case for real, fully-qualified keys post-restructure).
 *   3. Suffix fallback: search every leaf path in the whole tree for one
 *      ending in this exact key (dot-aligned, not a raw substring match).
 *      - Exactly one match -> return it (lets old short-suffix call sites
 *        like t('tabs.rarity.common') keep working after the restructure).
 *      - Multiple matches -> AMBIGUOUS. Do not guess: console.warn listing
 *        every colliding path, and fall through to "not found" so the
 *        caller's existing missing-key fallback (return the key itself)
 *        kicks in instead of silently showing the wrong language string.
 *      - Zero matches -> not found.
 * Returns undefined if nothing resolves.
 */
function resolvePath(key) {
  if (Object.prototype.hasOwnProperty.call(uiStrings, key)) {
    return uiStrings[key];
  }

  const segments = key.split('.');
  if (segments.length > 1) {
    const viaPath = walkSegments(uiStrings, segments);
    if (typeof viaPath === 'string') return viaPath;
  }

  const suffix = `.${key}`;
  const matches = getLeafPaths().filter(
    ([path]) => path === key || path.endsWith(suffix),
  );
  if (matches.length === 1) {
    return matches[0][1];
  }
  if (matches.length > 1) {
    console.warn(
      `[i18n] Ambiguous key "${key}" matches ${matches.length} paths: ` +
        `${matches.map(([p]) => p).join(', ')}. Refusing to guess -- ` +
        `use a longer/full path at the call site to disambiguate.`,
    );
  }
  return undefined;
}

// ─── Bootstrap ────────────────────────────────────────────────────────────────

export async function initI18n() {
  const stored = localStorage.getItem(STORAGE_KEY);
  currentLang = SUPPORTED_LANGS.includes(stored) ? stored : DEFAULT_LANG;

  await loadLocale(currentLang);
  applyDomTranslations();
}

// Where the old flat LOCATION_PREFIXES groups now live in the nested tree.
// Each entry's leaf keys are merged into the flat locationsMap UNCHANGED --
// only the read location moved, not the key names within each group, so
// tLocation()'s keyword-substitution logic needs zero changes.
const LOCATION_SOURCE_PATHS = [
  ['general', 'game', 'drops'],       // was the bare "loc.*" prefix
  ['general', 'game', 'mission'],
  ['general', 'game', 'quests'],
  ['general', 'game', 'planet'],
  ['general', 'game', 'gameMode'],
  ['general', 'game', 'events'],
  ['general', 'game', 'syndicate', 'ranks'],  // was "syndicateRank.*"
  ['general', 'game', 'syndicate'],           // siblings of .ranks -- walked
                                               // separately below so the
                                               // nested "ranks" branch isn't
                                               // double-counted as leaves
  ['general', 'game', 'npc'],
  ['general', 'game', 'enemy'],
  ['general', 'drops', 'dropSource'],
];

function buildLocationsMap() {
  const map = {};
  for (const segments of LOCATION_SOURCE_PATHS) {
    const node = walkSegments(uiStrings, segments);
    if (!node || typeof node !== 'object') continue;
    for (const [k, v] of Object.entries(node)) {
      // Skip nested sub-groups here (e.g. syndicate.ranks, already walked
      // as its own entry above) -- only take leaf strings at this level.
      if (typeof v === 'string') map[k] = v;
    }
  }
  return map;
}

async function loadLocale(lang) {
  const version = await fetchManifest();

  const [enResult, targetResult] = await Promise.all([
    fetchLocale('en', version),
    lang === 'en' ? Promise.resolve({ data: {}, fetchedFresh: false }) : fetchLocale(lang, version),
  ]);

  uiStrings = deepMerge(enResult.data, targetResult.data);
  leafPathCache = null; // invalidate suffix-search cache for the new tree

  locationsMap = buildLocationsMap();

  // Only prune old cached versions once we have PROOF the new version's
  // data was actually retrieved successfully -- not merely because the
  // manifest claims it exists. This is the fix for a real race: jsDelivr
  // (the locale CDN) can lag behind the manifest immediately after a
  // version bump, so the manifest may report a version whose files
  // aren't fetchable yet. Pruning eagerly on the manifest's say-so alone
  // previously deleted the last working cached version before confirming
  // a replacement was available, leaving the app with no locale data at
  // all (bare keys rendered) until the CDN caught up.
  //
  // en is required for every load; the target language is only required
  // when it's not 'en' itself (lang === 'en' short-circuits target above).
  const enConfirmed = enResult.fetchedFresh;
  const targetConfirmed = lang === 'en' || targetResult.fetchedFresh;
  if (enConfirmed && targetConfirmed) {
    pruneStaleLocaleCache(version);
  }
}

const LOCALE_CACHE_PREFIX = 'wf-locale:'; // keys look like wf-locale:{lang}:{version}

/**
 * Removes every cached locale entry whose version segment doesn't match
 * `currentVersion`. Called from loadLocale() ONLY after the new
 * version's data has been confirmed fetched successfully for every
 * language needed this load -- never called just because the manifest
 * reports a new version, since the CDN may not have propagated that
 * version's files yet (see loadLocale() for the full reasoning).
 *
 * Handles any backlog in one pass, not just "the previous" version --
 * if several versions piled up for any reason, they all get swept here.
 *
 * Treats "latest" as just another version string here -- if we're
 * pruning at all, it means the current fetch succeeded with a real
 * version string, so a wf-locale:{lang}:latest entry left over from an
 * earlier network failure (see the null-version fallback in fetchLocale)
 * is equally stale and gets swept up too.
 */
function pruneStaleLocaleCache(currentVersion) {
  if (!currentVersion) return; // don't guess at staleness if we don't know what's current

  const staleKeys = [];
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(LOCALE_CACHE_PREFIX)) continue;

    // key shape: wf-locale:{lang}:{version} -- version is everything after
    // the second colon, since version strings themselves may contain dots
    // but not colons (e.g. "v0.0.17"), so a simple split is safe here.
    const version = key.slice(LOCALE_CACHE_PREFIX.length).split(':')[1];
    if (version !== currentVersion) staleKeys.push(key);
  }

  for (const key of staleKeys) {
    try { localStorage.removeItem(key); } catch { /* ignore */ }
  }

  if (staleKeys.length) {
    console.info(`[i18n] Pruned ${staleKeys.length} stale locale cache entr${staleKeys.length === 1 ? 'y' : 'ies'}.`);
  }
}

const MANIFEST_CACHE_KEY = 'wf-locale-manifest';

/**
 * Always checks the network for the current manifest version -- no TTL,
 * by design: the person wants every app startup (Tauri and PWA alike,
 * since this file is shared 1:1 between them) to know immediately when a
 * new locale version has shipped, rather than potentially serving a
 * stale version for up to an hour.
 *
 * MANIFEST_CACHE_KEY is still written/read, but purely as an OFFLINE
 * FALLBACK (see the catch branch below) -- not as a "skip the network"
 * cache, and NOT as a trigger for cache pruning. Pruning old locale
 * versions happens in loadLocale(), only AFTER the new version's data
 * has been successfully fetched -- never here. Pruning based solely on
 * "the manifest says a new version exists" is unsafe: CDN propagation
 * (jsDelivr in particular) can lag behind the manifest, so the new
 * version's files may not be fetchable yet even though the manifest
 * already reports them. Deleting the old, working cache at that point
 * leaves the app with nothing to fall back to -- confirmed in practice:
 * this exact race produced a fully untranslated UI (bare keys
 * everywhere) when a version bump's manifest update outran jsDelivr.
 */
async function fetchManifest() {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const { localeVersion } = await res.json();
    try {
      localStorage.setItem(MANIFEST_CACHE_KEY, JSON.stringify({ version: localeVersion, fetchedAt: Date.now() }));
    } catch { /* storage full, ignore */ }
    return localeVersion;
  } catch (err) {
    console.warn('[i18n] Failed to fetch manifest:', err);
    // Serve last-known-good cached version on network failure rather than breaking
    try {
      const cached = localStorage.getItem(MANIFEST_CACHE_KEY);
      if (cached) return JSON.parse(cached).version;
    } catch { /* ignore */ }
    return null; // fetchLocale falls back to @latest
  }
}

/**
 * Fetches one language's locale data for a given version.
 *
 * Returns { data, fetchedFresh } where fetchedFresh is true only when
 * the network fetch for THIS EXACT version succeeded just now. That flag
 * is what loadLocale() uses to decide whether it's safe to prune other
 * cached versions -- never prune based on the manifest alone, only once
 * we have proof the new version's data actually came back successfully.
 *
 * Fallback order on a cache miss + failed network fetch:
 *   1. Try the network for the exact requested version.
 *   2. If that fails (e.g. CDN propagation lag right after a version
 *      bump), fall back to ANY other cached version for this language
 *      still sitting in localStorage, rather than returning nothing --
 *      slightly-stale translations beat an entirely untranslated UI.
 *   3. If nothing at all is cached for this language, return {}.
 */
async function fetchLocale(lang, version) {
  const cacheKey = `wf-locale:${lang}:${version ?? 'latest'}`;

  try {
    const cached = localStorage.getItem(cacheKey);
    if (cached) return { data: JSON.parse(cached), fetchedFresh: false };
  } catch { /* ignore parse errors, fall through to fetch */ }

  try {
    const url = version
      ? `${LOCALE_CDN_BASE}@${version}/${lang}/${lang}.json`
      : `${LOCALE_CDN_BASE}@latest/${lang}/${lang}.json`;
    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    try { localStorage.setItem(cacheKey, JSON.stringify(data)); } catch { /* storage full, ignore */ }
    return { data, fetchedFresh: true };
  } catch (err) {
    console.warn(`[i18n] Failed to fetch locale '${lang}' version '${version}':`, err);

    // Fall back to ANY cached version for this language, even if it's not
    // the one the manifest just told us about -- e.g. the CDN may not have
    // finished propagating a brand-new version tag yet. Better to show
    // slightly outdated translations than none at all.
    const fallback = findAnyCachedLocale(lang);
    if (fallback) {
      console.warn(`[i18n] Falling back to previously cached '${lang}' locale data.`);
      return { data: fallback, fetchedFresh: false };
    }

    return { data: {}, fetchedFresh: false };
  }
}

/**
 * Scans localStorage for any wf-locale:{lang}:* entry and returns the
 * first parseable one found. Used only as a last-resort fallback when
 * the exact requested version can't be fetched and isn't cached.
 */
function findAnyCachedLocale(lang) {
  const prefix = `${LOCALE_CACHE_PREFIX}${lang}:`;
  for (let i = 0; i < localStorage.length; i++) {
    const key = localStorage.key(i);
    if (!key || !key.startsWith(prefix)) continue;
    try {
      const cached = localStorage.getItem(key);
      if (cached) return JSON.parse(cached);
    } catch { /* skip unparseable entries */ }
  }
  return null;
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
 *
 * `key` can be a full real path (e.g. "tabs.vendor.ui.u43.item.syandana"),
 * a literal key as stored (e.g. "tabs.rarity.common" if that's literally how
 * it's keyed at whatever level it lives), or an old-style short suffix
 * (e.g. "planner") -- see resolvePath() for the full resolution order and
 * the ambiguous-suffix warning behavior.
 */
export function t(key, vars = {}) {
  const resolved = resolvePath(key);
  let str = typeof resolved === 'string' ? resolved : key;
  for (const [k, v] of Object.entries(vars)) {
    str = str.replace(`{{${k}}}`, v);
  }
  return str;
}

/**
 * Translate an arcane name. Falls back to original English name.
 * Old key: "arcane.<Name>". New home: general.game.arcane.<Name>.
 * Goes through resolvePath (not a direct uiStrings index) so this keeps
 * working via the suffix-fallback even if the arcane namespace moves
 * again later -- but the explicit full path is tried first and is the
 * fast, unambiguous route.
 */
export function tArcaneName(name) {
  if (currentLang === 'en' || !name) return name;
  const resolved = resolvePath(`general.game.arcane.${name}`);
  return typeof resolved === 'string' ? resolved : name;
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
  // Old key: "item.<name>". New home: general.game.arsenal.<name>.
  const fromMap = resolvePath(`general.game.arsenal.${name}`);
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
      const basePl   = pluralize(resolvePath(`general.game.arsenal.${parts[baseIdx]}`) ?? parts[baseIdx]);
      if (prefixIdx < baseIdx) return `${basePl} ${dualWord} ${prefix}`;
      else                     return `${basePl} ${prefix} ${dualWord}`;
    }
  }

  // 6. Clean prefix swap: Prefix Base -> TranslatedBase Prefix
  //    Base resolved through item map first (handles e.g. 'Tenet Flux Rifle').
  if (parts.length >= 2 && CLEAN_SWAP.has(parts[0])) {
    const base = parts.slice(1).join(' ');
    const translatedBase = resolvePath(`general.game.arsenal.${base}`) ?? base;
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
  return t(`tabs.rarity.${rarity.toLowerCase()}`) ?? rarity;
}

/**
 * Translate a category name (Warframe, Primary, Melee, etc.)
 */
export function tCategory(category) {
  if (!category) return category;
  return t(`filters.${category.toLowerCase().replace(/[^a-z]/g, '_')}`) ?? category;
}

/**
 * Translate a drop source group label (Eidolons, Zariman, etc.)
 * These are the parsed/grouped source names, not raw API strings.
 */
export function tDropSource(source) {
  if (!source || currentLang === 'en') return source;
  return t(`general.drops.dropSource.${source}`) ?? source;
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
    'Neuroptics':  t('general.component.neuroptics'),
    'Chassis':     t('general.component.chassis'),
    'Systems':     t('general.component.systems'),
    'Carapace':    t('general.component.carapace'),
    'Cerebrum':    t('general.component.cerebrum'),
    'Wings':       t('general.component.wings'),
    'Barrel':      t('general.component.barrel'),
    'Receiver':    t('general.component.receiver'),
    'Stock':       t('general.component.stock'),
    'Blade':       t('general.component.blade'),
    'Blades':      t('general.component.blades'),
    'Handle':      t('general.component.handle'),
    'Grip':        t('general.component.grip'),
    'Pouch':       t('general.component.pouch'),
    'String':      t('general.component.string'),
    'Upper Limb':  t('general.component.upper_limb'),
    'Lower Limb':  t('general.component.lower_limb'),
    'Guard':       t('general.component.guard'),
    'Ornament':    t('general.component.ornament'),
    'Hilt':        t('general.component.hilt'),
    'Harness':     t('general.component.harness'),
    'Stars':       t('general.component.stars'),
    'Gauntlet':    t('general.component.gauntlet'),
    'Link':        t('general.component.link'),
    'Head':        t('general.component.head'),
    'Disc':        t('general.component.disc'),
    'Glove':       t('general.component.glove'),
    'Core':        t('general.component.core'),
    'Day Aspect':  t('general.component.day aspect'),
    'Night Aspect':t('general.component.night aspect'),
  };

  const blueprint = t('general.component.blueprint'); // "Diagrama"

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
  return name.replace(/^(.+?)\s+Relic$/i, `${t('general.word.relic')} $1`);
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
  // Old key: "item.<base>". New home: general.game.arsenal.<base>.
  if (name.endsWith(' Prime')) {
    const base = name.slice(0, -6);
    const translatedBase = resolvePath(`general.game.arsenal.${base}`) ?? base;
    return `${translatedBase} Prime`;
  }
  return name;
}

/**
 * Translate a prime component part name (Blueprint, Neuroptics, etc.)
 * Falls back to the original name if no mapping exists.
 * Old key: "component.<slug>". New home: general.component.<slug>.
 */
export function tComponent(name) {
  if (!name || currentLang === 'en') return name;
  const slug = name.toLowerCase().replace(/[^a-z]/g, '_');
  const resolved = resolvePath(`general.component.${slug}`);
  return typeof resolved === 'string' ? resolved : name;
}

/**
 * Format a date using the current locale.
 */
export function formatDate(date, options = { year: 'numeric', month: 'short' }) {
  if (!date) return t('general.unknown');
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
  const translated = tOrRaw(`general.game.mission.${baseName}`, baseName);
  return hasCaches ? `${translated} ${tOrRaw('general.game.mission.caches', '(Caches)')}` : translated;
}

export function tGameMode(raw) {
  if (!raw) return raw;
  return tOrRaw(`general.game.gameMode.${raw}`, raw);
}

/**
 * Resolve a Baro Ki'Teer inventory entry's display name and category from locale keys.
 *
 * Old home: top-level uiStrings keys "baro.item.<category>.<apiIdentifier>".
 * New home: tabs.tasks.ui.baro.item is now its OWN nested object (reached
 * via a real path), but the keys WITHIN that object are still flat
 * "<category>.<apiIdentifier>" strings -- verified by hand (2026-06) that
 * this dictionary's internal shape didn't change, only where it lives.
 * e.g. tabs.tasks.ui.baro.item["mod.Weapon Shotgun Faction Damage Murmurs Expert"]
 *      → "Primed Cleanse The Murmur"
 *
 * Returns { name: string, category: string } where:
 *   - name:     localized display name; falls back to the raw API identifier if no key is found
 *   - category: slug from the key path (e.g. "mod", "weapon", "prime"); falls back to "other"
 */
const BARO_ITEM_PATH = ['tabs', 'tasks', 'ui', 'baro', 'item'];

export function tBaroItem(apiIdentifier) {
  const items = walkSegments(uiStrings, BARO_ITEM_PATH);
  if (items && typeof items === 'object') {
    for (const [key, value] of Object.entries(items)) {
      const dotIdx = key.indexOf('.');
      if (dotIdx === -1) continue;

      const category   = key.slice(0, dotIdx);
      const identifier  = key.slice(dotIdx + 1);

      if (identifier === apiIdentifier) {
        return { name: value || apiIdentifier, category };
      }
    }
  }

  return { name: apiIdentifier, category: 'other' };
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

export function resolveWeaponName(name) {
  const tr = t(`general.game.arsenal.${name}`);
  return tr.includes('general.game.arsenal') ? name : tr;
}