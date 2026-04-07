// mods/loader.js

import { state, MODS_URLS, WM_ITEMS_URL, WM_STATIC_BASE, WFCD_IMG_BASE } from './state.js';
import { CUSTOM_DROP_SOURCES } from './drop_sources.js';

// Tauri's invoke is injected as a global by the Tauri runtime (no bundler needed).
// Falls back to null so the module still loads in a plain browser context.
// Tauri v2 without a bundler exposes invoke via __TAURI_INTERNALS__, not __TAURI__.core.
// The __TAURI__.core path only works when using the npm package through a bundler.
const invoke = window.__TAURI_INTERNALS__?.invoke
  ?? window.__TAURI__?.core?.invoke
  ?? window.__TAURI__?.tauri?.invoke
  ?? null;

// ── Category map ──────────────────────────────────────────────────────────────

const TYPE_TO_CATEGORY = {
  'Warframe Mod':   'Warframe',
  'Primary Mod':    'Primary',
  'Secondary Mod':  'Secondary',
  'Melee Mod':      'Melee',
  'Companion Mod':  'Companion',
  'Kubrow Mod':     'Companion',
  'Kavat Mod':      'Companion',
  'Sentinel Mod':   'Companion',
  'Moa Mod':        'Companion',
  'Hound Mod':      'Companion',
  'Archwing Mod':   'Archwing',
  'Arch-Gun Mod':   'Arch-Gun',
  'Arch-Melee Mod': 'Arch-Melee',
  'Aura Mod':       'Aura',
  'Stance Mod':     'Stance',
  'Parazon Mod':    'Parazon',
};

// compatName values that take PRIORITY over the type map.
// WFCD uses ALL-CAPS (e.g. "AURA", "STANCE") — we normalise to lowercase.
// Must fire before TYPE_TO_CATEGORY because aura mods have type:"Warframe Mod"
// and stance mods have type:"Melee Mod", both of which would misclassify them.
const COMPAT_PRIORITY = {
  'aura':    'Aura',
  'stance':  'Stance',
  'parazon': 'Parazon',
};

// compatName fallbacks — only used when the type map also has no match.
const COMPAT_FALLBACK = {
  'archwing':  'Archwing',
  'archgun':   'Arch-Gun',
  'archmelee': 'Arch-Melee',
};

function resolveCategory(item) {
  const compat = (item.compatName || '').toLowerCase().replace(/[^a-z]/g, '');

  // 1. compatName priority — checked FIRST so aura/stance are never misrouted
  //    by their misleading type value.
  if (COMPAT_PRIORITY[compat]) return COMPAT_PRIORITY[compat];

  // 2. Type map — handles the vast majority of regular mods.
  const rawType = item.type || '';
  if (TYPE_TO_CATEGORY[rawType]) return TYPE_TO_CATEGORY[rawType];

  // 3. compatName fallback — catches arch variants under a generic type.
  if (COMPAT_FALLBACK[compat]) return COMPAT_FALLBACK[compat];

  return 'Misc';
}

// ── Filters ───────────────────────────────────────────────────────────────────

function shouldSkip(item) {
  const name       = item.name       || '';
  const uniqueName = item.uniqueName || '';
  const type       = item.type       || '';

  if (/riven/i.test(type))                   return true;
  if (/riven/i.test(uniqueName))             return true;
  if (item.isFlawed === true)                return true;
  if (/^Flawed /i.test(name))               return true;
  if (/^Damaged /i.test(name))              return true;
  if (/unfused artifact/i.test(name))       return true;
  if (/transmut(e|ation) core/i.test(name)) return true;
  if (/setmod$/i.test(name))               return true;
  if (/sampleantique/i.test(name))         return true;

  return false;
}

// ── Polarity normalisation ────────────────────────────────────────────────────

function normalisePolarity(raw) {
  if (!raw) return null;
  return raw.charAt(0).toUpperCase() + raw.slice(1).toLowerCase();
}

// ── Special class detection ───────────────────────────────────────────────────

function detectModClass(item) {
  const name = item.name || '';
  if (/^Galvanized /i.test(name)) return 'galvanized';
  if (/^Archon /i.test(name))     return 'archon';
  return null;
}

