// Seed definitions — used only to populate tasks_cache.json on first run.
// Once the cache exists, these are never read directly by the renderer.
export const DEFAULT_TASKS = [
  { id: 'daily.forma',         tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tasks.daily.forma.label',         descKey: 'tasks.daily.forma.desc',         liveData: null,                    custom: false, checked: false },
  { id: 'daily.sortie',        tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tasks.daily.sortie.label',        descKey: 'tasks.daily.sortie.desc',        liveData: 'sortie',                custom: false, checked: false },
  { id: 'daily.steelpath',     tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tasks.daily.steelpath.label',     descKey: 'tasks.daily.steelpath.desc',     liveData: 'steelPathIncursions',   custom: false, checked: false },
  { id: 'weekly.acrithis',     tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.acrithis.label',     descKey: 'tasks.weekly.acrithis.desc',     liveData: null,                    custom: false, checked: false },
  { id: 'weekly.yonta',        tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.yonta.label',        descKey: 'tasks.weekly.yonta.desc',        liveData: null,                    custom: false, checked: false },
  { id: 'weekly.circuit',      tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.circuit.label',      descKey: 'tasks.weekly.circuit.desc',      liveData: 'duviriCycle',           custom: false, checked: false },
  { id: 'weekly.ironwake',     tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.ironwake.label',     descKey: 'tasks.weekly.ironwake.desc',     liveData: null,                    custom: false, checked: false },
  { id: 'weekly.teshin',       tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.teshin.label',       descKey: 'tasks.weekly.teshin.desc',       liveData: 'steelPath',             custom: false, checked: false },
  { id: 'weekly.descendia',    tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.descendia.label',    descKey: 'tasks.weekly.descendia.desc',    liveData: null,                    custom: false, checked: false },
  { id: 'weekly.archonhunt',   tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.archonhunt.label',   descKey: 'tasks.weekly.archonhunt.desc',   liveData: 'archonHunt',            custom: false, checked: false },
  { id: 'weekly.calendar',     tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.calendar.label',     descKey: 'tasks.weekly.calendar.desc',     liveData: 'calendar',              custom: false, checked: false },
  { id: 'weekly.bird3',        tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tasks.weekly.bird3.label',        descKey: 'tasks.weekly.bird3.desc',        liveData: null,                    custom: false, checked: false },
  { id: 'weekly.netracells',   tier: 'weekly', group: 'archon',   subgroup: 'searchpulse', pulsesCost: 1,    labelKey: 'tasks.weekly.netracells.label',   descKey: 'tasks.weekly.netracells.desc',   liveData: null,                    custom: false, checked: false },
  { id: 'weekly.elitedeepa',   tier: 'weekly', group: 'archon',   subgroup: 'searchpulse', pulsesCost: 2,    labelKey: 'tasks.weekly.elitedeepa.label',   descKey: 'tasks.weekly.elitedeepa.desc',   liveData: 'archimedea.deepa',      custom: false, checked: false },
  { id: 'weekly.elitetemporala', tier: 'weekly', group: 'archon', subgroup: 'searchpulse', pulsesCost: 2,    labelKey: 'tasks.weekly.elitetemporala.label', descKey: 'tasks.weekly.elitetemporala.desc', liveData: 'archimedea.temporala',custom: false, checked: false },
];

// Runtime state — populated by loader.js from the cache file.
// renderer.js reads ONLY from here, never from DEFAULT_TASKS.
export const state = {
  tasks: [],                // merged array (built-ins + customs), loaded from disk
  lastDailyReset: null,
  lastWeeklyReset: null,
  sortieData: null,
  archonHuntData: null,
  steelPathData: null,
  duviriCycleData: null,
  calendarData: null,
  archimedeasData: null,
  baroData: null,
};