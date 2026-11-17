// src/vendors/ui/planner.js
// Planner panel: balances, yields, mission length and the estimate.
// Unavailable estimates render as "—" with a reason, never Infinity/NaN.

import { currencyLabel, T } from '../labels.js';
import { esc, fmt, fmtHours } from './util.js';

const WHY = {
  'needs-yield': () => T('needs_yield', 'Set an average yield per mission'),
  'needs-minutes': () => T('needs_minutes', 'Set the mission length'),
};

function est(e, text) {
  if (e.state === 'ok' || e.state === 'done') return esc(text);
  return `<span class="vx-na" title="${esc(WHY[e.state]())}">—</span>`;
}

export function plannerHTML(vendor, vs, plan) {
  const planner = T('planner', 'Planner');
  let html = `<div class="planner-panel-header"><h3>${esc(planner)}</h3><button id="plannerClose" class="planner-close" aria-label="Close">✕</button></div>`;

  // Settings shared by the whole vendor
  html += `<div class="planner-row vx-minutes"><label for="vxMinutes">${esc(T('mission_minutes', 'Mission length (min)'))}</label>` +
    `<input id="vxMinutes" type="number" min="1" step="1" data-input="minutes" value="${plan.minutes ?? ''}" placeholder="—"></div>`;

  if (plan.flex.has) {
    const opts = new Set(plan.flex.groups.flatMap((g) => g.options));
    html += `<div class="planner-row"><label for="vxPayWith">${esc(T('pay_with', 'Pay "either" costs with'))}</label>` +
      `<select id="vxPayWith" data-input="pay-with"><option value="auto"${vs.payWith === 'auto' ? ' selected' : ''}>${esc(T('pay_auto', 'Auto'))}</option>` +
      vendor.currencies.filter((c) => opts.has(c.id)).map((c) =>
        `<option value="${esc(c.id)}"${vs.payWith === c.id ? ' selected' : ''}>${esc(currencyLabel(vendor, c))}</option>`).join('') +
      `</select></div>`;
  }

  for (const row of plan.rows) {
    const cur = vendor.currencies.find((c) => c.id === row.id);
    const name = currencyLabel(vendor, cur);
    html += `<div class="vx-plan-cur">` +
      `<div class="vx-plan-title">${esc(name)}</div>` +
      `<div class="planner-row"><label for="vxBal-${esc(row.id)}">${esc(T('inventory', '{{name}}: in inventory', { name }))}</label>` +
      `<input id="vxBal-${esc(row.id)}" type="number" step="1" data-input="balance" data-cur="${esc(row.id)}" value="${row.balance}"${row.balance < 0 ? ' class="neg"' : ''}></div>` +
      `<div class="planner-row"><label for="vxYld-${esc(row.id)}">${esc(T('avg_yield', '{{name}}: average yield per run', { name }))}</label>` +
      `<input id="vxYld-${esc(row.id)}" type="number" min="0" step="any" data-input="yield" data-cur="${esc(row.id)}" value="${row.yield || ''}" placeholder="0"></div>` +
      `<div class="planner-currency-summary">` +
      `${esc(T('total_needed', 'Total needed'))}: <strong>${fmt(row.fixedTotal)}</strong><br>` +
      `${esc(T('remaining', 'Missing after inventory'))}: <strong>${fmt(row.short)}</strong>` +
      (row.flexRemaining ? ` <span class="vx-sub">(${esc(T('incl_flex', 'incl. {{n}} paid by choice', { n: fmt(row.flexRemaining) }))})</span>` : '') + `<br>` +
      `${esc(T('runs_needed', 'Missions needed'))}: <strong>${est(row.runs, row.runs.value != null ? fmt(row.runs.value) : '')}</strong><br>` +
      `${esc(T('hours', 'Hours'))}: <strong>${est(row.hours, row.hours.value != null ? fmtHours(row.hours.value) : '')}</strong>` +
      `</div></div>`;
  }

  if (plan.flex.has) {
    html += `<div class="planner-currency-summary vx-plan-flex"><strong>${esc(T('flex_title', 'Pay-one-of costs'))}</strong><br>` +
      `${esc(T('total_needed', 'Total needed'))}: <strong>${fmt(plan.flex.total)}</strong><br>` +
      `${esc(T('flex_left', 'Still to buy'))}: <strong>${fmt(plan.flex.remaining)}</strong></div>`;
  }

  const o = plan.overall;
  const model = plan.runModel === 'sequential'
    ? T('model_sequential', 'each currency needs its own missions')
    : T('model_parallel', 'all currencies drop in the same mission');
  html += `<div class="vx-plan-overall"><div class="vx-plan-title">${esc(T('overall', 'Overall'))}</div>` +
    `${esc(T('runs_needed', 'Missions needed'))}: <strong>${est(o, o.runs != null ? fmt(o.runs) : '')}</strong><br>` +
    `${esc(T('hours', 'Hours'))}: <strong>${est(o, o.hours != null ? fmtHours(o.hours) : '')}</strong>` +
    `<div class="vx-sub">${esc(model)}</div></div>`;
  return html;
}

