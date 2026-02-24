// primes/renderer.js - Rendering logic for primes list and drop tables

import { state, FOUNDER_ITEMS, primeImageCache } from './state.js';
import { openPrimeCardModal } from '../modal.js';
import { normalizeRelicName } from './loader.js';
import { t, tRarity, tComponent, tRelicName, tLocation, tOrRaw, tMission, parseDropLocation  } from '../i18n.js';

const invoke = window.__TAURI_INTERNALS__.invoke;
const resolvedImageCache = new Map();

export const PART_ORDER = {
  'Blueprint': 0,

  'Neuroptics': 1,
  'Cerebrum': 1,
  'Harness': 1,
  'Chassis': 2,
  'Carapace': 2,
  'Wings': 2,
  'Systems': 3,

  'Barrel': 1,
  'Lower Limb': 1,
  'Stars': 1,
  'Receiver': 2,
  'Upper Limb': 2,
  'Blade': 2,
  'Stock': 3,
  'Grip': 3,
  'Handle': 3,
  'Pouch': 3,
  'Hilt': 3,
  'Gauntlet': 3,
  'String': 4,
  'Link': 4,
  'Guard': 4, 
  'Boot': 4,
  'Head': 4
};

const RARITY_ORDER = {
  'Common': 0,
  'Uncommon': 1,
  'Rare': 2,
  'Unknown': 3,
};

export function hasRelicDrops(prime) {
  if (!prime.components || prime.components.length === 0) return false;
  let allRelicsFromBuiltPrimes = true;
  for (const comp of prime.components) {
    const isBuiltPrime = comp.name && comp.name.includes("Prime") && comp.drops && comp.drops.some(d => d.location && d.location.toLowerCase().includes('relic'));
    if (isBuiltPrime) continue;
    if (comp.drops && comp.drops.length > 0) {
      const hasRelicDrop = comp.drops.some(d => d.location && d.location.toLowerCase().includes('relic'));
      if (hasRelicDrop) allRelicsFromBuiltPrimes = false;
      for (const drop of comp.drops) {
        if (drop.location && drop.location.toLowerCase().includes('relic')) {
          return true;
        }
      }
    }
  }
  return false;
}

