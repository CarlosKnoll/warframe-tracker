// mods/modal.js

import { t, tLocation } from '../i18n.js';
import { tModName, tRarityMod, tCategory } from './renderer.js';
import { CUSTOM_DROP_SOURCES } from './drop_sources.js';

const BLANK = "data:image/gif;base64,R0lGODlhAQABAIAAAAAAAP///yH5BAEAAAAALAAAAAABAAEAAAIBRAA7";

const modal      = document.getElementById('relicModal');
const modalTitle = document.getElementById('modalTitle');
const modalBody  = document.getElementById('modalBody');
const modalBox   = modal.querySelector('.modal-box');

export function openModModal(mod) {
  const name     = tModName(mod.name);
  const rarityLC = (mod.rarity || 'common').toLowerCase();
  const modClass = mod.modClass || '';

  // ── Left panel ─────────────────────────────────────────────────────────────
  // If we have the full WM card image, show it large — it already has polarity,
  // rarity, and art embedded. Otherwise fall back to WFCD thumb.
  const imgSrc = mod.imgUrl || BLANK;
  const imgClass = mod.isWmCard ? 'mod-modal-img-wm' : 'mod-modal-img-thumb';

  const polHtml = mod.polarity
    ? `<p class="mod-modal-polarity">${mod.polarity}</p>` : '';

  const classBadge = modClass
    ? `<span class="prime-status-tag mod-class-badge mod-class-badge--${modClass}">${modClass.toUpperCase()}</span>` : '';

  const rarityHtml = mod.rarity
    ? `<span class="prime-status-tag mod-rarity-tag mod-rarity-tag--${rarityLC}">${tRarityMod(mod.rarity)}</span>` : '';

  const descHtml = mod.description
    ? `<p class="mod-modal-desc">${mod.description.replace(/\\n|\n/g, '<br>')}</p>` : '';

  const compatHtml = mod.category
    ? `<p class="mod-modal-compat">${tCategory(mod.category).toUpperCase()}</p>` : '';

  // Drain info
  let drainHtml = '';
  if (mod.drainDisplay !== null && mod.drainDisplay !== undefined) {
    const d = mod.drainDisplay;
    const label = d < 0
      ? `${Math.abs(d)} ${t('mod.label.provides')}`
      : `${d} ${t('mod.label.capacity')}`;
    drainHtml = `<p class="mod-modal-drain">${label}</p>`;
  }

  const left = `
    <div class="modal-item-image ${imgClass}">
      <img src="${imgSrc}" alt="${name}"
        onerror="this.src='${mod.imageName ? `https://cdn.warframestat.us/img/${mod.imageName}` : BLANK}'"
      />
    </div>
    ${mod.isWmCard ? '' : `<div class="modal-item-name">${name}</div>`}
    ${polHtml}
    <div style="display:flex;gap:6px;flex-wrap:wrap;justify-content:center;margin:2px 0 4px;">
      ${classBadge}${rarityHtml}
    </div>
    ${drainHtml}
    ${descHtml}
    ${compatHtml}
  `;

  modalTitle.textContent     = name;
  modalBody.innerHTML        = `
    <div class="modal-detail">
      <div class="modal-detail-left">${left}</div>
      <div class="modal-detail-right">${buildDropTable(mod)}</div>
    </div>`;
  modalBox.dataset.type      = 'mod';
  modalBox._primeOnClose     = null;
  modalBox._rebind           = null;
  modalBox._bindRelicButtons = null;
  modal.classList.remove('hidden');
}

// ── Drop table ────────────────────────────────────────────────────────────────

function buildDropTable(mod) {
  const noData = `<div class="drop-tables-container">
    <p class="no-drops">${t('modal.noLocations')}</p>
  </div>`;

  // Resolve custom entries: translate locationKey if possible, fall back to locationEn
  const customRows = (CUSTOM_DROP_SOURCES[mod.name] || []).map(d => {
    const loc = tLocation(d.locationKey) !== d.locationKey
      ? tLocation(d.locationKey)
      : d.locationEn;
    return { location: loc, type: '', rarity: d.rarity || '', chance: d.chance || 0 };
  });

  const wfcdRows = (mod.drops || [])
    .filter(d => d.location)
    .map(d => ({
      location: tLocation(d.location) || d.location,
      type:     d.type   || '',
      rarity:   d.rarity || '',
      chance:   typeof d.chance === 'number' ? d.chance : (parseFloat(d.chance) || 0),
    }));

  // Prefer custom if available; otherwise use WFCD
  const rows = (customRows.length ? customRows : wfcdRows)
    .sort((a, b) => b.chance - a.chance);

  if (!rows.length) return noData;

  const distinctTypes = new Set(rows.map(r => r.type).filter(Boolean));
  const showType = distinctTypes.size > 1;

  const uid    = (mod.uniqueName || mod.name).replace(/\W/g, '_');
  const sortId = `ms_${uid}`;
  const bodyId = `mb_${uid}`;

  const chanceLabel = c => c >= 100 ? '—' : `${c.toFixed(2)}%`;

  const renderRows = (data) => data.map(row => {
    const rKey   = `rarity.${row.rarity.toLowerCase()}`;
    const rLabel = t(rKey) !== rKey ? t(rKey) : row.rarity;
    const rClass = row.rarity ? `rarity-${row.rarity.toLowerCase()}` : '';
    const typeCell = showType
      ? `<td class="mod-drop-type">${translateDropType(row.type)}</td>` : '';
    return `<tr>
      ${typeCell}
      <td class="mod-drop-location">${row.location}</td>
      <td class="rarity ${rClass}">${rLabel}</td>
      <td class="relic-location-chance">${chanceLabel(row.chance)}</td>
    </tr>`;
  }).join('');

  const typeHeader = showType ? `<th>${t('mod.drop.type')}</th>` : '';

  const html = `
    <div class="drop-tables-container">
      <div class="drop-table-wrapper farmable">
        <h4>${t('mod.dropSources')} (${rows.length})</h4>
        <div class="drop-table-scroll">
          <table class="drop-table">
            <thead><tr>
              ${typeHeader}
              <th>${t('modal.colLocation')}</th>
              <th class="rarity">${t('table.colRarity')}</th>
              <th id="${sortId}" class="sortable-chance" style="cursor:pointer;user-select:none;">
                ${t('modal.colChance')} <span class="sort-arrow">↓</span>
              </th>
            </tr></thead>
            <tbody id="${bodyId}">${renderRows(rows)}</tbody>
          </table>
        </div>
      </div>
    </div>`;

  requestAnimationFrame(() => {
    const btn  = document.getElementById(sortId);
    const body = document.getElementById(bodyId);
    if (!btn || !body) return;
    let dir = 'desc';
    btn.onclick = () => {
      dir = dir === 'desc' ? 'asc' : 'desc';
      btn.querySelector('.sort-arrow').textContent = dir === 'desc' ? '↓' : '↑';
      const sorted = [...rows].sort((a, b) =>
        dir === 'desc' ? b.chance - a.chance : a.chance - b.chance);
      body.innerHTML = renderRows(sorted);
    };
  });

  return html;
}

function translateDropType(type) {
  if (!type) return '';
  const key = `mod.dropType.${type.toLowerCase().replace(/\s+/g, '_')}`;
  const val = t(key);
  return val !== key ? val : type;
}