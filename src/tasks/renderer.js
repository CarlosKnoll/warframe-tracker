import { t, tOrRaw, tBaroItem } from '../i18n.js';
import { state } from './state.js';
import { addCustomTask } from './loader.js';
import { getOwned } from '../lib/storage.js';
import { initIcons, preloadIcons } from '../lib/icons.js';
import { calendarHasShard, shardBucket, toneOf, categoryOf, formatCountdown, resetTargetFor, taskLabel } from './helpers.js';
import { openTaskModal } from './modal.js';
import { createTaskIcon, collectTaskIconKeys } from './rewards/resolve.js';

// Logic lives in helpers.js now; re-exported so existing importers keep working.
export { calendarHasShard, shardBucket, toneOf };

// ─── Per-device UI state ───────────────────────────────────────────────────────
// Deliberately localStorage, NOT storage.js — anything going through storage.js is synced.
const UI_KEY = 'tasksUi';

function readUi() {
  try {
    const v = JSON.parse(localStorage.getItem(UI_KEY));
    return v && typeof v === 'object' ? v : {};
  } catch { return {}; }
}

function getUi(key, fallback = false) {
  const v = readUi()[key];
  return v === undefined ? fallback : v;
}

function setUi(key, value) {
  const ui = readUi();
  ui[key] = value;
  try { localStorage.setItem(UI_KEY, JSON.stringify(ui)); } catch { /* blocked/full — ignore */ }
}

// Recomputes every [data-count] badge from state — call after any check/uncheck/remove.
function refreshCounts() {
  document.querySelectorAll('#tasksSection [data-count]').forEach(el => {
    const list = state.tasks.filter(task => categoryOf(task) === el.dataset.count);
    const done = list.filter(x => x.checked).length;
    el.textContent = `${done}/${list.length}`;
    el.classList.toggle('is-complete', list.length > 0 && done === list.length);
  });
}

// ─── Countdown timer ───────────────────────────────────────────────────────────

let countdownInterval   = null;
let baroCountdownTarget = null;   // Date object set by buildBaroSection, ticked by startCountdowns

function startCountdowns() {
  function tick() {
    document.querySelectorAll('#tasksSection [data-reset-at]').forEach(el => {
      el.textContent = formatCountdown(Number(el.dataset.resetAt));
    });
    const baroEl = document.getElementById('tasks-baro-countdown');
    if (baroEl && baroCountdownTarget) baroEl.textContent = formatCountdown(baroCountdownTarget);
  }

  tick();
  countdownInterval = setInterval(tick, 1000);
}

function stopCountdowns() {
  if (countdownInterval !== null) {
    clearInterval(countdownInterval);
    countdownInterval = null;
  }
  baroCountdownTarget = null;
}

// ─── Baro Ki'teer section ──────────────────────────────────────────────────────

function buildItemsTable(items) {
  const tableWrap = document.createElement('div');
  tableWrap.className = 'tasks-baro-table-wrap';

  const table = document.createElement('table');
  table.className = 'tasks-baro-table';

  const colgroup = document.createElement('colgroup');
  [null, '80px', '100px'].forEach(w => {
    const col = document.createElement('col');
    if (w) col.style.width = w;
    colgroup.appendChild(col);
  });
  table.appendChild(colgroup);

  const thead = document.createElement('thead');
  const headRow = document.createElement('tr');
  [t('general.item'), t('general.ducats'), t('general.credits')].forEach((text, i) => {
    const th = document.createElement('th');
    th.textContent = text;
    if (i > 0) th.className = 'tasks-baro-col-num';
    headRow.appendChild(th);
  });
  thead.appendChild(headRow);
  table.appendChild(thead);

  const tbody = document.createElement('tbody');
  items.forEach(entry => {
    const tr = document.createElement('tr');

    const normalizedName = entry.uniqueName?.replace('/StoreItems/', '/');
    const isMastered = entry.category === 'weapon' &&
      normalizedName &&
      state.masteredSet.has(normalizedName);
    if (isMastered) tr.classList.add('is-mastered');

    const tdItem = document.createElement('td');
    tdItem.textContent = entry.displayName || '—';
    if (entry.isNewItem) tr.classList.add('tasks-baro-missing-locale');

    const tdDucats = document.createElement('td');
    tdDucats.className = 'tasks-baro-col-num';
    tdDucats.textContent = entry.ducats != null ? entry.ducats.toLocaleString() : '—';

    const tdCredits = document.createElement('td');
    tdCredits.className = 'tasks-baro-col-num';
    tdCredits.textContent = entry.credits != null ? entry.credits.toLocaleString() : '—';

    tr.appendChild(tdItem);
    tr.appendChild(tdDucats);
    tr.appendChild(tdCredits);
    tbody.appendChild(tr);
  });
  table.appendChild(tbody);
  tableWrap.appendChild(table);
  return tableWrap;
}

