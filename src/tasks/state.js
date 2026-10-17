// Seed definitions — used only to populate tasks_cache.json on first run.
// Once the cache exists, these are never read directly by the renderer.
//
// Fields added for the card-grid redesign (static — loader.js spreads `...def` over the
// cached copy, so they reach existing users automatically):
//   icon : icon-registry key (see lib/icons.js). null = resolved elsewhere / placeholder.
//   iconCycle : true → the card icon cycles through the Archon shards that can drop from this task
//          (frames are read from the task's reward data — see rewards/resolve.js).
//   tone : optional colour override. 'maybe' = intermediate between weekly and archon.
//          When absent, the renderer derives the tone from tier / group / shards.
//   cryobells : set on Icebind; the modal shows the badge text from tabs.tasks.ui.cryobell.header
//          (that string already says "3 Cryobells", so keep this in sync with it).
export const DEFAULT_TASKS = [
  { id: 'daily.forma',           tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.dailies.forma.label',           descKey: 'tabs.tasks.ui.dailies.forma.desc',           liveData: null,                    icon: 'reward.forma',           custom: false, checked: false },
  { id: 'daily.sortie',          tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.dailies.sortie.label',          descKey: 'tabs.tasks.ui.dailies.sortie.desc',          liveData: 'sortie',                icon: 'reward.legendary-core',  custom: false, checked: false },
  { id: 'daily.steelpath',       tier: 'daily',  group: null,       subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.dailies.steelpath.label',       descKey: 'tabs.tasks.ui.dailies.steelpath.desc',       liveData: 'steelPathIncursions',   icon: 'reward.steel-essence',   custom: false, checked: false },
  { id: 'weekly.acrithis',       tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.acrithis.label',       descKey: 'tabs.tasks.ui.weeklies.acrithis.desc',       liveData: null,                    icon: 'reward.orokin-reactor',  custom: false, checked: false },
  { id: 'weekly.yonta',          tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.yonta.label',          descKey: 'tabs.tasks.ui.weeklies.yonta.desc',          liveData: null,                    icon: 'reward.kuva',            custom: false, checked: false },
  { id: 'weekly.circuit',        tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.circuit.label',        descKey: 'tabs.tasks.ui.weeklies.circuit.desc',        liveData: 'duviriCycle',           icon: 'reward.incarnon-genesis', custom: false, checked: false },
  { id: 'weekly.ironwake',       tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.ironwake.label',       descKey: 'tabs.tasks.ui.weeklies.ironwake.desc',       liveData: null,                    icon: 'reward.riven',           custom: false, checked: false },
  { id: 'weekly.teshin',         tier: 'weekly', group: 'standard', subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.teshin.label',         descKey: 'tabs.tasks.ui.weeklies.teshin.desc',         liveData: 'steelPath',             icon: null, /* derived from the rotating reward (rewards/resolve.js) */ custom: false, checked: false },
  { id: 'weekly.descendia',      tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.descendia.label',      descKey: 'tabs.tasks.ui.weeklies.descendia.desc',      liveData: null,                    icon: null, iconCycle: true, custom: false, checked: false, shards: 'potential', tone: 'maybe' },
  { id: 'weekly.archonhunt',     tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.archonhunt.label',     descKey: 'tabs.tasks.ui.weeklies.archonhunt.desc',     liveData: 'archonHunt',            icon: null, /* derived from the weekly archon (rewards/resolve.js) */ custom: false, checked: false, shards: 'guaranteed'},
  { id: 'weekly.calendar',       tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.calendar.label',       descKey: 'tabs.tasks.ui.weeklies.calendar.desc',       liveData: 'calendar',              icon: null, /* derived from the calendar rewards (rewards/resolve.js) */ custom: false, checked: false, shards: 'dynamic'   },
  { id: 'weekly.bird3',          tier: 'weekly', group: 'archon',   subgroup: null,          pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.bird3.label',          descKey: 'tabs.tasks.ui.weeklies.bird3.desc',          liveData: null,                    icon: null, iconCycle: true, custom: false, checked: false, shards: 'guaranteed'},
  { id: 'weekly.netracells',     tier: 'weekly', group: 'archon',   subgroup: 'searchpulse', pulsesCost: 1,    labelKey: 'tabs.tasks.ui.weeklies.netracells.label',     descKey: 'tabs.tasks.ui.weeklies.netracells.desc',     liveData: null,                    icon: null, iconCycle: true, custom: false, checked: false, shards: 'potential' },
  { id: 'weekly.elitedeepa',     tier: 'weekly', group: 'archon',   subgroup: 'searchpulse', pulsesCost: 2,    labelKey: 'tabs.tasks.ui.weeklies.elitedeepa.label',     descKey: 'tabs.tasks.ui.weeklies.elitedeepa.desc',     liveData: 'archimedea.deepa',      icon: null, iconCycle: true, custom: false, checked: false, shards: 'potential' },
  { id: 'weekly.elitetemporala', tier: 'weekly', group: 'archon',   subgroup: 'searchpulse', pulsesCost: 2,    labelKey: 'tabs.tasks.ui.weeklies.elitetemporala.label', descKey: 'tabs.tasks.ui.weeklies.elitetemporala.desc', liveData: 'archimedea.temporala',  icon: null, iconCycle: true, custom: false, checked: false, shards: 'potential' },
  { id: 'weekly.icebind',        tier: 'weekly', group: 'archon',   subgroup: 'cryobell',    pulsesCost: null, labelKey: 'tabs.tasks.ui.weeklies.icebind.label',        descKey: 'tabs.tasks.ui.weeklies.icebind.desc',        liveData: null,                    icon: null, iconCycle: true, custom: false, checked: false, shards: 'potential', badge: 'cryobell', cryobells: 3 },
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
  baroNewItemsSnapshot: null,
  circuitObtained: [],
  worldstateCache: {},
  masteredSet: new Set(),   // uniqueNames of mastered items, loaded from owned store
};