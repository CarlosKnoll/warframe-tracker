// modal.js - Modal system for relic, arcane, and prime detail views

import { t, tRarity, tItemName, tRelicName } from './i18n.js';
import { state } from './primes/state.js';

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
  let body;

  if (!rewards || rewards.length === 0) {
    body = `<p class="no-drops">${t('modal.noRewards')}</p>`;
  } else {
    const sorted = [...rewards].sort((a, b) => b.chance - a.chance);
    body = `
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
              <td>${r.chance.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  openModal(relicName, body, 'relic', pushCurrent);
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

// ─── Prime Modal ───────────────────────────────────────────────────────────────

export function openPrimeCardModal(prime, imageUrl, getDropTableHTML, onComponentChange, onClose) {
  let dirty = false;
  const renderBody = () => {

    // Re-read owned state for checkboxes each render
    return `
      <div class="modal-detail">
        <div class="modal-detail-left">
          <div class="modal-item-image">
            <img src="${imageUrl}" alt="${prime.name}" onerror="this.src=''" />
          </div>
          <div class="modal-item-name">${prime.name}</div>
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
        bindRelicbindRelicButtons();
      };
    });
  };

  const bindRelicButtons = () => {
    modalBody.querySelectorAll('.relic-btn').forEach(btn => {
      btn.onclick = () => {
        const relicName = btn.dataset.relic;
        const rewards = state.relicRewardsMap.get(relicName.toLowerCase());
        openRelicModal(tRelicName(relicName), rewards, true); // ← pushCurrent = true
      };
    });
  };

  openModal(prime.name, renderBody(), 'prime');
  rebind();
  bindRelicButtons();
  modalBox._primeOnClose = () => {
    if (dirty) onClose();
  };
  modalBox._rebind = rebind;                     
  modalBox._bindRelicButtons = bindRelicButtons;
}