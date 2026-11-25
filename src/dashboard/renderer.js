// src/dashboard/renderer.js
// Renders the live strip (events + alerts) into #dashboardLive. It is independent of
// renderTasks(): this runs on its own schedule, and each section is built inside its own
// try/catch so a payload we did not anticipate breaks one section, never the tab.
//
// The strip reuses the Baro/Add-task card classes (tasks-card, tasks-card-header, …) so it
// looks native and the open/closed state works with the same CSS. Countdowns carry
// data-reset-at, so the existing 1 s ticker in tasks/renderer.js updates them for free.

import { createRewardIcon, rewardLabel } from '../tasks/rewards/resolve.js';
import { iconKeyForReward } from '../tasks/rewards/icon-rules.js';
import { formatCountdown, tf } from '../tasks/helpers.js';
import { isAlertDone, toggleAlertDone } from '../tasks/loader.js';
import { statusOf } from './live/normalize.js';
import { vendorLinkFor } from './live/associations.js';
import { prioritize } from './live/rewards.js';
import { getVendor } from '../vendors/registry.js';
import { vendorName } from '../vendors/labels.js';
import { dt, missionTypeLabel, nodeLabel, factionLabel, titleLabel } from './labels.js';

// ─── Per-device UI state (localStorage on purpose: never synced) ───────────────
const UI_KEY = 'dashboardUi';
// Open by default; only an explicit "closed" from the user is remembered.
const readOpen = () => {
  try { return JSON.parse(localStorage.getItem(UI_KEY))?.open !== false; } catch { return true; }
};
const writeOpen = open => {
  try { localStorage.setItem(UI_KEY, JSON.stringify({ open })); } catch { /* blocked/full */ }
};

// ─── Helpers ───────────────────────────────────────────────────────────────────
const MAX_REWARDS = 3;   // shown up front; the rest sit behind a "+N" button

function el(tag, className, text) {
  const node = document.createElement(tag);
  if (className) node.className = className;
  if (text != null) node.textContent = text;
  return node;
}

function countdown(label, target) {
  const wrap = el('span', 'dash-time');
  wrap.append(`${label} `);
  const c = el('span', 'dash-countdown', formatCountdown(target));
  c.dataset.resetAt = String(target);
  wrap.append(c);
  return wrap;
}

function timeBlock(entry, now) {
  if (statusOf(entry, now) === 'upcoming' && entry.start != null) return countdown(dt('starts_in', 'Starts in'), entry.start);
  if (entry.end != null) return countdown(dt('ends_in', 'Ends in'), entry.end);
  return el('span', 'dash-time');
}

function rewardChip(r) {
  const chip = el('span', 'dash-reward');

  let icon;
  if (!iconKeyForReward(r.name) && r.thumbnail) {
    // Not in our icon registry — fall back to the API's own thumbnail.
    icon = document.createElement('img');
    icon.className = 'wf-icon dash-reward-icon';
    icon.src = r.thumbnail;
    icon.alt = '';
    icon.loading = 'lazy';
    icon.draggable = false;
  } else {
    icon = createRewardIcon({ name: r.name }, { className: 'dash-reward-icon' });
  }

  const label = rewardLabel(r.name);
  const text = r.isCredits
    ? `${r.count.toLocaleString()} ${label}`
    : (r.count > 1 ? `${r.count.toLocaleString()}× ${label}` : label);

  chip.append(icon, el('span', 'dash-reward-text', text));
  return chip;
}

function rewardsRow(rewards) {
  if (!rewards.length) return null;
  const ordered = prioritize(rewards);
  const row = el('div', 'dash-rewards');
  ordered.forEach((r, i) => {
    const chip = rewardChip(r);
    if (i >= MAX_REWARDS) chip.classList.add('is-extra');   // hidden until "+N" is pressed
    row.append(chip);
  });
  if (ordered.length > MAX_REWARDS) {
    const more = el('button', 'dash-more', `+${ordered.length - MAX_REWARDS}`);
    more.type = 'button';
    more.title = ordered.slice(MAX_REWARDS).map(r => rewardLabel(r.name)).join(', ');
    row.append(more);
  }
  return row;
}

