// Tauri v2 API access
const invoke = window.__TAURI_INTERNALS__.invoke;

const ARCANE_URL =
  "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arcanes.json";

let owned = {};
let allArcanes = [];
let searchText = "";
let activeCategory = "All";
let activeDropSource = "All";

document.getElementById("search").oninput = e => {
  searchText = e.target.value.toLowerCase();
  render();
};

// Category filter buttons
document.querySelectorAll("#filters button").forEach(btn => {
  btn.onclick = () => {
    activeCategory = btn.dataset.cat;
    activeDropSource = "All"; // Reset drop source when category changes
    
    document
      .querySelectorAll("#filters button")
      .forEach(b => b.classList.remove("active"));
    btn.classList.add("active");
    
    updateDropSourceFilters();
    render();
  };
});

async function init() {
  try {
    const arcaneRes = await fetch(ARCANE_URL);
    const rawArcanes = await arcaneRes.json();
    
    // Load custom drop data using Tauri command
    let customDrops = {};
    try {
      customDrops = await invoke("load_custom_drops");
      console.log("Loaded custom drops:", Object.keys(customDrops).length, "entries");
    } catch (err) {
      console.error("Error loading custom drop data:", err);
    }
    
    // Filter and deduplicate arcanes
    const arcanes = rawArcanes
      .filter(isValidArcane)
      .reduce((acc, arcane) => {
        // First check: deduplicate by exact uniqueName
        const exactMatch = acc.find(a => a.uniqueName === arcane.uniqueName);
        if (exactMatch) {
          // Keep the one with more drops or more complete data
          const existingDrops = exactMatch.drops?.length || 0;
          const newDrops = arcane.drops?.length || 0;
          if (newDrops > existingDrops) {
            const index = acc.indexOf(exactMatch);
            acc[index] = arcane;
          }
          return acc;
        }
        
        // Second check: merge variants with EXACTLY the same display name
        const nameMatch = acc.find(a => a.name === arcane.name);
        if (nameMatch) {
          // Merge drops from variants
          if (arcane.drops && arcane.drops.length > 0) {
            nameMatch.drops = [...(nameMatch.drops || []), ...arcane.drops];
          }
          
          // Keep the better levelStats (more ranks = better)
          if (arcane.levelStats && 
              (!nameMatch.levelStats || arcane.levelStats.length > nameMatch.levelStats.length)) {
            nameMatch.levelStats = arcane.levelStats;
          }
          
          return acc; // Skip adding duplicate
        }
        
        // No match found, add as new entry
        acc.push(arcane);
        return acc;
      }, [])
      .map(arcane => {
        // Merge custom drop data
        if (customDrops[arcane.name]) {
          console.log(`Applying custom data for: ${arcane.name}`);
          
          // Merge drops
          if (!arcane.drops || arcane.drops.length === 0) {
            arcane.drops = customDrops[arcane.name].drops;
          } else {
            arcane.drops = [...arcane.drops, ...customDrops[arcane.name].drops];
          }
          
          // Merge custom release info if provided
          if (customDrops[arcane.name].releaseDate || customDrops[arcane.name].updateName) {
            // Create a custom patchlog entry if it doesn't exist
            if (!arcane.patchlogs) {
              arcane.patchlogs = [];
            }
            
            // Add custom release info to the end (oldest position)
            arcane.patchlogs.push({
              name: customDrops[arcane.name].updateName || "Custom Entry",
              date: customDrops[arcane.name].releaseDate || new Date().toISOString(),
              url: "",
              additions: "",
              changes: "",
              fixes: ""
            });
          }
        }
        
        return arcane;
      })
      .filter(arcane => {
        // Filter out debug/test arcanes that only have "???" drops
        if (!arcane.drops || arcane.drops.length === 0) {
          return true; // Keep arcanes with no drops
        }
        
        // Check if ALL drops are "???"
        const allDropsAreUnknown = arcane.drops.every(drop => 
          drop.location === "???"
        );
        
        if (allDropsAreUnknown) {
          console.log(`Filtering out debug arcane: ${arcane.name}`);
          return false; // Remove this arcane
        }
        
        return true; // Keep this arcane
      });

    const stored = await invoke("load_owned");
    owned = stored.owned || {};
    allArcanes = arcanes;
    
    console.log(`Total arcanes loaded: ${arcanes.length}`);
    
    updateDropSourceFilters();
    render();
  } catch (err) {
    console.error("Initialization error:", err);
  }
}