const CATEGORY_ORDER = ['weapon', 'mod', 'resource', 'prime', 'cosmetic', 'decoration', 'other'];

function buildBaroSection(baroData) {
  const section = document.createElement('section');
  section.className = 'tasks-baro tasks-card tasks-card--wide';

  const header = document.createElement('div');
  header.className = 'tasks-baro-header tasks-card-header';

  const title = document.createElement('h2');
  title.className = 'tasks-tier-title tasks-baro-title';
  title.textContent = t('tasks.ui.baro.title');
  header.appendChild(title);

  section.appendChild(header);

  if (!baroData || !baroData.activation || !baroData.expiry) {
    section.classList.add('tasks-baro--unavailable');
    const msg = document.createElement('span');
    msg.className = 'tasks-baro-unavailable';
    msg.textContent = t('tasks.baro.unavailable');
    section.appendChild(msg);
    return section;
  }

  const now        = Date.now();
  const activation = new Date(baroData.activation).getTime();
  const expiry     = new Date(baroData.expiry).getTime();
  const isActive   = now >= activation && now < expiry;

  if (isActive) {
    // ── Active state ──────────────────────────────────────────────────────────
    section.classList.add('tasks-baro--active');

    // Location badge
    if (baroData.location) {
      const loc = document.createElement('span');
      loc.className = 'tasks-baro-location';
      loc.textContent = baroData.location;
      header.appendChild(loc);
    }

    // "Leaves in" countdown
    const statusWrap = document.createElement('span');
    statusWrap.className = 'tasks-baro-status';
    statusWrap.textContent = t('tabs.tasks.ui.baro.leaves') + ' ';
    const cd = document.createElement('span');
    cd.className = 'tasks-baro-countdown tasks-tier-countdown';
    cd.id = 'tasks-baro-countdown';
    statusWrap.appendChild(cd);
    header.appendChild(statusWrap);
    baroCountdownTarget = new Date(expiry);

    // Inventory — grouped by category derived from locale keys
    const inventory = Array.isArray(baroData.inventory) ? baroData.inventory : [];
    const newItemIds = new Set(state.baroNewItemsSnapshot?.identifiers ?? []);

    // Group entries by category, preserving first-appearance order
    const newItems = [];
    const grouped = new Map();
    inventory.forEach(entry => {
      const { name, category, missing } = tBaroItem(entry.item);
      if (missing) { newItems.push({ ...entry, displayName: name, isNewItem: true }); return;}
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push({ ...entry, displayName: name, category, isNewItem: newItemIds.has(entry.item) });
    });

    // Sort categories by preferred display order
    const sortedCategories = [...grouped.keys()].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const inventoryWrap = document.createElement('div');
    inventoryWrap.className = 'tasks-baro-inventory';

    if (newItems.length) {
      const newGroup = document.createElement('div');
      newGroup.className = 'tasks-baro-category-group tasks-baro-new-group';
      newGroup.dataset.category = 'new';

      const newHeader = document.createElement('div');
      newHeader.className = 'tasks-baro-category-header';
      newHeader.textContent = t('tabs.tasks.ui.baro.newItems');
      newGroup.appendChild(newHeader);

      newGroup.appendChild(buildItemsTable(newItems));
      inventoryWrap.appendChild(newGroup);
    }

    sortedCategories.forEach(category => {
      const items = grouped.get(category);

      const catGroup = document.createElement('div');
      catGroup.className = 'tasks-baro-category-group';
      catGroup.dataset.category = category;

      const catHeader = document.createElement('div');
      catHeader.className = 'tasks-baro-category-header';
      catHeader.textContent = t(`category.${category}`);
      catGroup.appendChild(catHeader);

      catGroup.appendChild(buildItemsTable(items));
      inventoryWrap.appendChild(catGroup);
    });

    inventoryWrap.classList.add('tasks-card-body');
    section.appendChild(inventoryWrap);
    makeCollapsible(section, header, 'baro');
  } else {
    // ── Inactive state ────────────────────────────────────────────────────────
    section.classList.add('tasks-baro--inactive');

    const departed = now >= expiry;
    const statusWrap = document.createElement('span');
    statusWrap.className = 'tasks-baro-status';

    if (departed) {
      // Expiry passed but next activation not yet known (API not refreshed)
      statusWrap.textContent = t('tabs.tasks.ui.baro.departed');
    } else {
      statusWrap.textContent = t('tabs.tasks.ui.baro.arrives') + ' ';
      const cd = document.createElement('span');
      cd.className = 'tasks-baro-countdown tasks-tier-countdown';
      cd.id = 'tasks-baro-countdown';
      statusWrap.appendChild(cd);
      baroCountdownTarget = new Date(activation);
    }

    header.appendChild(statusWrap);
  }

  return section;
}

