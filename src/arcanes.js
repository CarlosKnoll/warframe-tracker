// arcanes.js - Arcanes tracking logic
const invoke = window.__TAURI_INTERNALS__.invoke;

const ARCANE_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arcanes.json";

let allArcanes = [];
let searchText = "";
let activeCategory = "All";
let activeDropSource = "All";
let owned = {};
let saveFunction = null;

export async function initArcanes(ownedData, saveFn) {
  owned = ownedData;
  saveFunction = saveFn;
  
  const searchInput = document.getElementById("search");
  const clearBtn = document.getElementById("clearSearch");
  
  searchInput.oninput = e => {
    searchText = e.target.value.toLowerCase();
    clearBtn.style.display = searchText ? 'block' : 'none';
    renderArcanes();
  };
  
  clearBtn.onclick = () => {
    searchInput.value = '';
    searchText = '';
    clearBtn.style.display = 'none';
    renderArcanes();
  };
  
  // Initialize clear button visibility
  clearBtn.style.display = 'none';
  
  document.querySelectorAll("#filters button").forEach(btn => {
    btn.onclick = () => {
      activeCategory = btn.dataset.cat;
      activeDropSource = "All";
      
      document.querySelectorAll("#filters button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      
      updateDropSourceFilters();
      renderArcanes();
    };
  });
  
  await loadArcanes();
  renderArcanes();
}

async function loadArcanes() {
  try {
    const arcaneRes = await fetch(ARCANE_URL);
    const rawArcanes = await arcaneRes.json();
    
    let customDrops = {};
    try {
      customDrops = await invoke("load_custom_drops");
    } catch (err) {
      console.error("Error loading custom drop data:", err);
    }
    
    const arcanes = rawArcanes
      .filter(isValidArcane)
      .reduce((acc, arcane) => {
        const exactMatch = acc.find(a => a.uniqueName === arcane.uniqueName);
        if (exactMatch) {
          const existingDrops = exactMatch.drops?.length || 0;
          const newDrops = arcane.drops?.length || 0;
          if (newDrops > existingDrops) {
            const index = acc.indexOf(exactMatch);
            acc[index] = arcane;
          }
          return acc;
        }
        
        const nameMatch = acc.find(a => a.name === arcane.name);
        if (nameMatch) {
          if (arcane.drops && arcane.drops.length > 0) {
            nameMatch.drops = [...(nameMatch.drops || []), ...arcane.drops];
          }
          if (arcane.levelStats && (!nameMatch.levelStats || arcane.levelStats.length > nameMatch.levelStats.length)) {
            nameMatch.levelStats = arcane.levelStats;
          }
          return acc;
        }
        
        acc.push(arcane);
        return acc;
      }, [])
      .map(arcane => {
        const customData = customDrops[arcane.name];
        if (customData) {
          // Start with API drops (could be empty, could have data)
          let mergedDrops = arcane.drops || [];
          
          // Add custom drops if they exist
          if (customData.drops && customData.drops.length > 0) {
            mergedDrops = [...mergedDrops, ...customData.drops];
          }
          
          // Assign the merged drops back
          arcane.drops = mergedDrops;
          
          // Only use custom type if API type is missing or generic "Arcanes"
          if (customData.type && (!arcane.type || arcane.type === "Arcanes")) {
            arcane.type = customData.type;
          }
          
          // Only add release info if it exists in custom data
          if (customData.releaseDate || customData.updateName) {
            if (!arcane.patchlogs) arcane.patchlogs = [];
            arcane.patchlogs.push({
              name: customData.updateName || "Custom Entry",
              date: customData.releaseDate || new Date().toISOString(),
              url: "", 
              additions: "", 
              changes: "", 
              fixes: ""
            });
          }
        }
        return arcane;
      });

    // Add custom-only arcanes that don't exist in the API
    Object.keys(customDrops).forEach(arcaneName => {
      const existsInAPI = arcanes.find(a => a.name === arcaneName);
      if (!existsInAPI) {
        const customData = customDrops[arcaneName];
        // Filter out unknown drops from custom data
        const validDrops = customData.drops ? customData.drops.filter(drop => 
          drop && drop.location && drop.location !== "???"
        ) : [];
        
        // Only add if it has valid drops AND a type
        if (validDrops.length > 0 && customData.type) {
          const newArcane = {
            name: arcaneName,
            uniqueName: `/Lotus/Upgrades/Mods/Warframe/${arcaneName.replace(/\s+/g, '')}`,
            type: customData.type,
            drops: validDrops,
            levelStats: null,
            maxRank: 5
          };
          
          if (customData.releaseDate || customData.updateName) {
            newArcane.patchlogs = [{
              name: customData.updateName || "Custom Entry",
              date: customData.releaseDate || new Date().toISOString(),
              url: "", 
              additions: "", 
              changes: "", 
              fixes: ""
            }];
          }
          
          arcanes.push(newArcane);
        }
      }
    });

    // Final filter: Remove any arcanes that ONLY have "???" drops or no drops at all
    allArcanes = arcanes.filter(arcane => {
      // If no drops, keep it (might be obtainable through other means)
      if (!arcane.drops || arcane.drops.length === 0) return true;
      
      // If all drops are "???", filter it out
      const hasValidDrop = arcane.drops.some(drop => 
        drop && drop.location && drop.location !== "???"
      );
      
      return hasValidDrop;
    });
    updateDropSourceFilters();
  } catch (err) {
    console.error("Error loading arcanes:", err);
  }
}

function updateDropSourceFilters() {
  const dropFiltersDiv = document.getElementById("dropFilters");
  
  if (activeCategory === "All") {
    dropFiltersDiv.style.display = "none";
    return;
  }
  
  const categoryArcanes = allArcanes.filter(a => {
    const cat = getArcaneCategory(a);
    return cat === activeCategory;
  });
  
  const dropSources = new Set();
  categoryArcanes.forEach(arcane => {
    if (arcane.drops && Array.isArray(arcane.drops)) {
      arcane.drops.forEach(drop => {
        if (drop.location) {
          const source = parseDropSource(drop.location);
          if (source) dropSources.add(source);
        }
      });
    }
  });
  
  const sortedSources = Array.from(dropSources).sort();
  
  if (sortedSources.length === 0) {
    dropFiltersDiv.style.display = "none";
    return;
  }
  
  dropFiltersDiv.style.display = "block";
  dropFiltersDiv.innerHTML = `
    <label>Drop Source:</label>
    <button data-source="All" class="${activeDropSource === 'All' ? 'active' : ''}">All</button>
    ${sortedSources.map(source => 
      `<button data-source="${source}" class="${activeDropSource === source ? 'active' : ''}">${source}</button>`
    ).join('')}
  `;
  
  dropFiltersDiv.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      activeDropSource = btn.dataset.source;
      dropFiltersDiv.querySelectorAll("button").forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      renderArcanes();
    };
  });
}