function updateDropSourceFilters() {
  const dropFiltersDiv = document.getElementById("dropFilters");
  
  // Hide drop filters if "All" is selected
  if (activeCategory === "All") {
    dropFiltersDiv.style.display = "none";
    return;
  }
  
  // Get all arcanes in the current category
  const categoryArcanes = allArcanes.filter(a => {
    const cat = getArcaneCategory(a);
    return cat === activeCategory;
  });
  
  // Extract all unique drop sources from this category
  const dropSources = new Set();
  categoryArcanes.forEach(arcane => {
    if (arcane.drops && Array.isArray(arcane.drops)) {
      arcane.drops.forEach(drop => {
        if (drop.location) {
          // Parse the location to extract the main source
          const source = parseDropSource(drop.location);
          if (source) dropSources.add(source);
        }
      });
    }
  });
  
  // Sort alphabetically
  const sortedSources = Array.from(dropSources).sort();
  
  // Only show drop filters if there are sources
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
  
  // Add click handlers to new buttons
  dropFiltersDiv.querySelectorAll("button").forEach(btn => {
    btn.onclick = () => {
      activeDropSource = btn.dataset.source;
      dropFiltersDiv
        .querySelectorAll("button")
        .forEach(b => b.classList.remove("active"));
      btn.classList.add("active");
      render();
    };
  });
}

// Extract main source from location string with intelligent grouping
function parseDropSource(location) {
  const loc = location.toLowerCase();
  
  // Arbitrations
  if (loc.includes('arbitrations')) return 'Arbitrations';

  // Ascension
  if (loc.includes('sister of parvos')) return 'Ascension';

  // Cavia
  if (loc.includes('deep archimedea')) return 'Cavia';
  if (loc.includes('netracell')) return 'Cavia';
  if (loc.includes('whisper')) return 'Cavia';

  // Conjunction Survival
  if (loc.includes('circulus') || loc.includes('conjunction')) return 'Conjunction Survival';
  
  // Deimos (Isolation Vault)
  if (loc.includes('isolation vault')) return 'Isolation Vaults';

  // Group Duviri content (excluding Undercroft which has other content's arcanes)
  if (loc.includes('duviri') && !loc.includes('undercroft')) return 'Duviri';

  // Group all Eidolons together
  if (loc.includes('eidolon')) return 'Eidolons';

  // La Cathédrale
  if (loc.includes('cathédrale')) return 'La Cathédrale';

  // Mirror Defense
  if (loc.includes('tyana') || loc.includes('mirror defense')) return 'Mirror Defense';

  // Ostron
  if (loc.includes('ostron')) return 'Ostron';

  // Plague Star
  if (loc.includes('operational supply')) return 'Plague Star';

  // Quills
  if (loc.includes('the quills')) return 'The Quills';
  
  // Steel Path
  if (loc.includes('angst') || loc.includes('malice') || loc.includes('mania') || loc.includes('misery') || loc.includes('torment') || loc.includes('violence')) return 'Steel Path';

  // Solaris United
  if (loc.includes('solaris united')) return 'Solaris United';

  // Vox Solaris
  if (loc.includes('vox solaris')) return 'Vox Solaris';

  // Group all Höllvania content
  if (loc.includes('höllvania')) return 'The Hex';
  if (loc.includes('h-09')) return 'The Hex';
  if (loc.includes('scaldra')) return 'The Hex';
  if (loc.includes('temporal archimedea')) return 'The Hex';

  // Zariman
  if (loc.includes('thrax')) return 'Zariman';
  if (loc.includes('void angel')) return 'Zariman';
  if (loc.includes('holdfasts')) return 'Zariman';
  
  // If no match found, return null instead of extracting a generic source
  return null;
}

