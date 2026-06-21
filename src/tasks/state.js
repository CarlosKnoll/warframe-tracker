// Seed definitions — used only to populate tasks_cache.json on first run.
// Once the cache exists, these are never read directly by the renderer.
export const DEFAULT_TASKS = [
  { id: 'daily.forma',         tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.dailies.forma.label',         descKey: 'tabs.tasks.ui.dailies.forma.desc',         liveData: null,                    custom: false, checked: false },
  { id: 'daily.sortie',        tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.dailies.sortie.label',        descKey: 'tabs.tasks.ui.dailies.sortie.desc',        liveData: 'sortie',                custom: false, checked: false },
  { id: 'daily.steelpath',     tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.dailies.steelpath.label',     descKey: 'tabs.tasks.ui.dailies.steelpath.desc',     liveData: 'steelPathIncursions',   custom: false, checked: false },
  { id: 'weekly.acrithis',     tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.acrithis.label',     descKey: 'tabs.tasks.ui.weeklies.acrithis.desc',     liveData: null,                    custom: false, checked: false },
  { id: 'weekly.yonta',        tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.yonta.label',        descKey: 'tabs.tasks.ui.weeklies.yonta.desc',        liveData: null,                    custom: false, checked: false },
  { id: 'weekly.circuit',      tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.circuit.label',      descKey: 'tabs.tasks.ui.weeklies.circuit.desc',      liveData: 'duviriCycle',           custom: false, checked: false },
  { id: 'weekly.ironwake',     tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.ironwake.label',     descKey: 'tabs.tasks.ui.weeklies.ironwake.desc',     liveData: null,                    custom: false, checked: false },
  { id: 'weekly.teshin',       tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.teshin.label',       descKey: 'tabs.tasks.ui.weeklies.teshin.desc',       liveData: 'steelPath',             custom: false, checked: false },
  { id: 'weekly.descendia',    tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.descendia.label',    descKey: 'tabs.tasks.ui.weeklies.descendia.desc',    liveData: null,                    custom: false, checked: false },
  { id: 'weekly.archonhunt',   tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.archonhunt.label',   descKey: 'tabs.tasks.ui.weeklies.archonhunt.desc',   liveData: 'archonHunt',            custom: false, checked: false },
  { id: 'weekly.calendar',     tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.calendar.label',     descKey: 'tabs.tasks.ui.weeklies.calendar.desc',     liveData: 'calendar',              custom: false, checked: false },
  { id: 'weekly.bird3',        tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.bird3.label',        descKey: 'tabs.tasks.ui.weeklies.bird3.desc',        liveData: null,                    custom: false, checked: false },
  { id: 'weekly.netracells',   tier: 'weekly', group: 'archon',   subgroup: 'searchpulse', pulsesCost: 1,    labelKey: 'tabs.tasks.ui.weeklies.netracells.label',   descKey: 'tabs.tasks.ui.weeklies.netracells.desc',   liveData: null,                    custom: false, checked: false },
  { id: 'weekly.elitedeepa',   tier: 'weekly', group: 'archon',   subgroup: 'searchpulse', pulsesCost: 2,    labelKey: 'tabs.tasks.ui.weeklies.elitedeepa.label',   descKey: 'tabs.tasks.ui.weeklies.elitedeepa.desc',   liveData: 'archimedea.deepa',      custom: false, checked: false },
  { id: 'weekly.elitetemporala', tier: 'weekly', group: 'archon', subgroup: 'searchpulse', pulsesCost: 2,    labelKey: 'tabs.tasks.ui.weeklies.elitetemporala.label', descKey: 'tabs.tasks.ui.weeklies.elitetemporala.desc', liveData: 'archimedea.temporala',custom: false, checked: false },
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
  circuitObtained: [],
  worldstateCache: {},
  masteredSet: new Set(),   // uniqueNames of mastered items, loaded from owned store
};