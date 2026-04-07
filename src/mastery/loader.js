// mastery/loader.js - Data fetching, normalization, and disk caching for mastery items

const invoke = window.__TAURI_INTERNALS__.invoke;

import {
  masteryState,
  MASTERY_URLS,
} from './state.js';

// ─── Cache TTL ─────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours
const CACHE_VERSION = 3; // bump when normalized shape changes

// ─── Hardcoded items ───────────────────────────────────────────────────────────
// Items not present in the WFCD API, added manually.

const HARDCODED_ITEMS = [
  {
    uniqueName:    '/Custom/Vehicles/Plexus',
    name:          'Plexus',
    wikiImageUrl:  'https://wiki.warframe.com/images/Plexus.png',
    imageName:     null,
    isPrime:       false,
    section:       'Vehicle',
    masteryPoints: 6000,
  },
];

// ─── Exclusions ────────────────────────────────────────────────────────────────

const EXCLUDED_CATEGORIES = new Set([
  'Melee Exalted',
  'Primary Exalted',
  'Secondary Exalted',
]);

const EXCLUDED_PRODUCT_CATEGORIES = new Set([
  'KubrowPetWeapon',
  'KavatPetWeapon',
  'PredatitePetWeapon',
  'VulpaphylaPetWeapon',
  'MOAPetWeapon',
  'HoundPetWeapon',
]);

const EXCLUDED_UNIQUE_NAMES = new Set([
  '/Lotus/Powersuits/PowersuitAbilities/Helminth',
  '/Lotus/Weapons/Tenno/Grimoire/TnDoppelgangerGrimoire',
]);

// ─── Normalization ─────────────────────────────────────────────────────────────

function normalizeItem(item, endpointKey) {
  if (!item.uniqueName || !item.name) return null;
  if (EXCLUDED_CATEGORIES.has(item.category)) return null;
  if (EXCLUDED_PRODUCT_CATEGORIES.has(item.productCategory)) return null;
  if (EXCLUDED_UNIQUE_NAMES.has(item.uniqueName)) return null;

  let section = endpointKey;

  // ── Warframe ──────────────────────────────────────────────────────────────────
  if (endpointKey === 'Warframe') {
    if (item.uniqueName.includes('/Lotus/Powersuits/EntratiMech/')) {
      section = 'Vehicle';
    }
  }

  // ── Primary ───────────────────────────────────────────────────────────────────
  if (endpointKey === 'Primary') {
    if (item.uniqueName.includes('/DrifterPistolPlayerWeapon')) {
      section = 'Amp';
    } else if (item.productCategory === 'OperatorAmps') {
      return null;
    }
  }

  // ── Melee ─────────────────────────────────────────────────────────────────────
  if (endpointKey === 'Melee') {
    const un = item.uniqueName;
    if (un.includes('/Ostron/Melee/') && un.includes('/Tip')) {
      if (un.includes('PvPVariant')) return null;
      section = 'Zaw';
    } else if (un.includes('/Ostron/Melee/') || un.includes('/SUModularMelee/')) {
      return null;
    }
  }

  // ── Companion (Pets.json) ─────────────────────────────────────────────────────
  if (endpointKey === 'Companion') {
    const un = item.uniqueName;

    if (un.includes('/ZanukaPetParts/') || un.includes('MoaPetParts')) {
      if (un.includes('Head')) {
        section = 'Robotic';
      } else {
        return null;
      }
    }

    if (un.includes('/CreaturePetParts/')) return null;
  }

  // ── Misc ───────────────────────────────────────────────────────────────────────
  if (endpointKey === 'Misc') {
    const un = item.uniqueName;

    if (un.includes('/Hoverboard/')) {
      if (un.endsWith('Deck')) section = 'Vehicle';
      else return null;
    } else if ((un.includes('/SolarisUnited/Secondary/') || un.includes('/Infested/Pistols/')) && un.includes('/Barrel')) {
      section = 'Kitgun';
    } else if (un.includes('/OperatorAmplifiers/') && un.includes('Barrel')) {
      section = 'Amp';
    } else {
      return null;
    }
  }

  const RESOURCE_TYPES = new Set(['Resource', 'Misc']);
  const EXCLUDED_COMP_NAMES = new Set([
    'Orokin Cell', 'Argon Crystal', 'Neural Sensors', 'Neurodes',
    'Gallium', 'Ferrite', 'Plastids', 'Nano Spores', 'Alloy Plate',
    'Polymer Bundle', 'Rubedo', 'Salvage', 'Credits', 'Nitain Extract',
    'Entrati Lanthorn', "Echo Voca", "Entrati Obols", "Necracoil",
    'Pyrotic Alloy', 'Tear Azurite', 'Nistlepod', 'Fish Scales',
    'Feersteel Alloy', 'Marquise Veridos', 'Breath Of The Eidolon',
    'Maprico', 'Coprite Alloy', 'Esher Devar', 'Grokdul', 'Cetus Wisp',
    'Iradite',
    'Viper', 'Lato', 'Cestra', 'Dual Skana', 'Akstiletto', 'Kraken',
    'Dual Zoren', 'Vasto', 'Ankyros', 'Magistar', 'The Xoris', 'Furax',

  ]);

  // Keep only craftable components that carry drop location data.
  // Resources and components without drops are excluded.
  const components = Array.isArray(item.components)
    ? item.components
        .filter(c =>
          c.drops && c.drops.length > 0 &&
          !RESOURCE_TYPES.has(c.type) &&
          !EXCLUDED_COMP_NAMES.has(c.name)
        )
        .map(c => ({ name: c.name, drops: c.drops }))
    : [];

  return {
    uniqueName:    item.uniqueName,
    name:          item.name,
    imageName:     item.imageName || null,
    wikiImage:     null,
    isPrime:       item.name.includes('Prime'),
    section,
    masteryPoints: deriveMasteryPoints(section, item.name, endpointKey, item.uniqueName),
    components,
  };
}

