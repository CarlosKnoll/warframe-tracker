// modal.js - Modal system for relic, arcane, and prime detail views

import { t, tRarity, tItemName, tRelicName, tOrRaw, tMission, tPrimeName, tMasteryItemName, tComponent, tLocation } from './i18n.js';
import { state } from './primes/state.js';
import { masteryState } from './mastery/state.js';
import { PART_ORDER } from './primes/renderer.js';

const modal = document.getElementById("relicModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");
const modalBox = modal.querySelector(".modal-box");
const modalStack = [];

modalClose.onclick = () => closeModal();
modal.onclick = (e) => { if (e.target === modal) closeModal(); };
document.addEventListener("keydown", (e) => { if (e.key === "Escape") closeModal(); });

function openModal(title, bodyHTML, type = 'relic', pushCurrent = false) {
  if (pushCurrent && !modal.classList.contains("hidden")) {
    modalStack.push({
      title: modalTitle.textContent,
      body: modalBody.innerHTML,
      type: modalBox.dataset.type,
      onClose: modalBox._primeOnClose || null,
      rebind: modalBox._rebind || null,
      bindRelicButtons: modalBox._bindRelicButtons || null,
    });
  }
  modalTitle.textContent = title;
  modalBody.innerHTML = bodyHTML;
  modalBox.dataset.type = type;
  modal.classList.remove("hidden");
}

export function closeModal() {
  if (modalBox._primeOnClose && !modalStack.length) {
    // Only fire onClose if we're fully closing, not going back
    const cb = modalBox._primeOnClose;
    modalBox._primeOnClose = null;
    cb();
  }

  if (modalStack.length > 0) {
    // Pop and restore previous modal
    const prev = modalStack.pop();
    modalTitle.textContent = prev.title;
    modalBody.innerHTML = prev.body;
    modalBox.dataset.type = prev.type;
    modalBox._primeOnClose = prev.onClose;
    // Rewire relic buttons in the restored modal
    if (prev.bindRelicButtons) prev.bindRelicButtons();
    if (prev.rebind) prev.rebind();
    return;
  }

  modal.classList.add("hidden");
  modalTitle.textContent = '';
  modalBody.innerHTML = '';
  delete modalBox.dataset.type;
  modalBox._primeOnClose = null;
  modalBox._rebind = null;
  modalBox._bindRelicButtons = null;
  modalStack.length = 0;
}

// ─── Relic Modal ───────────────────────────────────────────────────────────────

