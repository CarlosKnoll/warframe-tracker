// primes.js - Primes tracking logic
const invoke = window.__TAURI_INTERNALS__.invoke;

const RELICS_DROP_URL = "https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/relics.json";
const MISSION_REWARDS_URL = "https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/missionRewards.json";
const PRIME_URLS = {
  Warframe: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json",
  Primary: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Primary.json",
  Secondary: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Secondary.json",
  Melee: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Melee.json",
  "Arch-Gun": "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Gun.json",
  "Arch-Melee": "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Melee.json",
  Sentinel: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Sentinels.json",
  Archwing: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Archwing.json",
};

const FOUNDER_ITEMS = ["Excalibur Prime", "Lato Prime", "Skana Prime"];

let allPrimes = [];
let primeSearchText = "";
let primesCategory = "All";
let primeVaultStatus = "All";
let showFounderItems = true;
let showSpecialItems = true;
let owned = {};
let ignoredPrimes = new Set();
let saveFunction = null;

let farmableRelics = new Set();
let relicRewardsMap = new Map(); // Maps relic name to its rewards with accurate rarities

function hasRelicDrops(prime) {
  if (!prime.components || prime.components.length === 0) return false;
  for (const comp of prime.components) {
    if (comp.drops && comp.drops.length > 0) {
      for (const drop of comp.drops) {
        if (drop.location && drop.location.toLowerCase().includes('relic')) {
          return true;
        }
      }
    }
  }
  return false;
}

