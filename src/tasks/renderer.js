import { t, tOrRaw, tGameMode, tBaroItem } from '../i18n.js';
import { state } from './state.js';
import { toggleTask, addCustomTask, removeCustomTask, toggleCircuitWeapon } from './loader.js';
import { getOwned } from '../lib/storage.js';

// ─── Bucket resolvers for archon shards ───────────────────────────────────────────────────────────

export function calendarHasShard(cal) {
  if (!Array.isArray(cal?.days)) return null;   // null = unknown (fetch failed)
  return cal.days.some(d => d.events?.some(e => /ArchonCrystal/.test(e.uniqueName ?? '')));
}

export function shardBucket(task) {
  if (task.custom) return task.shards ?? null;          // custom: user's choice
  if (task.shards === 'dynamic') {
    const has = calendarHasShard(state.calendarData);
    return has === null ? 'potential' : has ? 'guaranteed' : null;  // null = standard list
  }
  return task.shards ?? null;
}

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

// Weekly bucket: 'guaranteed' | 'potential' | null (null = standard list).
// Custom archon tasks created before the destination selector have no `shards`.
function weeklyBucket(task) {
  const b = shardBucket(task);
  if (b) return b;
  return task.custom && task.group === 'archon' ? 'guaranteed' : null;
}

function scopeTasks(scope) {
  const all = state.tasks;
  if (scope === 'daily')  return all.filter(x => x.tier === 'daily');
  if (scope === 'weekly') return all.filter(x => x.tier === 'weekly' && !weeklyBucket(x));
  return all.filter(x => x.tier === 'weekly' && weeklyBucket(x) === scope); // guaranteed | potential
}

// Recomputes every [data-count] badge from state — call after any check/uncheck/remove.
function refreshCounts() {
  document.querySelectorAll('#tasksSection [data-count]').forEach(el => {
    const list = scopeTasks(el.dataset.count);
    const done = list.filter(x => x.checked).length;
    el.textContent = `${done}/${list.length}`;
    el.classList.toggle('is-complete', list.length > 0 && done === list.length);
  });
}

// ─── Countdown timer ───────────────────────────────────────────────────────────

let countdownInterval   = null;
let baroCountdownTarget = null;   // Date object set by buildBaroSection, ticked by startCountdowns

function getNextDailyReset() {
  const now = new Date();
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + 1));
  return next;
}

function getNextWeeklyReset() {
  const now = new Date();
  const day = now.getUTCDay(); // 0=Sun … 6=Sat
  const daysUntilMonday = day === 0 ? 1 : 8 - day;
  const next = new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), now.getUTCDate() + daysUntilMonday));
  return next;
}

function formatCountdown(targetDate) {
  const diff = targetDate - Date.now();
  if (diff <= 0) return '00:00:00';

  const totalSeconds = Math.floor(diff / 1000);
  const days    = Math.floor(totalSeconds / 86400);
  const hours   = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  const hh = String(hours).padStart(2, '0');
  const mm = String(minutes).padStart(2, '0');
  const ss = String(seconds).padStart(2, '0');

  return days > 0 ? `${days}d ${hh}:${mm}:${ss}` : `${hh}:${mm}:${ss}`;
}