const fmtNum = (n) => Math.round(n).toLocaleString();

/** Community milestones (API: interimSteps): ticks on the bar are added by the caller, chips here. */
function milestonesRow(milestones, current) {
  if (!milestones.length) return null;
  const wrap = el('div', 'dash-milestones');
  wrap.append(el('span', 'dash-milestones-label', dt('milestones', 'Milestones')));
  for (const m of milestones) {
    const reached = current != null && current >= m.goal;
    const top = prioritize(m.rewards)[0];
    const chip = el('span', `dash-ms${reached ? ' is-reached' : ''}`);
    chip.append(el('span', 'dash-ms-goal', `${reached ? '✓ ' : ''}${fmtNum(m.goal)}`));
    if (top) chip.append(rewardChip(top));
    if (m.rewards.length > 1) chip.title = m.rewards.map(r => rewardLabel(r.name)).join(', ');
    wrap.append(chip);
  }
  return wrap;
}

/** "Open <vendor> →" button when a curated association exists for this entry. */
function vendorLink(entry) {
  const link = vendorLinkFor(entry);
  if (!link) return null;
  const { title } = vendorName(getVendor(link.vendorId));
  const btn = el('button', 'dash-link', dt('open_vendor', 'Open {{vendor}} →', { vendor: title }));
  btn.type = 'button';
  btn.dataset.vendor = link.vendorId;
  if (link.itemId) btn.dataset.item = link.itemId;
  return btn;
}

function metaLine(parts) {
  const text = parts.filter(Boolean).join(' · ');
  return text ? el('div', 'dash-meta', text) : null;
}

// ─── Entries ───────────────────────────────────────────────────────────────────

function eventCard(e, now) {
  const card = el('div', 'dash-item dash-event');
  const head = el('div', 'dash-item-head');
  const main = el('div', 'dash-alert-main');
  const title = titleLabel(e.title);
  main.append(liveCheck(e, title), el('span', 'dash-item-title', title));
  head.append(main, timeBlock(e, now));
  card.append(head);
  paintLiveRow(card, isAlertDone(e.id));

  const description = eventDescriptionLabel(e.title, e.tooltip);
  if (description) card.append(el('p', 'dash-item-desc', description));
  
  const meta = metaLine([nodeLabel(e.node), factionLabel(e.faction)]);
  if (meta) card.append(meta);

  if (e.progress) {
    const pct = Math.max(0, Math.min(100, (e.progress.current / e.progress.max) * 100));
    const bar = el('div', 'dash-progress');
    const fill = el('i');
    fill.style.width = `${pct}%`;
    bar.append(fill);
    for (const m of e.milestones) {                       // a tick where each milestone sits on the bar
      if (m.goal > e.progress.max) continue;
      const tick = el('b', 'dash-tick');
      tick.style.left = `${(m.goal / e.progress.max) * 100}%`;
      bar.append(tick);
    }
    const label = el('span', 'dash-progress-text', `${Math.round(e.progress.current).toLocaleString()} / ${Math.round(e.progress.max).toLocaleString()}`);
    const wrap = el('div', 'dash-progress-wrap');
    wrap.append(bar, label);
    card.append(wrap);
  }

  const milestones = milestonesRow(e.milestones, e.progress?.current ?? null);
  if (milestones) card.append(milestones);

  const rewards = rewardsRow(e.rewards);
  if (rewards) card.append(rewards);
  const link = vendorLink(e);
  if (link) card.append(link);
  return card;
}

const alertCheckTitle = (done) => (done
  ? tf('tabs.tasks.ui.modal.mark_undone', 'Mark as not completed')
  : tf('tabs.tasks.ui.modal.mark_done', 'Mark as completed'));

// Applies the done look to one alert row. Used when rendering and again after a tick, so the
// row is updated in place (a full re-render would drop keyboard focus from the checkbox).
function paintLiveRow(row, done) {
  row.classList.toggle('is-done', done);
  const box = row.querySelector('.tasks-check');
  if (!box) return;
  box.setAttribute('aria-checked', String(done));
  box.title = alertCheckTitle(done);
}

