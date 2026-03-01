# plugin-ccusage

## What This Is

A Ship Studio plugin that displays Claude Code usage data (daily, weekly, monthly token counts and costs) by integrating with the ccusage CLI tool. Users click a toolbar icon to open a modal showing their usage breakdown, powered by `npx ccusage --json` under the hood.

## Core Value

Users can see their Claude Code spending at a glance — daily, weekly, and monthly — without leaving Ship Studio.

## Requirements

### Validated

(None yet — ship to validate)

### Active

- [ ] Toolbar button with usage/cost icon
- [ ] Modal with daily, weekly, and monthly usage views
- [ ] Runs ccusage via `npx ccusage` (auto-installs if not present)
- [ ] Manual refresh button inside the modal
- [ ] Handles missing ccusage gracefully (npx auto-downloads on first use)
- [ ] Shows loading state while fetching data
- [ ] Shows error state when ccusage fails
- [ ] Uses Ship Studio theme tokens for consistent styling
- [ ] Built from plugin-starter template

### Out of Scope

- Auto-refresh / background polling — user controls refresh manually
- Session-level or per-project usage breakdowns — just daily/weekly/monthly totals
- Configuring ccusage options (timezone, locale, cost mode) — use defaults
- Per-model cost breakdown in the UI — just totals per time period
- Mobile or responsive layout — Ship Studio is a desktop app

## Context

- **ccusage** (github.com/ryoppippi/ccusage) reads Claude Code's local JSONL usage logs and aggregates token counts and costs. It exposes a `--json` flag that outputs structured data suitable for parsing.
- **Ship Studio plugins** are single-file React/TypeScript bundles loaded as ES modules. They render in a `toolbar` slot and access the host app via a plugin context API providing shell execution, storage, theming, and toast notifications.
- The plugin will use `shell.exec('npx', ['ccusage', 'daily', '--json'])` (and similar for weekly/monthly) to fetch data. `npx` handles auto-installation if ccusage isn't globally installed.
- `dist/index.js` must be committed to the repo — Ship Studio clones repos directly and does not build plugins.

## Constraints

- **Slot**: Only `toolbar` slot is available — plugin is a toolbar button + modal overlay
- **No npm deps at runtime**: Plugin runs in Ship Studio's React context; cannot bundle node_modules. All dependencies come from the host (React) or shell commands (ccusage)
- **Shell exec for data**: Must use `shell.exec()` to run CLI commands; no direct filesystem or network access
- **10s load timeout**: Plugin module must load fast; defer data fetching to user interaction
- **Build output committed**: `dist/index.js` must be in the repo for Ship Studio to load it

## Key Decisions

| Decision | Rationale | Outcome |
|----------|-----------|---------|
| Use `npx ccusage` instead of direct JSONL parsing | Plugin can't access filesystem directly; npx handles install + execution in one command | — Pending |
| Toolbar + modal UI pattern | Standard Ship Studio plugin pattern; gives enough space for daily/weekly/monthly data | — Pending |
| Manual refresh only | Avoids background polling complexity; user controls when data loads | — Pending |

---
*Last updated: 2026-03-01 after initialization*