// ─── Add-task card ─────────────────────────────────────────────────────────────

const ADD_DESTINATIONS = [
  { value: 'daily',             tier: 'daily',  group: null,       shards: null,
    label: () => t('tasks.ui.daily') },
  { value: 'weekly:standard',   tier: 'weekly', group: 'standard', shards: null,
    label: () => `${t('tasks.ui.weekly')} · ${t('tasks.ui.standard')}` },
  { value: 'weekly:guaranteed', tier: 'weekly', group: 'archon',   shards: 'guaranteed',
    label: () => t('tabs.tasks.ui.shards.guaranteed') },
  { value: 'weekly:potential',  tier: 'weekly', group: 'archon',   shards: 'potential',
    label: () => t('tabs.tasks.ui.shards.potential') },
];

function buildAddCard() {
  const card = document.createElement('section');
  card.className = 'tasks-card tasks-card--add';

  const header = document.createElement('div');
  const titleEl = document.createElement('span');
  titleEl.className = 'tasks-tier-title';
  titleEl.textContent = t('tabs.tasks.ui.custom.add');
  header.appendChild(titleEl);

  const body = document.createElement('div');
  body.className = 'tasks-card-body';

  const row = document.createElement('div');
  row.className = 'tasks-add-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = t('tabs.tasks.ui.custom.placeholder');
  input.maxLength = 120;

  const select = document.createElement('select');
  select.setAttribute('aria-label', t('tabs.tasks.ui.custom.group.select'));
  ADD_DESTINATIONS.forEach(d => {
    const opt = document.createElement('option');
    opt.value = d.value;
    opt.textContent = d.label();
    select.appendChild(opt);
  });
  const lastDest = getUi('addDest', null);
  if (ADD_DESTINATIONS.some(d => d.value === lastDest)) select.value = lastDest;

  const addBtn = document.createElement('button');
  addBtn.className = 'tasks-add-btn';
  addBtn.textContent = t('tabs.tasks.ui.custom.add');

  const confirm = async () => {
    const label = input.value.trim();
    if (!label) return;
    const dest = ADD_DESTINATIONS.find(d => d.value === select.value);
    if (!dest) return;

    const newTask = await addCustomTask(label, dest.tier, dest.group, dest.shards);
    setUi('addDest', dest.value);
    await renderTasks();

    // bring the new tile into view
    const tile = document.querySelector(`#tasksSection .tasks-tile-wrap[data-task-id="${newTask.id}"]`);
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    tile?.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
  };

  addBtn.onclick = confirm;
  input.onkeydown = e => { if (e.key === 'Enter') confirm(); };

  row.append(input, select, addBtn);
  body.appendChild(row);
  card.append(header, body);
  makeCollapsible(card, header, 'add');
  return card;
}

// ─── Collapsible cards (Add task, Baro) ────────────────────────────────────────