export function openRelicModal(relicName, rewards, pushCurrent = false) {
  // Left side — prime parts table
  let leftContent;
  if (!rewards || rewards.length === 0) {
    leftContent = `<p class="no-drops">${t('modal.noRewards')}</p>`;
  } else {
    const sorted = [...rewards].sort((a, b) => b.chance - a.chance);
    leftContent = `
      <table class="modal-table">
        <thead>
          <tr>
            <th>${t('modal.colItem')}</th>
            <th class="rarity">${t('modal.colRarity')}</th>
            <th>${t('modal.colChance')}</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(r => `
            <tr>
              <td>${tItemName(r.itemName)}</td>
              <td class="rarity rarity-${r.rarity.toLowerCase()}">${tRarity(r.rarity)}</td>
              <td class="relic-location-chance">${r.chance.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  // Right side — drop locations table
  const rawKey = relicName.trim().toLowerCase().replace(/\s*(intact|exceptional|flawless|radiant)\s*/gi, '').trim();
  const locations = state.relicLocationMap.get(rawKey) || [];
  let rightContent;
  if (locations.length === 0) {
    rightContent = `<p class="no-drops">${t('modal.noLocations')}</p>`;
  } else {
    rightContent = `
      <table class="modal-table" id="relicLocationTable">
        <thead>
          <tr>
            <th>${t('modal.colLocation')}</th>
            <th>${t('modal.colMode')}</th>
            <th>${t('modal.colRotation')}</th>
            <th class="sortable-chance" style="cursor:pointer; user-select:none;">
              ${t('modal.colChance')} <span class="sort-arrow">↕</span>
            </th>
          </tr>
        </thead>
        <tbody id="relicLocationBody">
          ${renderLocationRows(locations, 'desc')}
        </tbody>
      </table>
    `;
  }

  const body = `
    <div class="modal-detail">
      <div class="modal-detail-left relic-left">
        ${leftContent}
      </div>
      <div class="modal-detail-right">
        ${rightContent}
      </div>
    </div>
  `;

  openModal(tRelicName(relicName), body, 'relic', pushCurrent);

  // Wire sort button
  const chanceHeader = modalBody.querySelector('.sortable-chance');
  if (chanceHeader) {
    let sortDir = 'desc';
    chanceHeader.onclick = () => {
      sortDir = sortDir === 'desc' ? 'asc' : 'desc';
      chanceHeader.querySelector('.sort-arrow').textContent = sortDir === 'desc' ? '↓' : '↑';
      document.getElementById('relicLocationBody').innerHTML = renderLocationRows(locations, sortDir);
    };
  }
}

function renderLocationRows(locations, dir) {
  const sorted = [...locations].sort((a, b) =>
    dir === 'desc' ? b.chance - a.chance : a.chance - b.chance
  );
  return sorted.map(loc => `
    <tr>
      <td>${tOrRaw(`planet.${loc.planet}`, loc.planet)} - ${tMission(loc.mission)}</td>
      <td>${t(`gameMode.${loc.gameMode}`) || loc.gameMode}</td>
      <td>${loc.rotation}</td>
      <td class="relic-location-chance">${loc.chance.toFixed(2)}%</td>
    </tr>
  `).join('');
}

// ─── Arcane Modal ──────────────────────────────────────────────────────────────

export function openArcaneModal({ name, imageUrl, dropInfo, owned, totalNeeded, uniqueName, onOwnedChange }) {
  const needed = Math.max(0, totalNeeded - owned);

  const body = `
    <div class="modal-detail">
      <div class="modal-detail-left">
        <div class="modal-item-image">
          <img src="${imageUrl}" alt="${name}" onerror="this.src=''" />
        </div>
        <div class="modal-item-name">${name}</div>
        <div class="modal-item-counter">
          <label>${t('label.owned')}</label>
          <div class="modal-counter-row">
            <button class="arcane-counter-btn" id="modalDecBtn">−</button>
            <span class="arcane-counter-display" id="modalCounterDisplay">${owned}/${totalNeeded}</span>
            <button class="arcane-counter-btn" id="modalIncBtn">+</button>
          </div>
          <span class="modal-need-label">${t('label.need')} ${needed}</span>
        </div>
      </div>
      <div class="modal-detail-right">
        <div class="modal-drop-list">${dropInfo || t('drops.none')}</div>
      </div>
    </div>
  `;

  openModal(name, body, 'arcane');

let currentOwned = owned;
  const display = document.getElementById('modalCounterDisplay');
  const needLabel = document.querySelector('.modal-need-label');

  const updateDisplay = (val) => {
    currentOwned = Math.max(0, val);
    display.textContent = `${currentOwned}/${totalNeeded}`;
    needLabel.textContent = `${t('label.need')} ${Math.max(0, totalNeeded - currentOwned)}`;
    onOwnedChange(uniqueName, currentOwned);
  };

  document.getElementById('modalDecBtn').onclick = () => updateDisplay(currentOwned - 1);
  document.getElementById('modalIncBtn').onclick = () => updateDisplay(currentOwned + 1);

  display.onclick = () => {
    const current = currentOwned;
    display.textContent = current;
    display.contentEditable = 'true';
    display.classList.add('editing');
    display.focus();
    const range = document.createRange();
    range.selectNodeContents(display);
    window.getSelection().removeAllRanges();
    window.getSelection().addRange(range);
  };

  display.onblur = () => {
    display.contentEditable = 'false';
    display.classList.remove('editing');
    const parsed = parseInt(display.textContent, 10);
    updateDisplay(isNaN(parsed) ? currentOwned : parsed);
  };

  display.onkeydown = (e) => {
    if (e.key === 'Enter') { e.preventDefault(); display.blur(); }
    if (e.key === 'Escape') {
      display.textContent = `${currentOwned}/${totalNeeded}`;
      display.contentEditable = 'false';
      display.classList.remove('editing');
    }
    if (!/[\d]/.test(e.key) && !['Backspace', 'Delete', 'ArrowLeft', 'ArrowRight', 'Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };
}

// ─── Mastery Item Modal ────────────────────────────────────────────────────────

export function openMasteryItemModal({ item, imageUrl, onOwnedChange, onMasteredChange, onSubsumedChange }) {
  const name      = tMasteryItemName(item.name);
  const owned     = (masteryState.owned[`${item.uniqueName}_owned`] ?? 0) > 0;
  const mastered  = !!masteryState.masteryMastered[item.uniqueName];
  const subsumed  = !!masteryState.masteryMastered[`${item.uniqueName}_subsumed`];
  const canSubsume = item.section === 'Warframe' && !item.isPrime && !item.name.endsWith(' Umbra');

  // ── Right panel: per-component drop tables ─────────────────────────────────
  // Components that are resources (no masterable flag, type === 'Resource') or
  // have no drops are skipped — only craftable parts with actual drop data shown.
  const dropContent = buildMasteryDropTables(item);

  // ── Render ─────────────────────────────────────────────────────────────────
  const renderBody = () => `
    <div class="modal-detail">
      <div class="modal-detail-left">
        <div class="modal-item-image">
          <img src="${imageUrl}" alt="${name}" onerror="this.src=''" />
        </div>
        <div class="modal-item-name">${name}</div>
        <div class="modal-prime-components">
          <label class="component ${owned ? 'owned' : ''}" id="masteryModalOwnedLabel">
            <input type="checkbox" id="masteryModalOwned" ${owned ? 'checked' : ''} />
            <span>${t('mastery.label.owned')}</span>
          </label>
          <label class="component ${mastered ? 'owned' : ''}" id="masteryModalMasteredLabel">
            <input type="checkbox" id="masteryModalMastered" ${mastered ? 'checked' : ''} />
            <span>${t('mastery.label.mastered')}</span>
          </label>
          ${canSubsume ? `
          <label class="component ${subsumed ? 'owned' : ''}" id="masteryModalSubsumedLabel">
            <input type="checkbox" id="masteryModalSubsumed" ${subsumed ? 'checked' : ''} />
            <span>${t('mastery.label.subsumed')}</span>
          </label>` : ''}
        </div>
      </div>
      <div class="modal-detail-right">
        ${dropContent}
      </div>
    </div>
  `;

  openModal(name, renderBody(), 'mastery');

  // ── Wire checkboxes ────────────────────────────────────────────────────────
  document.getElementById('masteryModalOwned').onchange = (e) => {
    document.getElementById('masteryModalOwnedLabel').classList.toggle('owned', e.target.checked);
    onOwnedChange(e.target.checked);
  };

  document.getElementById('masteryModalMastered').onchange = (e) => {
    document.getElementById('masteryModalMasteredLabel').classList.toggle('owned', e.target.checked);
    onMasteredChange(e.target.checked);
  };

  if (canSubsume) {
    document.getElementById('masteryModalSubsumed').onchange = (e) => {
      document.getElementById('masteryModalSubsumedLabel').classList.toggle('owned', e.target.checked);
      onSubsumedChange(e.target.checked);
    };
  }
}

function buildMasteryDropTables(item) {
  // components are pre-filtered by the loader: only craftable parts with drop data.
  const craftableComps = item.components || [];

  if (craftableComps.length === 0) {
    return `<p class="no-drops">${t('modal.noLocations')}</p>`;
  }

  // Flatten all drops into a single table with a "Part" column — same pattern
  // as the prime drop table, so we reuse the same CSS cleanly.
  const rows = [];
  craftableComps.forEach(comp => {
    const compLabel = tComponent(comp.name) || comp.name;
    const partOrder = PART_ORDER[comp.name] ?? 99;
    [...comp.drops]
      .sort((a, b) => b.chance - a.chance)
      .forEach(drop => {
        rows.push({
          part:      compLabel,
          partOrder,
          location:  translateMasteryLocation(stripRotation(drop.location || '')),
          rotation:  extractRotation(drop.location),
          rarity:    drop.rarity || '',
          chance:    drop.chance,
        });
      });
  });

  // Sort by PART_ORDER first, then by chance descending within each part
  rows.sort((a, b) => {
    const partDiff = a.partOrder - b.partOrder;
    return partDiff !== 0 ? partDiff : b.chance - a.chance;
  });

  return `
    <div class="drop-tables-container">
      <div class="mastery-drop-table-wrapper">
        <table class="drop-table">
          <thead>
            <tr>
              <th>${t('table.colPart')}</th>
              <th>${t('modal.colLocation')}</th>
              <th>${t('modal.colRotation.abbr') !== 'modal.colRotation.abbr' ? t('modal.colRotation.abbr') : 'Rot.'}</th>
              <th class="rarity">${t('table.colRarity')}</th>
              <th>${t('modal.colChance')}</th>
            </tr>
          </thead>
          <tbody>
            ${rows.map(r => `
              <tr>
                <td class="part-name">${r.part}</td>
                <td>${r.location}</td>
                <td class="mastery-drop-rotation">${r.rotation}</td>
                <td class="rarity rarity-${r.rarity.toLowerCase()}">${tRarity(r.rarity)}</td>
                <td class="relic-location-chance">${(r.chance * 100).toFixed(2)}%</td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    </div>
  `;
}

function translateMasteryLocation(location) {
  return tLocation(location);
}

// The API embeds rotation in the location string, e.g.
// "Nokko: Corporate Restructuring Rewards, Rotation C"
// Extract it for the Rotation column; strip it from the location display.
function extractRotation(location = '') {
  const match = location.match(/,\s*Rotation\s+(\w+)\s*$/i);
  return match ? match[1] : '';
}

function stripRotation(location = '') {
  return location.replace(/,\s*Rotation\s+\w+\s*$/i, '').trim();
}

// ─── Prime Modal ───────────────────────────────────────────────────────────────

export function openPrimeCardModal(prime, imageUrl, getDropTableHTML, onComponentChange, onClose) {
  let dirty = false;
  const renderBody = () => {

    // Re-read owned state for checkboxes each render
    return `
      <div class="modal-detail">
        <div class="modal-detail-left">
          <div class="modal-item-image">
            <img src="${imageUrl}" alt="${tPrimeName(prime.name)}" onerror="this.src=''" />
          </div>
          <div class="modal-item-name">${tPrimeName(prime.name)}</div>
          <div class="modal-prime-components">
            ${prime.components.map(comp => `
              <label class="component ${comp.isOwned ? 'owned' : ''} ${comp.isMainItem ? 'main-item' : ''}">
                <input type="checkbox" ${comp.isOwned ? 'checked' : ''} data-unique="${comp.uniqueName}" />
                <span>${comp.displayName}</span>
              </label>
            `).join('')}
          </div>
        </div>
        <div class="modal-detail-right">
          ${getDropTableHTML()}
        </div>
      </div>
    `;
  };

  const rebind = () => {
    modalBody.querySelectorAll('input[type="checkbox"]').forEach(checkbox => {
      checkbox.onchange = (e) => {
        dirty = true;
        const uniqueName = e.target.dataset.unique;
        const val = e.target.checked ? 1 : 0;
        const label = e.target.closest('label');
        if (label) label.classList.toggle('owned', e.target.checked);

        // Update the component's isOwned so re-render reflects it
        const comp = prime.components.find(c => c.uniqueName === uniqueName);
        if (comp) comp.isOwned = e.target.checked;

        onComponentChange(uniqueName, val);

        // Rebuild the right panel with updated strikethrough
        modalBody.querySelector('.modal-detail-right').innerHTML = getDropTableHTML();

        // Rewire relic buttons after rebuild
        bindRelicButtons();
      };
    });
  };

  const bindRelicButtons = () => {
    modalBody.querySelectorAll('.relic-btn').forEach(btn => {
      btn.onclick = () => {
        const relicName = btn.dataset.relic;
        const rewards = state.relicRewardsMap.get(relicName.toLowerCase());
        openRelicModal(relicName, rewards, true);
      };
    });
  };

  openModal(tPrimeName(prime.name), renderBody(), 'prime');
  rebind();
  if (!prime.isSpecial) bindRelicButtons();
  modalBox._primeOnClose = () => {
    if (dirty) onClose();
  };
  modalBox._rebind = rebind;                     
  modalBox._bindRelicButtons = bindRelicButtons;
}