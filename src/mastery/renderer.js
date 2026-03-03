// mastery/renderer.js - Card rendering and lazy image loading for mastery items

const invoke = window.__TAURI_INTERNALS__.invoke;

import { masteryState, IMAGE_BASE,
         STARCHART_TRACKS, RAILJACK_INTRINSICS, DRIFTER_INTRINSICS,
         INTRINSIC_XP_PER_RANK, INTRINSIC_MAX_RANK } from './state.js';
import { t } from '../i18n.js';

// ─── Image cache ───────────────────────────────────────────────────────────────

const FALLBACK = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='80' height='80' viewBox='0 0 80 80'%3E%3Crect width='80' height='80' fill='%23151b2b'/%3E%3Ctext x='40' y='44' text-anchor='middle' font-size='28' fill='%23334'%3E✦%3C/text%3E%3C/svg%3E";

export async function initMasteryImageCache() {
  try {
    const diskCache = await invoke('load_mastery_image_cache');
    Object.entries(diskCache).forEach(([key, val]) => masteryState.imageCache.set(key, val));
  } catch (e) {
    console.error('[mastery/renderer] Failed to load mastery image cache:', e);
  }
}

let persistTimer = null;

function persistImageCache() {
  clearTimeout(persistTimer);
  persistTimer = setTimeout(async () => {
    try {
      const cache = Object.fromEntries(masteryState.imageCache);
      await invoke('save_mastery_image_cache', { cache });
    } catch (e) {
      console.error('[mastery/renderer] Failed to save shared image cache:', e);
    }
  }, 1000);
}

// ─── IntersectionObserver ──────────────────────────────────────────────────────

let imageObserver = null;

function getImageObserver() {
  if (imageObserver) return imageObserver;

  const scrollRoot = document.getElementById('contentArea');
  if (!scrollRoot) console.warn('[mastery/renderer] #contentArea not found, falling back to viewport');

  imageObserver = new IntersectionObserver((entries) => {
    entries.forEach(entry => {
      if (!entry.isIntersecting) return;

      const img        = entry.target;
      const uniqueName = img.dataset.uniqueName;
      const src        = img.dataset.src;

      if (!uniqueName || !src) { imageObserver.unobserve(img); return; }

      if (masteryState.imageCache.has(uniqueName)) {
        img.src = masteryState.imageCache.get(uniqueName);
        imageObserver.unobserve(img);
        return;
      }

      invoke('fetch_image_base64', { url: src })
        .then(b64 => {
          const dataUri = `data:image/png;base64,${b64}`;
          masteryState.imageCache.set(uniqueName, dataUri);
          img.src = dataUri;
          persistImageCache();
        })
        .catch(() => { img.src = FALLBACK; })
        .finally(() => { imageObserver.unobserve(img); });
    });
  }, {
    root: scrollRoot,
    rootMargin: '200px',
  });

  return imageObserver;
}

export function resetMasteryImageObserver() {
  if (imageObserver) {
    imageObserver.disconnect();
    imageObserver = null;
  }
}

// ─── Badge ─────────────────────────────────────────────────────────────────────