function makeCollapsible(card, header, id, defaultOpen = false) {
  const key = `card:${id}`;
  const open = getUi(key, defaultOpen);

  card.classList.add('tasks-card');
  card.classList.toggle('is-open', open);

  header.classList.add('tasks-card-header');
  header.setAttribute('role', 'button');
  header.tabIndex = 0;
  header.setAttribute('aria-expanded', String(open));

  const chevron = document.createElement('span');
  chevron.className = 'tasks-card-chevron';
  chevron.setAttribute('aria-hidden', 'true');
  chevron.textContent = '▾';
  header.prepend(chevron);

  const toggle = () => {
    const nowOpen = card.classList.toggle('is-open');
    header.setAttribute('aria-expanded', String(nowOpen));
    setUi(key, nowOpen);
  };
  header.addEventListener('click', toggle);
  header.addEventListener('keydown', e => {
    if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); toggle(); }
  });
}

function buildCountEl(scope) {
  const el = document.createElement('span');
  el.className = 'tasks-count';
  el.dataset.count = scope;
  return el;
}

// ─── Tiles ─────────────────────────────────────────────────────────────────────

// Fixed display order for built-ins (matches the layout sketch). Custom tasks follow.
const CARD_ORDER = [
  'daily.forma', 'daily.sortie', 'daily.steelpath',
  'weekly.acrithis', 'weekly.yonta', 'weekly.circuit', 'weekly.ironwake', 'weekly.teshin',
  'weekly.calendar', 'weekly.archonhunt', 'weekly.bird3', 'weekly.netracells',
  'weekly.elitedeepa', 'weekly.elitetemporala', 'weekly.icebind', 'weekly.descendia',
];

const CATEGORY_RANK = { daily: 0, weekly: 1, archon: 2 };

function orderedTasks() {
  const rank = new Map(CARD_ORDER.map((id, i) => [id, i]));
  const builtIns = state.tasks
    .filter(task => rank.has(task.id))
    .sort((a, b) => rank.get(a.id) - rank.get(b.id));
  // custom tasks, plus any built-in added in a later version but not yet in CARD_ORDER
  const others = state.tasks
    .filter(task => !rank.has(task.id))
    .sort((a, b) => CATEGORY_RANK[categoryOf(a)] - CATEGORY_RANK[categoryOf(b)]);   // stable: creation order within a category
  return [...builtIns, ...others];
}

function makeSpan(className, text) {
  const el = document.createElement('span');
  el.className = className;
  if (text != null) el.textContent = text;
  return el;
}

// Small extra line under the name for tasks whose current reward is the point of the card.
function buildTileExtra(task) {
  if (task.liveData === 'steelPath') {                    // Teshin: this week's rotating reward
    const name = state.steelPathData?.currentReward?.name;
    if (!name) return null;
    const key = `tabs.tasks.ui.steelpath.item.${name}`;
    const tName = t(key, {});
    return makeSpan('tasks-tile-extra', tName !== key ? tName : name);
  }

  if (task.liveData === 'duviriCycle') {                  // Circuit: this week's incarnon weapons
    const choices = state.duviriCycleData?.choices;
    const hard = Array.isArray(choices) ? choices.find(c => c.category === 'hard') : null;
    if (!Array.isArray(hard?.choices) || !hard.choices.length) return null;

    const extra = makeSpan('tasks-tile-extra tasks-tile-extra--weapons');
    hard.choices.forEach((weaponName, i) => {
      if (i > 0) extra.appendChild(document.createTextNode(', '));
      const chip = makeSpan('tasks-tile-weapon' + (state.circuitObtained.includes(weaponName) ? ' is-obtained' : ''), weaponName);
      extra.appendChild(chip);
    });
    return extra;
  }

  return null;
}