function parseDropSource(location) {
  const loc = location.toLowerCase();
  if (loc.includes('arbitrations')) return 'Arbitrations';
  if (loc.includes('sister of parvos')) return 'Ascension';
  if (loc.includes('deep archimedea')) return 'Cavia';
  if (loc.includes('netracell')) return 'Cavia';
  if (loc.includes('whisper')) return 'Cavia';
  if (loc.includes('circulus') || loc.includes('conjunction')) return 'Conjunction Survival';
  if (loc.includes('descendia')) return 'Descendia';
  if (loc.includes('isolation vault')) return 'Isolation Vaults';
  if (loc.includes('duviri') && !loc.includes('undercroft')) return 'Duviri';
  if (loc.includes('eidolon')) return 'Eidolons';
  if (loc.includes('cathédrale')) return 'La Cathédrale';
  if (loc.includes('tyana') || loc.includes('mirror defense')) return 'Mirror Defense';
  if (loc.includes('perita')) return 'Perita Rebellion';
  if (loc.includes('ostron')) return 'Ostron';
  if (loc.includes('operational supply')) return 'Plague Star';
  if (loc.includes('the quills')) return 'The Quills';
  if (loc.includes('angst') || loc.includes('malice') || loc.includes('mania') || loc.includes('misery') || loc.includes('torment') || loc.includes('violence')) return 'Steel Path';
  if (loc.includes('solaris united')) return 'Solaris United';
  if (loc.includes('vox solaris')) return 'Vox Solaris';
  if (loc.includes('höllvania')) return 'The Hex';
  if (loc.includes('h-09')) return 'The Hex';
  if (loc.includes('scaldra')) return 'The Hex';
  if (loc.includes('temporal archimedea')) return 'The Hex';
  if (loc.includes('thrax')) return 'Zariman';
  if (loc.includes('void angel')) return 'Zariman';
  if (loc.includes('holdfasts')) return 'Zariman';
  return null;
}