function buildBadge(item) {
  const mastered = !!masteryState.masteryMastered[item.uniqueName];
  const owned    = (masteryState.owned[`${item.uniqueName}_owned`] ?? 0) > 0;

  if (mastered) return `<span class="mastery-badge mastered">${t('mastery.badge.mastered')}</span>`;
  if (owned)    return `<span class="mastery-badge owned">${t('mastery.badge.owned')}</span>`;
  return               `<span class="mastery-badge missing">${t('mastery.badge.missing')}</span>`;
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function buildCard(item, observer) {
  const mastered = !!masteryState.masteryMastered[item.uniqueName];
  const owned    = (masteryState.owned[`${item.uniqueName}_owned`] ?? 0) > 0;

  const card = document.createElement('div');
  card.className = 'mastery-card';
  if (mastered) card.classList.add('mastered');
  else if (owned) card.classList.add('owned');
  card.dataset.unique = item.uniqueName;

  // ── Image ──
  const imgWrap = document.createElement('div');
  imgWrap.className = 'mastery-card-image';

  const img = document.createElement('img');
  img.alt = item.name;
  img.style.opacity = '0';
  img.style.transition = 'opacity 0.2s';
  img.onload  = () => { img.style.opacity = '1'; };
  img.onerror = () => { img.src = FALLBACK; img.style.opacity = '1'; };

  if (item.wikiImageUrl) {
    img.src = item.wikiImageUrl;
  } else if (item.imageName) {
    const cdnUrl = `${IMAGE_BASE}${item.imageName}`;
    if (masteryState.imageCache.has(item.uniqueName)) {
      img.src = masteryState.imageCache.get(item.uniqueName);
    } else {
      img.dataset.src        = cdnUrl;
      img.dataset.uniqueName = item.uniqueName;
      observer.observe(img);
    }
  } else {
    img.src = FALLBACK;
    img.style.opacity = '1';
  }

  imgWrap.appendChild(img);

  // ── Body ──
  const body = document.createElement('div');
  body.className = 'mastery-card-body';
  body.innerHTML = `
    <div class="mastery-card-name">${item.name}</div>
    <div class="mastery-card-xp">${(item.masteryPoints ?? 0).toLocaleString()} ${t('mastery.label.xp')}</div>
    ${buildBadge(item)}
  `;

  // ── Checkboxes ──
  const controls = document.createElement('div');
  controls.className = 'mastery-card-controls';

  const ownedLabel = document.createElement('label');
  ownedLabel.className = 'mastery-check';
  const ownedBox = document.createElement('input');
  ownedBox.type = 'checkbox';
  ownedBox.checked = owned;
  ownedBox.dataset.action = 'owned';
  ownedLabel.append(ownedBox, document.createTextNode(t('mastery.label.owned')));

  const masteredLabel = document.createElement('label');
  masteredLabel.className = 'mastery-check';
  const masteredBox = document.createElement('input');
  masteredBox.type = 'checkbox';
  masteredBox.checked = mastered;
  masteredBox.dataset.action = 'mastered';
  masteredLabel.append(masteredBox, document.createTextNode(t('mastery.label.mastered')));

  controls.append(ownedLabel, masteredLabel);
  card.append(imgWrap, body, controls);

  // ── Interaction ──
  card.addEventListener('change', async e => {
    const action = e.target.dataset.action;
    if (!action) return;

    const now = new Date().toISOString().slice(0, 10);

    if (action === 'owned') {
      if (e.target.checked) masteryState.owned[`${item.uniqueName}_owned`] = 1;
      else delete masteryState.owned[`${item.uniqueName}_owned`];
      card.classList.toggle('owned', e.target.checked);
    }

    if (action === 'mastered') {
      if (e.target.checked) masteryState.masteryMastered[item.uniqueName] = { since: now };
      else delete masteryState.masteryMastered[item.uniqueName];
      card.classList.toggle('mastered', e.target.checked);
    }

    const badge = body.querySelector('.mastery-badge');
    if (badge) badge.outerHTML = buildBadge(item);

    try { await masteryState.saveFunction(); }
    catch (err) { console.error('[mastery/renderer] Save failed:', err); }
  });

  return card;
}

// ─── Misc section ──────────────────────────────────────────────────────────────

function getTrackerValue(key) {
  const val = masteryState.masteryMastered[key];
  return typeof val === 'number' ? val : 0;
}

async function setTrackerValue(key, value) {
  masteryState.masteryMastered[key] = value;
  try { await masteryState.saveFunction(); }
  catch (err) { console.error('[mastery/renderer] Save failed:', err); }
}

function buildTrackerRow(key, label, max, xpPerUnit) {
  const current = getTrackerValue(key);

  const row = document.createElement('div');
  row.className = 'misc-tracker-row';
  row.dataset.key = key;

  const lbl = document.createElement('span');
  lbl.className = 'misc-tracker-label';
  lbl.textContent = label;

  const stepper = document.createElement('div');
  stepper.className = 'misc-tracker-stepper';

  const btnDown = document.createElement('button');
  btnDown.className = 'misc-stepper-btn';
  btnDown.textContent = '‹';
  btnDown.title = 'Decrease';

  const display = document.createElement('span');
  display.className = 'misc-stepper-input';
  display.textContent = current;
  display.contentEditable = 'true';

  const btnUp = document.createElement('button');
  btnUp.className = 'misc-stepper-btn';
  btnUp.textContent = '›';
  btnUp.title = 'Increase';

  const maxLabel = document.createElement('span');
  maxLabel.className = 'misc-tracker-max';
  maxLabel.textContent = `/ ${max}`;

  const xpLabel = document.createElement('span');
  xpLabel.className = 'misc-tracker-xp';
  xpLabel.textContent = `${(current * xpPerUnit).toLocaleString()} XP`;

  stepper.append(btnDown, display, btnUp, maxLabel);
  row.append(lbl, stepper, xpLabel);

  function applyValue(raw) {
    let v = parseInt(raw, 10);
    if (isNaN(v) || v < 0) v = 0;
    if (v > max) v = max;
    display.textContent = v;
    xpLabel.textContent = `${(v * xpPerUnit).toLocaleString()} XP`;
    setTrackerValue(key, v);
  }

  btnDown.onclick = e => { e.preventDefault(); applyValue(getTrackerValue(key) - 1); };
  btnUp.onclick   = e => { e.preventDefault(); applyValue(getTrackerValue(key) + 1); };

  display.onblur    = () => applyValue(display.textContent);
  display.onkeydown = e => {
    if (e.key === 'Enter') { e.preventDefault(); display.blur(); }
    // Allow only digits, backspace, delete, arrows
    if (!/[\d]/.test(e.key) && !['Backspace','Delete','ArrowLeft','ArrowRight','Tab'].includes(e.key)) {
      e.preventDefault();
    }
  };

  return row;
}




function buildTrackerGroup(title, rows) {
  const group = document.createElement('div');
  group.className = 'misc-tracker-group';

  const heading = document.createElement('h3');
  heading.className = 'misc-tracker-heading';
  heading.textContent = title;

  group.append(heading, ...rows);
  return group;
}

function renderMiscSection(list) {
  list.innerHTML = '';
  // masteryList is a grid by default — override for the misc tracker layout
  list.style.display = 'block';

  const container = document.createElement('div');
  container.className = 'misc-tracker-container';

  // ── Starchart ──
  const starchartRows = STARCHART_TRACKS.map(track =>
    buildTrackerRow(track.key, t(track.labelKey), track.max, track.xpEach)
  );
  container.appendChild(buildTrackerGroup(t('mastery.misc.starchart.heading'), starchartRows));

  // ── Railjack Intrinsics ──
  const railjackRows = RAILJACK_INTRINSICS.map(({ key, labelKey }) =>
    buildTrackerRow(key, t(labelKey), INTRINSIC_MAX_RANK, INTRINSIC_XP_PER_RANK)
  );
  container.appendChild(buildTrackerGroup(t('mastery.misc.railjack.heading'), railjackRows));

  // ── Drifter Intrinsics ──
  const drifterRows = DRIFTER_INTRINSICS.map(({ key, labelKey }) =>
    buildTrackerRow(key, t(labelKey), INTRINSIC_MAX_RANK, INTRINSIC_XP_PER_RANK)
  );
  container.appendChild(buildTrackerGroup(t('mastery.misc.drifter.heading'), drifterRows));

  list.appendChild(container);
}

// ─── Main render ───────────────────────────────────────────────────────────────

export function renderMastery() {
  const list = document.getElementById('masteryList');
  if (!list) return;

  list.innerHTML = '';
  list.style.display = ''; // restore grid (may have been overridden by misc section)
  resetMasteryImageObserver();

  const { items, masteryMastered, activeSection, searchText, statusFilter } = masteryState;

  // Misc section gets its own layout — no toolbar, no card grid
  if (activeSection === 'mastery-misc') {
    document.getElementById('masteryToolbar').style.display = 'none';
    renderMiscSection(list);
    return;
  }

  document.getElementById('masteryToolbar').style.display = '';

  // Maps sidebar data-section values to the section field used by the loader
  const SECTION_MAP = {
    'mastery-warframes':   'Warframe',
    'mastery-primaries':   'Primary',
    'mastery-secondaries': ['Secondary', 'Kitgun'],
    'mastery-melees':      ['Melee', 'Zaw'],
    'mastery-robotic':     ['Robotic', 'SentinelWeapon'],
    'mastery-companions':  'Companion',
    'mastery-vehicles':    ['Vehicle', 'Archwing'],
    'mastery-archgun':     'Arch-Gun',
    'mastery-archmelee':   'Arch-Melee',
    'mastery-amps':        'Amp',
  };

  const activeSectionValue = SECTION_MAP[activeSection] ?? activeSection;

  const sectionItems = items.filter(item => {
    const sectionMatch = Array.isArray(activeSectionValue)
      ? activeSectionValue.includes(item.section)
      : item.section === activeSectionValue;

    const searchMatch = !searchText || item.name.toLowerCase().includes(searchText.toLowerCase());

    const isOwned    = (masteryState.owned[`${item.uniqueName}_owned`] ?? 0) > 0;
    const isMastered = !!masteryMastered[item.uniqueName];
    const statusMatch =
      statusFilter === 'all'                                    ||
      (statusFilter === 'owned'    && isOwned && !isMastered)   ||
      (statusFilter === 'mastered' && isMastered)               ||
      (statusFilter === 'missing'  && !isOwned);

    return sectionMatch && searchMatch && statusMatch;
  });

  // Sort alphabetically within status groups (mastered last, owned middle, missing first)
  sectionItems.sort((a, b) => {
    const aM = !!masteryMastered[a.uniqueName];
    const bM = !!masteryMastered[b.uniqueName];
    const aO = (masteryState.owned[`${a.uniqueName}_owned`] ?? 0) > 0;
    const bO = (masteryState.owned[`${b.uniqueName}_owned`] ?? 0) > 0;

    const rank = (m, o) => m ? 2 : o ? 1 : 0;
    const diff = rank(aM, aO) - rank(bM, bO);
    if (diff !== 0) return diff;
    return a.name.localeCompare(b.name);
  });

  if (sectionItems.length === 0) {
    list.innerHTML = `<p class="mastery-empty">${t('mastery.label.noItems')}</p>`;
    return;
  }

  const observer = getImageObserver();
  const fragment = document.createDocumentFragment();
  sectionItems.forEach(item => fragment.appendChild(buildCard(item, observer)));
  list.appendChild(fragment);
}