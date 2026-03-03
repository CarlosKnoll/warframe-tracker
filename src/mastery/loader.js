// mastery/loader.js - Data fetching, normalization, and disk caching for mastery items

const invoke = window.__TAURI_INTERNALS__.invoke;

import {
  masteryState,
  MASTERY_URLS,
} from './state.js';

// ─── Cache TTL ─────────────────────────────────────────────────────────────────
const CACHE_TTL_MS = 24 * 60 * 60 * 1000; // 24 hours

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

  return {
    uniqueName:    item.uniqueName,
    name:          item.name,
    imageName:     item.imageName || null,
    wikiImage:     null,
    isPrime:       item.isPrime === true,
    section,
    masteryPoints: deriveMasteryPoints(section, item.name, endpointKey, item.uniqueName),
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
    if (age > CACHE_TTL_MS) {
      console.log('[mastery/loader] Cache expired, will re-fetch.');
      return null;
    }

    console.log('[mastery/loader] Using cached item data.');
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

  console.log('[mastery/loader] Fetching fresh mastery item data…');
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
  console.log(`[mastery/loader] Loaded ${masteryState.items.length} mastery items.`);
}