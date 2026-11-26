// mastery/renderer.js - Card rendering and lazy image loading for mastery items

const invoke = window.__TAURI_INTERNALS__.invoke;

import { masteryState, IMAGE_BASE,
         STARCHART_TRACKS, RAILJACK_INTRINSICS, DRIFTER_INTRINSICS,
         INTRINSIC_XP_PER_RANK, INTRINSIC_MAX_RANK,
         MASTERY_FOUNDER_ITEMS,
         MASTERY_SUBSECTIONS, MASTERY_MISC_SECTION, itemInSection } from './state.js';
import { t, tMasteryItemName, tComponent, getLanguage } from '../i18n.js';
import { openMasteryItemModal, openPrimeCardModal } from '../modal.js';
import { state as primesState } from '../primes/state.js';
import { buildDropTableForPrime, hasRelicDrops } from '../primes/renderer.js';
import { loadPrimes } from '../primes/loader.js';

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
      console.error('[mastery/renderer] Failed to save mastery image cache:', e);
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
  const ignored  = MASTERY_FOUNDER_ITEMS.has(item.name) && masteryState.ignoredMasteryItems.has(item.uniqueName);

  if (mastered) return `<span class="mastery-badge mastered">${t('mastery.ui.badge.mastered')}</span>`;
  if (owned)    return `<span class="mastery-badge owned">${t('mastery.ui.badge.owned')}</span>`;
  if (ignored)  return `<span class="mastery-badge ignored">${t('mastery.ui.badge.ignored')}</span>`;
  return               `<span class="mastery-badge missing">${t('mastery.ui.badge.missing')}</span>`;
}

// ─── Card ──────────────────────────────────────────────────────────────────────

