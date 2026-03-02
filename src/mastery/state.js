// mastery/state.js - Shared state for all mastery modules

const WFCD_BASE = "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/";

// ─── WFCD endpoints ────────────────────────────────────────────────────────────

export const MASTERY_URLS = {
  Warframe:       `${WFCD_BASE}Warframes.json`,
  Primary:        `${WFCD_BASE}Primary.json`,
  Secondary:      `${WFCD_BASE}Secondary.json`,
  Melee:          `${WFCD_BASE}Melee.json`,
  "Arch-Gun":     `${WFCD_BASE}Arch-Gun.json`,
  "Arch-Melee":   `${WFCD_BASE}Arch-Melee.json`,
  Archwing:       `${WFCD_BASE}Archwing.json`,
  Robotic:        `${WFCD_BASE}Sentinels.json`,
  SentinelWeapon: `${WFCD_BASE}SentinelWeapons.json`,
  Companion:      `${WFCD_BASE}Pets.json`,
  Misc:           `${WFCD_BASE}Misc.json`,
};

export const VEHICLE_CATEGORIES = new Set(['K-Drive', 'Necramech']);

export const WIKI_IMAGE_BASE = "https://wiki.warframe.com/images/thumb/";
export const IMAGE_BASE      = "https://cdn.warframestat.us/img/";

// ─── Misc section data ────────────────────────────────────────────────────────

export const STARCHART_TRACKS = [
  { key: 'starchart_normal_nodes',      labelKey: 'mastery.misc.starchart.normal_nodes',     max: 237, xpEach: 63   },
  { key: 'starchart_normal_junctions',  labelKey: 'mastery.misc.starchart.normal_junctions', max: 13,  xpEach: 1000 },
  { key: 'starchart_steel_nodes',       labelKey: 'mastery.misc.starchart.steel_nodes',      max: 237, xpEach: 63   },
  { key: 'starchart_steel_junctions',   labelKey: 'mastery.misc.starchart.steel_junctions',  max: 13,  xpEach: 1000 },
];

export const RAILJACK_INTRINSICS = [
  { key: 'intrinsic_railjack_tactical',    labelKey: 'mastery.misc.railjack.tactical'    },
  { key: 'intrinsic_railjack_piloting',    labelKey: 'mastery.misc.railjack.piloting'    },
  { key: 'intrinsic_railjack_gunnery',     labelKey: 'mastery.misc.railjack.gunnery'     },
  { key: 'intrinsic_railjack_engineering', labelKey: 'mastery.misc.railjack.engineering' },
  { key: 'intrinsic_railjack_command',     labelKey: 'mastery.misc.railjack.command'     },
];

export const DRIFTER_INTRINSICS = [
  { key: 'intrinsic_drifter_riding',      labelKey: 'mastery.misc.drifter.riding'      },
  { key: 'intrinsic_drifter_combat',      labelKey: 'mastery.misc.drifter.combat'      },
  { key: 'intrinsic_drifter_opportunity', labelKey: 'mastery.misc.drifter.opportunity' },
  { key: 'intrinsic_drifter_endurance',   labelKey: 'mastery.misc.drifter.endurance'   },
];

export const INTRINSIC_XP_PER_RANK = 1500;
export const INTRINSIC_MAX_RANK    = 10;

// ─── State ────────────────────────────────────────────────────────────────────

export const masteryState = {
  items: [],
  owned: {},
  masteryMastered: {},
  saveFunction: null,
  activeSection: 'mastery-warframes',
  searchText: '',
  statusFilter: 'all',
  imageCache: new Map(),
};