// ── Drain display computation ─────────────────────────────────────────────────
// Aura / Stance — baseDrain is negative in WFCD; display as Math.abs(base) + maxRank.
// Parazon        — return null, no cost shown.
// Normal         — baseDrain + maxRank (fully-ranked capacity cost).

function computeDrain(item, category) {
  const base    = item.baseDrain   ?? null;
  const maxRank = item.fusionLimit ?? 0;

  if (base === null)          return null;
  if (category === 'Parazon') return null;
  if (base < 0)               return Math.abs(base) + maxRank;

  return base + maxRank;
}

// ── WM url_name derivation ────────────────────────────────────────────────────

function toUrlName(name) {
  return name.toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_|_$/g, '');
}

function extractHash(thumb) {
  const m = thumb && thumb.match(/\.([a-f0-9]{32})\./);
  return m ? m[1] : null;
}

// ── WM exclusions ─────────────────────────────────────────────────────────────
// url_names of mods that should never use the WM card image.
// Add entries here for any mod whose WM card image is missing or incorrect.
const WM_EXCLUDE = new Set([
  // e.g. 'amalgam_javlok_magazine_warp',
  'accelerated_isotope',
  'atomic_fallout',
  'bane_of_the_murmurs',
  'battle_forge',
  'battle_stations',
  'blending_talons',
  'breach_quanta',
  'cathode_current',
  'cleanse_the_murmur',
  'containment_creach',
  'critical_mutation',
  'critical_precision',
  'critical_surge',
  'death_blossom',
  'energy_nexus',
  'eximus_advantage',
  'expel_the_murmur',
  'fass_canticle',
  'flow_burn',
  'form_up',
  'intrepid_stand',
  'intruder_stasis',
  'jahu_canticle',
  'khra_canticle',
  'lohk_canticle',
  'mach_crash',
  'martyr_symbiosis',
  'merulina_guardian',
  'mesmer_shield',
  'metamorphic_magazine',
  'necramech_drift',
  'necramech_efficiency',
  'necramech_flow',
  'necramech_friction',
  'necramech_hydraulics',
  'necramech_streamline',
  'netra_canticle',
  'precision_intensify',
  'primed_redirection',
  'primed_smite_grineer',
  'primed_smite_infested',
  'radiated_reload',
  'ready_steel',
  'repair_kit',
  'ris_invocation',
  'shadow_haze',
  'shattered_storm',
  'shivering_contagion',
  'smite_the_murmur',
  'squad_renew',
  'temporal_erosion',
  'thrall_pact',
  'vile_discharge',
  'void_cloak',
  'volatile_parasite',
  'volatile_quick_return',
  'volatile_rebound',
  'volatile_variant',
  'vome_invocation',
  'wild_frenzy',

]);


// ── WM items map ──────────────────────────────────────────────────────────────

let _wmMap = null;

const WM_MAP_CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

async function buildWmImageMap() {
  if (_wmMap) return _wmMap;
  _wmMap = {};

  try {
    if (!invoke) throw new Error('Tauri invoke not available');

    // ── Try disk cache first ────────────────────────────────────────────────
    try {
      const cached = await invoke('load_wm_map_cache');
      if (cached && cached.cachedAt && cached.map) {
        const age = Date.now() - new Date(cached.cachedAt).getTime();
        if (age < WM_MAP_CACHE_TTL_MS) {
          _wmMap = cached.map;
          return _wmMap;
        }
      }
    } catch (e) {
      console.warn('WM map cache read failed, fetching fresh:', e);
      console.error('WM map cache write failed:', e);
      console.error('Map size at save time:', Object.keys(_wmMap).length);
    }

    // ── Fetch fresh from WM API ─────────────────────────────────────────────

    const data = await invoke('fetch_json', {
      url: WM_ITEMS_URL,
      headers: {
        'Accept':   'application/json',
        'Platform': 'pc',
        'Language': 'en',
        'User-Agent': 'WarframeArcaneTracker/1.0',
      },
    }).catch(err => {
      console.error('invoke error:', err);
      return null;
    });
    if (!data) return _wmMap;

    const items = data?.data ?? [];

    for (const item of items) {
      const icon = item.i18n?.en?.icon;
      if (!icon) continue;
  
      const hash = extractHash(icon);
      if (!hash) continue;
  
      // derive url_name from the icon path: "items/images/en/secura_dual_cestra.HASH.png"
      const fileName = icon.split('/').pop();               // "secura_dual_cestra.HASH.png"
      const urlName  = fileName.replace(`.${hash}.png`, ''); // "secura_dual_cestra"

      if (WM_EXCLUDE.has(urlName)) continue;
  
      _wmMap[urlName] = `${WM_STATIC_BASE}${icon}`;
    }

    console.log('WM map built, size:', Object.keys(_wmMap).length);
    // ── Persist to disk cache ───────────────────────────────────────────────
    try {
      await invoke('save_wm_map_cache', {
        data: { cachedAt: new Date().toISOString(), map: _wmMap },
      });
    } catch (e) {
      console.warn('WM map cache write failed:', e);
    }

  } catch (err) {
    console.warn('WM items map build failed (images will fall back to WFCD):', err);
  }

  return _wmMap;
}

