// src/lib/icons.js
//
// Icon registry backed by the assets repo (CarlosKnoll/warframe-tracker-assets).
//
//   manifest : raw.githubusercontent.com/<repo>/releases/icons.json  → { assetsVersion, icons: { key: path } }
//   images   : cdn.jsdelivr.net/gh/<repo>@<assetsVersion>/<path>      (pinned to an exact git tag)
//
// The app asks for KEYS ("reward.forma"), never paths, so pictures can be swapped or
// renamed in the assets repo without an app release.
//
// Load order per <img> (each step only runs if the previous one errored):
//   1. current version, crossorigin="anonymous"  → cacheable by the service worker
//   2. current version, no crossorigin            → still displays if the CDN sent no CORS headers
//   3. last version that is KNOWN to have loaded  → covers jsDelivr lagging behind a version bump
//   4. inline SVG placeholder                     → a card never shows a broken image
//
// Mirrors i18n.js: the manifest is cached in localStorage for offline use, and a newer
// version is never trusted over the old one until one of its images has actually loaded.
//
// No pop-in: icons decode synchronously, and preloadIcons() fetches + decodes the icons the app
// will need in the background (right after the first render), remembering which load step worked
// for each. A new <img> for an already-loaded URL then paints in its first frame.

const REPO         = 'CarlosKnoll/warframe-tracker-assets';
const MANIFEST_URL = `https://raw.githubusercontent.com/${REPO}/releases/icons.json`;
const CDN_BASE     = `https://cdn.jsdelivr.net/gh/${REPO}`;

const LS_LATEST   = 'wf-icons-manifest';   // most recently fetched manifest
const LS_VERIFIED = 'wf-icons-verified';   // newest manifest whose images were seen loading
const UNKNOWN_KEY = 'ui.unknown';

const FALLBACK_SRC = 'data:image/svg+xml,' + encodeURIComponent(
  "<svg xmlns='http://www.w3.org/2000/svg' width='64' height='64' viewBox='0 0 64 64'>" +
  "<path d='M32 6 58 32 32 58 6 32Z' fill='none' stroke='#8a95a8' stroke-opacity='.55' stroke-width='3'/>" +
  '</svg>'
);

// ─── Manifest state ────────────────────────────────────────────────────────────

function isValidManifest(m) {
  return !!m
    && typeof m.assetsVersion === 'string'
    && !!m.icons && typeof m.icons === 'object' && !Array.isArray(m.icons);
}

function readStored(key) {
  try {
    const m = JSON.parse(localStorage.getItem(key));
    return isValidManifest(m) ? m : null;
  } catch { return null; }
}

function writeStored(key, manifest) {
  try { localStorage.setItem(key, JSON.stringify(manifest)); } catch { /* blocked/full — ignore */ }
}

const warm = new Map();      // icon key -> { img, candidate } for icons that are loaded and decoded
let warmKeys    = [];        // last set passed to preloadIcons (re-run when the manifest version changes)
let warmSig     = '';
let warmPromise = null;
let warmRun     = 0;         // bumps whenever a running preload must stop
let warmRetryAt = 0;         // after a preload with failures, don't try the same keys again before this time

let current     = readStored(LS_LATEST) ?? readStored(LS_VERIFIED);
let verified    = readStored(LS_VERIFIED);
let initPromise = null;

function urlFor(manifest, key) {
  const rel = manifest?.icons?.[key];
  return typeof rel === 'string' ? `${CDN_BASE}@${manifest.assetsVersion}/${rel}` : null;
}

// Fire-and-forget: safe to call on every render. Icons already on screen are re-resolved
// if the manifest version changed; a failed fetch is retried on the next call.
export function initIcons() {
  if (!initPromise) {
    initPromise = fetchManifest().then(ok => { if (!ok) initPromise = null; });
  }
  return initPromise;
}

