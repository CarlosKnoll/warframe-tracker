// primes/renderer.js - Rendering logic for primes list and drop tables

import { state, FOUNDER_ITEMS } from './state.js';
import { normalizeRelicName } from './loader.js';
import { openRelicModal } from '../modal.js';
import { t, tRarity, tCategory, tComponent, tRelicName } from '../i18n.js';

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
      const nonOwnedComponents = p.components.filter(c => !c.isMainItem);
      const allComponentsChecked = nonOwnedComponents.length > 0 &&
        nonOwnedComponents.every(c => (state.owned[c.uniqueName] ?? 0) > 0);
      const hasTradeableSet = isOwned && allComponentsChecked;

      if (hasTradeableSet) completeTradeable.push(p);
      else completeNonTradeable.push(p);
    } else {
      incomplete.push(p);
    }
  });

  const fragment = document.createDocumentFragment();

  const vaultSort = (a, b) => (a.vaulted ? 1 : 0) - (b.vaulted ? 1 : 0);
  incomplete.sort(vaultSort);
  completeTradeable.sort(vaultSort);
  completeNonTradeable.sort(vaultSort);

  [...incomplete, ...completeTradeable, ...completeNonTradeable].forEach(p => {
    const isIgnored = state.ignoredPrimes.has(p.uniqueName);
    const ownedComp = p.components.find(c => c.isMainItem);
    const isOwned = ownedComp && (state.owned[ownedComp.uniqueName] ?? 0) > 0;
    const isComplete = isOwned || isIgnored;

    const nonOwnedComponents = p.components.filter(c => !c.isMainItem);
    const allComponentsChecked = nonOwnedComponents.length > 0 &&
      nonOwnedComponents.every(c => (state.owned[c.uniqueName] ?? 0) > 0);
    const hasTradeableSet = isOwned && allComponentsChecked;

    const isFounder = FOUNDER_ITEMS.includes(p.name);
    const isSpecial = !isFounder && !hasRelicDrops(p);

    const row = document.createElement("div");
    row.className = isComplete ? "prime complete" : "prime";
    if (hasTradeableSet) row.classList.add("tradeable");

    const founderBadge = isFounder ? `<span class="founder-badge">${t('badge.founder')}</span>` : '';
    const specialBadge = isSpecial ? `<span class="special-badge">${t('badge.special')}</span>` : '';
    const vaultBadge = (p.vaulted && !isFounder && !isSpecial) ? `<span class="vaulted-badge">${t('badge.vaulted')}</span>` : '';
    const ignoredLabel = isIgnored ? `<span class="ignored-label">${t('badge.ignored')}</span>` : '';
    const tradeableBadge = hasTradeableSet ? `<span class="tradeable-badge">${t('badge.tradeable')}</span>` : '';

    row.innerHTML = `
      <div class="prime-header">
        <strong>${p.name}</strong>
        ${founderBadge}
        ${specialBadge}
        ${vaultBadge}
        ${tradeableBadge}
        ${ignoredLabel}
        <span class="prime-category">${tCategory(p.category)}</span>
        ${(isFounder || isSpecial) ? `<button class="ignore-btn" data-unique="${p.uniqueName}">${isIgnored ? t('btn.unignore') : t('btn.ignore')}</button>` : ''}
        <button class="expand-btn" data-unique="${p.uniqueName}">▼</button>
      </div>
      <div class="prime-components">
        ${p.components.map(comp => {
          const have = (state.owned[comp.uniqueName] ?? 0) > 0;
          const compName = comp.isMainItem ? t('label.owned') : tComponent(comp.name);
          return `
            <label class="component ${have ? 'owned' : ''} ${comp.isMainItem ? 'main-item' : ''}">
              <input type="checkbox" ${have ? 'checked' : ''} data-unique="${comp.uniqueName}" />
              <span>${compName}</span>
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
        dropTable.innerHTML = buildDropTable(p);
        dropTable.dataset.loaded = 'true';

        dropTable.querySelectorAll('.relic-btn').forEach(btn => {
          btn.onclick = () => {
            const relicName = btn.dataset.relic;
            const rewards = state.relicRewardsMap.get(relicName.toLowerCase());
            openRelicModal(tRelicName(relicName), rewards);
          };
        });
      }

      dropTable.style.display = isExpanded ? 'none' : 'block';
      expandBtn.textContent = isExpanded ? '▼' : '▲';
    };

    const ignoreBtn = row.querySelector('.ignore-btn');
    if (ignoreBtn) {
      ignoreBtn.onclick = async () => {
        if (state.ignoredPrimes.has(p.uniqueName)) state.ignoredPrimes.delete(p.uniqueName);
        else state.ignoredPrimes.add(p.uniqueName);
        await state.saveFunction();
        renderPrimes();
      };
    }

    row.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.onchange = async (e) => {
        const uniqueName = e.target.dataset.unique;
        state.owned[uniqueName] = e.target.checked ? 1 : 0;
        try {
          await state.saveFunction();
          // Invalidate drop table cache so it rebuilds with updated strikethrough
          const dropTable = e.target.closest('.prime').querySelector('.drop-table');
          if (dropTable) dropTable.dataset.loaded = 'false';
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

function buildDropTable(prime) {
  const farmableRows = [];
  const vaultedRows = [];

  const partOrder = {
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

  const rarityOrder = {
    'Common': 0,
    'Uncommon': 1,
    'Rare': 2,
    'Unknown': 3,
  };

  prime.components.forEach(comp => {
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
      const isOwned = (state.owned[comp.uniqueName] ?? 0) > 0;
      const row = { partName: compDisplayName, rawName: comp.name, relicName: relic.name, rarity: relic.rarity, isOwned };
      if (relic.status === 'farmable') farmableRows.push(row);
      else vaultedRows.push(row);
    });
  });

  if (farmableRows.length === 0 && vaultedRows.length === 0) {
    return `<div class="drop-tables-container"><p class="no-drops">${t('table.noRelicData')}</p></div>`;
  }

  const sortRows = (a, b) => {
    const aOrder = partOrder[a.rawName] ?? 99;
    const bOrder = partOrder[b.rawName] ?? 99;
    if (aOrder !== bOrder) return aOrder - bOrder;
    const aRarity = rarityOrder[a.rarity] ?? 99;
    const bRarity = rarityOrder[b.rarity] ?? 99;
    if (aRarity !== bRarity) return aRarity - bRarity;
    const partCompare = a.partName.localeCompare(b.partName);
    return partCompare !== 0 ? partCompare : a.relicName.localeCompare(b.relicName);
  };
  farmableRows.sort(sortRows);
  vaultedRows.sort(sortRows);

  const buildTable = (rows, wrapperClass, title, btnClass = '') => `
    <div class="drop-table-wrapper ${wrapperClass}">
      <h4>${title} (${rows.length})</h4>
      <table class=drop-table>
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
  `;

  let html = '<div class="drop-tables-container">';
  if (farmableRows.length > 0) html += buildTable(farmableRows, 'farmable', t('table.availableRelics'));
  if (vaultedRows.length > 0) html += buildTable(vaultedRows, 'vaulted', t('table.vaultedRelics'), 'vaulted-relic');
  html += '</div>';

  return html;
}