function startCountdowns() {
  const dailyTarget  = getNextDailyReset();
  const weeklyTarget = getNextWeeklyReset();

  function tick() {
    const dailyEl  = document.getElementById('tasks-countdown-daily');
    const weeklyEl = document.getElementById('tasks-countdown-weekly');
    const baroEl   = document.getElementById('tasks-baro-countdown');
    if (dailyEl)  dailyEl.textContent  = formatCountdown(dailyTarget);
    if (weeklyEl) weeklyEl.textContent = formatCountdown(weeklyTarget);
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
    msg.textContent = t('tasks.ui.baro.unavailable');
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
    statusWrap.textContent = t('tasks.ui.baro.leaves') + ' ';
    const cd = document.createElement('span');
    cd.className = 'tasks-baro-countdown tasks-tier-countdown';
    cd.id = 'tasks-baro-countdown';
    statusWrap.appendChild(cd);
    header.appendChild(statusWrap);
    baroCountdownTarget = new Date(expiry);

    // Inventory — grouped by category derived from locale keys
    const inventory = Array.isArray(baroData.inventory) ? baroData.inventory : [];

    // Group entries by category, preserving first-appearance order
    const grouped = new Map();
    inventory.forEach(entry => {
      const { name, category, missing } = tBaroItem(entry.item);
      if (!grouped.has(category)) grouped.set(category, []);
      grouped.get(category).push({ ...entry, displayName: name, isMissingLocale: missing });
    });

    // Sort categories by preferred display order
    const sortedCategories = [...grouped.keys()].sort((a, b) => {
      const ai = CATEGORY_ORDER.indexOf(a);
      const bi = CATEGORY_ORDER.indexOf(b);
      return (ai === -1 ? 999 : ai) - (bi === -1 ? 999 : bi);
    });

    const inventoryWrap = document.createElement('div');
    inventoryWrap.className = 'tasks-baro-inventory';

    sortedCategories.forEach(category => {
      const items = grouped.get(category);

      // Category group: header + bordered table wrap
      const catGroup = document.createElement('div');
      catGroup.className = 'tasks-baro-category-group';
      catGroup.dataset.category = category;

      const catHeader = document.createElement('div');
      catHeader.className = 'tasks-baro-category-header';
      catHeader.textContent = t(`category.${category}`);
      catGroup.appendChild(catHeader);

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
        const isMastered = category === 'weapon' &&
          normalizedName &&
          state.masteredSet.has(normalizedName);

        if (isMastered) tr.classList.add('is-mastered');

        const tdItem = document.createElement('td');
        tdItem.textContent = entry.displayName || '—';
        if (entry.isMissingLocale) tr.classList.add('tasks-baro-missing-locale');

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
      catGroup.appendChild(tableWrap);
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
      statusWrap.textContent = t('tasks.ui.baro.departed');
    } else {
      statusWrap.textContent = t('tasks.ui.baro.arrives') + ' ';
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

// ─── Live data enrichment ──────────────────────────────────────────────────────

function buildSortieDesc(sortieData) {
  if (!sortieData) return null;

  const lines = [];

  if (Array.isArray(sortieData.variants)) {
    sortieData.variants.forEach(v => {
      const node     = v.node || '';
      const type     = tGameMode(v.missionType || '');
      const modifier = v.modifier || '';

      if (node || type) {
        const span = document.createElement('span');

        // Bold node + type
        const strong = document.createElement('strong');
        strong.textContent = `${node} — ${type}`;
        span.appendChild(strong);

        // Normal modifier
        if (modifier) {
          span.appendChild(document.createTextNode(' · ' + modifier));
        }

        lines.push(span);
      }
    });
  }

  return lines.length ? lines : null;
}

function buildArchonDesc(archonData) {
  if (!archonData) return null;
  const lines = [];

  if (Array.isArray(archonData.missions)) {
    archonData.missions.forEach(m => {
      const node = m.node || '';
      const type = tGameMode(m.type || '');
      if (node || type) {
        const span = document.createElement('span');

        // Bold node + type
        const strong = document.createElement('strong');
        strong.textContent = `${node} — ${type}`;
        span.appendChild(strong);

        lines.push(span);
      }
    });
  }
  return lines.length ? lines : null;
}

function buildSteelPathDesc(steelData) {
  if (!steelData || !steelData.currentReward) return null;
  const lines = [];
  const essence = t('tasks.ui.steelpath.essence');

  // Rotating weekly reward
  const { name, cost } = steelData.currentReward;
  if (name) {
    const tName = t(`tasks.ui.steelpath.item.${name}`, {});
    const label = tName !== `tasks.ui.steelpath.item.${name}` ? tName : name;
    
    const strong = document.createElement('strong');
    strong.textContent = `${label}${cost != null ? ' · ' + cost + ' ' + essence : ''}`;
    lines.push(strong);
  }

  // Selected evergreen wares
  const EVERGREEN_KEYS = new Set([
    'Veiled Riven Cipher',
    '10k Kuva',
    'Primary Arcane Adapter',
    'Secondary Arcane Adapter',
    'Relic Pack',
    'Stance Forma Blueprint',
  ]);

  if (Array.isArray(steelData.evergreens)) {
    const relevant = steelData.evergreens.filter(e => EVERGREEN_KEYS.has(e.name));
    if (relevant.length) {
      relevant.forEach(e => {
        const tName = t(`tasks.ui.steelpath.item.${e.name}`, {});
        const label = tName !== `tasks.ui.steelpath.item.${e.name}` ? tName : e.name;
        lines.push(`${label}${e.cost != null ? ' · ' + e.cost + ' ' + essence : ''}`);
      });
    }
  }

  return lines.length ? lines : null;
}

function buildDuviriCircuitDesc(duviriData) {
  if (!duviriData || !Array.isArray(duviriData.choices)) return null;

  const hard = duviriData.choices.find(c => c.category === 'hard');
  if (!hard || !Array.isArray(hard.choices) || hard.choices.length === 0) return null;

  const wrapper = document.createElement('span');
  wrapper.className = 'tasks-circuit-weapons';

  hard.choices.forEach((weaponName, i) => {
    const isObtained = state.circuitObtained.includes(weaponName);

    const chip = document.createElement('button');
    chip.className = 'tasks-circuit-weapon' + (isObtained ? ' is-obtained' : '');
    chip.textContent = weaponName;
    chip.title = isObtained ? t('tasks.ui.circuit.weapon.mark_not_obtained') : t('tasks.ui.circuit.weapon.mark_obtained');

    chip.onclick = async () => {
      await toggleCircuitWeapon(weaponName);
      const nowObtained = state.circuitObtained.includes(weaponName);
      chip.classList.toggle('is-obtained', nowObtained);
      chip.title = nowObtained ? t('tasks.ui.circuit.weapon.mark_not_obtained') : t('tasks.ui.circuit.weapon.mark_obtained');
    };

    wrapper.appendChild(chip);

    if (i < hard.choices.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'tasks-circuit-sep';
      sep.textContent = '·';
      wrapper.appendChild(sep);
    }
  });

  return [wrapper];
}

function translateCalendarReward(name) {
   const namespaces = [
     `tasks.ui.calendar.item.${name}`,
     `arcane.${name}`,
     `item.${name}`,
   ];
   for (const key of namespaces) {
     const result = t(key);
     if (result !== key) return result;
   }
   return name;
}

function buildCalendarDesc(calendarData) {
    if (!calendarData || !Array.isArray(calendarData.days)) return null;
    const lines = [];
 
    const prizeLabel = t('tasks.ui.calendar.prizes.label');

    const strong = document.createElement('strong');
    strong.textContent = prizeLabel;

    lines.push(strong);
 
    for (const day of calendarData.days) {
      const prizes = day.events.filter(e => e.type === 'Big Prize!' && e.reward);
      if (!prizes.length) continue;
      const options = prizes.map(e => translateCalendarReward(e.reward));
      lines.push(options.join(` ${t('general.or')} `));
    }
 
    return lines.length ? lines : null;
}

function buildArchimedeasDesc(archimedeasData, typeKey) {
  if (!Array.isArray(archimedeasData)) return null;

  const entry = archimedeasData.find(e => e.typeKey === typeKey);
  if (!entry) return null;

  const lines = [];

  if (Array.isArray(entry.missions)) {
    entry.missions.forEach(m => {
      const missionSpan = document.createElement('span');
      const strong = document.createElement('strong');
      strong.textContent = tGameMode(m.missionType);
      missionSpan.appendChild(strong);

      if (m.deviation?.key) {
        // deviation name + desc
        const devName = tOrRaw(`tasks.ui.archimedea.deviation.${m.deviation.key}`, m.deviation.name);
        const devDesc = tOrRaw(`tasks.ui.archimedea.deviation.${m.deviation.key}.desc`, m.deviation.description);
        missionSpan.appendChild(document.createTextNode(' · ' + devName));
        missionSpan.title = devDesc;
      }

      lines.push(missionSpan);

      if (Array.isArray(m.risks)) {
        m.risks.forEach(r => {
          const riskSpan = document.createElement('span');
          riskSpan.className = 'tasks-archimedea-risk' + (r.isHard ? ' tasks-archimedea-risk--hard' : '');
          // risk name + desc
          riskSpan.textContent = (r.isHard ? '⚠ ' : '· ') + tOrRaw(`tasks.ui.archimedea.risk.${r.key}`, r.name);
          riskSpan.title = tOrRaw(`tasks.ui.archimedea.risk.${r.key}.desc`, r.description);
          lines.push(riskSpan);
        });
      }
    });
  }

  if (Array.isArray(entry.personalModifiers) && entry.personalModifiers.length) {
    const modHeader = document.createElement('strong');
    // static label — stays as t()
    modHeader.textContent = t('tasks.ui.archimedea.modifiers.label');
    lines.push(modHeader);

    entry.personalModifiers.forEach(mod => {
      const modSpan = document.createElement('span');
      modSpan.className = 'tasks-archimedea-modifier';
      // modifier name + desc
      modSpan.textContent = tOrRaw(`tasks.ui.archimedea.modifier.${mod.key}`, mod.name);
      modSpan.title = tOrRaw(`tasks.ui.archimedea.modifier.${mod.key}.desc`, mod.description);
      lines.push(modSpan);
    });
  }

  return lines.length ? lines : null;
}

function getLiveLines(task) {
  switch (task.liveData) {
    case 'sortie':                  return buildSortieDesc(state.sortieData);
    case 'archonHunt':              return buildArchonDesc(state.archonHuntData);
    case 'steelPath':               return buildSteelPathDesc(state.steelPathData);
    case 'duviriCycle':             return buildDuviriCircuitDesc(state.duviriCycleData);
    case 'steelPathIncursions': {
        const span = document.createElement('strong');
        span.textContent = t('tasks.ui.steelpath.incursions.reward');
        return [span];
    }
    case 'calendar':                return buildCalendarDesc(state.calendarData);
    case 'archimedea.deepa':        return buildArchimedeasDesc(state.archimedeasData, 'C T_ L A B');
    case 'archimedea.temporala':    return buildArchimedeasDesc(state.archimedeasData, 'C T_ H E X');
    default:                        return null;
  }
}

// ─── DOM helpers ───────────────────────────────────────────────────────────────

function createTaskItem(task) {
  const label = task.custom ? task.customLabel : t(task.labelKey);
  const desc  = task.custom ? null : t(task.descKey);

  const item = document.createElement('div');
  item.className = 'tasks-item' + (task.checked ? ' is-done' : '');
  item.dataset.taskId = task.id;

  // Checkbox button
  const checkbox = document.createElement('button');
  checkbox.className = 'tasks-checkbox';
  checkbox.setAttribute('aria-label', label);
  checkbox.setAttribute('aria-pressed', String(task.checked));
  checkbox.onclick = async () => {
    await toggleTask(task.id);
    item.classList.toggle('is-done', task.checked);
    checkbox.setAttribute('aria-pressed', String(task.checked));
    refreshCounts();
  };

  const checkmark = document.createElement('span');
  checkmark.className = 'tasks-checkmark';
  checkbox.appendChild(checkmark);

  // Text column
  const textCol = document.createElement('div');
  textCol.className = 'tasks-item-text';

  const labelEl = document.createElement('span');
  labelEl.className = 'tasks-item-label';
  labelEl.textContent = label;
  textCol.appendChild(labelEl);

  // Pulse cost badge (search pulse sub-items)
  if (task.pulsesCost != null) {
    const badge = document.createElement('span');
    badge.className = 'tasks-pulse-cost';
    const n = task.pulsesCost;
    badge.textContent = n === 1 ? t('tasks.ui.pulse.cost', { n }) : t('tasks.ui.pulse.cost.plural', { n });
    labelEl.appendChild(badge);
  }

  // Static reward badge (e.g. Cryobell on Icebind)
  if (task.badge) {
    const key = `tabs.tasks.ui.badge.${task.badge}`;
    const text = t(key);
    const badge = document.createElement('span');
    badge.className = `tasks-badge tasks-badge--${task.badge}`;
    badge.textContent = text !== key ? text : task.badge.charAt(0).toUpperCase() + task.badge.slice(1);
    labelEl.appendChild(badge);
  }

  // Static description
  if (desc && desc !== task.descKey) {
    const descEl = document.createElement('span');
    descEl.className = 'tasks-item-desc';
    descEl.textContent = desc;
    textCol.appendChild(descEl);
  }

  // Live enrichment lines
  const liveLines = getLiveLines(task);
  if (liveLines) {
    const liveEl = document.createElement('div');
    liveEl.className = 'tasks-item-live';
    liveLines.forEach(line => {
      const p = document.createElement('span');
      p.className = 'tasks-item-live-line';
      if (line instanceof Node) p.appendChild(line);
      else p.textContent = line;
      liveEl.appendChild(p);
    });
    textCol.appendChild(liveEl);
  }

  item.appendChild(checkbox);
  item.appendChild(textCol);

  // Remove button for custom tasks
  if (task.custom) {
    const removeBtn = document.createElement('button');
    removeBtn.className = 'tasks-item-remove';
    removeBtn.textContent = '✕';
    removeBtn.title = 'Remove task';
    removeBtn.onclick = async () => {
      await removeCustomTask(task.id);
      item.remove();
      refreshCounts();
    };
    item.appendChild(removeBtn);
  }

  return item;
}

// ─── Add-task card ─────────────────────────────────────────────────────────────

const ADD_DESTINATIONS = [
  { value: 'daily',             tier: 'daily',  group: null,       shards: null,         card: 'daily',
    label: () => t('tasks.ui.daily') },
  { value: 'weekly:standard',   tier: 'weekly', group: 'standard', shards: null,         card: 'weekly',
    label: () => `${t('tasks.ui.weekly')} · ${t('tasks.ui.standard')}` },
  { value: 'weekly:guaranteed', tier: 'weekly', group: 'archon',   shards: 'guaranteed', card: 'archon',
    label: () => t('tabs.tasks.ui.shards.guaranteed') },
  { value: 'weekly:potential',  tier: 'weekly', group: 'archon',   shards: 'potential',  card: 'archon',
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

    await addCustomTask(label, dest.tier, dest.group, dest.shards);
    setUi('addDest', dest.value);
    // open the block the task landed in so it is visible
    const blockId = dest.shards ?? (dest.tier === 'daily' ? 'daily' : 'weekly');
    setUi(`card:${blockId}`, true);
    await renderTasks();
    revealBlock(blockId);
  };

  addBtn.onclick = confirm;
  input.onkeydown = e => { if (e.key === 'Enter') confirm(); };

  row.append(input, select, addBtn);
  body.appendChild(row);
  card.append(header, body);
  makeCollapsible(card, header, 'add');
  return card;
}

// ─── Card builders ─────────────────────────────────────────────────────────────

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

function buildResetEl(countdownId) {
  const reset = document.createElement('span');
  reset.className = 'tasks-tier-reset';
  reset.textContent = t('tasks.ui.reset') + ' ';

  const countdown = document.createElement('span');
  countdown.id = countdownId;
  countdown.className = 'tasks-tier-countdown';
  reset.appendChild(countdown);
  return reset;
}

// ─── Dock + board ──────────────────────────────────────────────────────────────
// Dock: permanent toggle buttons that never move.
// Board: the open blocks, flowed into one column per open block (see syncDock).

const isBlockOpen = id => getUi(`card:${id}`, false);

function setBlockOpen(id, open) {
  setUi(`card:${id}`, open);
  document.querySelector(`#tasksSection .tasks-block[data-block="${id}"]`)
    ?.classList.toggle('is-open', open);
}

// Scrolls a freshly opened block into view, leaving room for the sticky dock.
function revealBlock(id) {
  const block = document.querySelector(`#tasksSection .tasks-block[data-block="${id}"]`);
  if (!block) return;
  const dock = document.querySelector('#tasksSection .tasks-dock');
  block.style.scrollMarginTop = `${(dock?.offsetHeight ?? 0) + 12}px`;
  const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  block.scrollIntoView({ behavior: reduceMotion ? 'auto' : 'smooth', block: 'nearest' });
}

// Opens all given blocks if none is open, otherwise closes them all.
function toggleBlocks(ids) {
  const open = !ids.some(isBlockOpen);
  ids.forEach(id => setBlockOpen(id, open));
  syncDock();
  if (open) revealBlock(ids[0]);
}

function syncDock() {
  document.querySelectorAll('#tasksSection [data-dock]').forEach(btn => {
    const active = btn.dataset.dock.split(',').some(isBlockOpen);
    btn.classList.toggle('is-active', active);
    btn.setAttribute('aria-pressed', String(active));
  });

  const board = document.querySelector('#tasksSection .tasks-board');
  if (!board) return;
  board.classList.toggle('is-empty', !board.querySelector('.tasks-block.is-open'));
}

function buildDockButton(ids, title, meta = [], extraClass = '') {
  const btn = document.createElement('button');
  btn.type = 'button';
  btn.className = `tasks-dock-btn ${extraClass}`.trim();
  btn.dataset.dock = ids.join(',');
  btn.onclick = () => toggleBlocks(ids);

  if (title) {
    const titleEl = document.createElement('span');
    titleEl.className = 'tasks-tier-title';
    titleEl.textContent = title;
    btn.appendChild(titleEl);
  }
  if (meta.length) {
    const metaEl = document.createElement('span');
    metaEl.className = 'tasks-dock-meta';
    meta.forEach(el => metaEl.appendChild(el));
    btn.appendChild(metaEl);
  }
  return btn;
}

function buildDock() {
  const dock = document.createElement('div');
  dock.className = 'tasks-dock';

  const daily  = buildDockButton(['daily'],  t('tasks.ui.daily'),
    [buildCountEl('daily'),  buildResetEl('tasks-countdown-daily')]);
  const weekly = buildDockButton(['weekly'], t('tasks.ui.weekly'),
    [buildCountEl('weekly'), buildResetEl('tasks-countdown-weekly')]);

  const archon = document.createElement('div');
  archon.className = 'tasks-dock-group';
  archon.appendChild(buildDockButton(['guaranteed', 'potential'], t('tasks.ui.archon')));
  ['guaranteed', 'potential'].forEach(bucket => {
    const chip = buildDockButton([bucket], null, [buildCountEl(bucket)],
      `tasks-dock-chip tasks-dock-chip--${bucket}`);
    const label = t(`tabs.tasks.ui.shards.${bucket}`);
    chip.title = label;
    chip.setAttribute('aria-label', label);
    archon.appendChild(chip);
  });

  dock.append(daily, weekly, archon);
  return dock;
}

function buildBlockHeader(title, scope, extraClass = '') {
  const header = document.createElement('div');
  header.className = `tasks-block-header ${extraClass}`.trim();

  const titleEl = document.createElement('span');
  titleEl.className = 'tasks-tier-title';
  titleEl.textContent = title;

  header.append(titleEl, buildCountEl(scope));
  return header;
}

function buildBlock(id, header, body) {
  const block = document.createElement('section');
  block.className = 'tasks-block' + (isBlockOpen(id) ? ' is-open' : '');
  block.dataset.block = id;
  body.classList.add('tasks-block-body');
  block.append(header, body);
  return block;
}

function buildSimpleBlock(id, title, tasks) {
  const body = document.createElement('div');
  tasks.forEach(task => body.appendChild(createTaskItem(task)));
  return buildBlock(id, buildBlockHeader(title, id), body);
}

function buildShardBlock(bucket, tasks) {
  const body = document.createElement('div');

  const SUBGROUPS = ['searchpulse', 'cryobell'];
  tasks.filter(task => !SUBGROUPS.includes(task.subgroup))
       .forEach(task => body.appendChild(createTaskItem(task)));

  SUBGROUPS.forEach(sub => {
    const items = tasks.filter(task => task.subgroup === sub);
    if (!items.length) return;
    const subHeader = document.createElement('div');
    subHeader.className = `tasks-subgroup-header tasks-subgroup-header--${sub}`;
    subHeader.textContent = sub === 'cryobell'
      ? t('tabs.tasks.ui.cryobell.header', { n: 3 })
      : t('tabs.tasks.ui.searchpulse');
    body.appendChild(subHeader);
    items.forEach(task => body.appendChild(createTaskItem(task)));
  });

  const header = buildBlockHeader(
    t(`tabs.tasks.ui.shards.${bucket}`), bucket, `tasks-block-header--${bucket}`);
  return buildBlock(bucket, header, body);
}

function buildBoard(daily, weekly) {
  const board = document.createElement('div');
  board.className = 'tasks-board';
  board.append(
    buildSimpleBlock('daily',  t('tasks.ui.daily'),  daily),
    buildSimpleBlock('weekly', t('tasks.ui.weekly'), weekly.filter(task => !weeklyBucket(task))),
    buildShardBlock('guaranteed', weekly.filter(task => weeklyBucket(task) === 'guaranteed')),
    buildShardBlock('potential',  weekly.filter(task => weeklyBucket(task) === 'potential')),
  );
  return board;
}

// ─── Public render ─────────────────────────────────────────────────────────────

export async function renderTasks() {
  const owned = await getOwned();
  state.masteredSet = new Set(Object.keys(owned?.masteryMastered ?? {}));

  stopCountdowns();

  const container = document.querySelector('#tasksSection .tasks-content');
  if (!container) return;
  container.innerHTML = '';

  const daily  = state.tasks.filter(task => task.tier === 'daily');
  const weekly = state.tasks.filter(task => task.tier === 'weekly');

  container.append(
    buildDock(),
    buildBoard(daily, weekly),
    buildAddCard(),
    buildBaroSection(state.baroData),
  );

  refreshCounts();
  syncDock();
  startCountdowns();
}