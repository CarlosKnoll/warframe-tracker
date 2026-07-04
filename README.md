# Warframe Tracker
A native Windows desktop companion app for Warframe, built with **Tauri v2** (Rust backend + vanilla JS frontend). It covers mastery, primes, mods, arcanes, vendors, daily/weekly tasks, and Warframe Market price lookups, with optional cross-device sync via Google Drive.

There is also a [PWA version](https://github.com/CarlosKnoll/warframe-tracker-web) available at https://warframe-tracker.pages.dev/, fully compatible from the user-data perspective.

## Features

### Tasks
Daily and weekly checklist (Sortie, Steel Path incursions, Forma, Circuit, Archon Hunt, Netracells, Elite Deep Archimedea, Baro Ki'Teer, and more), with:
- Automatic daily (00:00 UTC) and weekly (Monday UTC) reset detection
- Live data pulled from the [Warframe worldstate](https://api.warframestat.us/pc) for time-gated tasks (sorties, Steel Path, Archon Hunts, Duviri Cycle, calendar, Archimedea)
- Support for user-defined custom tasks alongside the built-ins
- Baro Ki'Teer weapon tracking cross-referenced against your mastered items and new Baro items highlight.

### Mastery
Tracks mastery progress across every category: Warframes, Primaries, Secondaries, Melees, Robotic, Companions, Vehicles, Arch-Gun, Arch-Melee, Amps, and Misc, tailored to resemble the in-game profile as much as possible. Every card is clickable and, if the data is available on the [warframe-drop-data](https://github.com/WFCD/warframe-drop-data) repository, the modal that pops up will display its drop sources.

### Primes
Lists of all primes in the game, allowing filtering by type (Warframe, Primary, Secondary, Melee, Arch-Gun, Arch-Melee, Sentinels, Archwings) and by status (Available, Vaulted, Founders, Specials). All rendered cards are clickable, which brings up a modal with checkboxes for individual components, relics listing and categorization by vaulted/unvaulted, and a clickable text on each relic that brings another modal displaying drop sources for the selected relic.

### Mods
Full mod database with category and polarity filters, and drop-source lookups via clickable modal.

### Arcanes
Tracks how many copies of each arcane you own vs. how many you need for max rank, with filters by type (Warframe, Primary, Secondary, Melee, Operator, Amp, Kitgun, Zaw) and by source (Arbitrations, Ascension, Cavia, Conjunction Survival, Duviri, Eidolons, Isolation Vault, La Cathédrale, Mirror Defense, Ostron, Plague Star, The Quills, Steel Path Acolytes, The Hex, Zariman).

### Vendors
Tracks pity-currency vendor stock across game updates (Nokko, Uriel, Follie, and Sirius & Orion), broken down by category (warframes, weapons, mods, arcanes, cosmetics, decorations, standing) and component slot.

### Market
Live order search against the Warframe Market v2 API. Orders are streamed and parsed on the Rust side (brace-depth JSON scanner, not a naive full-parse) and ranked with a BinaryHeap to surface the cheapest sell / highest buy orders without holding the entire order dump in memory.

### Sync
Sign in with Google to back up and sync your progress (owned items, task state, custom drops, vendor state) across machines and app versions via a private Google Drive `appDataFolder`. Auth uses a loopback OAuth flow with a small Cloudflare Worker brokering the token exchange. Sync includes conflict detection and a debounced push-on-change model.

### Localization
Contains a custom i18n.js module with a bunch of helper functions that allows for UI localization in different languages, as long as they follow the EN key names.
Translations have been decentralized and are no longer bundled in `index.html` — they're pulled from a companion [`warframe-tracker-locales`](https://github.com/CarlosKnoll/warframe-tracker-locales) repo via jsDelivr, versioned against a manifest so the app can update translations independently of app releases (with local caching and automatic pruning of stale versions).
Currently, UI ships in **English** and **Portuguese (Brazil)**. 

### Auto-updates
Ships with `tauri-plugin-updater`; the app checks GitHub Releases for new versions and self-updates.

## Data storage

All user data is stored locally on disk (not in browser storage), read/written through Rust commands:
- `owned.json` — arcane/mastery ownership counts
- `tasks_cache.json` — task check state and reset timestamps
- `customDrops.json` — user overrides/additions to drop-source data
- `vendorState.json` — vendor purchase tracking
- `sync_meta.json` — sync bookkeeping (only relevant if Drive sync is enabled)

Example shapes for `owned.json` and `custom-drops.json` are provided under `examples/`.

**Note:** Uninstalling the app does **not** delete this local data directory.

## Data sources
- [WFCD warframe-items](https://github.com/WFCD/warframe-items)
- [WFCD warframe-drop-data](https://github.com/WFCD/warframe-drop-data)
- [Warframe Status API](https://api.warframestat.us)
- [Warframe Wiki](https://wiki.warframe.com)
- [Warframe Market v2 API](https://api.warframe.market)
- Google Drive API (optional sync)

## Development

```bash
npm install
npm run tauri dev      # dev build
npm run tauri build    # production build
```

Requires the standard [Tauri v2 prerequisites](https://v2.tauri.app/start/prerequisites/) (Rust toolchain + platform build tools).