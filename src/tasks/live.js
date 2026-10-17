// src/tasks/live.js
//
// Live-data enrichment lines for the task modal (sortie missions, archon hunt, Teshin
// stock, Circuit weapons, Calendar prizes, Archimedea risks).
// Each builder returns an array of DOM nodes / strings, or null when data is unavailable.
// Moved verbatim out of renderer.js; the only change is the `export` on getLiveLines.

import { t, tOrRaw, tGameMode } from '../i18n.js';
import { state } from './state.js';
import { toggleCircuitWeapon } from './loader.js';
import { tf } from './helpers.js';

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
  const essence = t('tabs.tasks.ui.steelpath.essence');

  // Rotating weekly reward
  const { name, cost } = steelData.currentReward;
  if (name) {
    const key = `tabs.tasks.ui.steelpath.item.${name}`;
    const tName = t(key, {});
    const label = tName !== key ? tName : name;
    
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
        const key = `tabs.tasks.ui.steelpath.item.${e.name}`;
        const tName = t(key, {});
        const label = tName !== key ? tName : e.name;
        lines.push(`${label}${e.cost != null ? ' · ' + e.cost + ' ' + essence : ''}`);
      });
    }
  }

  return lines.length ? lines : null;
}

// One labelled row of gold chips.
//   toggleable = true  → Steel Path Incarnon weapons: buttons, state kept in circuitObtained (synced)
//   toggleable = false → this week's Normal Warframes: display-only, nothing is stored
function buildChipRow(label, names, toggleable) {
  const row = document.createElement('span');
  row.className = 'tasks-circuit-row';

  const labelEl = document.createElement('strong');
  labelEl.className = 'tasks-circuit-row-label';
  labelEl.textContent = label;
  row.appendChild(labelEl);

  const wrapper = document.createElement('span');
  wrapper.className = 'tasks-circuit-weapons';

  names.forEach((name, i) => {
    let chip;

    if (toggleable) {
      const isObtained = state.circuitObtained.includes(name);

      chip = document.createElement('button');
      chip.className = 'tasks-circuit-weapon' + (isObtained ? ' is-obtained' : '');
      chip.textContent = name;
      chip.title = isObtained ? t('tabs.tasks.ui.circuit.weapon.mark_not_obtained') : t('tabs.tasks.ui.circuit.weapon.mark_obtained');

      chip.onclick = async () => {
        await toggleCircuitWeapon(name);
        const nowObtained = state.circuitObtained.includes(name);
        chip.classList.toggle('is-obtained', nowObtained);
        chip.title = nowObtained ? t('tabs.tasks.ui.circuit.weapon.mark_not_obtained') : t('tabs.tasks.ui.circuit.weapon.mark_obtained');
      };
    } else {
      chip = document.createElement('span');
      chip.className = 'tasks-circuit-weapon tasks-circuit-weapon--static';
      chip.textContent = name;
    }

    wrapper.appendChild(chip);

    if (i < names.length - 1) {
      const sep = document.createElement('span');
      sep.className = 'tasks-circuit-sep';
      sep.textContent = '·';
      wrapper.appendChild(sep);
    }
  });

  row.appendChild(wrapper);
  return row;
}

function buildDuviriCircuitDesc(duviriData) {
  if (!duviriData || !Array.isArray(duviriData.choices)) return null;

  const pick = category => {
    const entry = duviriData.choices.find(c => c.category === category);
    return Array.isArray(entry?.choices) && entry.choices.length ? entry.choices : null;
  };

  const rows = [];
  const normal = pick('normal');   // this week's Warframes
  const hard   = pick('hard');     // this week's Steel Path Incarnon weapons
  if (normal) rows.push(buildChipRow(tf('tabs.tasks.ui.rewards.tab.normal', 'Normal'), normal, false));
  if (hard)   rows.push(buildChipRow(tf('tabs.tasks.ui.rewards.tab.sp', 'Steel Path'), hard, true));

  return rows.length ? rows : null;
}

function translateCalendarReward(name) {
   const namespaces = [
     `tabs.tasks.ui.calendar.item.${name}`,
     `general.game.arcane.${name}`,
     `general.game.arsenal.${name}`,
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
 
    const prizeLabel = t('tabs.tasks.ui.calendar.prizes.label');

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
    modHeader.textContent = t('tabs.tasks.ui.archimedea.modifiers.label');
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

export function getLiveLines(task) {
  switch (task.liveData) {
    case 'sortie':                  return buildSortieDesc(state.sortieData);
    case 'archonHunt':              return buildArchonDesc(state.archonHuntData);
    case 'steelPath':               return buildSteelPathDesc(state.steelPathData);
    case 'duviriCycle':             return buildDuviriCircuitDesc(state.duviriCycleData);
    case 'steelPathIncursions': {
        const span = document.createElement('strong');
        span.textContent = t('tabs.tasks.ui.steelpath.incursions.reward');
        return [span];
    }
    case 'calendar':                return buildCalendarDesc(state.calendarData);
    case 'archimedea.deepa':        return buildArchimedeasDesc(state.archimedeasData, 'C T_ L A B');
    case 'archimedea.temporala':    return buildArchimedeasDesc(state.archimedeasData, 'C T_ H E X');
    default:                        return null;
  }
}