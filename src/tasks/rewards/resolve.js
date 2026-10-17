// src/tasks/rewards/resolve.js
//
// Runtime glue between the reward data files and the rest of the app:
//   rewardLabel(name)        translated item name (falls back to the English name)
//   liveOptions / liveRows   this week's values from the API (Circuit picks, Teshin's offer)
//   currentArchon / matchesWhen   which Archon is up → hide the other Archons' shards
//   resolveTaskIconKey(s)    icon(s) for a task: static key, derived from live data, or shard cycle
//   createTaskIcon / createRewardIcon   build the <img> (or the cycling <span>) for those

import { t } from '../../i18n.js';
import { state } from '../state.js';
import { tf } from '../helpers.js';
import { createIcon, createCyclingIcon } from '../../lib/icons.js';
import { iconKeyForReward } from './icon-rules.js';
import { REWARDS } from './index.js';

// ─── Names ─────────────────────────────────────────────────────────────────────
// First namespace that has the name wins; these are the places the app already translates
// item names, plus tabs.tasks.ui.rewards.item for names that exist nowhere else.
const NAME_NAMESPACES = [
  'tabs.tasks.ui.rewards.item',
  'tabs.tasks.ui.calendar.item',
  'tabs.tasks.ui.steelpath.item',
  'tabs.tasks.ui.baro.item.resource',
  'general.game.arcane',
  'general.game.arsenal',
];

// Every t() miss scans the whole locale tree (i18n.js suffix search), and most reward names
// miss in most namespaces — so labels are cached, and the cache is cleared when the language changes.
const labelCache = new Map();
if (typeof window !== 'undefined') window.addEventListener('langchange', () => labelCache.clear());

export function rewardLabel(name) {
  if (labelCache.has(name)) return labelCache.get(name);
  let label = name;
  for (const ns of NAME_NAMESPACES) {
    const key = `${ns}.${name}`;
    const out = t(key);
    if (out !== key) { label = out; break; }
  }
  labelCache.set(name, label);
  return label;
}

// ─── Live (API) values ─────────────────────────────────────────────────────────

function circuitChoices(category) {
  const choices = state.duviriCycleData?.choices;
  const entry = Array.isArray(choices) ? choices.find(c => c.category === category) : null;
  return Array.isArray(entry?.choices) && entry.choices.length ? entry.choices : null;
}

export function liveOptions(kind) {
  switch (kind) {
    case 'circuit.normal':  return circuitChoices('normal');
    case 'circuit.hard':    return circuitChoices('hard');
    case 'teshin.rotation': {
      const name = state.steelPathData?.currentReward?.name;
      return name ? [name] : null;
    }
    default: return null;
  }
}

// Reward rows built from the API itself (used by `liveOnly` groups). `sub` is already-translated
// text shown under the name. null = the API has nothing, so the caller falls back to the data file.
export function liveRows(kind) {
  if (kind !== 'teshin.rotation') return null;
  const offer = state.steelPathData?.currentReward;
  if (!offer?.name) return null;
  const essence = tf('tabs.tasks.ui.steelpath.essence', 'Steel Essence');
  return [{ name: offer.name, ...(offer.cost != null ? { sub: `${offer.cost} ${essence}` } : {}) }];
}

// ─── This week's Archon ────────────────────────────────────────────────────────
// `boss` is localised ("Archon Amar" / "Arconte Amar"), the Archon's own name is not.
const ARCHON_SHARD = { amar: 'crimson', nira: 'amber', boreal: 'azure' };

export function currentArchon() {
  const text = String(state.archonHuntData?.boss ?? '').toLowerCase();
  return Object.keys(ARCHON_SHARD).find(name => text.includes(name)) ?? null;
}

// Reward rows can say `when: 'archon.nira'`. Unknown week (API down) → show everything.
export function matchesWhen(cond) {
  const [ns, value] = String(cond).split('.');
  if (ns !== 'archon') return true;
  const current = currentArchon();
  return current === null || current === value;
}

// ─── Archon shard icons ────────────────────────────────────────────────────────

const SHARD_ORDER = ['crimson', 'amber', 'azure', 'emerald', 'topaz', 'violet'];
const shardKey = (color, tauforged = false) => `reward.${tauforged ? 'tauforged-' : ''}${color}-archon-shard`;

// The game's INTERNAL shard names (…/NarmerSorties/ArchonCrystal<X>[Mythic]) — not the display names:
//   Amar → Crimson · Nira → Amber · Boreal → Azure · Green → Emerald · Orange → Topaz · Violet → Violet
//   "Mythic" suffix = Tauforged
const INTERNAL_SHARD_COLOR = {
  Amar: 'crimson', Nira: 'amber', Boreal: 'azure', Green: 'emerald', Orange: 'topaz', Violet: 'violet',
};

