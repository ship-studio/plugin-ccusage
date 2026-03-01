---
phase: 01-foundation
plan: "01"
subsystem: infra
tags: [vite, typescript, react, plugin, ship-studio]

# Dependency graph
requires: []
provides:
  - package.json with @shipstudio/plugin-ccusage name, build scripts, react in peerDependencies
  - tsconfig.json configured for bundler moduleResolution and react-jsx
  - vite.config.ts with data: URL React externalization pattern for ES module output
  - .gitignore excluding node_modules/ only (dist/ intentionally tracked)
  - src/index.tsx exporting name, slots.toolbar, onActivate, onDeactivate
  - plugin.json with all required Ship Studio plugin manifest fields
affects: [02-foundation, all future phases]

# Tech tracking
tech-stack:
  added: [vite@6, typescript@5.6, "@types/react@19", react@19 (peerDependency)]
  patterns: [data: URL React externalization, ES module plugin output, Ship Studio plugin contract]

key-files:
  created:
    - package.json
    - tsconfig.json
    - vite.config.ts
    - .gitignore
    - src/index.tsx
    - plugin.json
  modified: []

key-decisions:
  - "React externalized via data: URL aliasing (not rollupOptions.globals) — required for ES module format compatibility"
  - "dist/ intentionally NOT in .gitignore — Ship Studio loads dist/index.js directly from repo without running a build"
  - "React in peerDependencies only — prevents bundling host app React instance"

patterns-established:
  - "Plugin contract: export const name, export const slots, export function onActivate from src/index.tsx"
  - "React data: URL pattern: window.__SHIPSTUDIO_REACT__ aliased for useState, useEffect, useContext, etc."
  - "Build output: single dist/index.js ES module via vite build"

requirements-completed: [SETUP-01, SETUP-02]

# Metrics
duration: 2min
completed: 2026-03-01
---

# Phase 1 Plan 01: Foundation Scaffold Summary

**Vite ES module plugin scaffold with data: URL React externalization, Ship Studio plugin manifest, and minimal toolbar entry point**

## Performance

- **Duration:** 2 min
- **Started:** 2026-03-01T09:10:43Z
- **Completed:** 2026-03-01T09:12:01Z
- **Tasks:** 2
- **Files modified:** 6

## Accomplishments
- All 6 required files created: package.json, tsconfig.json, vite.config.ts, .gitignore, src/index.tsx, plugin.json
- React externalized via data: URL aliasing pattern (the only correct approach for ES module format)
- Plugin manifest configured with all required Ship Studio fields (id, name, version, description, slots, api_version)
- src/index.tsx exports the full plugin contract: name, slots.toolbar (ToolbarButton), onActivate, onDeactivate

## Task Commits

Each task was committed atomically:

1. **Task 1: Write all template configuration files** - `5256cc0` (chore)
2. **Task 2: Write plugin entry point and plugin manifest** - `43e05df` (feat)

## Files Created/Modified
- `package.json` - Package manifest with @shipstudio/plugin-ccusage name, ES module type, build scripts, react as peerDependency
- `tsconfig.json` - TypeScript config with moduleResolution bundler, jsx react-jsx, strict mode, declaration false
- `vite.config.ts` - Vite build config with data: URL React externalization for react, react-dom, react/jsx-runtime
- `.gitignore` - Only excludes node_modules/; dist/ intentionally tracked for Ship Studio direct repo loading
- `src/index.tsx` - Plugin entry point with ToolbarButton placeholder component and full plugin contract exports
- `plugin.json` - Ship Studio plugin manifest with id=plugin-ccusage, slots=["toolbar"], api_version=1

## Decisions Made
- Used data: URL aliasing (not `output.globals`) for React externalization — globals approach fails with ES module format
- dist/ kept out of .gitignore — Ship Studio clones repo and serves dist/index.js without running npm build
- React declared only in peerDependencies to avoid bundling a second React instance alongside the host app's React

## Deviations from Plan

None - plan executed exactly as written.

## Issues Encountered
None

## User Setup Required
None - no external service configuration required.

## Next Phase Readiness
- All scaffold files in place; project is ready for `npm install` and `npm run build`
- Plan 02 (build verification) can proceed immediately
- No blockers

---
*Phase: 01-foundation*
*Completed: 2026-03-01*