function deriveMasteryPoints(section, itemName, endpointKey, uniqueName) {
  const highXpSections = new Set(['Warframe', 'Archwing', 'Robotic', 'Companion', 'Vehicle']);
  // Kuva and Tenet weapons cap at rank 40 → 4,000 mastery
  if (itemName.startsWith('Kuva ') || itemName.startsWith('Tenet ') || itemName === 'Paracesis') {
    return 4000;
  }

  // Necramechs cap at rank 40 via forma → 8,000 mastery
  if (endpointKey === 'Warframe' && uniqueName.includes('/Lotus/Powersuits/EntratiMech/')) {
    return 8000;
  }

  else{
    return highXpSections.has(section) ? 6000 : 3000;
  }
}

// ─── WFCD item loader ──────────────────────────────────────────────────────────

async function fetchAllItems() {
  const normalized = [];

  const fetches = Object.entries(MASTERY_URLS).map(async ([endpointKey, url]) => {
    try {
      const res   = await fetch(url);
      const items = await res.json();
      items.forEach(item => {
        const n = normalizeItem(item, endpointKey);
        if (n) normalized.push(n);
      });
    } catch (err) {
      console.error(`[mastery/loader] Failed to load ${endpointKey}:`, err);
    }
  });

  await Promise.allSettled(fetches);

  // Merge hardcoded items — skip if uniqueName already present from API
  const seen = new Set(normalized.map(i => i.uniqueName));
  HARDCODED_ITEMS.forEach(item => {
    if (!seen.has(item.uniqueName)) normalized.push(item);
  });

  return normalized;
}

// ─── Disk cache ────────────────────────────────────────────────────────────────

async function loadFromDiskCache() {
  try {
    const cached = await invoke('load_mastery_data_cache');
    if (!cached || !cached.cachedAt || !Array.isArray(cached.items) || cached.items.length === 0) return null;

    const age = Date.now() - new Date(cached.cachedAt).getTime();
    if (age > CACHE_TTL_MS || (cached.version ?? 1) < CACHE_VERSION) {
      console.warn('[mastery/loader] Cache expired or outdated, will re-fetch.');
      return null;
    }

    console.warn('[mastery/loader] Using cached item data.');
    return cached.items;
  } catch (err) {
    console.error('[mastery/loader] Failed to read cache:', err);
    return null;
  }
}

async function saveToDiskCache(items) {
  try {
    await invoke('save_mastery_data_cache', {
      data: {
        cachedAt: new Date().toISOString(),
        version: CACHE_VERSION,
        items,
      }
    });
  } catch (err) {
    console.error('[mastery/loader] Failed to write cache:', err);
  }
}

// ─── Public API ────────────────────────────────────────────────────────────────

export async function loadMasteryItems({ forceRefresh = false } = {}) {
  if (!forceRefresh) {
    const cached = await loadFromDiskCache();
    if (cached) {
      const seen = new Set(cached.map(i => i.uniqueName));
      HARDCODED_ITEMS.forEach(item => {
        if (!seen.has(item.uniqueName)) cached.push(item);
      });
      masteryState.items = cached;
      return;
    }
  }

  console.warn('[mastery/loader] Fetching fresh mastery item data…');
  const items = await fetchAllItems();

  const seen = new Set();
  masteryState.items = items.filter(item => {
    if (seen.has(item.uniqueName)) return false;
    seen.add(item.uniqueName);
    return true;
  });

  // Don't await — the disk write has no effect on what gets rendered.
  // Let it complete in the background so renderMastery() can proceed immediately.
  saveToDiskCache(masteryState.items).catch(err =>
    console.error('[mastery/loader] Background cache save failed:', err)
  );
  console.warn(`[mastery/loader] Loaded ${masteryState.items.length} mastery items.`);
}