export function shardKeyFromUniqueName(uniqueName) {
  const m = String(uniqueName ?? '').match(/ArchonCrystal(Amar|Nira|Boreal|Green|Orange|Violet)?(Mythic)?$/);
  if (!m || !m[1]) return null;          // bare "ArchonCrystal" = colour unknown
  return shardKey(INTERNAL_SHARD_COLOR[m[1]], !!m[2]);
}

// The shards a task can actually drop, read from its own reward data (so editing the data
// file is all it takes). A generic "Archon Shard" row contributes its `options` colours.
function shardFrames(taskId) {
  const data = REWARDS[taskId];
  if (!data) return [];

  const keys = new Set();
  for (const tab of data.tabs) for (const group of tab.groups) for (const r of group.rewards) {
    if (!/archon shard/i.test(r.name)) continue;
    if (/^archon shard$/i.test(r.name)) {
      (r.options ?? []).forEach(o => SHARD_ORDER.includes(o.toLowerCase()) && keys.add(shardKey(o.toLowerCase())));
    } else {
      const key = iconKeyForReward(r.name);
      if (key) keys.add(key);
    }
  }

  const rank = key => {
    const m = key.match(/^reward\.(tauforged-)?([a-z]+)-archon-shard$/);
    return m ? (m[1] ? 100 : 0) + SHARD_ORDER.indexOf(m[2]) : 999;
  };
  return [...keys].sort((a, b) => rank(a) - rank(b));
}

// ─── Task icons ────────────────────────────────────────────────────────────────

function archonHuntIcon() {
  const who = currentArchon();
  return who ? shardKey(ARCHON_SHARD[who]) : null;
}

// Calendar priority (from the layout sketch): 1) an Archon shard  2) Reactor / Catalyst  3) Riven / Kuva
function calendarIcon(cal) {
  if (!Array.isArray(cal?.days)) return null;
  const events = cal.days.flatMap(d => d.events ?? []);

  const shard = events.find(e => /ArchonCrystal/.test(e.uniqueName ?? ''));
  if (shard) return shardKeyFromUniqueName(shard.uniqueName);

  const prizes = events.filter(e => e.type === 'Big Prize!' && e.reward).map(e => e.reward);
  for (const re of [/orokin (reactor|catalyst)/i, /riven|kuva/i]) {
    const hit = prizes.find(p => re.test(p));
    if (hit) return iconKeyForReward(hit);
  }
  return null;
}

// null = no icon (the placeholder is shown)
export function resolveTaskIconKey(task) {
  if (task.icon) return task.icon;
  switch (task.liveData) {
    case 'steelPath':  return iconKeyForReward(state.steelPathData?.currentReward?.name);
    case 'archonHunt': return archonHuntIcon();
    case 'calendar':   return calendarIcon(state.calendarData);
    default:           return null;
  }
}

// One key normally; several for tasks flagged `iconCycle` (they alternate between the shards that can drop).
export function resolveTaskIconKeys(task) {
  if (task.iconCycle) {
    const frames = shardFrames(task.id);
    if (frames.length) return frames;
  }
  const key = resolveTaskIconKey(task);
  return key ? [key] : [];
}

// Every icon key the Tasks tab can show: task icons, every reward row, and all Archon shards
// (Calendar / Archon Hunt / cycling cards can land on any colour). Fed to preloadIcons().
export function collectTaskIconKeys() {
  const keys = new Set(['ui.unknown']);
  state.tasks.forEach(task => task.icon && keys.add(task.icon));
  for (const color of SHARD_ORDER) { keys.add(shardKey(color)); keys.add(shardKey(color, true)); }
  for (const data of Object.values(REWARDS)) {
    for (const tab of data.tabs) for (const group of tab.groups) for (const r of group.rewards) {
      const key = r.icon ?? iconKeyForReward(r.name);
      if (key) keys.add(key);
    }
  }
  return [...keys];
}

export function createTaskIcon(task, opts) {
  const keys = resolveTaskIconKeys(task);
  return keys.length > 1 ? createCyclingIcon(keys, opts) : createIcon(keys[0] ?? null, opts);
}

// Reward rows: a generic "Archon Shard" row with colour options cycles through exactly those colours.
export function createRewardIcon(reward, opts) {
  if (reward.icon) return createIcon(reward.icon, opts);
  if (/^archon shard$/i.test(reward.name) && Array.isArray(reward.options)) {
    const keys = reward.options.map(o => o.toLowerCase()).filter(o => SHARD_ORDER.includes(o)).map(o => shardKey(o));
    if (keys.length > 1) return createCyclingIcon(keys, opts);
    if (keys.length === 1) return createIcon(keys[0], opts);
  }
  return createIcon(iconKeyForReward(reward.name), opts);
}