// Prime Relic Finder — derived entirely from the existing Prime collection state.
import { state } from './state.js';
import { masteryState } from '../mastery/state.js';
import { t, tRelicName, tPrimeName, tComponent } from '../i18n.js';
import { normalizeRelicName } from './loader.js';
import { openRelicModal } from '../modal.js';
import { createIcon, initIcons } from '../lib/icons.js';

const FILTERS = { search: '' };
const tr = key => t(`tabs.primes.relicFinder.${key}`);
const statusRank = { available: 0, resurgence: 1, vaulted: 2, unknown: 3 };
const rarityRank = { common: 0, uncommon: 1, rare: 2 };
const eraRank = { Lith: 0, Meso: 1, Neo: 2, Axi: 3, Requiem: 4, Other: 5 };
// TEMPORARY ERA PRESENTATION ICONS — replace these registry keys with the final era assets.
// Keep this mapping isolated so each era's artwork can be swapped with a one-line edit.
const ERA_ICON_KEYS = {
  Lith: 'reward.lith-relic-intact',
  Meso: 'reward.meso-relic-intact',
  Neo: 'reward.neo-relic-intact',
  Axi: 'reward.axi-relic-intact',
  Requiem: 'reward.requiem-relic-intact',
  Other: 'reward.other-relic-intact',
};
const MAX_PREVIEW_ITEMS = 3; // cards list at most this many missing rewards, then "and +n more"
const getBestMissingRarity = relic => Math.min(99, ...relic.useful.flatMap(item => item.drops.map(drop => rarityRank[String(drop.rarity || '').toLowerCase()] ?? 99)));
let initialized = false;

const escapeHtml = value => String(value ?? '').replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const normalizeKey = value => String(value ?? '').trim().toLowerCase();
const formatDisplayName = value => String(value ?? '').split(/\s+/).map(word =>
  word ? word.charAt(0).toUpperCase() + word.slice(1).toLowerCase() : word
).join(' ');
const displayRelic = name => formatDisplayName(tRelicName(name) || name);
const getStatus = name => {
  const key = normalizeKey(name);
  if (state.farmableRelics.has(key)) return 'available';
  if (state.resurgenceRelics.has(key)) return 'resurgence';
  return state.missionRewardsLoaded ? 'vaulted' : 'unknown';
};
const getEra = name => {
  const era = String(name).trim().split(/\s+/)[0];
  return ['Lith', 'Meso', 'Neo', 'Axi', 'Requiem'].find(x => x.toLowerCase() === era.toLowerCase()) || 'Other';
};

function buildRelicIndex() {
  const missingByRelic = new Map();
  const missingRewards = new Map();
  let missingPartCount = 0;

  for (const prime of state.allPrimes) {
    if (!prime.components?.length) continue;

    // Exclude completed Prime items before looking at their individual parts.
    // The Prime tab stores item ownership on its main-item component; the
    // Mastery tab stores it under `${prime.uniqueName}_owned` and mastery
    // under `masteryMastered[prime.uniqueName]`.
    const mainItem = prime.components.find(component => component.isMainItem);
    const isObtained = !!(
      (mainItem?.uniqueName && Number(state.owned[mainItem.uniqueName] ?? 0) > 0) ||
      Number(masteryState.owned[`${prime.uniqueName}_owned`] ?? 0) > 0
    );
    const isMastered = !!masteryState.masteryMastered[prime.uniqueName];
    if (isObtained || isMastered) continue;

    const missingComponents = prime.components.filter(component =>
      !component.isMainItem && component.uniqueName && !(state.owned[component.uniqueName] > 0)
    );

    for (const component of missingComponents) {
      const relicNames = new Set();
      for (const drop of component.drops || []) {
        if (!drop.location) continue;
        const name = normalizeRelicName(drop.location);
        if (name) relicNames.add(normalizeKey(name));
      }
      if (!relicNames.size) continue;
      missingPartCount++;

      for (const relicName of relicNames) {
        if (!missingByRelic.has(relicName)) missingByRelic.set(relicName, new Map());
        const rewardName = (component.drops || []).find(d => normalizeKey(d.location) === relicName)?.type || `${prime.name} ${component.name}`;
        const rewardKey = normalizeKey(rewardName);
        const entry = {
          primeName: prime.name,
          primeUniqueName: prime.uniqueName,
          category: prime.category || 'Other',
          componentName: component.name,
          componentUniqueName: component.uniqueName,
          rewardName,
          drops: (component.drops || []).filter(d => normalizeKey(d.location) === relicName),
        };
        const bucket = missingByRelic.get(relicName);
        const dedupe = `${entry.componentUniqueName}|${rewardKey}`;
        bucket.set(dedupe, entry);
        if (!missingRewards.has(rewardKey)) missingRewards.set(rewardKey, []);
        if (!missingRewards.get(rewardKey).some(x => x.componentUniqueName === entry.componentUniqueName)) {
          missingRewards.get(rewardKey).push(entry);
        }
      }
    }
  }

  const relics = [];
  const allRelicNames = new Set([...state.relicRewardsMap.keys(), ...missingByRelic.keys()]);
  for (const name of allRelicNames) {
    const usefulMap = missingByRelic.get(name) || new Map();
    const rewards = state.relicRewardsMap.get(name) || [];
    const useful = [...usefulMap.values()];
    const status = getStatus(name);
    relics.push({
      name,
      era: getEra(name),
      status,
      useful,
      rewards,
      primeCount: new Set(useful.map(x => x.primeUniqueName)).size,
      categories: [...new Set(useful.map(x => x.category))],
    });
  }
  return { relics, missingPartCount, missingRewards };
}

