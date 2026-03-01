# Roadmap: plugin-ccusage

## Overview

Three phases deliver a Ship Studio plugin that surfaces Claude Code usage data. Phase 1 scaffolds a working plugin skeleton from the starter template. Phase 2 wires in the ccusage CLI via shell.exec and implements the toolbar entry point. Phase 3 builds the full modal UI with tabbed views, loading/error states, and Ship Studio theming.

## Phases

**Phase Numbering:**
- Integer phases (1, 2, 3): Planned milestone work
- Decimal phases (2.1, 2.2): Urgent insertions (marked with INSERTED)

Decimal phases appear between their surrounding integers in numeric order.

- [ ] **Phase 1: Foundation** - Scaffold the plugin from plugin-starter so it loads in Ship Studio with a committed dist/index.js
- [ ] **Phase 2: Data + Toolbar** - Wire ccusage CLI via shell.exec, implement toolbar button, and handle all data states (loading, error, cached)
- [ ] **Phase 3: Modal UI** - Build the full usage modal with tabbed daily/weekly/monthly views, refresh, and Ship Studio theming

## Phase Details

### Phase 1: Foundation
**Goal**: A working Ship Studio plugin skeleton is scaffolded, configured, and loadable from the repo
**Depends on**: Nothing (first phase)
**Requirements**: SETUP-01, SETUP-02, SETUP-03
**Success Criteria** (what must be TRUE):
  1. Ship Studio can load the plugin directly from the repo without any local build step
  2. plugin.json declares the correct id, name, description, toolbar slot, and required permissions
  3. dist/index.js is committed and reflects the latest build output
**Plans**: 2 plans

Plans:
- [x] 01-01-PLAN.md — Scaffold all template files and configure plugin manifest (SETUP-01, SETUP-02)
- [ ] 01-02-PLAN.md — Install dependencies, build dist/index.js, and commit to repository (SETUP-03)

### Phase 2: Data + Toolbar
**Goal**: The toolbar button appears in Ship Studio and clicking it fetches real usage data from ccusage via shell.exec, with loading, error, and cached states all handled
**Depends on**: Phase 1
**Requirements**: DATA-01, DATA-02, DATA-03, DATA-04, DATA-05, DATA-06, DATA-07, TOOL-01, TOOL-02
**Success Criteria** (what must be TRUE):
  1. A recognizable usage/cost icon appears in the Ship Studio toolbar
  2. Clicking the toolbar button triggers shell.exec calls to npx ccusage for daily, weekly, and monthly data
  3. Parsed data includes cost, input/output tokens, cache tokens, and models used for each period
  4. A loading indicator is visible while shell.exec is running
  5. When ccusage fails or returns no data, a clear error message is shown instead of crashing
**Plans**: TBD

### Phase 3: Modal UI
**Goal**: Users can view daily, weekly, and monthly usage data in a polished modal that matches Ship Studio's design and handles all interaction patterns
**Depends on**: Phase 2
**Requirements**: MODAL-01, MODAL-02, MODAL-03, MODAL-04, MODAL-05, MODAL-06, MODAL-07, MODAL-08, MODAL-09, MODAL-10
**Success Criteria** (what must be TRUE):
  1. User can switch between daily, weekly, and monthly usage views using tabs, and each view shows date/period, cost, and token counts
  2. Per-model cost breakdown is visible within each time period view
  3. A visual cost chart shows spending trend over time
  4. User can refresh data manually with a button inside the modal
  5. Modal closes on Escape key press and on click outside the modal content, and all UI uses Ship Studio theme tokens
**Plans**: TBD

## Progress

**Execution Order:**
Phases execute in numeric order: 1 → 2 → 3

| Phase | Plans Complete | Status | Completed |
|-------|----------------|--------|-----------|
| 1. Foundation | 1/2 | In progress | - |
| 2. Data + Toolbar | 0/? | Not started | - |
| 3. Modal UI | 0/? | Not started | - |