async function fetchManifest() {
  try {
    const res = await fetch(MANIFEST_URL);
    if (!res.ok) throw new Error(`${res.status} ${res.statusText}`);
    const manifest = await res.json();
    if (!isValidManifest(manifest)) throw new Error('invalid manifest');

    const changed = manifest.assetsVersion !== current?.assetsVersion;
    current = manifest;
    writeStored(LS_LATEST, manifest);
    if (changed) {
      warm.clear();            // those images belong to the old version's URLs
      warmPromise = null;
      refreshAll();
      if (warmKeys.length) preloadIcons(warmKeys);
    }
    return true;
  } catch (e) {
    console.warn('[icons] manifest unavailable — using cached manifest or placeholders:', e.message);
    return false;
  }
}

export function iconUrl(key) {
  return urlFor(current, key);
}

// ─── <img> loading ─────────────────────────────────────────────────────────────

function candidatesFor(key) {
  const list = [];

  const wanted = key && current?.icons?.[key] ? key : UNKNOWN_KEY;
  const cur = urlFor(current, wanted);
  if (cur) {
    list.push({ url: cur, cors: true,  version: current.assetsVersion });
    list.push({ url: cur, cors: false, version: current.assetsVersion });
  }

  if (verified && verified.assetsVersion !== current?.assetsVersion) {
    const old = urlFor(verified, key) ?? urlFor(verified, UNKNOWN_KEY);
    if (old) list.push({ url: old, cors: true, version: verified.assetsVersion });
  }

  // A preloaded icon starts from the step that is known to work (and its image is already in memory).
  const hot = warm.get(key)?.candidate;
  if (hot) list.unshift(hot);

  const seen = new Set();
  return list.filter(c => { const id = `${c.url}|${c.cors}`; return seen.has(id) ? false : (seen.add(id), true); });
}

function markVerified(version) {
  if (!current || current.assetsVersion !== version) return;   // only the current manifest can be promoted
  if (verified?.assetsVersion === version) return;
  verified = current;
  writeStored(LS_VERIFIED, current);
}

function attempt(img) {
  const next = img._wfQueue?.shift();
  if (!next) {
    img.dataset.wfState = 'fallback';
    img.removeAttribute('crossorigin');
    img.src = FALLBACK_SRC;
    return;
  }
  img.dataset.wfState   = 'loading';
  img.dataset.wfVersion = next.version;
  if (next.cors) img.crossOrigin = 'anonymous';
  else img.removeAttribute('crossorigin');
  img.src = next.url;
}

function start(img) {
  img._wfQueue = candidatesFor(img.dataset.wfKey);
  attempt(img);
}

function refreshAll() {
  document.querySelectorAll('img.wf-icon[data-wf-key]').forEach(start);
}

// Returns an <img>. Safe to call before the manifest is available: the image shows the
// placeholder first and is upgraded automatically once the manifest arrives.
export function createIcon(key, { className = '', alt = '' } = {}) {
  const img = document.createElement('img');
  img.className = `wf-icon ${className}`.trim();
  img.alt = alt;
  img.decoding = 'sync';   // 'async' paints cached images a few frames late, which looks like pop-in
  img.draggable = false;
  img.dataset.wfKey = key ?? '';

  img.addEventListener('load', () => {
    if (img.dataset.wfState === 'fallback') return;
    img.dataset.wfState = 'ok';
    markVerified(img.dataset.wfVersion);
  });
  img.addEventListener('error', () => {
    if (img.dataset.wfState === 'fallback') return;   // the placeholder itself failed — stop, don't loop
    attempt(img);
  });

  start(img);
  return img;
}

// ─── Warm-up ───────────────────────────────────────────────────────────────────
// Loads and decodes icons ahead of time, a few at a time, when the browser is idle. The <img>
// objects are kept referenced so the browser keeps them in memory; later createIcon() calls for the
// same URL then paint immediately instead of fetching/decoding while the user watches.

const PRELOAD_CONCURRENCY = 6;

// Resolves with the loaded + decoded image, or null if this candidate fails.
function probe(candidate) {
  if (typeof Image === 'undefined') return Promise.resolve(null);
  return new Promise(resolve => {
    const img = new Image();
    if (candidate.cors) img.crossOrigin = 'anonymous';
    img.onload = () => {
      const decoded = typeof img.decode === 'function' ? img.decode().catch(() => {}) : Promise.resolve();
      decoded.then(() => resolve(img));
    };
    img.onerror = () => resolve(null);
    img.src = candidate.url;
  });
}

