// mods/renderer.js

import { state } from './state.js';
import { t } from '../i18n.js';
import { openModModal } from './modal.js';

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

// ─── Lazy image observer ───────────────────────────────────────────────────────

let _obs = null;

function getObs() {
  if (_obs) return _obs;
  _obs = new IntersectionObserver((entries) => {
    entries.forEach(e => {
      if (!e.isIntersecting) return;
      const img = e.target;
      img.src = img.dataset.src;
      img.onerror = () => {
        // If WM card fails, try the WFCD fallback stored in data-fallback
        const fb = img.dataset.fallback;
        if (fb && img.src !== fb) {
          img.src = fb;
        } else {
          img.removeAttribute('src');
        }
      };
      _obs.unobserve(img);
    });
  }, { rootMargin: '200px' });
  return _obs;
}

function resetObs() {
  if (_obs) { _obs.disconnect(); _obs = null; }
}

// ─── Main render ───────────────────────────────────────────────────────────────

export function renderMods() {
  const list = document.getElementById('modList');
  list.innerHTML = '';
  resetObs();

  const st = state.searchText;
  const filtered = state.allMods.filter(mod => {
    const dn       = tModName(mod.name).toLowerCase();
    const nameMatch = dn.includes(st) || mod.name.toLowerCase().includes(st);
    const compatMatch = mod.compatName ? mod.compatName.toLowerCase().includes(st) : false;
    const catMatch  = state.category === 'All' || mod.category === state.category;
    const polMatch  = state.polarity === 'All' || mod.polarity === state.polarity;
    return (nameMatch || compatMatch) && catMatch && polMatch;
  });

  if (!filtered.length) {
    list.innerHTML = `<div class="mod-empty">${t('mod.noResults')}</div>`;
    return;
  }

  const frag = document.createDocumentFragment();
  const obs  = getObs();
  filtered.forEach(mod => frag.appendChild(buildCard(mod, obs)));
  list.appendChild(frag);
}

// ─── Card builder ──────────────────────────────────────────────────────────────
// When WM full card is available (isWmCard=true):
//   → just show the card image filling the whole card area — polarity, rarity,
//     art and name are all baked into the WM image itself.
// When only WFCD thumbnail is available:
//   → show the overframe-style layered card with rarity background + mod art.

function buildCard(mod, obs) {
  const card     = document.createElement('div');
  const rarity   = mod.rarity   || 'Common';
  const modClass = mod.modClass || '';

  card.className        = 'mod-card';
  card.dataset.rarity   = rarity;
  card.dataset.polarity = mod.polarity || '';
  if (modClass) card.dataset.modClass = modClass;
  card.dataset.wmCard = mod.isWmCard ? '1' : '0';

  const name = tModName(mod.name);

  // Fallback thumb URL (WFCD)
  const fallbackSrc = mod.imageName
    ? `https://cdn.warframestat.us/img/${mod.imageName}`
    : null;

  if (mod.isWmCard && mod.imgUrl) {
    // ── Full WM card: just the image, it is the card ───────────────────────
    card.innerHTML = `
      <div class="mc-wm-card">
        <img
          class="mc-wm-img"
          data-src="${mod.imgUrl}"
          ${fallbackSrc ? `data-fallback="${fallbackSrc}"` : ''}
          src="${BLANK}"
          alt="${name}"
          draggable="false"
        />
      </div>
    `;
  } else {
    // ── Layered fallback card (WFCD thumb + rarity styling) ────────────────
    const maxRank  = typeof mod.maxRank === 'number' ? mod.maxRank : 5;
    const pipCount = Math.min(maxRank, 10);
    const pips     = Array(pipCount).fill('<i>●</i>').join('');
    const isMaxed  = pipCount >= 10;

    // Drain display — aura and stance values are positive after computeDrain.
    // Aura mods grant capacity so we prefix with + for clarity.
    let drainStr = '';
    if (mod.drainDisplay !== null && mod.drainDisplay !== undefined) {
      const d = mod.drainDisplay;
      if (d !== 0) {
        drainStr = (mod.category === 'Aura' || mod.category === 'Stance') ? '+' + d : String(d);
      }
    }

    card.innerHTML = `
      <div class="mc-mod">
        <div class="mc-content">
          <div class="mc-border"></div>

          <div class="mc-drain">${drainStr}</div>

          <figure class="mc-figure">
            <img
              class="mc-img"
              ${mod.imgUrl ? `data-src="${mod.imgUrl}"` : ''}
              src="${BLANK}"
              width="128" height="128"
              alt="${name}"
            />
          </figure>

          <div class="mc-description">
            <p class="mc-name">${name}</p>
            ${mod.description ? `<p class="mc-desc">${mod.description.replace(/\\n|\n/g, '<br>')}</p>` : ''}
          </div>
          <div class="mc-compat"><p>${tCategory(mod.category).toUpperCase()}</p></div>
          <div class="mc-fusion${isMaxed ? ' mc-fusion-max' : ''}" data-rank="${pipCount}">${pips}</div>
        </div>
      </div>
    `;
  }

  // Lazy-load the image
  const img = card.querySelector('img');
  if (img && img.dataset.src) obs.observe(img);

  card.onclick = () => openModModal(mod);
  return card;
}

// ─── i18n helpers ─────────────────────────────────────────────────────────────

export function tModName(name) {
  if (!name) return name;
  const key = `mod.${name}`;
  const val = t(key);
  return val !== key ? val : name;
}

export function tRarityMod(rarity) {
  if (!rarity) return '';
  const key = `rarity.${rarity.toLowerCase()}`;
  const val = t(key);
  return val !== key ? val : rarity;
}

export function tCategory(cat) {
  if (!cat) return cat;
  const MAP = {
    Primary:      'category.primary',
    Secondary:    'category.secondary',
    Melee:        'category.melee',
    Warframe:     'category.warframe',
    Companion:    'mod.category.companion',
    'Arch-Gun':   'category.arch_gun',
    'Arch-Melee': 'category.arch_melee',
    Archwing:     'category.archwing',
    Aura:         'mod.category.aura',
    Stance:       'mod.category.stance',
    Parazon:      'mod.category.parazon',
    Misc:         'mod.category.misc',
  };
  const key = MAP[cat];
  if (!key) return cat;
  const val = t(key);
  return val !== key ? val : cat;
}