function ensureShell() {
  const host = document.getElementById('relicFinder');
  if (!host || initialized) return;
  host.innerHTML = `
    <div class="relic-toolbar">
      <div class="relic-search-wrap"><input id="relicSearch" type="text" placeholder="${escapeHtml(tr('search'))}" aria-label="${escapeHtml(tr('search'))}"></div>
    </div>
    <div id="relicResults" class="relic-results"></div>`;

  const bind = (id, key, transform = v => v) => {
    const el = document.getElementById(id);
    el.addEventListener('input', () => { FILTERS[key] = transform(el.value); renderRelics(); });
    el.addEventListener('change', () => { FILTERS[key] = transform(el.value); renderRelics(); });
  };
  bind('relicSearch', 'search', normalizeKey);
  initialized = true;
}

function localizeShell() {
  const search = document.getElementById('relicSearch');
  if (search) { search.placeholder = tr('search'); search.setAttribute('aria-label', tr('search')); }
}


export function renderRelics() {
  ensureShell();
  localizeShell();
  const results = document.getElementById('relicResults');
  if (!results) return;

  const { relics } = buildRelicIndex();
  const query = FILTERS.search;
  let filtered = relics.filter(relic => {
    if (!relic.useful.length) return false;
    if (query && !normalizeKey(relic.name).includes(query) && !relic.useful.some(x => normalizeKey(`${x.primeName} ${x.componentName}`).includes(query))) return false;
    return true;
  });

  // Filters define the candidate set; ranking is always deterministic:
  // availability, best missing reward rarity, then Lith > Meso > Neo > Axi.
  filtered.sort((a, b) =>
    (statusRank[a.status] ?? 99) - (statusRank[b.status] ?? 99) ||
    getBestMissingRarity(a) - getBestMissingRarity(b) ||
    (eraRank[a.era] ?? 99) - (eraRank[b.era] ?? 99) ||
    a.name.localeCompare(b.name)
  );

  if (!filtered.length) {
    results.innerHTML = `<div class="relic-empty"><strong>${state.allPrimes.length ? tr('noMatches') : tr('notLoaded')}</strong><span>${state.allPrimes.length ? tr('tryFilters') : tr('reload')}</span></div>`;
    return;
  }

  results.innerHTML = filtered.map(relic => {
    const statusLabel = relic.status === 'available' ? tr('available') : relic.status === 'resurgence' ? tr('resurgence') : relic.status === 'unknown' ? tr('unverified') : tr('vaulted');
    const hiddenCount = Math.max(0, relic.useful.length - MAX_PREVIEW_ITEMS);
    const previewItems = relic.useful.slice(0, MAX_PREVIEW_ITEMS).map(item => {
      const prime = tPrimeName(item.primeName) || item.primeName;
      const component = tComponent(item.componentName) || item.componentName;
      return `<span class="relic-missing-item" title="${escapeHtml(prime)} · ${escapeHtml(component)}">${escapeHtml(prime)} <i>·</i> ${escapeHtml(component)}</span>`;
    }).join('');
    const moreLabel = tr('more').replace('{{count}}', hiddenCount);
    return `<div class="relic-cell"><button type="button" class="relic-entry" data-open-relic="${escapeHtml(relic.name)}" aria-label="${escapeHtml(displayRelic(relic.name))} — ${escapeHtml(statusLabel)}">
      <span class="relic-era-mark" aria-hidden="true"><span class="relic-era-icon-slot" data-icon-key="${escapeHtml(ERA_ICON_KEYS[relic.era] || ERA_ICON_KEYS.Other)}"></span></span>
      <span class="relic-card-content">
        <span class="relic-card-heading"><strong class="relic-entry-name">${escapeHtml(displayRelic(relic.name))}</strong><span class="relic-status ${relic.status}">${escapeHtml(statusLabel)}</span></span>
        <span class="relic-card-preview"><span class="relic-missing-list">${previewItems}${hiddenCount ? `<span class="relic-more-targets">${escapeHtml(moreLabel)}</span>` : ''}</span></span>
      </span>
    </button></div>`;
  }).join('');

  results.querySelectorAll('.relic-era-icon-slot').forEach(slot => {
    slot.appendChild(createIcon(slot.dataset.iconKey, { className: 'relic-era-icon', alt: '' }));
  });

  results.querySelectorAll('[data-open-relic]').forEach(card => {
    card.addEventListener('click', () => {
      const relic = filtered.find(item => item.name === card.dataset.openRelic);
      if (!relic) return;
      openRelicModal(
        relic.name,
        relic.rewards,
        false,
        relic.status === 'resurgence',
        relic.useful.map(item => item.rewardName)
      );
    });
  });
}

export function initRelics() {
  initIcons();
  ensureShell();
  if (!window.__primeRelicOwnershipListener) {
    window.addEventListener('primeownershipchange', () => {
      if (document.getElementById('relicFinder') && !document.getElementById('relicFinder').hidden) renderRelics();
    });
    window.__primeRelicOwnershipListener = true;
  }
  renderRelics();
}