export function renderPrimes() {
  const list = document.getElementById("primeList");
  list.innerHTML = "";

  const filtered = state.allPrimes.filter(p => {
    const isFounder = FOUNDER_ITEMS.includes(p.name);
    const isSpecial = !isFounder && !hasRelicDrops(p);

    if (!state.showFounderItems && isFounder) return false;
    if (!state.showSpecialItems && isSpecial) return false;

    const nameMatch = p.name.toLowerCase().includes(state.searchText);
    const catMatch = state.category === "All" || p.category === state.category;

    let vaultMatch = true;
    if (state.vaultStatus === "Available") vaultMatch = !p.vaulted;
    else if (state.vaultStatus === "Vaulted") vaultMatch = p.vaulted === true;

    return nameMatch && catMatch && vaultMatch;
  });

  const incomplete = [];
  const completeTradeable = [];
  const completeNonTradeable = [];

  filtered.forEach(p => {
    const isIgnored = state.ignoredPrimes.has(p.uniqueName);
    const ownedComp = p.components.find(c => c.isMainItem);
    const isOwned = ownedComp && (state.owned[ownedComp.uniqueName] ?? 0) > 0;

    if (isOwned || isIgnored) {
      const nonOwned = p.components.filter(c => !c.isMainItem);
      const allChecked = nonOwned.length > 0 && nonOwned.every(c => (state.owned[c.uniqueName] ?? 0) > 0);
      if (isOwned && allChecked) completeTradeable.push(p);
      else completeNonTradeable.push(p);
    } else {
      incomplete.push(p);
    }
  });

  const vaultSort = (a, b) => (a.vaulted ? 1 : 0) - (b.vaulted ? 1 : 0);
  incomplete.sort(vaultSort);
  completeTradeable.sort(vaultSort);
  completeNonTradeable.sort(vaultSort);

  const fragment = document.createDocumentFragment();

  [...incomplete, ...completeTradeable, ...completeNonTradeable].forEach(p => {
    const isIgnored = state.ignoredPrimes.has(p.uniqueName);
    const ownedComp = p.components.find(c => c.isMainItem);
    const isOwned = ownedComp && (state.owned[ownedComp.uniqueName] ?? 0) > 0;
    const isFounder = FOUNDER_ITEMS.includes(p.name);
    const isSpecial = !isFounder && !hasRelicDrops(p);
    const isComplete = isOwned || isIgnored;
    const nonOwned = p.components.filter(c => !c.isMainItem);
    const allChecked = nonOwned.length > 0 && nonOwned.every(c => (state.owned[c.uniqueName] ?? 0) > 0);
    const hasTradeableSet = isOwned && allChecked && !isSpecial;


    const card = document.createElement("div");
    card.className = "prime-card";
    if (isComplete) card.classList.add("complete");
    if (hasTradeableSet) card.classList.add("tradeable");
    card.dataset.unique = p.uniqueName;

    // Status tag
    let statusTag = '';
    if (hasTradeableSet)    statusTag = `<span class="prime-status-tag tradeable">${t('badge.tradeable')}</span>`;
    else if (isIgnored)     statusTag = `<span class="prime-status-tag ignored">${t('badge.ignored')}</span>`;
    else if (isOwned)       statusTag = `<span class="prime-status-tag owned">${t('badge.owned')}</span>`;
    else                    statusTag = `<span class="prime-status-tag farming">${t('badge.farming')}</span>`;

    // Letter badges
    const vaultDot   = (p.vaulted && !isFounder && !isSpecial) ? `<span class="prime-dot vaulted" title="${t('badge.vaulted')}">V</span>` : '';
    const founderDot = isFounder ? `<span class="prime-dot founder" title="${t('badge.founder')}">F</span>` : '';
    const specialDot = isSpecial ? `<span class="prime-dot special" title="${t('badge.special')}">S</span>` : '';
    const ignoredDot = isIgnored ? `<span class="prime-dot ignored-dot" title="${t('badge.ignored')}">I</span>` : '';

    // Ignore button (Founder and Special only)
    const ignoreBtn = (isFounder || isSpecial)
      ? `<button class="prime-ignore-btn" data-unique="${p.uniqueName}" title="${isIgnored ? t('btn.unignore') : t('btn.ignore')}">✕</button>`
      : '';

      const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23151b2b'/%3E%3Ctext x='40' y='44' text-anchor='middle' font-size='28' fill='%23334'%3E✦%3C/text%3E%3C/svg%3E";
      const imageUrl = primeImageCache.get(p.uniqueName) || FALLBACK;

    card.innerHTML = `
      <div class="prime-card-dots">
        ${vaultDot}${founderDot}${specialDot}${ignoredDot}
      </div>
      ${ignoreBtn}
      <div class="prime-card-image"></div>
      <div class="prime-card-name">${p.name}</div>
      <div class="prime-card-footer">
        ${statusTag}
      </div>
    `;

    // Image
    const imgEl = document.createElement('img');
    imgEl.alt = p.name;
    imgEl.style.display = 'none'; // hide until loaded

    imgEl.onload = () => { imgEl.style.display = ''; };
    imgEl.onerror = () => { imgEl.src = FALLBACK; };

    if (resolvedImageCache.has(p.uniqueName)) {
      imgEl.src = resolvedImageCache.get(p.uniqueName);
    } else if (imageUrl !== FALLBACK) {
      invoke("fetch_image_base64", { url: imageUrl })
        .then(b64 => {
          const dataUri = `data:image/png;base64,${b64}`;
          resolvedImageCache.set(p.uniqueName, dataUri);
          imgEl.src = dataUri;
        })
        .catch(() => { imgEl.src = FALLBACK; });
    } else {
      imgEl.src = FALLBACK;
    }
    card.querySelector('.prime-card-image').appendChild(imgEl);

    // Ignore button wiring
    const ignoreBtnEl = card.querySelector('.prime-ignore-btn');
    if (ignoreBtnEl) {
      ignoreBtnEl.onclick = async (e) => {
        e.stopPropagation();
        if (state.ignoredPrimes.has(p.uniqueName)) state.ignoredPrimes.delete(p.uniqueName);
        else state.ignoredPrimes.add(p.uniqueName);
        await state.saveFunction();
        renderPrimes();
      };
    }

    // Click card to open modal
    card.onclick = () => {
      const imageUrl = primeImageCache.get(p.uniqueName) || FALLBACK;
      const ownedCompAtOpen = p.components.find(c => c.isMainItem);
      const wasCompleteAtOpen = ownedCompAtOpen && (state.owned[ownedCompAtOpen.uniqueName] ?? 0) > 0;

      // Build components with display names and owned state for the modal
      const compsForModal = p.components.map(comp => ({
        ...comp,
        displayName: comp.isMainItem ? t('label.owned') : tComponent(comp.name),
        isOwned: (state.owned[comp.uniqueName] ?? 0) > 0,
      }));

      openPrimeCardModal(
        { ...p, components: compsForModal, isSpecial },
        imageUrl,
        () => buildDropTable(p, isSpecial),
        // onComponentChange — update state and card tag in place
        async (uniqueName, val) => {
          state.owned[uniqueName] = val;
          try {
            await state.saveFunction();
            updatePrimeCardTag(p, card);
          } catch (err) {
            console.error("Save failed:", err);
          }
        },
        
        // onClose — compare against snapshot
        () => {
          const ownedCompNow = p.components.find(c => c.isMainItem);
          const isCompleteNow = ownedCompNow && (state.owned[ownedCompNow.uniqueName] ?? 0) > 0;
          if (wasCompleteAtOpen !== isCompleteNow) renderPrimes();
        }
      );
    };

    fragment.appendChild(card);
  });

  list.appendChild(fragment);
}

