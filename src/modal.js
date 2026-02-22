// modal.js - Reusable relic modal logic

const modal = document.getElementById("relicModal");
const modalTitle = document.getElementById("modalTitle");
const modalBody = document.getElementById("modalBody");
const modalClose = document.getElementById("modalClose");

// Close on X button
modalClose.onclick = () => closeModal();

// Close on overlay click (outside the modal box)
modal.onclick = (e) => {
  if (e.target === modal) closeModal();
};

// Close on Escape key
document.addEventListener("keydown", (e) => {
  if (e.key === "Escape") closeModal();
});

export function openRelicModal(relicName, rewards) {
  modalTitle.textContent = relicName;

  if (!rewards || rewards.length === 0) {
    modalBody.innerHTML = '<p class="no-drops">No reward data available for this relic.</p>';
  } else {
    const sorted = [...rewards].sort((a, b) => b.chance - a.chance);

    modalBody.innerHTML = `
      <table class="modal-table">
        <thead>
          <tr>
            <th>Item</th>
            <th>Rarity</th>
            <th>Chance</th>
          </tr>
        </thead>
        <tbody>
          ${sorted.map(r => `
            <tr>
              <td>${r.itemName}</td>
              <td class="rarity rarity-${r.rarity.toLowerCase()}">${r.rarity}</td>
              <td>${r.chance.toFixed(2)}%</td>
            </tr>
          `).join('')}
        </tbody>
      </table>
    `;
  }

  modal.classList.remove("hidden");
}

export function closeModal() {
  modal.classList.add("hidden");
  modalTitle.textContent = '';
  modalBody.innerHTML = '';
}