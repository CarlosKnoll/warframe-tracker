import { t, tOrRaw  } from '../i18n.js';
import { state } from './state.js';
import { toggleTask, addCustomTask, removeCustomTask } from './loader.js';

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

function buildBaroSection(baroData) {
  const section = document.createElement('section');
  section.className = 'tasks-baro';

  const header = document.createElement('div');
  header.className = 'tasks-baro-header';

  const title = document.createElement('h2');
  title.className = 'tasks-tier-title tasks-baro-title';
  title.textContent = t('tasks.baro.title');
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
    statusWrap.textContent = t('tasks.baro.leaves') + ' ';
    const cd = document.createElement('span');
    cd.className = 'tasks-baro-countdown tasks-tier-countdown';
    cd.id = 'tasks-baro-countdown';
    statusWrap.appendChild(cd);
    header.appendChild(statusWrap);
    baroCountdownTarget = new Date(expiry);

    // Inventory table
    const inventory = Array.isArray(baroData.inventory) ? baroData.inventory : [];
    const tableWrap = document.createElement('div');
    tableWrap.className = 'tasks-baro-table-wrap';

    const table = document.createElement('table');
    table.className = 'tasks-baro-table';

    const thead = document.createElement('thead');
    const headRow = document.createElement('tr');
    [t('tasks.baro.inventory.item'), t('tasks.baro.inventory.ducats'), t('tasks.baro.inventory.credits')].forEach((text, i) => {
      const th = document.createElement('th');
      th.textContent = text;
      if (i > 0) th.className = 'tasks-baro-col-num';
      headRow.appendChild(th);
    });
    thead.appendChild(headRow);
    table.appendChild(thead);

    const tbody = document.createElement('tbody');
    inventory.forEach(entry => {
      const tr = document.createElement('tr');

      const tdItem = document.createElement('td');
      tdItem.textContent = entry.item || '—';

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
    section.appendChild(tableWrap);

  } else {
    // ── Inactive state ────────────────────────────────────────────────────────
    section.classList.add('tasks-baro--inactive');

    const departed = now >= expiry;
    const statusWrap = document.createElement('span');
    statusWrap.className = 'tasks-baro-status';

    if (departed) {
      // Expiry passed but next activation not yet known (API not refreshed)
      statusWrap.textContent = t('tasks.baro.departed');
    } else {
      statusWrap.textContent = t('tasks.baro.arrives') + ' ';
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
      const type     = v.missionType || '';
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
      const type = m.type || '';
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
  const essence = t('tasks.steelpath.essence');

  // Rotating weekly reward
  const { name, cost } = steelData.currentReward;
  if (name) {
    const tName = t(`tasks.steelpath.item.${name}`, {});
    const label = tName !== `tasks.steelpath.item.${name}` ? tName : name;
    
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
        const tName = t(`tasks.steelpath.item.${e.name}`, {});
        const label = tName !== `tasks.steelpath.item.${e.name}` ? tName : e.name;
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

  const span = document.createElement('span');

  hard.choices.forEach((choice, i) => {
    const strong = document.createElement('strong');
    strong.textContent = choice;
    span.appendChild(strong);

    if (i < hard.choices.length - 1) {
      span.appendChild(document.createTextNode(' · '));
    }
  });

  return [span];
}

function translateCalendarReward(name) {
   const namespaces = [
     `tasks.calendar.item.${name}`,
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
 
    const prizeLabel = t('tasks.calendar.prizes.label');

    const strong = document.createElement('strong');
    strong.textContent = prizeLabel;

    lines.push(strong);
 
    for (const day of calendarData.days) {
      const prizes = day.events.filter(e => e.type === 'Big Prize!' && e.reward);
      if (!prizes.length) continue;
      const options = prizes.map(e => translateCalendarReward(e.reward));
      lines.push(options.join(` ${t('tasks.calendar.or')} `));
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
      strong.textContent = m.missionType;
      missionSpan.appendChild(strong);

      if (m.deviation?.key) {
        // deviation name + desc
        const devName = tOrRaw(`tasks.archimedea.deviation.${m.deviation.key}`, m.deviation.name);
        const devDesc = tOrRaw(`tasks.archimedea.deviation.${m.deviation.key}.desc`, m.deviation.description);
        missionSpan.appendChild(document.createTextNode(' · ' + devName));
        missionSpan.title = devDesc;
      }

      lines.push(missionSpan);

      if (Array.isArray(m.risks)) {
        m.risks.forEach(r => {
          const riskSpan = document.createElement('span');
          riskSpan.className = 'tasks-archimedea-risk' + (r.isHard ? ' tasks-archimedea-risk--hard' : '');
          // risk name + desc
          riskSpan.textContent = (r.isHard ? '⚠ ' : '· ') + tOrRaw(`tasks.archimedea.risk.${r.key}`, r.name);
          riskSpan.title = tOrRaw(`tasks.archimedea.risk.${r.key}.desc`, r.description);
          lines.push(riskSpan);
        });
      }
    });
  }

  if (Array.isArray(entry.personalModifiers) && entry.personalModifiers.length) {
    const modHeader = document.createElement('strong');
    // static label — stays as t()
    modHeader.textContent = t('tasks.archimedea.modifiers.label');
    lines.push(modHeader);

    entry.personalModifiers.forEach(mod => {
      const modSpan = document.createElement('span');
      modSpan.className = 'tasks-archimedea-modifier';
      // modifier name + desc
      modSpan.textContent = tOrRaw(`tasks.archimedea.modifier.${mod.key}`, mod.name);
      modSpan.title = tOrRaw(`tasks.archimedea.modifier.${mod.key}.desc`, mod.description);
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
        span.textContent = t('tasks.steelpath.incursions.reward');
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
    badge.textContent = n === 1 ? t('tasks.pulse.cost', { n }) : t('tasks.pulse.cost.plural', { n });
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

        if (line instanceof Node) {
            p.appendChild(line);
        } else {
            p.textContent = line;
        }

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
    };
    item.appendChild(removeBtn);
  }

  return item;
}

function createAddRow(tier, group) {
  const row = document.createElement('div');
  row.className = 'tasks-add-row';

  const input = document.createElement('input');
  input.type = 'text';
  input.placeholder = t('tasks.custom.placeholder');
  input.maxLength = 120;

  // Group selector — only shown for weekly tier
  let select = null;
  if (tier === 'weekly') {
    select = document.createElement('select');
    const optStd = document.createElement('option');
    optStd.value = 'standard';
    optStd.textContent = t('tasks.group.standard');
    const optArch = document.createElement('option');
    optArch.value = 'archon';
    optArch.textContent = t('tasks.group.archon');
    select.appendChild(optStd);
    select.appendChild(optArch);
    if (group) select.value = group;
  }

  const addBtn = document.createElement('button');
  addBtn.className = 'tasks-add-btn';
  addBtn.textContent = t('tasks.custom.add');

  const confirm = async () => {
    const label = input.value.trim();
    if (!label) return;
    const resolvedGroup = select ? select.value : group;
    const newTask = await addCustomTask(label, tier, resolvedGroup);

    // Find the correct list to insert into
    const targetGroup = resolvedGroup || 'none';
    const listId = `tasks-list-${tier}-${targetGroup}`;
    const list = document.getElementById(listId) || document.getElementById(`tasks-list-${tier}`);
    if (list) {
      const newItem = createTaskItem(newTask);
      // Insert before the add-row container's parent separator, or just append
      list.insertBefore(newItem, list.querySelector('.tasks-add-row') || null);
    }

    input.value = '';
  };

  addBtn.onclick = confirm;
  input.onkeydown = e => { if (e.key === 'Enter') confirm(); };

  row.appendChild(input);
  if (select) row.appendChild(select);
  row.appendChild(addBtn);

  return row;
}

// ─── Tier builders ─────────────────────────────────────────────────────────────

function buildDailyTier(tasks) {
  const tier = document.createElement('section');
  tier.className = 'tasks-tier';

  // Header
  const header = document.createElement('div');
  header.className = 'tasks-tier-header';

  const title = document.createElement('h2');
  title.className = 'tasks-tier-title';
  title.textContent = t('tasks.tier.daily');

  const resetLabel = document.createElement('span');
  resetLabel.className = 'tasks-tier-reset';
  resetLabel.textContent = t('tasks.reset.daily') + ' ';

  const countdown = document.createElement('span');
  countdown.id = 'tasks-countdown-daily';
  countdown.className = 'tasks-tier-countdown';
  resetLabel.appendChild(countdown);

  header.appendChild(title);
  header.appendChild(resetLabel);
  tier.appendChild(header);

  // Body
  const body = document.createElement('div');
  body.className = 'tasks-tier-body';
  body.id = 'tasks-list-daily';

  tasks.forEach(task => body.appendChild(createTaskItem(task)));
  body.appendChild(createAddRow('daily', null));

  tier.appendChild(body);
  return tier;
}

function buildWeeklyTier(tasks) {
  const tier = document.createElement('section');
  tier.className = 'tasks-tier';

  // Header
  const header = document.createElement('div');
  header.className = 'tasks-tier-header';

  const title = document.createElement('h2');
  title.className = 'tasks-tier-title';
  title.textContent = t('tasks.tier.weekly');

  const resetLabel = document.createElement('span');
  resetLabel.className = 'tasks-tier-reset';
  resetLabel.textContent = t('tasks.reset.weekly') + ' ';

  const countdown = document.createElement('span');
  countdown.id = 'tasks-countdown-weekly';
  countdown.className = 'tasks-tier-countdown';
  resetLabel.appendChild(countdown);

  header.appendChild(title);
  header.appendChild(resetLabel);
  tier.appendChild(header);

  // Body — two groups: standard and archon
  const body = document.createElement('div');
  body.className = 'tasks-tier-body';

  const standard = tasks.filter(task => task.group === 'standard');
  const archon   = tasks.filter(task => task.group === 'archon');

  // Standard group
  const stdGroup = buildWeeklyGroup('standard', standard);
  body.appendChild(stdGroup);

  // Archon group
  const archGroup = buildWeeklyGroup('archon', archon);
  body.appendChild(archGroup);

  tier.appendChild(body);
  return tier;
}

function buildWeeklyGroup(groupKey, tasks) {
  const group = document.createElement('div');
  group.className = 'tasks-group';

  const groupHeader = document.createElement('div');
  groupHeader.className = 'tasks-group-header';
  groupHeader.textContent = t(`tasks.group.${groupKey}`);
  group.appendChild(groupHeader);

  const list = document.createElement('div');
  list.className = 'tasks-group-list';
  list.id = `tasks-list-weekly-${groupKey}`;

  // For archon group, separate search-pulse subgroup
  if (groupKey === 'archon') {
    const nonPulse = tasks.filter(task => task.subgroup !== 'searchpulse');
    const pulse    = tasks.filter(task => task.subgroup === 'searchpulse');

    nonPulse.forEach(task => list.appendChild(createTaskItem(task)));

    if (pulse.length) {
      const pulseHeader = document.createElement('div');
      pulseHeader.className = 'tasks-subgroup-header';
      pulseHeader.textContent = t('tasks.subgroup.searchpulse');
      list.appendChild(pulseHeader);

      pulse.forEach(task => list.appendChild(createTaskItem(task)));
    }
  } else {
    tasks.forEach(task => list.appendChild(createTaskItem(task)));
  }

  list.appendChild(createAddRow('weekly', groupKey));
  group.appendChild(list);

  return group;
}

// ─── Public render ─────────────────────────────────────────────────────────────

export function renderTasks() {
  stopCountdowns();

  const container = document.querySelector('#tasksSection .tasks-content');
  if (!container) return;
  container.innerHTML = '';

  const daily  = state.tasks.filter(task => task.tier === 'daily');
  const weekly = state.tasks.filter(task => task.tier === 'weekly');

  container.appendChild(buildDailyTier(daily));
  container.appendChild(buildWeeklyTier(weekly));
  container.appendChild(buildBaroSection(state.baroData));

  startCountdowns();
}