function buildCard(item, observer, displayName = tMasteryItemName(item.name)) {
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
  img.alt = displayName;
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

  const isFounder = MASTERY_FOUNDER_ITEMS.has(item.name);
  const isIgnored = masteryState.ignoredMasteryItems.has(item.uniqueName);

  if (isFounder) {
    const ignoreBtn = document.createElement('button');
    ignoreBtn.className = 'prime-ignore-btn';
    ignoreBtn.title = isIgnored ? t('btn.unignore') : t('btn.ignore');
    ignoreBtn.textContent = '✕';
    ignoreBtn.onclick = async e => {
      e.stopPropagation();
      if (masteryState.ignoredMasteryItems.has(item.uniqueName)) masteryState.ignoredMasteryItems.delete(item.uniqueName);
      else masteryState.ignoredMasteryItems.add(item.uniqueName);
      try { await masteryState.saveFunction(); } catch (err) { console.error(err); }
      renderMastery();
      document.dispatchEvent(new CustomEvent('mastery-progress-update'));
    };
    card.appendChild(ignoreBtn);
  }

  if (isIgnored) card.classList.add('mastered'); // reuse the faded style

  // ── Body ──
  const body = document.createElement('div');
  body.className = 'mastery-card-body';
  body.innerHTML = `
    <div class="mastery-card-name">${displayName}</div>
    <div class="mastery-card-xp">${(item.masteryPoints ?? 0).toLocaleString()} ${t('mastery.ui.label.xp')}</div>
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
  ownedLabel.append(ownedBox, document.createTextNode(t('mastery.ui.label.owned')));

  const masteredLabel = document.createElement('label');
  masteredLabel.className = 'mastery-check';
  const masteredBox = document.createElement('input');
  masteredBox.type = 'checkbox';
  masteredBox.checked = mastered;
  masteredBox.dataset.action = 'mastered';
  masteredLabel.append(masteredBox, document.createTextNode(t('mastery.ui.label.mastered')));

  controls.append(ownedLabel, masteredLabel);

  if (item.section === 'Warframe' && !item.isPrime && !item.name.endsWith(' Umbra')) {
    const subsumedLabel = document.createElement('label');
    subsumedLabel.className = 'mastery-check';
    const subsumedBox = document.createElement('input');
    subsumedBox.type = 'checkbox';
    subsumedBox.checked = !!masteryState.masteryMastered[`${item.uniqueName}_subsumed`];
    subsumedBox.dataset.action = 'subsumed';
    subsumedLabel.append(subsumedBox, document.createTextNode(t('mastery.ui.label.subsumed')));
    controls.append(subsumedLabel);
  }
  
  card.append(imgWrap, body, controls);

  // ── Checkbox state changes ──────────────────────────────────────────────────
  card.addEventListener('change', async e => {
    const action = e.target.dataset.action;
    if (!action) return;

    if (action === 'owned') {
      if (e.target.checked) masteryState.owned[`${item.uniqueName}_owned`] = 1;
      else delete masteryState.owned[`${item.uniqueName}_owned`];
      card.classList.toggle('owned', e.target.checked);
    }

    if (action === 'mastered') {
      if (e.target.checked) masteryState.masteryMastered[item.uniqueName] = 1;
      else delete masteryState.masteryMastered[item.uniqueName];
      card.classList.toggle('mastered', e.target.checked);
    }

    if (action === 'subsumed') {
      if (e.target.checked) masteryState.masteryMastered[`${item.uniqueName}_subsumed`] = 1;
      else delete masteryState.masteryMastered[`${item.uniqueName}_subsumed`];
    }

    const badge = body.querySelector('.mastery-badge');
    if (badge) badge.outerHTML = buildBadge(item);

    try { await masteryState.saveFunction(); }
    catch (err) { console.error('[mastery/renderer] Save failed:', err); }

    document.dispatchEvent(new CustomEvent('mastery-progress-update'));
  });

  // ── Card click → modal ──────────────────────────────────────────────────────
  // Prevent checkbox interactions from also triggering the card click
  controls.addEventListener('click', e => e.stopPropagation());

  card.addEventListener('click', async () => {
    // Resolve the image that was loaded for this card
    const resolvedImg = masteryState.imageCache.get(item.uniqueName)
      || item.wikiImageUrl
      || FALLBACK;

    // If this is a prime item, use the full prime modal.
    // Lazy-load primes data first if the Primes tab hasn't been visited yet.
    if (item.isPrime) {
      if (!primesState.allPrimes || primesState.allPrimes.length === 0) {
        await loadPrimes();
      }

      const matchedPrime = primesState.allPrimes.find(p =>
        p.uniqueName === item.uniqueName || p.name === item.name
      );

      if (matchedPrime) {
        const isFounder = primesState.ignoredPrimes?.has(matchedPrime.uniqueName) ?? false;
        const isSpecial = !isFounder && !hasRelicDrops(matchedPrime);
        const compsForModal = matchedPrime.components.map(comp => ({
          ...comp,
          displayName: comp.isMainItem ? t('general.owned') : tComponent(comp.name),
          isOwned: (primesState.owned[comp.uniqueName] ?? 0) > 0,
        }));

        openPrimeCardModal(
          { ...matchedPrime, components: compsForModal, isSpecial },
          resolvedImg,
          () => buildDropTableForPrime(matchedPrime, isSpecial),
          async (uniqueName, val) => {
            primesState.owned[uniqueName] = val;
            try { await primesState.saveFunction(); } catch (err) { console.error('Save failed:', err); }
          },
          async (uniqueName, checked) => {
            if (checked) masteryState.masteryMastered[uniqueName] = 1;
            else delete masteryState.masteryMastered[uniqueName];
            card.classList.toggle('mastered', checked);
            const badge = body.querySelector('.mastery-badge');
            if (badge) badge.outerHTML = buildBadge(item);
            const masteredBox = controls.querySelector('[data-action="mastered"]');
            if (masteredBox) masteredBox.checked = checked;
            try { await masteryState.saveFunction(); } catch (err) { console.error('Mastery save failed:', err); }
            document.dispatchEvent(new CustomEvent('mastery-progress-update'));
          },
          () => { /* no mastery re-render needed on prime parts ownership change */ }
        );
        return;
      }
    }

    // Non-prime → mastery modal with component drop data fetched from API
    openMasteryItemModal({
      item,
      imageUrl: resolvedImg,
      onOwnedChange: async (checked) => {
        if (checked) masteryState.owned[`${item.uniqueName}_owned`] = 1;
        else delete masteryState.owned[`${item.uniqueName}_owned`];
        card.classList.toggle('owned', checked && !masteryState.masteryMastered[item.uniqueName]);
        const badge = body.querySelector('.mastery-badge');
        if (badge) badge.outerHTML = buildBadge(item);
        const ownedBox = controls.querySelector('[data-action="owned"]');
        if (ownedBox) ownedBox.checked = checked;
        try { await masteryState.saveFunction(); } catch (err) { console.error(err); }
        document.dispatchEvent(new CustomEvent('mastery-progress-update'));
      },
      onMasteredChange: async (checked) => {
        if (checked) masteryState.masteryMastered[item.uniqueName] = 1;
        else delete masteryState.masteryMastered[item.uniqueName];
        card.classList.toggle('mastered', checked);
        const badge = body.querySelector('.mastery-badge');
        if (badge) badge.outerHTML = buildBadge(item);
        const masteredBox = controls.querySelector('[data-action="mastered"]');
        if (masteredBox) masteredBox.checked = checked;
        try { await masteryState.saveFunction(); } catch (err) { console.error(err); }
        document.dispatchEvent(new CustomEvent('mastery-progress-update'));
      },
      onSubsumedChange: async (checked) => {
        if (checked) masteryState.masteryMastered[`${item.uniqueName}_subsumed`] = 1;
        else delete masteryState.masteryMastered[`${item.uniqueName}_subsumed`];
        const subsumedBox = controls.querySelector('[data-action="subsumed"]');
        if (subsumedBox) subsumedBox.checked = checked;
        try { await masteryState.saveFunction(); } catch (err) { console.error(err); }
      },
    });
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
  container.appendChild(buildTrackerGroup(t('mastery.ui.misc.starchart.heading'), starchartRows));

  // ── Railjack Intrinsics ──
  const railjackRows = RAILJACK_INTRINSICS.map(({ key, labelKey }) =>
    buildTrackerRow(key, t(labelKey), INTRINSIC_MAX_RANK, INTRINSIC_XP_PER_RANK)
  );
  container.appendChild(buildTrackerGroup(t('mastery.ui.misc.railjack.heading'), railjackRows));

  // ── Drifter Intrinsics ──
  const drifterRows = DRIFTER_INTRINSICS.map(({ key, labelKey }) =>
    buildTrackerRow(key, t(labelKey), INTRINSIC_MAX_RANK, INTRINSIC_XP_PER_RANK)
  );
  container.appendChild(buildTrackerGroup(t('mastery.ui.misc.drifter.heading'), drifterRows));

  list.appendChild(container);
}

// ─── Category tab bar ──────────────────────────────────────────────────────────
// Buttons are created once in index.js; labels/active state are synced on every render
// so language changes and section switches are both covered.

export function syncMasterySubnav() {
  const lang = getLanguage();
  document.querySelectorAll('#masterySubnav [data-mastery-section]').forEach(btn => {
    const sub = MASTERY_SUBSECTIONS.find(s => s.id === btn.dataset.masterySection);
    if (!sub) return;
    const translated = t(sub.labelKey);
    btn.textContent = translated !== sub.labelKey ? translated : (sub.fallback?.[lang] ?? sub.fallback?.en ?? translated);
    const active = sub.id === masteryState.activeSection;
    btn.classList.toggle('active', active);
    btn.setAttribute('aria-selected', String(active));
  });
}

// ─── Main render ───────────────────────────────────────────────────────────────

const SEARCH_KEYWORDS = { 'kitgun': 'Kitgun', 'zaw': 'Zaw' };

// Cards are appended in time-boxed chunks: the first screenful is built synchronously,
// the rest are spread across animation frames so the "All" tab (~1k cards) never blocks
// the main thread. A new render bumps the token, which makes any in-flight chunk loop stop.
const FIRST_CHUNK_MIN = 60;   // cards built before the first yield, regardless of time
const CHUNK_BUDGET_MS = 10;   // per-frame budget for the remaining cards
let renderToken = 0;

// Intl.Collator is far cheaper than String#localeCompare(a, locale) in a sort comparator
const collators = new Map();
function getCollator() {
  const locale = getLanguage() === 'pt' ? 'pt-BR' : 'en';
  let col = collators.get(locale);
  if (!col) { col = new Intl.Collator(locale); collators.set(locale, col); }
  return col;
}

export function renderMastery() {
  const list = document.getElementById('masteryList');
  if (!list) return;

  const token = ++renderToken;
  list.innerHTML = '';
  list.style.display = ''; // restore grid (may have been overridden by misc section)
  resetMasteryImageObserver();
  syncMasterySubnav();

  const { items, masteryMastered, owned, ignoredMasteryItems, activeSection, searchText, statusFilter } = masteryState;

  // Misc section gets its own layout — no toolbar, no card grid
  if (activeSection === MASTERY_MISC_SECTION) {
    document.getElementById('masteryToolbar').style.display = 'none';
    renderMiscSection(list);
    return;
  }

  document.getElementById('masteryToolbar').style.display = '';

  // Everything that doesn't depend on the item is computed once, not per item
  const q = searchText.toLowerCase();
  const matchedSections = q
    ? new Set(Object.entries(SEARCH_KEYWORDS).filter(([keyword]) => keyword.startsWith(q)).map(([, section]) => section))
    : null;

  // Single pass: section + search + status filters, with the display name and sort rank
  // computed once per item (rank: missing first, owned, mastered, ignored last).
  const rows = [];
  for (const item of items) {
    if (!itemInSection(item, activeSection)) continue;

    const displayName = tMasteryItemName(item.name);

    if (q && !(
      item.name.toLowerCase().includes(q) ||
      displayName.toLowerCase().includes(q) ||
      matchedSections.has(item.section)
    )) continue;

    const isOwned    = (owned[`${item.uniqueName}_owned`] ?? 0) > 0;
    const isMastered = !!masteryMastered[item.uniqueName];
    const statusMatch =
      statusFilter === 'all'                                    ||
      (statusFilter === 'owned'    && isOwned )                 ||
      (statusFilter === 'mastered' && isMastered)               ||
      (statusFilter === 'missing'  && !isOwned);
    if (!statusMatch) continue;

    const isIgnored = MASTERY_FOUNDER_ITEMS.has(item.name) && ignoredMasteryItems.has(item.uniqueName);
    rows.push({ item, displayName, rank: isIgnored ? 3 : isMastered ? 2 : isOwned ? 1 : 0 });
  }

  const collator = getCollator();
  rows.sort((a, b) => (a.rank - b.rank) || collator.compare(a.displayName, b.displayName));

  if (rows.length === 0) {
    list.innerHTML = `<p class="mastery-empty">${t('feedback.noItems')}</p>`;
    return;
  }

  const observer = getImageObserver();
  let i = 0;

  const appendChunk = () => {
    if (token !== renderToken) return; // superseded by a newer render
    const fragment = document.createDocumentFragment();
    const deadline = performance.now() + CHUNK_BUDGET_MS;
    const minEnd   = i === 0 ? FIRST_CHUNK_MIN : 0;

    do {
      const { item, displayName } = rows[i++];
      fragment.appendChild(buildCard(item, observer, displayName));
    } while (i < rows.length && (i < minEnd || performance.now() < deadline));

    list.appendChild(fragment);
    if (i < rows.length) requestAnimationFrame(appendChunk);
  };

  appendChunk();
}
