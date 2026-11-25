// src/dashboard/live/normalize.js
// Turns raw warframestat.us alert/event objects into one small, predictable shape.
// Every field is read defensively: an unknown or partial payload degrades to
// "title + timer" instead of throwing. One bad entry never hides the others.
//
// Normalised entry:
//   { kind, id, tag, title, tooltip, type, node, faction, minLevel, maxLevel,
//     start, end,            // ms epoch or null
//     rewards: [{ name, uniqueName, count, thumbnail?, isCredits? }],
//     progress: { current, max } | null,
//     milestones: [{ goal, rewards }] }   // community goals (API: interimSteps), ascending by goal

const str  = v => (typeof v === 'string' && v.trim() ? v.trim() : null);
const num  = v => (typeof v === 'number' && Number.isFinite(v) ? v : null);
const time = v => { const t = typeof v === 'string' ? Date.parse(v) : NaN; return Number.isFinite(t) ? t : null; };

const prettify = s => (s ? String(s).replace(/[-_]+/g, ' ').replace(/([a-z])([A-Z])/g, '$1 $2').replace(/\b\w/g, c => c.toUpperCase()) : null);

/** Computed at render time, never stored — a cached entry that has ended is never "active". */
export function statusOf(entry, now = Date.now()) {
  if (entry.end != null && now >= entry.end) return 'expired';
  if (entry.start != null && now < entry.start) return 'upcoming';
  return 'active';
}

function rewardsOf(reward) {
  const out = [];
  if (!reward || typeof reward !== 'object') return out;

  for (const it of Array.isArray(reward.countedItems) ? reward.countedItems : []) {
    const name = str(it?.type) ?? str(it?.key);
    if (name) out.push({ name, uniqueName: str(it?.uniqueName), count: num(it?.count) ?? 1 });
  }
  for (const it of Array.isArray(reward.items) ? reward.items : []) {
    const name = typeof it === 'string' ? str(it) : (str(it?.type) ?? str(it?.name));
    if (name) out.push({ name, uniqueName: null, count: 1 });
  }
  if (out.length && str(reward.thumbnail)) out[0].thumbnail = str(reward.thumbnail);

  const credits = num(reward.credits);
  if (credits && credits > 0) out.push({ name: 'Credits', uniqueName: null, count: credits, isCredits: true });
  return out;
}

function milestonesOf(steps) {
  if (!Array.isArray(steps)) return [];
  return steps
    .map((s) => ({ goal: num(s?.goal), rewards: rewardsOf(s?.reward) }))
    .filter((m) => m.goal != null && m.goal > 0)
    .sort((a, b) => a.goal - b.goal);
}

function normalizeAlert(a) {
  if (!a || typeof a !== 'object' || !a.mission || typeof a.mission !== 'object') return null;
  const m = a.mission;
  return {
    kind: 'alert',
    id: str(a?.id) ?? `${str(m.node)}|${str(a?.expiry)}`,
    tag: str(a?.tag),
    title: str(m.description) ?? str(m.type) ?? 'Alert',
    tooltip: null,
    type: str(m.type),
    node: str(m.node),
    faction: str(m.faction),
    minLevel: num(m.minEnemyLevel),
    maxLevel: num(m.maxEnemyLevel),
    start: time(a?.activation),
    end: time(a?.expiry),
    rewards: rewardsOf(m.reward),
    progress: null,
    milestones: [],
  };
}

function normalizeEvent(e) {
  if (!e || typeof e !== 'object' || e.expired === true) return null;
  if (!str(e.description) && !str(e.tag) && !str(e.id)) return null;   // nothing to show
  const current = num(e?.currentScore);
  const max = num(e?.maximumScore);
  const title = str(e?.description) ?? prettify(str(e?.tag)) ?? 'Event';
  const tooltip = str(e?.tooltip);
  return {
    kind: 'event',
    id: str(e?.id) ?? `${title}|${str(e?.expiry)}`,
    tag: str(e?.tag),
    title,
    tooltip: tooltip && tooltip !== title ? tooltip : null,
    type: null,
    node: str(e?.node),
    faction: typeof e?.faction === 'string' ? str(e.faction) : null,
    minLevel: null,
    maxLevel: null,
    start: time(e?.activation),
    end: time(e?.expiry),
    rewards: (Array.isArray(e?.rewards) ? e.rewards : []).flatMap(rewardsOf),
    progress: current != null && max != null && max > 0 ? { current, max } : null,
    milestones: milestonesOf(e?.interimSteps),
  };
}

function normalizeList(raw, fn, label) {
  if (!Array.isArray(raw)) return [];
  const out = [];
  for (const item of raw) {
    try {
      const n = fn(item);
      if (n) out.push(n);
    } catch (err) {
      console.warn(`[live] skipped a malformed ${label}`, err);
    }
  }
  return out;
}

export const normalizeAlerts = raw => normalizeList(raw, normalizeAlert, 'alert');
export const normalizeEvents = raw => normalizeList(raw, normalizeEvent, 'event');