export function renderArcanes() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const filtered = allArcanes.filter(a => {
    const nameMatch = a.name.toLowerCase().includes(searchText);
    const cat = getArcaneCategory(a);
    const catMatch = activeCategory === "All" || cat === activeCategory;
    
    let dropMatch = activeDropSource === "All";
    if (!dropMatch && a.drops && Array.isArray(a.drops)) {
      const dropsFromSelected = a.drops.some(drop => {
        if (!drop.location) return false;
        const source = parseDropSource(drop.location);
        return source === activeDropSource;
      });
      
      if (activeDropSource === "Duviri" && dropsFromSelected) {
        const dropsFromOthers = a.drops.some(drop => {
          if (!drop.location) return false;
          const source = parseDropSource(drop.location);
          if (source === null) return false;
          return source !== "Duviri";
        });
        dropMatch = !dropsFromOthers;
      } else {
        dropMatch = dropsFromSelected;
      }
    }
    
    return nameMatch && catMatch && dropMatch;
  });

  const incomplete = [];
  const complete = [];
  
  filtered.forEach(a => {
    const have = owned[a.uniqueName] ?? 0;
    const totalNeeded = getNeededCopies(a);
    if (have >= totalNeeded) {
      complete.push(a);
    } else {
      incomplete.push(a);
    }
  });

  const fragment = document.createDocumentFragment();

  [...incomplete, ...complete].forEach(a => {
    const have = owned[a.uniqueName] ?? 0;
    const totalNeeded = getNeededCopies(a);
    const needed = Math.max(0, totalNeeded - have);
    const isComplete = have >= totalNeeded;

    const row = document.createElement("div");
    row.className = isComplete ? "arcane complete" : "arcane";

    const category = getArcaneCategory(a);
    const dropInfo = getDropLocations(a);
    const releaseInfo = getArcaneReleaseInfo(a);
    const releaseDateStr = formatReleaseDate(releaseInfo.date);
    const releaseTooltip = releaseInfo.updateName || "Unknown update";
    const releaseDateHTML = releaseInfo.date 
      ? `<span class="release-date" title="${releaseTooltip}">${releaseDateStr}</span>`
      : '<span class="release-date"></span>';

    row.innerHTML = `
      <strong>${a.name}</strong>
      <span>${category}</span>
      ${releaseDateHTML}
      <input type="number" min="0" value="${have}" />
      <span>Need: ${needed}</span>
      <span class="drop-hint" title="${dropInfo}">📍</span>
    `;

    const input = row.querySelector("input");
    input.onchange = async (e) => {
      const newValue = Number(e.target.value);
      owned[a.uniqueName] = newValue;
      try {
        await saveFunction();
        renderArcanes();
      } catch (err) {
        console.error("Save failed:", err);
        alert("Failed to save data: " + err);
      }
    };

    fragment.appendChild(row);
  });
  
  list.appendChild(fragment);
}

function getDropLocations(arcane) {
  if (!arcane.drops || arcane.drops.length === 0) {
    return "No drop data available";
  }
  const drops = arcane.drops.slice(0, 10).map(d => `${d.location} (${d.chance.toFixed(2)}%)`).join('\n');
  const suffix = arcane.drops.length > 10 ? `\n... and ${arcane.drops.length - 10} more` : '';
  return drops + suffix;
}

function getNeededCopies(arcane) {
  if (arcane.levelStats && Array.isArray(arcane.levelStats)) {
    const maxRank = arcane.levelStats.length - 1;
    const n = maxRank + 1;
    return (n * (n + 1)) / 2;
  }
  if (typeof arcane.maxRank === "number") {
    const n = arcane.maxRank + 1;
    return (n * (n + 1)) / 2;
  }
  return 21;
}

function isValidArcane(a) {
  if (!a.name) return false;
  // Filter out the generic "Arcane" entry that's a placeholder
  if (a.name === "Arcane" && !a.type) return false;
  if (a.name === "Arcane" && a.type === "Arcane") return false;
  if (!a.uniqueName) return false;
  return true;
}

function getArcaneCategory(arcane) {
  if (!arcane.type) return "Unknown";
  const type = arcane.type.toLowerCase();
  if (type.includes("warframe")) return "Warframe";
  if (type.includes("operator") || type.includes("magus") || type.includes("emergence")) return "Operator";
  if (type.includes("amp") || type.includes("virtuos")) return "Amp";
  if (type.includes("tektolyst")) return "Tektolyst Artifact";
  if (type.includes("primary") || type.includes("bow arcane") || type.includes("shotgun arcane")) return "Primary";
  if (type.includes("secondary")) return "Secondary";
  if (type.includes("melee")) return "Melee";
  if (type.includes("kitgun") || type.includes("pax")) return "Kitgun";
  if (type.includes("zaw") || type.includes("exodia")) return "Zaw";
  return arcane.type;
}

function getArcaneReleaseInfo(arcane) {
  if (!arcane.patchlogs || arcane.patchlogs.length === 0) {
    return { date: null, updateName: null };
  }
  const firstMention = arcane.patchlogs[arcane.patchlogs.length - 1];
  return {
    date: new Date(firstMention.date),
    updateName: firstMention.name
  };
}

function formatReleaseDate(date) {
  if (!date) return "Unknown";
  const options = { year: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-US', options);
}

export function updateArcaneOwned(uniqueName, value) {
  owned[uniqueName] = value;
}