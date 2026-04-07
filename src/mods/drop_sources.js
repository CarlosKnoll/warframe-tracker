// mods/drop_sources.js
//
// Custom drop-source overrides for mods with no (or wrong) WFCD drop data.
//
// Each key is the exact English mod name.
// Each entry has:
//   locationKey  — i18n key passed to tLocation(); e.g. 'dropSource.Arbitrations Vendor'
//   locationEn   — English fallback shown if the key is missing from the locale
//   rarity       — 'Common' | 'Uncommon' | 'Rare' | 'Legendary'
//   chance       — number; 100 means guaranteed/vendor (shown as "—" in table)
//   category     — (optional) overrides the auto-detected category for this mod.
//                  Use this to force a mod into a specific filter bucket, e.g.
//                  to promote a "Misc" mod into a named category, or to group
//                  otherwise-scattered mods together.
//                  Must match one of the category filter values:
//                  'Warframe' | 'Primary' | 'Secondary' | 'Melee' | 'Companion' |
//                  'Archwing' | 'Arch-Gun' | 'Arch-Melee' | 'Aura' | 'Stance' |
//                  'Parazon' | 'Misc'
//
// To add PT-BR translations: add the locationKey to locales/pt/pt.json using the
// existing "dropSource.*" pattern already in that file.

export const CUSTOM_DROP_SOURCES = {

  // ── Galvanized mods (Arbitrations Vendor, 20 Vitus Essence each) ─────────────
  'Galvanized Acceleration': [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Aptitude':     [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Chamber':      [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Crosshairs':   [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Diffusion':    [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Hell':         [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Reflex':       [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Savvy':        [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Scope':        [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Shot':         [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],
  'Galvanized Steel':        [{ locationKey: 'dropSource.Arbitrations', locationEn: 'Arbitrations Vendor (Relay, 20 Vitus Essence)', rarity: 'Rare', chance: 100 }],

  // ── Archon mods (weekly Archon Hunt, one guaranteed per completed hunt) ────────
  'Archon Continuity': [{ locationKey: 'dropSource.Archon Hunt', locationEn: 'Archon Hunt (weekly rotation)', rarity: 'Legendary', chance: 100 }],
  'Archon Flow':       [{ locationKey: 'dropSource.Archon Hunt', locationEn: 'Archon Hunt (weekly rotation)', rarity: 'Legendary', chance: 100 }],
  'Archon Intensify':  [{ locationKey: 'dropSource.Archon Hunt', locationEn: 'Archon Hunt (weekly rotation)', rarity: 'Legendary', chance: 100 }],
  'Archon Stretch':    [{ locationKey: 'dropSource.Archon Hunt', locationEn: 'Archon Hunt (weekly rotation)', rarity: 'Legendary', chance: 100 }],
  'Archon Vitality':   [{ locationKey: 'dropSource.Archon Hunt', locationEn: 'Archon Hunt (weekly rotation)', rarity: 'Legendary', chance: 100 }],

  // ── Add more entries here as needed ──────────────────────────────────────────
  // Format (drop source only):
  // 'Mod Name': [{ locationKey: 'dropSource.Source', locationEn: 'Fallback EN string', rarity: 'Rare', chance: 100 }],
  //
  // Format (drop source + category override):
  // 'Mod Name': [{ locationKey: 'dropSource.Source', locationEn: 'Fallback EN string', rarity: 'Rare', chance: 100, category: 'Primary' }],
  //
  // Format (category override only, no custom drop source):
  // 'Mod Name': [{ category: 'Primary' }],
};