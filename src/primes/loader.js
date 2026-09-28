// primes/loader.js - All data fetching and processing logic

import { state, RELICS_DROP_URL, MISSION_REWARDS_URL, PRIME_URLS, VAULT_TRADER_URL, RELICS_ITEMS_URL } from './state.js';
import { PART_ORDER } from './renderer.js';

const VALID_PARTS = ["Blueprint", "Helmet", "Cerebrum", "Harness", "Chassis", "Carapace", "Wings",
  "Systems", "Barrel", "LowerLimb", "Stars", "Receiver", "UpperLimb", "Blade", "Stock", "Grip", 
  "Handle", "Pouch", "Hilt", "Gauntlet", "String", "Link", "Guard", "Boot", "Head"];

export async function loadPrimes() {
  try {
    // Fire all requests simultaneously — missions, relics, and all 8 category
    // JSONs in one parallel wave. Processing waits for all to settle, but no
    // fetch has to wait for another to complete before it can start.
    const categoryEntries = Object.entries(PRIME_URLS);

    const [missionsResult, relicsResult, ...categoryResults] = await Promise.allSettled([
      fetch(MISSION_REWARDS_URL).then(r => r.json()),
      fetch(RELICS_DROP_URL).then(r => r.json()),
      ...categoryEntries.map(([, url]) => fetch(url).then(r => r.json())),
    ]);

    const relicsItemsResult = await fetch(RELICS_ITEMS_URL)
      .then(r => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`);
        return r.json();
      })
      .catch(e => { console.error('Relics.json fetch failed:', e); return null; });

    if (relicsItemsResult) {
      for (const relic of relicsItemsResult) {
        if (!relic.uniqueName || !relic.name) continue;
        // "Lith A11 Intact" → "lith a11 relic"
        const displayKey = relic.name
          .replace(/\s*(Intact|Exceptional|Flawless|Radiant)\s*$/i, '')
          .trim()
          .toLowerCase()
          + ' relic';
        state.relicUniqueNameMap.set(relic.uniqueName, displayKey);
      }
    } 

    // ── Process mission rewards → farmableRelics + relicLocationMap ──────────
    state.farmableRelics = new Set();
    if (missionsResult.status === 'fulfilled') {
      const missions = missionsResult.value.missionRewards || {};
      Object.entries(missions).forEach(([planetName, planet]) => {
        Object.entries(planet).forEach(([missionName, mission]) => {
          if (mission.rewards) {
            ['A', 'B', 'C'].forEach(rotation => {
              if (mission.rewards[rotation]) {
                mission.rewards[rotation].forEach(reward => {
                  if (!reward.itemName || !reward.itemName.toLowerCase().includes('relic')) return;

                  // Item names here are already clean e.g. "Lith D7 Relic"
                  // No need to normalize, just lowercase for the key
                  const key = reward.itemName.trim().toLowerCase();
                  state.farmableRelics.add(key);

                  if (!state.relicLocationMap.has(key)) {
                    state.relicLocationMap.set(key, []);
                  }
                  state.relicLocationMap.get(key).push({
                    planet: planetName,
                    mission: missionName,
                    gameMode: mission.gameMode || '',
                    rotation,
                    chance: reward.chance,
                  });
                });
              }
            });
          }
        });
      });
    } else {
      console.error("Error loading mission rewards data:", missionsResult.reason);
    }

    // ── Process relics → relicRewardsMap + componentRelicsMap ─────────────────────────────────────
    state.relicRewardsMap = new Map();
    state.componentRelicsMap = new Map();
    if (relicsResult.status === 'fulfilled') {
      const intactRelics = (relicsResult.value.relics || [])
        .filter(r => r.state === 'Intact');

      intactRelics.forEach(relic => {
        const normalizedName =
          `${relic.tier} ${relic.relicName} Relic`.toLowerCase();

        if (!relic.rewards || !Array.isArray(relic.rewards)) return;

        const rewardsWithRarity = relic.rewards.map(reward => {
          // Common: ~25.33%, Uncommon: ~11%, Rare: ~2%
          let rarity = 'Common';

          if (reward.chance <= 3) {
            rarity = 'Rare';
          } else if (reward.chance <= 12) {
            rarity = 'Uncommon';
          }

          const rewardName = reward.itemName?.trim();

          if (rewardName) {
            const componentKey = rewardName.toLowerCase();

            if (!state.componentRelicsMap.has(componentKey)) {
              state.componentRelicsMap.set(componentKey, []);
            }

            state.componentRelicsMap.get(componentKey).push({
              location: normalizedName,
              type: rewardName,
              chance: reward.chance,
              rarity
            });
          }

          return {
            itemName: rewardName,
            rarity,
            chance: reward.chance
          };
        });

        state.relicRewardsMap.set(normalizedName, rewardsWithRarity);

        if (relic.uniqueName) {
          state.relicUniqueNameMap.set(
            relic.uniqueName,
            normalizedName
          );
        }
      });
    } else {
      console.error("Error loading relics data:", relicsResult.reason);
    }

    await loadResurgenceRelics();

    // ── Process category items → allPrimes ───────────────────────────────────
    // farmableRelics is now fully populated, so checkPrimeVaultStatus and
    // extractPrimeComponents will produce correct results.
    const primeData = [];
    categoryResults.forEach((result, i) => {
      const [category] = categoryEntries[i];
      if (result.status !== 'fulfilled') {
        console.error(`Error loading ${category}:`, result.reason);
        return;
      }
      const items = result.value;
      items
        .filter(item => item.name && item.name.includes("Prime"))
        .forEach(item => {
          const vaultStatus = checkPrimeVaultStatus(item, state.farmableRelics);
          primeData.push({
            ...item,
            imageName: item.imageName || null,
            category,
            vaulted: vaultStatus.vaulted,
            resurgence: vaultStatus.resurgence,
            components: extractPrimeComponents(item, vaultStatus, state.farmableRelics),
          });
        });
    });
    state.allPrimes = primeData;
  } catch (err) {
    console.error("Error loading primes:", err);
  }
}

function checkPrimeVaultStatus(item, farmableRelics) {
  if (!item?.components || !Array.isArray(item.components)) {
    return { vaulted: true, resurgence: false };
  }

  let hasFarmableRelic = false;
  let hasAnyRelic = false;
  let hasResurgenceRelic = false;

  for (const comp of item.components) {
    const componentName = VALID_PARTS.find(part =>
      comp.uniqueName?.includes(part)
    );

    if (!componentName) continue;

    const drops = getComponentDrops(item, componentName);

    if (!drops.length) continue;

    hasAnyRelic = true;

    for (const drop of drops) {
      if (!drop.location) continue;

      const normalizedRelic = normalizeRelicName(drop.location);

      if (!normalizedRelic) continue;

      const relicLower = normalizedRelic.toLowerCase();

      if (isRelicActive(relicLower, farmableRelics)) {
        hasFarmableRelic = true;
        break;
      }

      if (state.resurgenceRelics.has(relicLower)) {
        hasResurgenceRelic = true;
      }
    }

    if (hasFarmableRelic) break;
  }

  return {
    vaulted: !hasFarmableRelic && hasAnyRelic,
    resurgence: !hasFarmableRelic && hasResurgenceRelic
  };
}

function isRelicActive(relicName, activeRelics) {
  if (!relicName) return false;

  const lowerRelic = relicName.toLowerCase();
  if (activeRelics.has(lowerRelic)) return true;

  const withoutRelic = lowerRelic.replace(/\s+relic\s*$/i, '').trim();
  if (activeRelics.has(withoutRelic)) return true;

  const withRelic = withoutRelic + ' relic';
  if (activeRelics.has(withRelic)) return true;

  const noSpaces = lowerRelic.replace(/\s+/g, '');
  if (activeRelics.has(noSpaces)) return true;

  return false;
}

function getComponentDrops(item, componentName) {
  if (!item?.name || !componentName || !state.componentRelicsMap) {
    return [];
  }

  // Some component names in the item API differ from the names
  // used by relic rewards.
  //
  // Warframe:
  //   Helmet → Neuroptics
  //
  // Example:
  //   Ash Prime + Helmet
  //   must search for:
  //   Ash Prime Neuroptics
  const rewardComponentName =
    componentName === "Helmet"
      ? "Neuroptics"
      : componentName;

  let searchName
  searchName =
    `${item.name} ${rewardComponentName}`.trim().toLowerCase();

  // exceptional treatment for bow limbs.
  searchName = searchName.replace('lowerlimb', 'lower limb')
                         .replace('upperlimb', 'upper limb');

  const drops = [];

  for (const [rewardName, relicDrops] of state.componentRelicsMap) {
    const rewardLower = rewardName.toLowerCase();

    if (
      rewardLower === searchName ||
      rewardLower === `${searchName} blueprint`
    ) {
      drops.push(...relicDrops);
    }
  }

  // Deduplicate identical relic entries.
  const seen = new Set();

  return drops.filter(drop => {
    const key =
      `${drop.location}|${drop.type}|${drop.chance}|${drop.rarity}`;

    if (seen.has(key)) return false;

    seen.add(key);
    return true;
  });
}

function extractPrimeComponents(item, vaultStatus, farmableRelics) {
  const components = [];
  const seen = new Set();

  const isWarframeCategory = item.category === "Warframe" || item.category === "Archwing" || item.category === "Sentinel";

  const mainKey = `${item.uniqueName}_owned`;
  components.push({
    name: "Owned",
    uniqueName: mainKey,
    vaulted: vaultStatus.vaulted,
    isMainItem: true,
    drops: item.drops || []
  });
  seen.add(mainKey);

  const EXCLUDED_COMPONENTS = [
    "Orokin Cell", "Argon Crystal", "Neural Sensors", "Neurodes",
    "Gallium", "Ferrite", "Plastids", "Nano Spores", "Alloy Plate",
    "Polymer Bundle", "Rubedo", "Salvage", "Credits", "Nitain Extract"
  ];

  if (item.components && Array.isArray(item.components)) {
    item.components.forEach(comp => {

      // Resolve the old component name from the new uniqueName.
      //
      // Example:
      // /Lotus/.../PrimeArchwingSystemsComponent
      // → Systems
      let componentName;
      componentName = VALID_PARTS.find(part =>
        comp.uniqueName?.includes(part)
      );
    
      // Hardcode override for Corufell Barrel/Stock until it gets fixed upstream.
      if(comp.uniqueName?.includes("CorufellPrimeBarrel")) {
        componentName = 'Stock'
      }

      // Not a component we display.
      // Example:
      // /Lotus/Types/Items/MiscItems/OrokinCell
      if (!componentName) return;

      if (
        EXCLUDED_COMPONENTS.some(ex =>
          componentName.includes(ex)
        )
      ) {
        return;
      }

      const baseKey =
        comp.uniqueName ||
        `${item.uniqueName}_${componentName}`;

      // Reconstruct the drops that existed in the old API.
      const drops = getComponentDrops(item, componentName);

      // A component is considered a built Prime when its uniqueName
      // identifies it as a Prime component and it has relic drops.
      const isBuiltPrime =
        comp.uniqueName?.includes("Prime") &&
        drops.some(d =>
          d.location &&
          d.location.toLowerCase().includes("relic")
        );

      // How many copies of this component are needed.
      const copies =
        comp.itemCount && comp.itemCount > 1
          ? comp.itemCount
          : (isBuiltPrime ? null : 1);

      // Deduplicate genuine duplicates.
      if (copies === 1 && seen.has(baseKey)) return;

      // Find the next available indexed key.
      let compKey = baseKey;
      let index = 1;

      while (seen.has(compKey)) {
        compKey = `${baseKey}_${index++}`;
      }

      seen.add(compKey);

      // Since the component no longer contains its own drop data,
      // use the reconstructed drops to determine its vault status.
      let compStatus = {
        vaulted: vaultStatus.vaulted
      };

      if (drops.length > 0) {
        compStatus = checkPrimeVaultStatus(
          {
            ...item,
            components: [comp]
          },
          farmableRelics
        );
      }

      // Helmet → Neuroptics special case.
      const displayName =
        componentName === "Helmet"
          ? "Neuroptics"
          : componentName;

      // Push once for the current iteration.
      // Skip Warframe/Archwing/Sentinel blueprints as before.
      if (
        !(
          componentName === "Blueprint" &&
          isWarframeCategory &&
          components.length > 1
        )
      ) {
        components.push({
          name: displayName,
          uniqueName: compKey,
          vaulted: compStatus.vaulted,
          isMainItem: false,
          isBuiltPrime: isBuiltPrime,
          drops
        });
      }

      // If itemCount > 1, push additional copies.
      const totalCopies = copies ?? 1;

      for (let i = 1; i < totalCopies; i++) {
        let extraKey = baseKey;
        let ei = 1;

        while (seen.has(extraKey)) {
          extraKey = `${baseKey}_${ei++}`;
        }

        seen.add(extraKey);

        components.push({
          name: displayName,
          uniqueName: extraKey,
          vaulted: compStatus.vaulted,
          isMainItem: false,
          isBuiltPrime: isBuiltPrime,
          drops
        });
      }
    });
  }

  components.sort((a, b) => {
    if (a.isMainItem) return -1;
    if (b.isMainItem) return 1;

    const aOrder = PART_ORDER[a.name] ?? 99;
    const bOrder = PART_ORDER[b.name] ?? 99;

    if (aOrder !== bOrder) {
      return aOrder - bOrder;
    }

    return a.name.localeCompare(b.name);
  });

  return components;
}

export function normalizeRelicName(location) {
  if (!location) return null;

  let normalized = location
    .replace(/\s*\((Intact|Exceptional|Flawless|Radiant)\)\s*/gi, '')
    .replace(/\s*(Intact|Exceptional|Flawless|Radiant)\s*/gi, '')
    .replace(/\s+Relic\s*/gi, ' Relic')
    .replace(/\s*\(\s*\)\s*/g, '')
    .trim();

  if (!normalized.toLowerCase().endsWith('relic')) {
    normalized += ' Relic';
  }

  return normalized;
}

export async function loadResurgenceRelics() {
  const invoke = window.__TAURI_INTERNALS__.invoke;

  // 1. Check disk cache
  try {
    const cached = await invoke("load_resurgence_cache");
    if (cached && cached.expiry && new Date(cached.expiry) > new Date()) {
      // Cache is still valid — hydrate state and return
      state.resurgenceRelics = new Set(cached.relicNames);
      state.resurgenceExpiry = cached.expiry;
      return;
    }
  } catch (e) {
    console.warn("Could not read resurgence cache:", e);
  }

  // 2. Fetch from warframe API via existing fetch_json Rust proxy
  let apiData;
  try {
    apiData = await invoke("fetch_json", { url: VAULT_TRADER_URL });
  } catch (e) {
    console.error("Failed to fetch vaultTrader:", e);
    return;
  }

  const expiry = apiData?.expiry;
  const inventory = apiData?.inventory;
  if (!expiry || !Array.isArray(inventory)) return;

  // 3. Extract relic entries and normalize uniqueName
  // Strip "/Lotus/StoreItems/" → "/Lotus/" prefix pattern
  // Relic entries are identified by having null ducats (credits-only)
  // and a uniqueName path under Types/Game/Projections/
  const resurgenceNames = [];

  for (const entry of inventory) {
    const un = entry.uniqueName;
    if (!un || !un.includes("/Game/Projections/")) continue;

    // Normalize: remove the extra "StoreItems/" segment
    // "/Lotus/StoreItems/Types/Game/Projections/..."
    // → "/Lotus/Types/Game/Projections/..."
    const normalized = un.replace("/Lotus/StoreItems/", "/Lotus/");

    // Look up by uniqueName in relicRewardsMap to confirm it exists in WFCD
    // relicRewardsMap is keyed by display name ("lith a11 relic"), not uniqueName,
    // so we need to scan. Build a reverse lookup once.
    // (see Step 4 for the reverse map — kept separate to avoid bloating loadPrimes)
    resurgenceNames.push(normalized);
  }

  // 4. Resolve uniqueNames → display names via reverse map
  const matched = resolveResurgenceUniqueNames(resurgenceNames);  

  // 5. Hydrate state
  state.resurgenceRelics = new Set(matched);
  state.resurgenceExpiry = expiry;

  // 6. Persist to disk
  try {
    await invoke("save_resurgence_cache", {
      data: { expiry, relicNames: matched }
    });
  } catch (e) {
    console.error("Failed to save resurgence cache:", e);
  }
}

function resolveResurgenceUniqueNames(uniqueNames) {
  const matched = [];
  for (const un of uniqueNames) {
    const displayName = state.relicUniqueNameMap.get(un);
    if (displayName) matched.push(displayName);
    // else: uniqueName not found in WFCD data — silently skip
  }

  return matched;
}