async function warmKey(key, run) {
  if (warm.has(key) || !current?.icons?.[key]) return;
  for (const candidate of candidatesFor(key)) {
    const img = await probe(candidate);
    if (run !== warmRun) return;                       // the manifest changed while we were loading
    if (img) { warm.set(key, { img, candidate }); return; }
  }
}

const whenIdle = cb =>
  (typeof requestIdleCallback === 'function' ? requestIdleCallback(cb, { timeout: 2000 }) : setTimeout(cb, 0));

// Safe to call on every render: the same set of keys is only preloaded once.
export function preloadIcons(keys) {
  const list = [...new Set(keys)].filter(Boolean);
  const sig = list.join('|');
  if (warmPromise && sig === warmSig) return warmPromise;
  if (sig === warmSig && Date.now() < warmRetryAt) return Promise.resolve();   // failed recently — wait out the cooldown

  warmKeys = list;
  warmSig = sig;
  const run = ++warmRun;
  warmPromise = (async () => {
    await initIcons();                                  // needs the manifest (a cached copy counts)
    if (run !== warmRun) return;
    await new Promise(done => whenIdle(done));
    const queue = list.filter(k => current?.icons?.[k]);
    const worker = async () => { while (queue.length && run === warmRun) await warmKey(queue.shift(), run); };
    await Promise.all(Array.from({ length: PRELOAD_CONCURRENCY }, worker));

    // Something didn't load (offline? a manifest key whose file isn't published yet?): allow a retry,
    // but not on every render — renders happen often.
    if (run === warmRun && list.some(k => current?.icons?.[k] && !warm.has(k))) {
      warmPromise = null;
      warmRetryAt = Date.now() + 60_000;
    }
  })().catch(e => console.warn('[icons] preload failed:', e?.message ?? e));
  return warmPromise;
}

// For tests / diagnostics: how many icons are loaded and ready.
export const warmIconCount = () => warm.size;

// ─── Cycling icons ─────────────────────────────────────────────────────────────
// For rewards where the exact item isn't known ("an Archon shard — colour unknown"): stacked
// <img> frames that crossfade (CSS does the fade, see .wf-icon-cycle in tasks.css).
// One shared timer advances every cycling icon on the page in step; it stops by itself when
// none are left, and it never runs for people who prefer reduced motion (first frame only).

const CYCLE_FRAME_MS = 1600;
const cyclers = new Set();
let cycleTimer = null;

const prefersReducedMotion = () =>
  typeof window !== 'undefined' && !!window.matchMedia?.('(prefers-reduced-motion: reduce)').matches;

function paintCycler(c) {
  c.frames.forEach((frame, i) => frame.classList.toggle('is-active', i === c.index));
}

// Advances every connected cycling icon by one frame and forgets detached ones.
// (Exported so tests can step the animation without waiting on the timer.)
export function tickCyclingIcons() {
  for (const c of [...cyclers]) {
    if (!c.wrap.isConnected) { cyclers.delete(c); continue; }
    c.index = (c.index + 1) % c.frames.length;
    paintCycler(c);
  }
  if (!cyclers.size && cycleTimer !== null) { clearInterval(cycleTimer); cycleTimer = null; }
}

// Same call shape as createIcon(), but takes several keys. Always returns a <span>
// (so callers can treat it like the single icon: same class, same data-wf-key convention).
export function createCyclingIcon(keys, { className = '', alt = '' } = {}) {
  const wrap = document.createElement('span');
  wrap.className = `wf-icon-cycle ${className}`.trim();
  wrap.dataset.wfKey = keys.join(',');
  if (alt) { wrap.setAttribute('role', 'img'); wrap.setAttribute('aria-label', alt); }

  const frames = keys.map(key => createIcon(key, { className: 'wf-icon-frame' }));
  frames.forEach(frame => wrap.appendChild(frame));

  const cycler = { wrap, frames, index: 0 };
  paintCycler(cycler);

  if (frames.length > 1 && !prefersReducedMotion()) {
    cyclers.add(cycler);
    if (cycleTimer === null) {
      cycleTimer = setInterval(() => { if (!document.hidden) tickCyclingIcons(); }, CYCLE_FRAME_MS);
    }
  }
  return wrap;
}