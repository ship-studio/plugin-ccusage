# Requirements: plugin-ccusage

**Defined:** 2026-03-01
**Core Value:** Users can see their Claude Code spending at a glance — daily, weekly, and monthly — without leaving Ship Studio.

## v1 Requirements

### Setup

- [x] **SETUP-01**: Project is scaffolded from ship-studio/plugin-starter template (vite, tsconfig, plugin.json)
- [x] **SETUP-02**: plugin.json configured with id, name, description, toolbar slot, and required permissions
- [x] **SETUP-03**: Vite build produces working dist/index.js committed to repo

### Data

- [x] **DATA-01**: Plugin runs `npx ccusage daily --json` via shell.exec and parses the response
- [x] **DATA-02**: Plugin runs `npx ccusage weekly --json` via shell.exec and parses the response
- [x] **DATA-03**: Plugin runs `npx ccusage monthly --json` via shell.exec and parses the response
- [x] **DATA-04**: Parsed data includes per-period cost, input/output tokens, cache tokens, and models used
- [x] **DATA-05**: Last fetched results are cached in plugin storage so stale data shows immediately while refreshing
- [x] **DATA-06**: Loading state is shown while data is being fetched
- [x] **DATA-07**: Error state is shown with a clear message when ccusage fails (not installed, no data, etc.)

### UI - Toolbar

- [x] **TOOL-01**: Toolbar button renders with a recognizable usage/cost icon
- [x] **TOOL-02**: Clicking the toolbar button opens the usage modal

### UI - Modal

- [ ] **MODAL-01**: Modal displays daily usage data (date, cost, token counts)
- [ ] **MODAL-02**: Modal displays weekly usage data (week, cost, token counts)
- [ ] **MODAL-03**: Modal displays monthly usage data (month, cost, token counts)
- [ ] **MODAL-04**: User can switch between daily, weekly, and monthly views via tabs
- [ ] **MODAL-05**: Manual refresh button fetches fresh data from ccusage
- [ ] **MODAL-06**: Modal closes on Escape key press
- [ ] **MODAL-07**: Modal closes on click outside the modal content
- [ ] **MODAL-08**: All UI uses Ship Studio theme tokens for consistent styling
- [ ] **MODAL-09**: Per-model cost breakdown is visible for each time period
- [ ] **MODAL-10**: Visual cost chart shows spending trend over time

## v2 Requirements

### Enhanced Data

- **EDATA-01**: Auto-refresh usage data on a configurable interval
- **EDATA-02**: Per-project usage filtering
- **EDATA-03**: Session-level usage breakdown

### Enhanced UI

- **EUI-01**: Configurable timezone and locale for date display
- **EUI-02**: Export usage data as CSV
- **EUI-03**: Cost alerts/thresholds with visual warnings

## Out of Scope

| Feature | Reason |
|---------|--------|
| Direct JSONL file parsing | Plugin can't access filesystem; ccusage CLI handles this |
| Bundling ccusage as a dependency | Plugin can't bundle node_modules; npx handles install |
| Background polling | User chose manual refresh only |
| Mobile/responsive layout | Ship Studio is a desktop app |
| Custom ccusage configuration | Defaults are sufficient for v1 |

## Traceability

| Requirement | Phase | Status |
|-------------|-------|--------|
| SETUP-01 | Phase 1 | Complete |
| SETUP-02 | Phase 1 | Complete |
| SETUP-03 | Phase 1 | Complete |
| DATA-01 | Phase 2 | Complete |
| DATA-02 | Phase 2 | Complete |
| DATA-03 | Phase 2 | Complete |
| DATA-04 | Phase 2 | Complete |
| DATA-05 | Phase 2 | Complete |
| DATA-06 | Phase 2 | Complete |
| DATA-07 | Phase 2 | Complete |
| TOOL-01 | Phase 2 | Complete |
| TOOL-02 | Phase 2 | Complete |
| MODAL-01 | Phase 3 | Pending |
| MODAL-02 | Phase 3 | Pending |
| MODAL-03 | Phase 3 | Pending |
| MODAL-04 | Phase 3 | Pending |
| MODAL-05 | Phase 3 | Pending |
| MODAL-06 | Phase 3 | Pending |
| MODAL-07 | Phase 3 | Pending |
| MODAL-08 | Phase 3 | Pending |
| MODAL-09 | Phase 3 | Pending |
| MODAL-10 | Phase 3 | Pending |

**Coverage:**
- v1 requirements: 22 total
- Mapped to phases: 22
- Unmapped: 0 ✓

---
*Requirements defined: 2026-03-01*
*Last updated: 2026-03-01 after 02-01 plan completion*