function render() {
  const list = document.getElementById("list");
  list.innerHTML = "";

  const filtered = allArcanes.filter(a => {
    // Name search
    const nameMatch = a.name.toLowerCase().includes(searchText);
    
    // Category filter
    const cat = getArcaneCategory(a);
    const catMatch = activeCategory === "All" || cat === activeCategory;
    
    // Drop source filter with exclusivity check
    let dropMatch = activeDropSource === "All";
    if (!dropMatch && a.drops && Array.isArray(a.drops)) {
      // Check if arcane drops from the selected source
      const dropsFromSelected = a.drops.some(drop => {
        if (!drop.location) return false;
        const source = parseDropSource(drop.location);
        return source === activeDropSource;
      });
      
      // For Duviri filter: only show if it EXCLUSIVELY drops from Duviri
      if (activeDropSource === "Duviri" && dropsFromSelected) {
        // Check if it drops from any non-Duviri source
        const dropsFromOthers = a.drops.some(drop => {
          if (!drop.location) return false;
          const source = parseDropSource(drop.location);
          // Ignore null sources (unmatched locations)
          if (source === null) return false;
          return source !== "Duviri";
        });
        dropMatch = !dropsFromOthers; // Only match if it doesn't drop from others
      } else {
        dropMatch = dropsFromSelected;
      }
    }
    
    return nameMatch && catMatch && dropMatch;
  });

  // Separate into incomplete and complete arrays (faster than sorting)
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

  // Use DocumentFragment for better performance
  const fragment = document.createDocumentFragment();

  // Render incomplete first, then complete
  [...incomplete, ...complete].forEach(a => {
    const have = owned[a.uniqueName] ?? 0;
    const totalNeeded = getNeededCopies(a);
    const needed = Math.max(0, totalNeeded - have);
    const isComplete = have >= totalNeeded;

    const row = document.createElement("div");
    row.className = isComplete ? "arcane complete" : "arcane";

    const category = getArcaneCategory(a);
    
    // Get drop locations for tooltip
    const dropInfo = getDropLocations(a);
    
    // Get release info
    const releaseInfo = getArcaneReleaseInfo(a);
    const releaseDateStr = formatReleaseDate(releaseInfo.date);
    const releaseTooltip = releaseInfo.updateName || "Unknown update";
    
    // Only show release date if we have the info
    const releaseDateHTML = releaseInfo.date 
      ? `<span class="release-date" title="${releaseTooltip}">${releaseDateStr}</span>`
      : '<span class="release-date"></span>'; // Empty span to maintain grid layout

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
      
      console.log(`Updated ${a.name} to ${newValue}`);
      
      try {
        const result = await save();
        console.log("Save result:", result);
        render();
      } catch (err) {
        console.error("Save failed:", err);
        alert("Failed to save data: " + err);
      }
    };

    fragment.appendChild(row);
  });
  
  list.appendChild(fragment);
}

// Get formatted drop locations for tooltip
function getDropLocations(arcane) {
  if (!arcane.drops || arcane.drops.length === 0) {
    return "No drop data available";
  }
  
  // Group by location and show chance
  const drops = arcane.drops
    .slice(0, 10) // Limit to first 10 to avoid huge tooltips
    .map(d => `${d.location} (${d.chance.toFixed(2)}%)`)
    .join('\n');
  
  const suffix = arcane.drops.length > 10 ? `\n... and ${arcane.drops.length - 10} more` : '';
  
  return drops + suffix;
}

// Compute needed copies based on actual levelStats from API
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

async function save() {
  try {
    const result = await invoke("save_owned", { data: { owned } });
    return result;
  } catch (err) {
    console.error("Save error:", err);
    throw err;
  }
}

function isValidArcane(a) {
  if (!a.name) return false;
  if (a.name === "Arcane") return false;
  // Filter out items that aren't actually arcanes
  if (!a.type || a.type === "Arcanes") return false;
  // Must have a uniqueName to be valid
  if (!a.uniqueName) return false;
  return true;
}

function getArcaneCategory(arcane) {
  if (!arcane.type) return "Unknown";
  
  const type = arcane.type.toLowerCase();
  
  if (type.includes("warframe")) return "Warframe";
  if (type.includes("primary") || type.includes("bow arcane") || type.includes("shotgun arcane")) return "Primary";
  if (type.includes("secondary")) return "Secondary";
  if (type.includes("melee")) return "Melee";
  if (type.includes("operator") || type.includes("magus") || type.includes("emergence")) return "Operator";
  if (type.includes("amp") || type.includes("virtuos")) return "Amp";
  if (type.includes("kitgun") || type.includes("pax")) return "Kitgun";
  if (type.includes("zaw") || type.includes("exodia")) return "Zaw";
  
  return arcane.type;
}

// Get arcane release date and update name from patchlogs
function getArcaneReleaseInfo(arcane) {
  if (!arcane.patchlogs || arcane.patchlogs.length === 0) {
    return { date: null, updateName: null };
  }
  
  // The last entry is usually the oldest (first introduction)
  const firstMention = arcane.patchlogs[arcane.patchlogs.length - 1];
  return {
    date: new Date(firstMention.date),
    updateName: firstMention.name
  };
}

// Format date for display
function formatReleaseDate(date) {
  if (!date) return "Unknown";
  
  const options = { year: 'numeric', month: 'short' };
  return date.toLocaleDateString('en-US', options);
}

init();