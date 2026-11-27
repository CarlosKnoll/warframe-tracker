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
  { key: 'starchart_normal_nodes',      labelKey: 'mastery.ui.misc.starchart.normal_nodes',     max: 238, xpEach: 63   },
  { key: 'starchart_normal_junctions',  labelKey: 'mastery.ui.misc.starchart.normal_junctions', max: 13,  xpEach: 1000 },
  { key: 'starchart_steel_nodes',       labelKey: 'mastery.ui.misc.starchart.steel_nodes',      max: 238, xpEach: 63   },
  { key: 'starchart_steel_junctions',   labelKey: 'mastery.ui.misc.starchart.steel_junctions',  max: 13,  xpEach: 1000 },
];

export const RAILJACK_INTRINSICS = [
  { key: 'intrinsic_railjack_tactical',    labelKey: 'mastery.ui.misc.railjack.tactical'    },
  { key: 'intrinsic_railjack_piloting',    labelKey: 'mastery.ui.misc.railjack.piloting'    },
  { key: 'intrinsic_railjack_gunnery',     labelKey: 'mastery.ui.misc.railjack.gunnery'     },
  { key: 'intrinsic_railjack_engineering', labelKey: 'mastery.ui.misc.railjack.engineering' },
  { key: 'intrinsic_railjack_command',     labelKey: 'mastery.ui.misc.railjack.command'     },
];

export const DRIFTER_INTRINSICS = [
  { key: 'intrinsic_drifter_riding',      labelKey: 'mastery.ui.misc.drifter.riding'      },
  { key: 'intrinsic_drifter_combat',      labelKey: 'mastery.ui.misc.drifter.combat'      },
  { key: 'intrinsic_drifter_opportunity', labelKey: 'mastery.ui.misc.drifter.opportunity' },
  { key: 'intrinsic_drifter_endurance',   labelKey: 'mastery.ui.misc.drifter.endurance'   },
];

export const INTRINSIC_XP_PER_RANK = 1500;
export const INTRINSIC_MAX_RANK    = 10;

// ─── Sub-sections (tab bar at the top of the Mastery section) ──────────────────
// `sections` lists the item.section values shown in each tab. 'mastery-all' shows
// every item once (Kitgun parts appear in both Primaries and Secondaries, but only
// once in All). 'mastery-misc' is the tracker panel, not an item grid.

export const MASTERY_ALL_SECTION  = 'mastery-all';
export const MASTERY_MISC_SECTION = 'mastery-misc';
export const DEFAULT_MASTERY_SECTION = MASTERY_ALL_SECTION;

export const MASTERY_SUBSECTIONS = [
  { id: MASTERY_ALL_SECTION,    labelKey: 'mastery.ui.subnav.all',            fallback: { en: 'All items', pt: 'Todos os itens' }, sections: null },
  { id: 'mastery-warframes',    labelKey: 'menus-nav.mode.mastery-div.warframes',   sections: ['Warframe'] },
  { id: 'mastery-primaries',    labelKey: 'menus-nav.mode.mastery-div.primaries',   sections: ['Primary', 'Kitgun'] },
  { id: 'mastery-secondaries',  labelKey: 'menus-nav.mode.mastery-div.secondaries', sections: ['Secondary', 'Kitgun'] },
  { id: 'mastery-melees',       labelKey: 'menus-nav.mode.mastery-div.melees',      sections: ['Melee', 'Zaw'] },
  { id: 'mastery-robotic',      labelKey: 'menus-nav.mode.mastery-div.robotic',     sections: ['Robotic', 'SentinelWeapon'] },
  { id: 'mastery-companions',   labelKey: 'menus-nav.mode.mastery-div.companions',  sections: ['Companion'] },
  { id: 'mastery-vehicles',     labelKey: 'menus-nav.mode.mastery-div.vehicles',    sections: ['Vehicle', 'Archwing'] },
  { id: 'mastery-archgun',      labelKey: 'menus-nav.mode.mastery-div.archgun',     sections: ['Arch-Gun'] },
  { id: 'mastery-archmelee',    labelKey: 'menus-nav.mode.mastery-div.archmelee',   sections: ['Arch-Melee'] },
  { id: 'mastery-amps',         labelKey: 'menus-nav.mode.mastery-div.amps',        sections: ['Amp'] },
  { id: MASTERY_MISC_SECTION,   labelKey: 'menus-nav.mode.mastery-div.misc',        sections: null },
];

const SECTION_SETS = new Map(
  MASTERY_SUBSECTIONS.filter(s => s.sections).map(s => [s.id, new Set(s.sections)])
);

// Hardcoded overrides if any item is miscategorized in WFCD / DE endpoints
// Entries have the form: { uniqueName: sectionId } where sectionId is one of the item.section values
const SECTION_OVERRIDES = {
};

export function getEffectiveSection(item) {
  return SECTION_OVERRIDES[item.uniqueName] ?? item.section;
}

export function itemInSection(item, sectionId) {
  if (sectionId === MASTERY_ALL_SECTION) return true;
  const set = SECTION_SETS.get(sectionId);
  return set ? set.has(getEffectiveSection(item)) : false;
}

// ─── State ────────────────────────────────────────────────────────────────────

export const MASTERY_FOUNDER_ITEMS = new Set([
  "Excalibur Prime", "Lato Prime", "Skana Prime"
]);

export const masteryState = {
  items: [],
  owned: {},
  masteryMastered: {},
  ignoredMasteryItems: new Set(),
  saveFunction: null,
  activeSection: DEFAULT_MASTERY_SECTION,
  searchText: '',
  statusFilter: 'all',
  imageCache: new Map(),
};