// arcanes.js - Arcanes tracking logic
const invoke = window.__TAURI_INTERNALS__.invoke;

import { t, tArcaneName, tDropSource, tLocation, getLanguage } from './i18n.js';
import { openArcaneModal } from './modal.js';

const log = (msg) => invoke("js_log", { message: msg });

const ARCANE_URL = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arcanes.json";
const WIKI_IMAGE_BASE = "https://wiki.warframe.com/images/thumb/";
const FALLBACK_IMAGE = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23151b2b'/%3E%3Ctext x='40' y='44' text-anchor='middle' font-size='28' fill='%23334'%3E✦%3C/text%3E%3C/svg%3E";

let allArcanes = [];
let searchText = "";
let activeCategory = "All";
let activeDropSource = "All";
let owned = {};
let saveFunction = null;

const localeMap = {
  'en': 'en',
  'pt': 'pt-BR',
};

function getWikiImageUrl(arcaneName, size = 300) {
  const filename = arcaneName.replace(/\s+/g, '') + '.png';
  return `${WIKI_IMAGE_BASE}${filename}/${size}px-${filename}`;
}



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
          let mergedDrops = arcane.drops || [];
          if (customData.drops && customData.drops.length > 0) {
            mergedDrops = [...mergedDrops, ...customData.drops];
          }
          arcane.drops = mergedDrops;
          if (customData.type && (!arcane.type || arcane.type === "Arcanes")) {
            arcane.type = customData.type;
          }
          if (customData.releaseDate || customData.updateName) {
            if (!arcane.patchlogs) arcane.patchlogs = [];
            arcane.patchlogs.push({
              name: customData.updateName || "Custom Entry",
              date: customData.releaseDate || new Date().toISOString(),
              url: "", additions: "", changes: "", fixes: ""
            });
          }
        }
        return arcane;
      });

    Object.keys(customDrops).forEach(arcaneName => {
      const existsInAPI = arcanes.find(a => a.name === arcaneName);
      if (!existsInAPI) {
        const customData = customDrops[arcaneName];
        const validDrops = customData.drops ? customData.drops.filter(drop =>
          drop && drop.location && drop.location !== "???"
        ) : [];
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
              url: "", additions: "", changes: "", fixes: ""
            }];
          }
          arcanes.push(newArcane);
        }
      }
    });

    allArcanes = arcanes.filter(arcane => {
      if (!arcane.drops || arcane.drops.length === 0) return true;
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

  const categoryArcanes = allArcanes.filter(a => getArcaneCategory(a) === activeCategory);

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
    <label>${t('filter.dropSource')}</label>
    <button data-source="All" class="${activeDropSource === 'All' ? 'active' : ''}">${t('filter.all')}</button>
    ${sortedSources.map(source =>
      `<button data-source="${source}" class="${activeDropSource === source ? 'active' : ''}">${tDropSource(source)}</button>`
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
    const translatedName = tArcaneName(a.name);
    const nameMatch = a.name.toLowerCase().includes(searchText) ||
                      translatedName.toLowerCase().includes(searchText);
    const cat = getArcaneCategory(a);
    const catMatch = activeCategory === "All" || cat === activeCategory;

    let dropMatch = activeDropSource === "All";
    if (!dropMatch && a.drops && Array.isArray(a.drops)) {
      const dropsFromSelected = a.drops.some(drop => {
        if (!drop.location) return false;
        return parseDropSource(drop.location) === activeDropSource;
      });
      if (activeDropSource === "Duviri" && dropsFromSelected) {
        const dropsFromOthers = a.drops.some(drop => {
          if (!drop.location) return false;
          const source = parseDropSource(drop.location);
          return source !== null && source !== "Duviri";
        });
        dropMatch = !dropsFromOthers;
      } else {
        dropMatch = dropsFromSelected;
      }
    }

    return nameMatch && catMatch && dropMatch;
  })
  .sort((a, b) => tArcaneName(a.name).localeCompare(tArcaneName(b.name), localeMap[getLanguage()] ?? getLanguage()));

  const incomplete = [];
  const complete = [];

  filtered.forEach(a => {
    const have = owned[a.uniqueName] ?? 0;
    const totalNeeded = getNeededCopies(a);
    if (have >= totalNeeded) complete.push(a);
    else incomplete.push(a);
  });

  const fragment = document.createDocumentFragment();

  [...incomplete, ...complete].forEach(a => {
    const have = owned[a.uniqueName] ?? 0;
    const totalNeeded = getNeededCopies(a);
    const isComplete = have >= totalNeeded;
    const displayName = tArcaneName(a.name);

    const card = document.createElement("div");
    card.className = isComplete ? "arcane-card complete" : "arcane-card";
    card.dataset.unique = a.uniqueName;

    card.innerHTML = `
      <div class="arcane-card-image"></div>
      <div class="arcane-card-name">${displayName}</div>
      <div class="arcane-card-input">
        <button class="arcane-counter-btn" data-action="dec">−</button>
        <span class="arcane-counter-display" title="${t('label.owned')}">${have}/${totalNeeded}</span>
        <button class="arcane-counter-btn" data-action="inc">+</button>
      </div>
    `;

    const imageContainer = card.querySelector('.arcane-card-image');
    if (!imageContainer) {
      console.error('arcane-card-image not found for', a.name);
      return;
    }

    const imgEl = document.createElement('img');
    imgEl.alt = displayName;
    imgEl.loading = 'lazy';
    imgEl.style.opacity = '0';
    imgEl.style.transition = 'opacity 0.2s';
    imgEl.onload = () => { imgEl.style.opacity = '1'; };
    imgEl.onerror = () => { imgEl.src = FALLBACK_IMAGE; imgEl.style.opacity = '1'; };
    imgEl.src = getWikiImageUrl(a.name);
    imageContainer.appendChild(imgEl);

    // Click image to open detail modal
    imageContainer.onclick = () => {
      openArcaneModal({
        name: displayName,
        imageUrl: getWikiImageUrl(a.name),
        dropInfo: getDropLocations(a),
        owned: owned[a.uniqueName] ?? 0,
        totalNeeded,
        uniqueName: a.uniqueName,
        onOwnedChange: async (uniqueName, val) => {
          owned[uniqueName] = val;
          try {
            await saveFunction();
            // Update just the card counter display without rebuilding the grid
            const card = document.querySelector(`[data-unique="${uniqueName}"]`);
            if (card) {
              const totalNeeded = getNeededCopies(allArcanes.find(a => a.uniqueName === uniqueName));
              const display = card.querySelector('.arcane-counter-display');
              if (display) display.textContent = `${val}/${totalNeeded}`;
              card.classList.toggle('complete', val >= totalNeeded);
            }
          } catch (err) {
            console.error("Save failed:", err);
          }
        }
      });
    };

    const display = card.querySelector('.arcane-counter-display');

    const saveValue = async (newValue) => {
      const clamped = Math.max(0, newValue);
      const wasComplete = owned[a.uniqueName] >= totalNeeded;
      const isNowComplete = clamped >= totalNeeded;
      owned[a.uniqueName] = clamped;

      display.textContent = `${clamped}/${totalNeeded}`;
      card.classList.toggle('complete', isNowComplete);

      try {
        await saveFunction();
        // Only do a full re-render if completion status changed (card needs to move)
        if (wasComplete !== isNowComplete) renderArcanes();
      } catch (err) {
        console.error("Save failed:", err);
        alert("Failed to save data: " + err);
      }
    };

    // − / + buttons
    card.querySelectorAll('.arcane-counter-btn').forEach(btn => {
      btn.onclick = (e) => {
        e.stopPropagation();
        const current = owned[a.uniqueName] ?? 0;
        saveValue(btn.dataset.action === 'inc' ? current + 1 : current - 1);
      };
    });

    // Click display to edit inline
    display.onclick = (e) => {
      e.stopPropagation();
      const current = owned[a.uniqueName] ?? 0;
      display.textContent = current;
      display.contentEditable = 'true';
      display.classList.add('editing');
      display.focus();
      const range = document.createRange();
      range.selectNodeContents(display);
      window.getSelection().removeAllRanges();
      window.getSelection().addRange(range);
    };

    const commitEdit = () => {
      display.contentEditable = 'false';
      display.classList.remove('editing');
      const parsed = parseInt(display.textContent, 10);
      saveValue(isNaN(parsed) ? (owned[a.uniqueName] ?? 0) : parsed);
    };

    display.onblur = commitEdit;
    display.onkeydown = (e) => {
      if (e.key === 'Enter') { e.preventDefault(); display.blur(); }
      if (e.key === 'Escape') {
        display.textContent = `${owned[a.uniqueName] ?? 0}/${totalNeeded}`;
        display.contentEditable = 'false';
        display.classList.remove('editing');
      }
      if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
        e.preventDefault();
      }
    };

    fragment.appendChild(card);
  });

  list.appendChild(fragment);
}

function getDropLocations(arcane) {
  if (!arcane.drops || arcane.drops.length === 0) return t('drops.none');
  return arcane.drops
    .map(d => ({ translated: tLocation(d.location), chance: d.chance }))
    .sort((a, b) => a.translated.localeCompare(b.translated, localeMap[getLanguage()] ?? getLanguage()))
    .map(d => `${d.translated} (${(d.chance).toFixed(2)}%)`)
    .join('\n');
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

export function updateArcaneOwned(uniqueName, value) {
  owned[uniqueName] = value;
}