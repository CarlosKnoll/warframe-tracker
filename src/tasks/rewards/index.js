// src/tasks/rewards/index.js
//
// Registry: task id -> its reward data file. ONE FILE PER TASK, named after the task id
// (dots become dashes). To fix a reward, open that task's file and edit its line.
//
// File shape (see any data file for a live example):
//   { tabs: [ { id, groups: [ { id?, label?, n?, meta?, kind?, note?, live?, rewards: [ reward… ] } ] } ] }
//   reward = { name, qty?, chance?, options?: [names], note?, live?, icon? }
//     name    English item name — also the translation key suffix and the icon-rule input
//     qty     amount ("6,000 Kuva", "3× Forma")        chance  drop chance in percent
//     options "one of these" sub-list (weapon types, arcane names…)
//     note    short free text (avoid "." — it is used inside a locale key)
//     live    pull this week's value from the API: 'circuit.normal' | 'circuit.hard' | 'teshin.rotation'
//     icon    force an icon key instead of the name-based rule
//     when    'archon.amar' | 'archon.nira' | 'archon.boreal' — show only in that Archon's week
//   group.kind = 'one' → "one of" the rows below;  group.n → "Tier {{n}}";  group.meta → progress needed
//   group.liveOnly (with group.live) → show only what the API reports; `rewards` becomes the offline fallback

import dailyForma from './daily-forma.js';
import dailySortie from './daily-sortie.js';
import dailySteelpath from './daily-steelpath.js';
import weeklyAcrithis from './weekly-acrithis.js';
import weeklyYonta from './weekly-yonta.js';
import weeklyCircuit from './weekly-circuit.js';
import weeklyIronwake from './weekly-ironwake.js';
import weeklyTeshin from './weekly-teshin.js';
import weeklyCalendar from './weekly-calendar.js';
import weeklyArchonhunt from './weekly-archonhunt.js';
import weeklyBird3 from './weekly-bird3.js';
import weeklyNetracells from './weekly-netracells.js';
import weeklyElitedeepa from './weekly-elitedeepa.js';
import weeklyElitetemporala from './weekly-elitetemporala.js';
import weeklyIcebind from './weekly-icebind.js';
import weeklyDescendia from './weekly-descendia.js';

export const REWARDS = {
  'daily.forma':           dailyForma,
  'daily.sortie':          dailySortie,
  'daily.steelpath':       dailySteelpath,
  'weekly.acrithis':       weeklyAcrithis,
  'weekly.yonta':          weeklyYonta,
  'weekly.circuit':        weeklyCircuit,
  'weekly.ironwake':       weeklyIronwake,
  'weekly.teshin':         weeklyTeshin,
  'weekly.calendar':       weeklyCalendar,
  'weekly.archonhunt':     weeklyArchonhunt,
  'weekly.bird3':          weeklyBird3,
  'weekly.netracells':     weeklyNetracells,
  'weekly.elitedeepa':     weeklyElitedeepa,
  'weekly.elitetemporala': weeklyElitetemporala,
  'weekly.icebind':        weeklyIcebind,
  'weekly.descendia':      weeklyDescendia,
};

export function getRewards(taskId) {
  return REWARDS[taskId] ?? null;
}