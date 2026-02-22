// primes/state.js - Shared state for all primes modules

export const state = {
  allPrimes: [],
  farmableRelics: new Set(),
  relicRewardsMap: new Map(),
  owned: {},
  ignoredPrimes: new Set(),
  saveFunction: null,
  searchText: '',
  category: 'All',
  vaultStatus: 'All',
  showFounderItems: true,
  showSpecialItems: true,
};

export const FOUNDER_ITEMS = ["Excalibur Prime", "Lato Prime", "Skana Prime"];

export const RELICS_DROP_URL = "https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/relics.json";
export const MISSION_REWARDS_URL = "https://raw.githubusercontent.com/WFCD/warframe-drop-data/gh-pages/data/missionRewards.json";
export const PRIME_URLS = {
  Warframe: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Warframes.json",
  Primary: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Primary.json",
  Secondary: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Secondary.json",
  Melee: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Melee.json",
  "Arch-Gun": "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Gun.json",
  "Arch-Melee": "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Arch-Melee.json",
  Sentinel: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Sentinels.json",
  Archwing: "https://raw.githubusercontent.com/WFCD/warframe-items/master/data/json/Archwing.json",
};