/** Live-entry checkbox: completion is stored until the entry's expiry. */
function liveCheck(entry, title) {
  const box = el('button', 'tasks-check');
  box.type = 'button';
  box.setAttribute('role', 'checkbox');
  box.setAttribute('aria-checked', String(isAlertDone(entry.id)));
  box.setAttribute('aria-label', title);
  box.title = alertCheckTitle(isAlertDone(entry.id));
  box.dataset.liveId = entry.id;
  if (entry.end != null) box.dataset.expiry = String(entry.end);
  return box;
}

function alertRow(a, now) {
  const row = el('div', 'dash-item dash-alert');
  const title = titleLabel(a.title);
  const head = el('div', 'dash-item-head');
  const main = el('div', 'dash-alert-main');
  main.append(liveCheck(a, title), el('span', 'dash-item-title', title));
  head.append(main, timeBlock(a, now));
  row.append(head);

  const level = a.minLevel != null && a.maxLevel != null
    ? dt('level', 'Lv {{min}}–{{max}}', { min: a.minLevel, max: a.maxLevel })
    : null;
  const meta = metaLine([missionTypeLabel(a.type), nodeLabel(a.node), factionLabel(a.faction), level]);
  if (meta) row.append(meta);

  const rewards = rewardsRow(a.rewards);
  if (rewards) row.append(rewards);
  const link = vendorLink(a);
  if (link) row.append(link);
  paintLiveRow(row, isAlertDone(a.id));
  return row;
}

function section(titleKey, titleFallback, list, build, now, modifier) {
  const sec = el('section', 'dash-sec');
  const title = el('h3', 'dash-sec-title', dt(titleKey, titleFallback));
  const count = el('span', 'tasks-count', ` ${list.length}`);
  if (modifier === 'dash-list--alerts') count.dataset.alertsCount = '';
  if (modifier === 'dash-list--events') count.dataset.eventsCount = '';
  title.append(count);
  const grid = el('div', `dash-list ${modifier}`);   // one column on narrow screens, more on wide ones
  [...list].sort((a, b) => Number(isAlertDone(a.id)) - Number(isAlertDone(b.id)))
      .forEach(entry => grid.append(build(entry, now)));
  sec.append(title, grid);
  return sec;
}

function safe(build) {
  try {
    return build();
  } catch (err) {
    console.warn('[live] section failed to render', err);
    return el('div', 'dash-error', dt('render_error', "Couldn't display this section"));
  }
}

function summaryText({ events, alerts, hasData, stale }) {
  const count = (list, key, one, other) => (list.length === 1
    ? dt(key, one, { n: 1 })
    : dt(`${key}.plural`, other, { n: list.length }));
  const parts = [];
  if (events.length) parts.push(count(events, 'events.count', '{{n}} event', '{{n}} events'));
  if (alerts.length) parts.push(count(alerts, 'alerts.count', '{{n}} alert', '{{n}} alerts'));
  if (parts.length) return parts.join(' · ');
  if (!hasData && stale) return dt('unavailable', "Couldn't load live data");
  return dt('nothing', 'Nothing live right now');
}

// ─── Public ────────────────────────────────────────────────────────────────────

/** Alerts "done/total" next to the section title, and a ✓ on the collapsed summary when all are done. */
function refreshAlertCounts(host) {
  const total = host.querySelectorAll('.dash-alert').length;
  const done = host.querySelectorAll('.dash-alert.is-done').length;
  const all = total > 0 && done === total;

  const count = host.querySelector('[data-alerts-count]');
  if (count) {
    count.textContent = ` ${done}/${total}`;
    count.classList.toggle('is-complete', all);
  }
  const eventRows = [...host.querySelectorAll('.dash-event')];
  const eventDone = eventRows.filter(row => row.classList.contains('is-done')).length;
  const eventCount = host.querySelector('[data-events-count]');
  if (eventCount) {
    eventCount.textContent = ` ${eventDone}/${eventRows.length}`;
    eventCount.classList.toggle('is-complete', eventRows.length > 0 && eventDone === eventRows.length);
  }
  const summary = host.querySelector('.dash-summary');
  if (summary) {
    const hasLiveEntries = total + eventRows.length > 0;
    const alertsAll = done === total;
    const eventsAll = eventDone === eventRows.length;
    summary.textContent = (summary.dataset.base ?? summary.textContent) + (hasLiveEntries && alertsAll && eventsAll ? ' ✓' : '');
  }
}