// ── Main loader ───────────────────────────────────────────────────────────────

export async function loadMods() {
  try {
    const [modsResult, wmMap] = await Promise.all([
      Promise.allSettled([
        fetch(MODS_URLS.Mods).then(r => r.json()),
      ]).then(([r]) => r),
      buildWmImageMap(),
    ]);

    if (modsResult.status !== 'fulfilled') {
      console.error('Mods load error:', modsResult.reason);
      return;
    }



    const modData = [];

    for (const item of modsResult.value) {
      if (!item.name) continue;

      const rawType = item.type || '';
      if (!rawType.includes('Mod')) continue;
      if (shouldSkip(item)) continue;

      if (item.name === 'Aegis Gale') {
        console.log('raw item:', JSON.stringify(item));
      }

      const category     = resolveCategory(item);
      const polarity     = normalisePolarity(item.polarity);
      const modClass     = detectModClass(item);
      const drainDisplay = computeDrain(item, category);

      const customEntry      = CUSTOM_DROP_SOURCES[item.name];
      const overrideCategory = customEntry?.[0]?.category ?? null;

      const urlName  = toUrlName(item.name);
      const wmImgUrl = (!WM_EXCLUDE.has(urlName) && wmMap[urlName]) ? wmMap[urlName] : null;
      const imgUrl   = wmImgUrl
        ?? (item.imageName ? `${WFCD_IMG_BASE}${item.imageName}` : null);

      modData.push({
        uniqueName:   item.uniqueName  || '',
        name:         item.name,
        description:  extractDescription(item),
        type:         rawType,
        category:     overrideCategory ?? category,
        modClass,
        polarity,
        compatName:   item.compatName  || null,
        imgUrl,
        isWmCard:     !!wmImgUrl,
        imageName:    item.imageName   || null,
        drops:        item.drops       || [],
        tradable:     item.tradable    ?? false,
        rarity:       item.rarity      || null,
        baseDrain:    item.baseDrain   ?? null,
        maxRank:      item.fusionLimit ?? null,
        drainDisplay,
        isFlawed:     item.isFlawed    ?? false,
      });
    }

    // ── Deduplicate tier variants (Beginner/Intermediate) ─────────────────────
    // WFCD includes multiple tiers of the same mod under identical names but
    // different uniqueNames. Keep only the one with the highest fusionLimit.
    const bestByName = new Map();
    for (const mod of modData) {
      const existing = bestByName.get(mod.name);
      if (!existing || (mod.maxRank ?? 0) > (existing.maxRank ?? 0)) {
        bestByName.set(mod.name, mod);
      }
    }
    const deduped = Array.from(bestByName.values());
    deduped.sort((a, b) => a.name.localeCompare(b.name));
    state.allMods = deduped;

  } catch (err) {
    console.error('loadMods error:', err);
  }
}

function extractDescription(item) {
  if (item.description) return item.description;
  const stats = item.levelStats;
  if (Array.isArray(stats) && stats.length > 0) {
    const maxStats = stats[stats.length - 1].stats ?? [];
    return maxStats
      .map(s => s.replace(/<[^>]+>/g, ''))  // strip colour tags like <DT_RADIATION_COLOR>
      .join('\n');
  }
  return '';
}