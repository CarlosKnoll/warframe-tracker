// src/tasks/rewards/view.js
//
// "Potential rewards" section of the task modal: optional tabs (Normal / Steel Path, Silver /
// Gold / Legendary …), groups ("Tier 3", "One of", …) and reward rows (icon · name · chance).
// Pure DOM builder over the data files in this folder — nothing here is task-specific.

import { getLanguage } from '../../i18n.js';
import { tf } from '../helpers.js';
import { getRewards } from './index.js';
import { rewardLabel, liveOptions, liveRows, matchesWhen, createRewardIcon } from './resolve.js';

const OPTIONS_INLINE_MAX = 8;   // longer option lists collapse into a <details> (7 weapon types stay inline)

// English labels for tab ids (translate via tabs.tasks.ui.rewards.tab.<id>)
const TAB_FALLBACK = {
  normal: 'Normal', sp: 'Steel Path', silver: 'Silver', gold: 'Gold', legendary: 'Legendary',
  crested: 'Crested Frozen Chest', frozen: 'Frozen Chests', main: 'Rewards',
};

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

// "ptbr" isn't a valid BCP-47 tag for Intl, so never let a locale error break the modal.
function fmtNumber(n, opts) {
  try { return n.toLocaleString(getLanguage(), opts); }
  catch { return n.toLocaleString(undefined, opts); }
}

const fmtQty    = qty => (qty >= 100 ? fmtNumber(qty) : `${qty}×`);
const fmtChance = c   => `${fmtNumber(c, { maximumFractionDigits: 2 })}%`;
const noteText  = note => tf(`tabs.tasks.ui.rewards.note.${note}`, note);

function liveLine(kind) {
  const names = liveOptions(kind);
  if (!names) return null;
  return el('div', 'tasks-reward-live',
    `${tf('tabs.tasks.ui.rewards.this_week', 'This week')}: ${names.map(rewardLabel).join(', ')}`);
}

function buildOptions(options) {
  const labels = options.map(rewardLabel);
  if (labels.length <= OPTIONS_INLINE_MAX) return el('div', 'tasks-reward-sub', labels.join(' · '));

  const details = el('details', 'tasks-reward-more');
  details.appendChild(el('summary', null, tf('tabs.tasks.ui.rewards.options', '{{n}} options', { n: labels.length })));
  details.appendChild(el('div', 'tasks-reward-sub', labels.join(' · ')));
  return details;
}

function buildReward(r) {
  const li = el('li', 'tasks-reward');
  li.appendChild(createRewardIcon(r, { className: 'tasks-reward-icon' }));

  const body = el('div', 'tasks-reward-body');
  body.appendChild(el('span', 'tasks-reward-name', (r.qty != null ? `${fmtQty(r.qty)} ` : '') + rewardLabel(r.name)));
  if (r.live) { const l = liveLine(r.live); if (l) body.appendChild(l); }
  if (Array.isArray(r.options) && r.options.length) body.appendChild(buildOptions(r.options));
  if (r.note) body.appendChild(el('div', 'tasks-reward-sub', noteText(r.note)));
  if (r.sub) body.appendChild(el('div', 'tasks-reward-sub', r.sub));   // runtime text (already translated)
  li.appendChild(body);

  if (r.chance != null) li.appendChild(el('span', 'tasks-reward-chance', fmtChance(r.chance)));
  return li;
}

function groupLabel(g) {
  const fallback = g.label ?? (g.id === 'tier' ? 'Tier {{n}}' : null);
  if (!g.id) return fallback;
  return tf(`tabs.tasks.ui.rewards.group.${g.id}`, fallback ?? g.id, { n: g.n });
}

// Which rows a group shows right now:
//   · rows with `when` (e.g. 'archon.nira') are dropped when the API says it's another week
//   · a `liveOnly` group shows just what the API reports (Teshin's offer of the week) and only
//     falls back to the full pool in the data file when the API has nothing
function visibleRewards(g) {
  if (g.liveOnly && g.live) {
    const rows = liveRows(g.live);
    if (rows) return { rewards: rows, isPool: false };
  }
  const shown = g.rewards.filter(r => !r.when || matchesWhen(r.when));
  return { rewards: shown.length ? shown : g.rewards, isPool: true };
}

function buildGroup(g) {
  const wrap = el('div', 'tasks-rewards-group');
  const { rewards, isPool } = visibleRewards(g);

  const head = el('div', 'tasks-rewards-group-head');
  const label = groupLabel(g);
  if (label) head.appendChild(el('span', 'tasks-rewards-group-label', label));
  if (g.meta != null) head.appendChild(el('span', 'tasks-rewards-group-meta',
    tf('tabs.tasks.ui.rewards.progress', '{{n}} progress', { n: fmtNumber(g.meta) })));
  if (g.kind === 'one' && isPool) head.appendChild(el('span', 'tasks-rewards-badge', tf('tabs.tasks.ui.rewards.one_of', 'One of')));
  if (g.note) head.appendChild(el('span', 'tasks-rewards-group-note', noteText(g.note)));
  if (head.childNodes.length) wrap.appendChild(head);

  if (g.live && !g.liveOnly) { const l = liveLine(g.live); if (l) wrap.appendChild(l); }

  const list = el('ul', 'tasks-rewards-list');
  rewards.forEach(r => list.appendChild(buildReward(r)));
  wrap.appendChild(list);
  return wrap;
}

function buildPanel() {
  const panel = el('div', 'tasks-rewards-panel');
  panel.setAttribute('role', 'tabpanel');
  return panel;
}

// Returns null when the task has no reward data (custom tasks).
export function buildRewardsSection(task) {
  const data = getRewards(task.id);
  if (!data?.tabs?.length) return null;

  const section = el('section', 'tasks-rewards');
  section.appendChild(el('h4', 'tasks-rewards-title', tf('tabs.tasks.ui.rewards.title', 'Potential rewards')));

  // Panels are filled the first time their tab is shown: label lookups are the slow part,
  // and most of the time only one tab is ever looked at.
  const panels = data.tabs.map(buildPanel);
  const filled = new Set();
  const fill = i => {
    if (filled.has(i)) return;
    filled.add(i);
    data.tabs[i].groups.forEach(g => panels[i].appendChild(buildGroup(g)));
  };

  if (data.tabs.length > 1) {
    const bar = el('div', 'tasks-rewards-tabs');
    bar.setAttribute('role', 'tablist');
    const buttons = data.tabs.map((tab, i) => {
      const b = el('button', 'tasks-rewards-tab', tf(`tabs.tasks.ui.rewards.tab.${tab.id}`, TAB_FALLBACK[tab.id] ?? tab.id));
      b.type = 'button';
      b.setAttribute('role', 'tab');
      b.onclick = () => select(i);
      bar.appendChild(b);
      return b;
    });
    const select = i => {
      fill(i);
      buttons.forEach((b, j) => b.setAttribute('aria-selected', String(i === j)));
      panels.forEach((p, j) => { p.hidden = i !== j; });
    };
    section.appendChild(bar);
    panels.forEach(p => section.appendChild(p));
    select(0);
  } else {
    fill(0);
    section.appendChild(panels[0]);
  }

  return section;
}