async function onLiveCheck(box, host) {
  const row = box.closest('.dash-alert, .dash-event');
  if (!row) return;
  const expiry = Number(box.dataset.expiry);
  const done = await toggleAlertDone(box.dataset.liveId, Number.isFinite(expiry) ? expiry : null);
  paintLiveRow(row, done);
  // Keep each section ordered with unfinished entries first without rebuilding the DOM.
  const list = row.parentElement;
  [...list.children]
    .sort((a, b) => Number(a.classList.contains('is-done')) - Number(b.classList.contains('is-done')))
    .forEach(item => list.append(item));
  refreshAlertCounts(host);
}

let wiredHost = null;

function wire(host) {
  if (wiredHost === host) return;
  wiredHost = host;

  const toggle = () => {
    const card = host.querySelector('.dash-live');
    if (!card) return;
    const open = card.classList.toggle('is-open');
    card.querySelector('.tasks-card-header')?.setAttribute('aria-expanded', String(open));
    writeOpen(open);
  };
  host.addEventListener('click', e => {
    const box = e.target.closest('.dash-alert .tasks-check, .dash-event .tasks-check');
    if (box) {
      onLiveCheck(box, host).catch(err => console.warn('[live] could not save alert tick', err));
      return;
    }
    const more = e.target.closest('.dash-more');
    if (more) {
      more.closest('.dash-rewards')?.classList.add('is-expanded');
      more.remove();
      return;
    }
    const link = e.target.closest('.dash-link');
    if (link) {
      // main.js owns navigation; the dashboard only announces where to go.
      window.dispatchEvent(new CustomEvent('wf:navigate', {
        detail: { section: 'vendors', vendorId: link.dataset.vendor, itemId: link.dataset.item || null },
      }));
      return;
    }
    if (e.target.closest('.dash-live > .tasks-card-header')) toggle();
  });
  host.addEventListener('keydown', e => {
    if ((e.key === 'Enter' || e.key === ' ') && e.target.matches('.dash-live > .tasks-card-header')) {
      e.preventDefault();
      toggle();
    }
  });
}

/**
 * @param {{events: Object[], alerts: Object[], stale: boolean, hasData: boolean}} model
 *        entries are already normalised, filtered (no expired) and sorted
 */
export function renderLive(model) {
  const host = document.getElementById('dashboardLive');
  if (!host) return;
  wire(host);

  const now = Date.now();
  const open = readOpen();

  const card = el('div', `tasks-card dash-live${open ? ' is-open' : ''}`);

  const header = el('div', 'tasks-card-header');
  header.setAttribute('role', 'button');
  header.tabIndex = 0;
  header.setAttribute('aria-expanded', String(open));
  const chevron = el('span', 'tasks-card-chevron', '▾');
  chevron.setAttribute('aria-hidden', 'true');
  const summary = el('span', 'dash-summary', summaryText(model));
  summary.dataset.base = summary.textContent;
  header.append(chevron, el('h2', 'tasks-tier-title', dt('title', 'Live')), summary);

  const body = el('div', 'tasks-card-body');
  if (model.events.length) body.append(safe(() => section('events.title', 'Events', model.events, eventCard, now, 'dash-list--events')));
  if (model.alerts.length) body.append(safe(() => section('alerts.title', 'Alerts', model.alerts, alertRow, now, 'dash-list--alerts')));
  if (!model.events.length && !model.alerts.length) body.append(el('div', 'dash-empty', dt('nothing', 'Nothing live right now')));
  if (model.stale && model.hasData) body.append(el('div', 'dash-stale', dt('stale', "Showing saved data — couldn't refresh")));

  card.append(header, body);
  host.replaceChildren(card);
  refreshAlertCounts(host);
}
