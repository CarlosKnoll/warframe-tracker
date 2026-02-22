// primes/loader.js - All data fetching and processing logic

import { state, RELICS_DROP_URL, MISSION_REWARDS_URL, PRIME_URLS } from './state.js';

export async function loadPrimes() {
  try {
    const primeData = [];

    state.farmableRelics = new Set();
    try {
      const missionsRes = await fetch(MISSION_REWARDS_URL);
      const missionsData = await missionsRes.json();

      const missions = missionsData.missionRewards || {};
      Object.values(missions).forEach(planet => {
        Object.values(planet).forEach(mission => {
          if (mission.rewards) {
            ['A', 'B', 'C'].forEach(rotation => {
              if (mission.rewards[rotation]) {
                mission.rewards[rotation].forEach(reward => {
                  if (reward.itemName && reward.itemName.toLowerCase().includes('relic')) {
                    const relicName = normalizeRelicName(reward.itemName);
                    if (relicName) {
                      state.farmableRelics.add(relicName.toLowerCase());
                    }
                  }
                });
              }
            });
          }
        });
      });
    } catch (err) {
      console.error("Error loading mission rewards data:", err);
    }

    state.relicRewardsMap = new Map();
    try {
      const relicsRes = await fetch(RELICS_DROP_URL);
      const relicsJson = await relicsRes.json();
      const relicsData = relicsJson.relics || [];

      const intactRelics = relicsData.filter(relic => relic.state === 'Intact');

      intactRelics.forEach(relic => {
        const relicName = `${relic.tier} ${relic.relicName} Relic`;
        const normalizedName = relicName.toLowerCase();

        if (relic.rewards && Array.isArray(relic.rewards)) {
          const rewardsWithRarity = relic.rewards.map(reward => {
            // Common: ~25.33%, Uncommon: ~11%, Rare: ~2%
            let rarity = 'Common';
            if (reward.chance <= 3) rarity = 'Rare';
            else if (reward.chance <= 12) rarity = 'Uncommon';

            return { itemName: reward.itemName, rarity, chance: reward.chance };
          });

          state.relicRewardsMap.set(normalizedName, rewardsWithRarity);
        }
      });
    } catch (err) {
      console.error("Error loading relics data:", err);
    }

    const categoryPromises = Object.entries(PRIME_URLS).map(async ([category, url]) => {
      try {
        const res = await fetch(url);
        const items = await res.json();

        return items
          .filter(item => item.name && item.name.includes("Prime") && item.isPrime === true)
          .map(item => {
            const vaultStatus = checkPrimeVaultStatus(item, state.farmableRelics);
            return {
              ...item,
              category,
              vaulted: vaultStatus.vaulted,
              resurgence: false,
              components: extractPrimeComponents(item, vaultStatus, state.farmableRelics)
            };
          });
      } catch (err) {
        console.error(`Error loading ${category}:`, err);
        return [];
      }
    });

    const results = await Promise.all(categoryPromises);
    results.forEach(primes => primeData.push(...primes));

    state.allPrimes = primeData;
  } catch (err) {
    console.error("Error loading primes:", err);
  }
}

function checkPrimeVaultStatus(item, farmableRelics) {
  if (item.components && Array.isArray(item.components)) {
    let hasFarmableRelic = false;
    let hasAnyRelic = false;

    for (const comp of item.components) {
      if (comp.drops && comp.drops.length > 0) {
        for (const drop of comp.drops) {
          if (drop.location && drop.location.toLowerCase().includes('relic')) {
            const normalizedRelic = normalizeRelicName(drop.location);
            if (!normalizedRelic) continue;

            hasAnyRelic = true;
            const relicLower = normalizedRelic.toLowerCase();

            if (isRelicActive(relicLower, farmableRelics)) {
              hasFarmableRelic = true;
              break;
            }
          }
        }
      }
      if (hasFarmableRelic) break;
    }

    return { vaulted: !hasFarmableRelic && hasAnyRelic };
  }

  return { vaulted: true };
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
      if (comp.name && EXCLUDED_COMPONENTS.some(ex => comp.name.includes(ex))) return;

      const compKey = comp.uniqueName || `${item.uniqueName}_${comp.name}`;
      if (seen.has(compKey)) return;
      seen.add(compKey);

      if (comp.name === "Blueprint" && isWarframeCategory && components.length > 1) return;

      let compStatus = { vaulted: vaultStatus.vaulted };
      if (comp.drops && comp.drops.length > 0) {
        compStatus = checkPrimeVaultStatus({ components: [comp] }, farmableRelics);
      }

      components.push({
        name: comp.name || "Component",
        uniqueName: compKey,
        vaulted: compStatus.vaulted,
        isMainItem: false,
        drops: comp.drops || []
      });
    });
  }

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