function buildTile(task) {
  const wrap = document.createElement('div');
  wrap.className = 'tasks-tile-wrap';
  wrap.dataset.taskId = task.id;

  const tile = document.createElement('button');
  tile.type = 'button';
  tile.className = `tasks-tile tasks-tone--${toneOf(task)}` + (task.checked ? ' is-done' : '');
  tile.setAttribute('aria-haspopup', 'dialog');

  const head = makeSpan('tasks-tile-head');
  head.appendChild(createTaskIcon(task, { className: 'tasks-tile-icon' }));
  head.appendChild(makeSpan('tasks-tile-name', taskLabel(task)));
  // The faded look is visual only — say it out loud for screen readers too.
  if (task.checked) head.appendChild(makeSpan('tasks-sr-only', ' ' + tOrRaw('tabs.tasks.ui.modal.done', '(completed)')));
  tile.appendChild(head);

  const extra = buildTileExtra(task);
  if (extra) tile.appendChild(extra);

  const reset = makeSpan('tasks-tile-reset', t('tasks.ui.reset') + ' ');
  const countdown = makeSpan('tasks-tile-countdown');
  const target = resetTargetFor(task);
  if (target !== null) {
    countdown.dataset.resetAt = String(target);
    countdown.textContent = formatCountdown(target);
  } else {
    countdown.textContent = '—';
  }
  reset.appendChild(countdown);
  tile.appendChild(reset);

  tile.onclick = () => openTaskModal(task, { onClose: () => refreshTile(task.id) });

  wrap.appendChild(tile);
  return wrap;
}

// A freshly created <img> blinks for a frame while the browser decodes it, even from cache.
// So when a tile is rebuilt, the icon element that is already on screen moves into the new tile
// (as long as it still shows the same icon). This also keeps a cycling icon on the same frame.
function carryIcon(oldWrap, newWrap) {
  const oldIcon = oldWrap?.querySelector('.tasks-tile-icon');
  const newIcon = newWrap?.querySelector('.tasks-tile-icon');
  if (oldIcon && newIcon && oldIcon.dataset.wfKey === newIcon.dataset.wfKey) newIcon.replaceWith(oldIcon);
}

// Rebuilds one tile in place after its modal closes (check state, Circuit weapons, removal).
function refreshTile(taskId) {
  const wrap = document.querySelector(`#tasksSection .tasks-tile-wrap[data-task-id="${taskId}"]`);
  if (!wrap) return;   // a full re-render already replaced the grid

  const task = state.tasks.find(x => x.id === taskId);
  if (!task) {
    wrap.remove();     // custom task removed from the modal
  } else {
    const fresh = buildTile(task);
    carryIcon(wrap, fresh);
    wrap.replaceWith(fresh);
    fresh.querySelector('.tasks-tile')?.focus();
  }
  refreshCounts();
}

function buildLegend() {
  const legend = document.createElement('div');
  legend.className = 'tasks-legend';

  [['daily', 'tasks.ui.daily'], ['weekly', 'tasks.ui.weekly'], ['archon', 'tasks.ui.archon']].forEach(([cat, key]) => {
    const item = document.createElement('span');
    item.className = `tasks-legend-item tasks-tone--${cat}`;
    item.append(makeSpan('tasks-legend-swatch'), makeSpan('tasks-legend-name', t(key)), buildCountEl(cat));
    legend.appendChild(item);
  });

  return legend;
}

function buildGrid() {
  const grid = document.createElement('div');
  grid.className = 'tasks-grid';
  orderedTasks().forEach(task => grid.appendChild(buildTile(task)));
  return grid;
}

// ─── Public render ─────────────────────────────────────────────────────────────

export async function renderTasks() {
  initIcons();   // non-blocking: tiles show a placeholder until the icon manifest is ready
  preloadIcons(collectTaskIconKeys());   // background: load + decode every icon the modals will need (once)

  const owned = await getOwned();
  state.masteredSet = new Set(Object.keys(owned?.masteryMastered ?? {}));

  stopCountdowns();

  const container = document.querySelector('#tasksSection .tasks-content');
  if (!container) return;

  // keep the icons already on screen (see carryIcon) — a full re-render would otherwise make them all blink
  const previous = new Map([...container.querySelectorAll('.tasks-tile-wrap')].map(w => [w.dataset.taskId, w]));
  const grid = buildGrid();
  grid.querySelectorAll('.tasks-tile-wrap').forEach(w => carryIcon(previous.get(w.dataset.taskId), w));

  container.innerHTML = '';

  container.append(
    buildLegend(),
    grid,
    buildAddCard(),
    buildBaroSection(state.baroData),
  );

  refreshCounts();
  startCountdowns();
}