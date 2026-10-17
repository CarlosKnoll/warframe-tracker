// src/tasks/modal.js
//
// Task detail modal, opened from a grid tile. Built with DOM nodes (not an HTML string)
// because the live-data lines carry event handlers (Circuit weapon chips).
// Rides on the shared #relicModal overlay via openElementModal() in ../modal.js.
//
// Layout (from the design sketch):
//   [icon]  Name [checkbox]                    [badges: pulses / cryobells]
//           Reset <countdown>
//   ───────────────────────────────────────────────────────────────────────
//   description
//   live data from the API (missions, stock, risks, this week's Warframes / weapons …)
//   potential rewards (rewards/view.js)

import { t, tOrRaw } from '../i18n.js';
import { state } from './state.js';
import { toggleTask, removeCustomTask } from './loader.js';
import { openElementModal, closeModal } from '../modal.js';
import { toneOf, taskLabel, resetTargetFor, formatCountdown, tf } from './helpers.js';
import { getLiveLines } from './live.js';
import { buildRewardsSection } from './rewards/view.js';
import { createTaskIcon } from './rewards/resolve.js';

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function buildBadges(task) {
  const badges = [];

  // Existing locale keys: "{{n}} pulso" / "{{n}} pulsos" and "3 Sinos Criogênicos" (the 3 is baked into that string).
  if (task.pulsesCost) {
    const n = task.pulsesCost;
    badges.push(['pulse', n === 1
      ? tf('tabs.tasks.ui.pulse.cost', '{{n}} Search Pulse', { n })
      : tf('tabs.tasks.ui.pulse.cost.plural', '{{n}} Search Pulses', { n })]);
  }
  if (task.cryobells) {
    badges.push(['cryobell', tf('tabs.tasks.ui.cryobell.header', '3 Cryobells')]);
  }
  if (!badges.length) return null;

  const wrap = el('div', 'tasks-modal-badges');
  badges.forEach(([kind, text]) => wrap.appendChild(el('span', `tasks-modal-badge tasks-modal-badge--${kind}`, text)));
  return wrap;
}

// `onClose` fires once when the modal is fully closed (after check/uncheck, Circuit weapon
// toggles or removal), so the grid can refresh the tile.
export function openTaskModal(task, { onClose = null } = {}) {
  const label = taskLabel(task);
  // state.tasks can be replaced while the modal is open (e.g. a sync pull) — always act on the live object.
  const current = () => state.tasks.find(x => x.id === task.id) ?? task;

  let timer = null;
  const stopTimer = () => { if (timer !== null) { clearInterval(timer); timer = null; } };

  openElementModal({
    title: label,
    type: 'task',
    onClose: () => { stopTimer(); onClose?.(); },
    build(container) {
      const root = el('div', `tasks-modal tasks-tone--${toneOf(task)}`);

      // ── Header ──
      const head = el('div', 'tasks-modal-head');
      head.appendChild(createTaskIcon(task, { className: 'tasks-modal-icon' }));

      const titleBlock = el('div', 'tasks-modal-title');
      const nameRow = el('div', 'tasks-modal-name-row');
      nameRow.appendChild(el('h3', 'tasks-modal-name', label));

      const check = el('button', 'tasks-modal-check');
      check.type = 'button';
      check.setAttribute('role', 'checkbox');
      check.setAttribute('aria-label', label);
      nameRow.appendChild(check);
      titleBlock.appendChild(nameRow);

      const reset = el('div', 'tasks-modal-reset', t('tasks.ui.reset') + ' ');
      const countdown = el('span', 'tasks-modal-countdown');
      reset.appendChild(countdown);
      titleBlock.appendChild(reset);
      head.appendChild(titleBlock);

      const badges = buildBadges(task);
      if (badges) head.appendChild(badges);
      root.appendChild(head);

      const paintCheck = () => {
        const done = current().checked;
        check.setAttribute('aria-checked', String(done));
        check.title = done
          ? tf('tabs.tasks.ui.modal.mark_undone', 'Mark as not completed')
          : tf('tabs.tasks.ui.modal.mark_done', 'Mark as completed');
      };
      const paintReset = () => {
        const target = resetTargetFor(current());
        countdown.textContent = target === null ? '—' : formatCountdown(target);
      };

      check.onclick = async () => {
        await toggleTask(task.id);
        paintCheck();
        paintReset();     // Forma's 24h clock starts/stops with the tick
      };

      // ── Body ──
      if (task.descKey) {
        const desc = tOrRaw(task.descKey, '');
        if (desc) root.appendChild(el('p', 'tasks-modal-desc', desc));
      }

      const lines = getLiveLines(task);
      if (Array.isArray(lines) && lines.length) {
        const live = el('div', 'tasks-modal-live');
        lines.forEach(line => {
          const row = el('div', 'tasks-modal-live-line');
          if (typeof line === 'string') row.textContent = line;
          else row.appendChild(line);
          live.appendChild(row);
        });
        root.appendChild(live);
      }

      const rewards = buildRewardsSection(task);
      if (rewards) root.appendChild(rewards);

      if (task.custom) {
        const remove = el('button', 'tasks-modal-remove', tf('tabs.tasks.ui.modal.remove', 'Remove task'));
        remove.type = 'button';
        remove.onclick = async () => {
          await removeCustomTask(task.id);
          closeModal();   // fires onClose → the grid drops the tile
        };
        root.appendChild(remove);
      }

      container.appendChild(root);

      paintCheck();
      paintReset();
      timer = setInterval(() => {
        if (!root.isConnected) { stopTimer(); return; }   // modal replaced without a close event
        paintReset();
      }, 1000);

      check.focus();
    },
  });
}