function buildDropTable(prime, isSpecial = false) {
  if (isSpecial) return buildSpecialDropTable(prime);

  const farmableRows = [];
  const vaultedRows = [];

  // Deduplicate by name for drop table purposes - multiple copies of a component
  // (e.g. Tipedo Prime Ornament x2) share the same drop data, so only render once
  const seenCompNames = new Set();
  const uniqueComponents = prime.components.filter(comp => {
    if (seenCompNames.has(comp.name)) return false;
    seenCompNames.add(comp.name);
    return true;
  });

  uniqueComponents.forEach(comp => {
    if (!comp.drops || comp.drops.length === 0) return;
    if (comp.isBuiltPrime) return;

    const relicData = new Map();

    comp.drops.forEach(drop => {
      if (!drop.location) return;

      const relicName = normalizeRelicName(drop.location);
      if (!relicName || relicName === '') return;

      if (!relicData.has(relicName)) {
        const relicLower = relicName.toLowerCase();
        const isFarmable = state.farmableRelics.has(relicLower);

        let rarity = 'Unknown';
        const relicRewards = state.relicRewardsMap.get(relicLower);
        if (relicRewards) {
          const compNameLower = comp.name.toLowerCase();
          const primeName = prime.name.replace(' Prime', '').toLowerCase();
          const reward = relicRewards.find(r =>
            r.itemName &&
            r.itemName.toLowerCase().includes(primeName) &&
            r.itemName.toLowerCase().includes(compNameLower)
          );
          if (reward) rarity = reward.rarity;
        }

        if (rarity === 'Unknown' && drop.rarity) rarity = drop.rarity;

        relicData.set(relicName, {
          name: relicName,
          rarity,
          status: isFarmable ? 'farmable' : 'vaulted'
        });
      }
    });

    relicData.forEach(relic => {
      const compDisplayName = comp.isMainItem ? t('label.owned') : tComponent(comp.name);
      // For parts with itemCount > 1 (e.g. Ornament x2), only strike through if ALL copies are owned
      const allCopies = prime.components.filter(c => c.name === comp.name);
      const isOwned = allCopies.every(c => (state.owned[c.uniqueName] ?? 0) > 0);
      const row = { partName: compDisplayName, rawName: comp.name, relicName: relic.name, rarity: relic.rarity, isOwned };
      if (relic.status === 'farmable') farmableRows.push(row);
      else vaultedRows.push(row);
    });
  });

  if (farmableRows.length === 0 && vaultedRows.length === 0) {
    return `<div class="drop-tables-container"><p class="no-drops">${t('table.noRelicData')}</p></div>`;
  }

  const sortRows = (a, b) => {
    const aOrder = PART_ORDER[a.rawName] ?? 99;
    const bOrder = PART_ORDER[b.rawName] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aRarity = RARITY_ORDER[a.rarity] ?? 99;
    const bRarity = RARITY_ORDER[b.rarity] ?? 99;
    if (aRarity !== bRarity) return aRarity - bRarity;
    const partCompare = a.partName.localeCompare(b.partName);
    return partCompare !== 0 ? partCompare : a.relicName.localeCompare(b.relicName);
  };
  farmableRows.sort(sortRows);
  vaultedRows.sort(sortRows);

  const buildTable = (rows, wrapperClass, title, btnClass = '') => `
    <div class="drop-table-wrapper ${wrapperClass}">
      <h4>${title} (${rows.length})</h4>
      <div class="drop-table-scroll">
        <table class="drop-table">
          <thead><tr><th>${t('table.colPart')}</th><th>${t('table.colRelic')}</th><th class="rarity">${t('table.colRarity')}</th></tr></thead>
          <tbody>
            ${rows.map(row => `
              <tr class="${row.isOwned ? 'part-owned' : ''}">
                <td class="part-name">${row.partName}</td>
                <td><button class="relic-btn ${btnClass}" data-relic="${row.relicName}">${tRelicName(row.relicName)}</button></td>
                <td class="rarity rarity-${row.rarity.toLowerCase()}">${tRarity(row.rarity)}</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;

  let html = '<div class="drop-tables-container">';
  if (farmableRows.length > 0) html += buildTable(farmableRows, 'farmable', t('table.availableRelics'));
  if (vaultedRows.length > 0) html += buildTable(vaultedRows, 'vaulted', t('table.vaultedRelics'), 'vaulted-relic');
  html += '</div>';

  return html;
}