export async function initPrimes(ownedData, ignoredData, saveFn) {
  owned = ownedData;
  ignoredPrimes = ignoredData;
  saveFunction = saveFn;
  
  // Show loading indicator
  const primeList = document.getElementById("primeList");
  primeList.innerHTML = '<div style="text-align: center; padding: 40px; opacity: 0.6;">Loading primes data...</div>';
  
  const searchInput = document.getElementById("primeSearch");
  const clearBtn = document.getElementById("clearPrimeSearch");
  
  searchInput.oninput = e => {
    primeSearchText = e.target.value.toLowerCase();
    clearBtn.style.display = primeSearchText ? 'block' : 'none';
    renderPrimes();
  };
  
  clearBtn.onclick = () => {
    searchInput.value = '';
    primeSearchText = '';
    clearBtn.style.display = 'none';
    renderPrimes();
  };
  
  // Initialize clear button visibility
  clearBtn.style.display = 'none';
  
  document.querySelectorAll("#primeFilters button").forEach(btn => {
    btn.onclick = () => {
      primesCategory = btn.dataset.cat;
      document.querySelectorAll("#primeFilters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPrimes();
    };
  });
  
  document.querySelectorAll("#primeVaultFilter button").forEach(btn => {
    btn.onclick = () => {
      primeVaultStatus = btn.dataset.vault;
      document.querySelectorAll("#primeVaultFilter button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderPrimes();
    };
  });
  
  document.getElementById("founderToggle").onclick = (e) => {
    showFounderItems = e.target.checked;
    renderPrimes();
  };
  
  document.getElementById("specialToggle").onclick = (e) => {
    showSpecialItems = e.target.checked;
    renderPrimes();
  };
  
  await loadPrimes();
  
  document.getElementById("founderToggle").checked = showFounderItems;
  document.getElementById("specialToggle").checked = showSpecialItems;
  clearBtn.style.display = 'none';
  
  // Hide empty category filters
  updateCategoryFilters();
  
  renderPrimes();
}

async function loadPrimes() {
  try {
    const primeData = [];
    
    farmableRelics = new Set();
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
                      farmableRelics.add(relicName.toLowerCase());
                    }
                  };
                });
              }
            });
          }
        });
      });
    } catch (err) {
      console.error("Error loading mission rewards data:", err);
    }
    
    // Load relic rewards with accurate rarities based on drop chances
    relicRewardsMap = new Map();
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
            // Determine rarity based on drop chance
            // Common: ~25.33% (3 items), Uncommon: ~11% (2 items), Rare: ~2% (1 item)
            let rarity = 'Common';
            if (reward.chance <= 3) {
              rarity = 'Rare';
            } else if (reward.chance <= 12) {
              rarity = 'Uncommon';
            }
            
            return {
              itemName: reward.itemName,
              rarity: rarity,
              chance: reward.chance
            };
          });
          
          relicRewardsMap.set(normalizedName, rewardsWithRarity);
        }
      });
    } catch (err) {
      console.error("Error loading relics data:", err);
    }
    
    // Fetch all categories in parallel for faster loading
    const categoryPromises = Object.entries(PRIME_URLS).map(async ([category, url]) => {
      try {
        const res = await fetch(url);
        const items = await res.json();
        
        const primes = items.filter(item => 
          item.name && 
          item.name.includes("Prime") && 
          item.isPrime === true
        ).map(item => {
          const vaultStatus = checkPrimeVaultStatus(item, farmableRelics);
          
          return {
            ...item,
            category: category,
            vaulted: vaultStatus.vaulted,
            resurgence: false, // Removed resurgence categorization
            components: extractPrimeComponents(item, vaultStatus, farmableRelics)
          };
        });
        
        return primes;
      } catch (err) {
        console.error(`Error loading ${category}:`, err);
        return [];
      }
    });
    
    const results = await Promise.all(categoryPromises);
    results.forEach(primes => primeData.push(...primes));
    
    allPrimes = primeData;
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
    
    // Simplified: either available (in mission drops) or vaulted (not in mission drops)
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
  
  // Determine if this is a Warframe/Archwing/Sentinel category (which uses "Owned" instead of "Blueprint")
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
  
  if (item.components && Array.isArray(item.components)) {
    item.components.forEach(comp => {
      if (comp.name && (
        comp.name.includes("Orokin Cell") || 
        comp.name.includes("Argon Crystal") ||
        comp.name.includes("Neural Sensors") ||
        comp.name.includes("Neurodes") ||
        comp.name.includes("Gallium") ||
        comp.name.includes("Ferrite") ||
        comp.name.includes("Plastids") ||
        comp.name.includes("Nano Spores") ||
        comp.name.includes("Alloy Plate") ||
        comp.name.includes("Polymer Bundle") ||
        comp.name.includes("Rubedo") ||
        comp.name.includes("Salvage") ||
        comp.name.includes("Credits") ||
        comp.name.includes("Nitain Extract")
      )) {
        return;
      }
      
      const compKey = comp.uniqueName || `${item.uniqueName}_${comp.name}`;
      
      if (seen.has(compKey)) return;
      seen.add(compKey);
      
      // Only skip Blueprint for Warframe/Archwing/Sentinel categories
      if (comp.name === "Blueprint" && isWarframeCategory && components.length > 1) {
        return;
      }
      
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

export function renderPrimes() {
  const list = document.getElementById("primeList");
  list.innerHTML = "";

  const filtered = allPrimes.filter(p => {
    const isFounder = FOUNDER_ITEMS.includes(p.name);
    const isSpecial = !isFounder && !hasRelicDrops(p);
    
    if (!showFounderItems && isFounder) return false;
    if (!showSpecialItems && isSpecial) return false;
    
    const nameMatch = p.name.toLowerCase().includes(primeSearchText);
    const catMatch = primesCategory === "All" || p.category === primesCategory;
    
    let vaultMatch = true;
    if (primeVaultStatus === "Available") {
      vaultMatch = !p.vaulted;
    } else if (primeVaultStatus === "Vaulted") {
      vaultMatch = p.vaulted === true;
    }
    // Removed "Resurgence" filter option
    
    return nameMatch && catMatch && vaultMatch;
  });

  const incomplete = [];
  const completeTradeable = [];
  const completeNonTradeable = [];
  
  filtered.forEach(p => {
    const isIgnored = ignoredPrimes.has(p.uniqueName);
    const ownedComp = p.components.find(c => c.isMainItem);
    const isOwned = ownedComp && (owned[ownedComp.uniqueName] ?? 0) > 0;
    
    if (isOwned || isIgnored) {
      // Check if it's tradeable (owned + all components checked)
      const nonOwnedComponents = p.components.filter(c => !c.isMainItem);
      const allComponentsChecked = nonOwnedComponents.length > 0 && 
        nonOwnedComponents.every(c => (owned[c.uniqueName] ?? 0) > 0);
      const hasTradeableSet = isOwned && allComponentsChecked;
      
      if (hasTradeableSet) {
        completeTradeable.push(p);
      } else {
        completeNonTradeable.push(p);
      }
    } else {
      incomplete.push(p);
    }
  });

  const fragment = document.createDocumentFragment();

  [...incomplete, ...completeTradeable, ...completeNonTradeable].forEach(p => {
    const isIgnored = ignoredPrimes.has(p.uniqueName);
    const ownedComp = p.components.find(c => c.isMainItem);
    const isOwned = ownedComp && (owned[ownedComp.uniqueName] ?? 0) > 0;
    const isComplete = isOwned || isIgnored;
    
    // Check if all non-owned components are checked (indicating a complete set for trade)
    const nonOwnedComponents = p.components.filter(c => !c.isMainItem);
    const allComponentsChecked = nonOwnedComponents.length > 0 && 
      nonOwnedComponents.every(c => (owned[c.uniqueName] ?? 0) > 0);
    const hasTradeableSet = isOwned && allComponentsChecked;
    
    const isFounder = FOUNDER_ITEMS.includes(p.name);
    const isSpecial = !isFounder && !hasRelicDrops(p);

    const row = document.createElement("div");
    row.className = isComplete ? "prime complete" : "prime";
    if (hasTradeableSet) {
      row.classList.add("tradeable");
    }

    const founderBadge = isFounder ? '<span class="founder-badge">FOUNDER</span>' : '';
    const specialBadge = isSpecial ? '<span class="special-badge">SPECIAL</span>' : '';
    const vaultBadge = (p.vaulted && !isFounder && !isSpecial) ? '<span class="vaulted-badge">VAULTED</span>' : '';
    const ignoredLabel = isIgnored ? '<span class="ignored-label">(Ignored)</span>' : '';
    const tradeableBadge = hasTradeableSet ? '<span class="tradeable-badge">TRADEABLE SET</span>' : '';

    row.innerHTML = `
      <div class="prime-header">
        <strong>${p.name}</strong>
        ${founderBadge}
        ${specialBadge}
        ${vaultBadge}
        ${tradeableBadge}
        ${ignoredLabel}
        <span class="prime-category">${p.category}</span>
        ${(isFounder || isSpecial) ? `<button class="ignore-btn" data-unique="${p.uniqueName}">${isIgnored ? 'Unignore' : 'Ignore'}</button>` : ''}
        <button class="expand-btn" data-unique="${p.uniqueName}">▼</button>
      </div>
      <div class="prime-components">
        ${p.components.map(comp => {
          const have = (owned[comp.uniqueName] ?? 0) > 0;
          return `
            <label class="component ${have ? 'owned' : ''} ${comp.isMainItem ? 'main-item' : ''}">
              <input type="checkbox" ${have ? 'checked' : ''} data-unique="${comp.uniqueName}" />
              <span>${comp.name}</span>
            </label>
          `;
        }).join('')}
      </div>
      <div class="drop-table" style="display: none;" data-unique="${p.uniqueName}" data-loaded="false"></div>
    `;

    const expandBtn = row.querySelector('.expand-btn');
    const dropTable = row.querySelector('.drop-table');
    expandBtn.onclick = () => {
      const isExpanded = dropTable.style.display === 'block';
      
      if (!isExpanded && dropTable.dataset.loaded === 'false') {
        // Lazy load the drop table content only when first expanded
        dropTable.innerHTML = buildDropTable(p);
        dropTable.dataset.loaded = 'true';
      }
      
      dropTable.style.display = isExpanded ? 'none' : 'block';
      expandBtn.textContent = isExpanded ? '▼' : '▲';
    };

    const ignoreBtn = row.querySelector('.ignore-btn');
    if (ignoreBtn) {
      ignoreBtn.onclick = async () => {
        if (ignoredPrimes.has(p.uniqueName)) {
          ignoredPrimes.delete(p.uniqueName);
        } else {
          ignoredPrimes.add(p.uniqueName);
        }
        await saveFunction();
        renderPrimes();
      };
    }

    const checkboxes = row.querySelectorAll('input[type="checkbox"]');
    checkboxes.forEach(checkbox => {
      checkbox.onchange = async (e) => {
        const uniqueName = e.target.dataset.unique;
        owned[uniqueName] = e.target.checked ? 1 : 0;
        try {
          await saveFunction();
          renderPrimes();
        } catch (err) {
          console.error("Save failed:", err);
          alert("Failed to save data: " + err);
        }
      };
    });

    fragment.appendChild(row);
  });
  
  list.appendChild(fragment);
}

function normalizeRelicName(location) {
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

function buildDropTable(prime) {
  const farmableRows = [];
  const vaultedRows = [];
  
  prime.components.forEach(comp => {
    if (comp.drops && comp.drops.length > 0) {
      const relicData = new Map();
      
      comp.drops.forEach(drop => {
        if (!drop.location) return;
        
        const relicName = normalizeRelicName(drop.location);
        if (!relicName || relicName === '') return;
        
        if (!relicData.has(relicName)) {
          const relicLower = relicName.toLowerCase();
          const isFarmable = isRelicActive(relicLower, farmableRelics);
          
          // Look up accurate rarity from relicRewardsMap
          let rarity = 'Unknown';
          const relicRewards = relicRewardsMap.get(relicLower);
          if (relicRewards) {
            // More efficient search - check if comp name is in item name
            const compNameLower = comp.name.toLowerCase();
            const reward = relicRewards.find(r => 
              r.itemName && r.itemName.toLowerCase().includes(compNameLower)
            );
            if (reward) {
              rarity = reward.rarity;
            }
          }
          
          // If still unknown, try fallback to original drop rarity
          if (rarity === 'Unknown' && drop.rarity) {
            rarity = drop.rarity;
          }
          
          relicData.set(relicName, {
            name: relicName,
            rarity: rarity,
            status: isFarmable ? 'farmable' : 'vaulted'
          });
        }
      });
      
      relicData.forEach(relic => {
        const row = {
          partName: comp.name,
          relicName: relic.name,
          rarity: relic.rarity
        };
        
        if (relic.status === 'farmable') {
          farmableRows.push(row);
        } else {
          vaultedRows.push(row);
        }
      });
    }
  });
  
  if (farmableRows.length === 0 && vaultedRows.length === 0) {
    return '<div class="drop-tables-container"><p class="no-drops">No relic data available</p></div>';
  }
  
  // Sort by part name first, then by relic name
  farmableRows.sort((a, b) => {
    const partCompare = a.partName.localeCompare(b.partName);
    return partCompare !== 0 ? partCompare : a.relicName.localeCompare(b.relicName);
  });
  vaultedRows.sort((a, b) => {
    const partCompare = a.partName.localeCompare(b.partName);
    return partCompare !== 0 ? partCompare : a.relicName.localeCompare(b.relicName);
  });
  
  let html = '<div class="drop-tables-container">';
  
  if (farmableRows.length > 0) {
    html += `
      <div class="drop-table-wrapper farmable">
        <h4>Available Relics (${farmableRows.length})</h4>
        <table>
          <thead>
            <tr>
              <th>Part</th>
              <th>Relic</th>
              <th>Rarity</th>
            </tr>
          </thead>
          <tbody>
            ${farmableRows.map(row => `
              <tr>
                <td class="part-name">${row.partName}</td>
                <td class="relic-name">${row.relicName}</td>
                <td class="rarity rarity-${row.rarity.toLowerCase()}">${row.rarity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  if (vaultedRows.length > 0) {
    html += `
      <div class="drop-table-wrapper vaulted">
        <h4>Vaulted Relics (${vaultedRows.length})</h4>
        <table>
          <thead>
            <tr>
              <th>Part</th>
              <th>Relic</th>
              <th>Rarity</th>
            </tr>
          </thead>
          <tbody>
            ${vaultedRows.map(row => `
              <tr>
                <td class="part-name">${row.partName}</td>
                <td class="relic-name vaulted-relic">${row.relicName}</td>
                <td class="rarity rarity-${row.rarity.toLowerCase()}">${row.rarity}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  }
  
  html += '</div>';
  return html;
}

export function updatePrimeOwned(uniqueName, value) {
  owned[uniqueName] = value;
}

export function togglePrimeIgnore(uniqueName) {
  if (ignoredPrimes.has(uniqueName)) {
    ignoredPrimes.delete(uniqueName);
  } else {
    ignoredPrimes.add(uniqueName);
  }
}

function updateCategoryFilters() {
  // Count items in each category
  const categoryCounts = {};
  allPrimes.forEach(prime => {
    categoryCounts[prime.category] = (categoryCounts[prime.category] || 0) + 1;
  });
  
  // Hide filter buttons for empty categories
  document.querySelectorAll("#primeFilters button").forEach(btn => {
    const category = btn.dataset.cat;
    if (category === "All") {
      btn.style.display = "inline-block";
    } else {
      const count = categoryCounts[category] || 0;
      btn.style.display = count > 0 ? "inline-block" : "none";
    }
  });
}