function buildSpecialDropTable(prime) {
  const rows = [];

  prime.components.forEach(comp => {
    if (!comp.drops || comp.drops.length === 0) return;
    if (comp.isBuiltPrime) return;

    comp.drops.forEach(drop => {
      if (!drop.location) return;
      const isOwned = (state.owned[comp.uniqueName] ?? 0) > 0;
      const compDisplayName = comp.isMainItem ? t('label.owned') : tComponent(comp.name);
      rows.push({
        rawName: comp.name,
        partName: compDisplayName,
        ...parseDropLocation(drop.location),
        rarity: drop.rarity || 'Unknown',
        chance: drop.chance,
        isOwned,
      });
    });
  });
  
  rows.sort((a, b) => {
    const partDiff = (PART_ORDER[a.rawName] ?? 99) - (PART_ORDER[b.rawName] ?? 99);
    if (partDiff !== 0) return partDiff;
    return (RARITY_ORDER[a.rarity] ?? 99) - (RARITY_ORDER[b.rarity] ?? 99);
  });

  if (rows.length === 0) {
    return `<div class="drop-tables-container"><p class="no-drops">${t('modal.noLocations')}</p></div>`;
  }

  return `
    <div class="drop-tables-container">
      <div class="drop-table-wrapper special">
        <h4>${t('table.specialDrops')}</h4>
        <div class="drop-table-scroll">
          <table class="drop-table">
            <thead>
              <tr>
                <th>${t('table.colPart')}</th>
                <th>${t('modal.colLocation')}</th>
                <th>${t('modal.colMode')}</th>
                <th>${t('modal.colRotation')}</th>
                <th class="rarity">${t('table.colRarity')}</th>
                <th>${t('modal.colChance')}</th>
              </tr>
            </thead>
            <tbody>
              ${rows.map(row => `
                <tr class="${row.isOwned ? 'part-owned' : ''}">
                  <td class="part-name">${row.partName}</td>
                  <td>${tOrRaw(`planet.${row.planet}`, row.planet)} - ${tMission(row.mission)}</td>
                  <td>${row.gameMode ? (t(`gameMode.${row.gameMode}`) !== `gameMode.${row.gameMode}` ? t(`gameMode.${row.gameMode}`) : row.gameMode) : ''}</td>
                  <td>${row.rotation}</td>
                  <td class="rarity rarity-${row.rarity.toLowerCase()}">${tRarity(row.rarity)}</td>
                  <td class="relic-location-chance">${(row.chance * 100).toFixed(2)}%</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  `;
}

function updatePrimeCardTag(p, card) {
  const isFounder = FOUNDER_ITEMS.includes(p.name);
  const isSpecial = !isFounder && !hasRelicDrops(p);
  const ownedComp = p.components.find(c => c.isMainItem);
  const isOwned = ownedComp && (state.owned[ownedComp.uniqueName] ?? 0) > 0;
  const isIgnored = state.ignoredPrimes.has(p.uniqueName);
  const nonOwned = p.components.filter(c => !c.isMainItem);
  const allChecked = nonOwned.length > 0 && nonOwned.every(c => (state.owned[c.uniqueName] ?? 0) > 0);
  const hasTradeableSet = isOwned && allChecked;

  const tag = card.querySelector('.prime-status-tag');
  if (!tag) return;

  tag.className = 'prime-status-tag';
  if (hasTradeableSet) {
    tag.classList.add('tradeable');
    tag.textContent = t('badge.tradeable');
  } else if (isIgnored) {
    tag.classList.add('ignored');
    tag.textContent = t('badge.ignored');
  } else if (isOwned) {
    tag.classList.add('owned');
    tag.textContent = t('badge.owned');
  } else {
    tag.classList.add('farming');
    tag.textContent = t('badge.farming');
  }

  card.classList.toggle('complete', isOwned || isIgnored);
  card.classList.toggle('tradeable', hasTradeableSet);
}

function updatePrimeCard(p) {
  const card = document.querySelector(`.prime-card[data-unique="${p.uniqueName}"]`);
  if (!card) return false; // card not found, need full render

  const isFounder = FOUNDER_ITEMS.includes(p.name);
  const isSpecial = !isFounder && !hasRelicDrops(p);
  const ownedComp = p.components.find(c => c.isMainItem);
  const isOwned = ownedComp && (state.owned[ownedComp.uniqueName] ?? 0) > 0;
  const isIgnored = state.ignoredPrimes.has(p.uniqueName);
  const nonOwned = p.components.filter(c => !c.isMainItem);
  const allChecked = nonOwned.length > 0 && nonOwned.every(c => (state.owned[c.uniqueName] ?? 0) > 0);
  const hasTradeableSet = isOwned && allChecked;

  const wasComplete = card.classList.contains('complete');
  const isNowComplete = isOwned || isIgnored;

  // Update tag and classes in place
  updatePrimeCardTag(p, card);

  // Return whether the card needs to move sections (requires full re-render)
  return wasComplete !== isNowComplete;
}