# Phase 2: Data + Toolbar - Research

**Researched:** 2026-03-01
**Domain:** Ship Studio Plugin API (shell.exec, storage), ccusage CLI JSON output, React state machine for async data
**Confidence:** HIGH

## Summary

Phase 2 builds the two foundational pieces that all subsequent phases depend on: (1) a toolbar button with a recognizable cost/usage icon that replaces the current info-circle placeholder, and (2) the data layer that calls `npx ccusage daily/weekly/monthly --json` via `shell.exec`, parses the structured JSON response, handles loading/error states, and caches results in plugin storage so stale data appears immediately on subsequent opens.

The Ship Studio plugin API is comprehensively documented in the plugin-starter CLAUDE.md (a sibling project). The `shell.exec` API signature, `storage.read/write` API, theme tokens, and CSS class `toolbar-icon-btn` are all known with HIGH confidence from verified source files in the same monorepo. The ccusage JSON output format was verified by live execution — the real output structure is confirmed with field-level precision.

The primary architectural decision for this phase is how to structure the async data lifecycle within the `ToolbarButton` component (which is the only rendered slot). Because the toolbar component is always mounted while the plugin is active, fetching on first toolbar-button click is clean: read storage on mount (to restore cached data immediately), then trigger the three shell.exec calls when the user clicks the button, updating state as each resolves.

**Primary recommendation:** Implement a single `useCcusageData` custom hook in `src/index.tsx` that encapsulates all shell.exec calls, JSON parsing, storage caching, and loading/error state. The ToolbarButton component reads from this hook, and the modal (Phase 3) will also read from it.

<phase_requirements>
## Phase Requirements

| ID | Description | Research Support |
|----|-------------|-----------------|
| DATA-01 | Plugin runs `npx ccusage daily --json` via shell.exec and parses the response | shell.exec API confirmed; ccusage JSON structure verified by live run |
| DATA-02 | Plugin runs `npx ccusage weekly --json` via shell.exec and parses the response | Same as DATA-01; weekly key confirmed as `week` (not `weekOf`) |
| DATA-03 | Plugin runs `npx ccusage monthly --json` via shell.exec and parses the response | Same as DATA-01; monthly key confirmed as `month` |
| DATA-04 | Parsed data includes per-period cost, input/output tokens, cache tokens, and models used | All fields present: `totalCost`, `inputTokens`, `outputTokens`, `cacheCreationTokens`, `cacheReadTokens`, `modelsUsed`, `modelBreakdowns` |
| DATA-05 | Last fetched results are cached in plugin storage so stale data shows immediately while refreshing | `storage.read()` / `storage.write()` API confirmed; storage is per-plugin per-project |
| DATA-06 | Loading state is shown while data is being fetched | Standard React useState pattern; three concurrent shell.exec calls need coordinated loading state |
| DATA-07 | Error state is shown with a clear message when ccusage fails | `exit_code !== 0` and thrown exceptions both need handling; stderr contains error text |
| TOOL-01 | Toolbar button renders with a recognizable usage/cost icon | `toolbar-icon-btn` CSS class confirmed; current icon is an info-circle placeholder needing replacement |
| TOOL-02 | Clicking the toolbar button opens the usage modal | Modal will be stubbed in Phase 2 (data wiring), implemented fully in Phase 3 |
</phase_requirements>

## Standard Stack

### Core
| Library | Version | Purpose | Why Standard |
|---------|---------|---------|--------------|
| React | 19 (host-provided) | UI components and hooks | Provided by Ship Studio host; must NOT be bundled |
| TypeScript | 5.6 | Type safety | Already in scaffold from Phase 1 |
| Vite | 6 | Build system | Already configured from Phase 1 |

### Supporting
| Library | Version | Purpose | When to Use |
|---------|---------|---------|-------------|
| ccusage | 18.0.8 (latest as of 2026-03-01) | Usage data CLI | Called via `npx ccusage` — NOT installed as a dep |

### Alternatives Considered
| Instead of | Could Use | Tradeoff |
|------------|-----------|----------|
| `npx ccusage` | `ccusage` (global install) | npx auto-installs; global install requires user setup |
| Three separate shell.exec calls | Single call with combined flags | ccusage has no combined daily+weekly+monthly mode; must be separate |
| Promise.allSettled for parallel fetch | Sequential fetch | allSettled gives better partial-success UX (show what succeeded even if one fails) |

**Installation:** No new packages needed. ccusage is invoked via npx at runtime.

## Architecture Patterns

### Recommended Project Structure
```
src/
└── index.tsx    # Single file: types, hook, toolbar component, modal stub, exports
```

Phase 2 stays in one file. When the full modal is built in Phase 3, components may be split into multiple source files (all bundled by Vite into the single dist/index.js).

### Pattern 1: Custom Data Hook (useCcusageData)

**What:** A single hook that owns all data-fetching state: daily/weekly/monthly results, loading flag, error message, and a `fetch` callback.

**When to use:** Whenever async data from multiple sources needs coordinated loading/error state, plus cache restoration on mount.

**Example:**
```typescript
// Source: verified against plugin-starter CLAUDE.md + plugin-dependency-checker/src/index.tsx

interface DayEntry {
  date: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalTokens: number;
  totalCost: number;
  modelsUsed: string[];
  modelBreakdowns: ModelBreakdown[];
}

interface ModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

interface WeekEntry extends Omit<DayEntry, 'date'> { week: string; }
interface MonthEntry extends Omit<DayEntry, 'date'> { month: string; }

interface Totals {
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  totalCost: number;
  totalTokens: number;
}

interface CcusageData {
  daily: DayEntry[];
  weekly: WeekEntry[];
  monthly: MonthEntry[];
  dailyTotals?: Totals;
  weeklyTotals?: Totals;
  monthlyTotals?: Totals;
  fetchedAt: number; // timestamp for cache freshness display
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

function useCcusageData() {
  const shell = useShell();
  const storage = usePluginStorage();
  const [data, setData] = useState<CcusageData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Restore cache on mount
  useEffect(() => {
    storage.read().then(stored => {
      if (stored.ccusageData) {
        setData(stored.ccusageData as CcusageData);
        setStatus('success');
      }
    });
  }, []);

  const fetch = useCallback(async () => {
    setStatus('loading');
    setError(null);
    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.allSettled([
        shell.exec('npx', ['ccusage', 'daily', '--json']),
        shell.exec('npx', ['ccusage', 'weekly', '--json']),
        shell.exec('npx', ['ccusage', 'monthly', '--json']),
      ]);

      // Parse each result, collecting errors
      const errors: string[] = [];
      let daily: DayEntry[] = [], weekly: WeekEntry[] = [], monthly: MonthEntry[] = [];
      let dailyTotals: Totals | undefined, weeklyTotals: Totals | undefined, monthlyTotals: Totals | undefined;

      if (dailyRes.status === 'fulfilled' && dailyRes.value.exit_code === 0) {
        const parsed = JSON.parse(dailyRes.value.stdout);
        daily = parsed.daily ?? [];
        dailyTotals = parsed.totals;
      } else {
        const msg = dailyRes.status === 'rejected' ? String(dailyRes.reason) : dailyRes.value.stderr;
        errors.push(`daily: ${msg}`);
      }
      // ... same pattern for weekly, monthly

      if (errors.length === 3) {
        setStatus('error');
        setError(errors.join('\n'));
        return;
      }

      const newData: CcusageData = { daily, weekly, monthly, dailyTotals, weeklyTotals, monthlyTotals, fetchedAt: Date.now() };
      setData(newData);
      setStatus('success');
      await storage.write({ ccusageData: newData });
    } catch (err) {
      setStatus('error');
      setError(String(err));
    }
  }, [shell, storage]);

  return { data, status, error, fetch };
}
```

### Pattern 2: Toolbar Button with Deferred Fetch

**What:** The ToolbarButton component is always mounted. Data fetch is triggered on click, not on mount. Cache is restored from storage on mount so stale data is immediately available.

**When to use:** Any plugin where data fetching is user-initiated (manual refresh pattern).

**Example:**
```typescript
// Source: verified against plugin-starter CLAUDE.md

function ToolbarButton() {
  const { data, status, error, fetch } = useCcusageData();
  const [open, setOpen] = useState(false);

  useInjectStyles();

  const handleClick = useCallback(() => {
    setOpen(true);
    if (status === 'idle' || status === 'error') {
      fetch(); // Auto-fetch on first open or after error
    }
  }, [status, fetch]);

  return (
    <>
      <button
        className="toolbar-icon-btn"
        title="CC Usage"
        onClick={handleClick}
      >
        {/* Cost/dollar icon — see Icon section below */}
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="12" y1="1" x2="12" y2="23" />
          <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
        </svg>
      </button>
      {open && (
        <UsageModal
          data={data}
          status={status}
          error={error}
          onRefresh={fetch}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}
```

### Pattern 3: CSS Injection for Modal Overlay

**What:** Inject a `<style>` tag into `document.head` on mount, remove on unmount. Required because plugins have no access to CSS files — only `dist/index.js` is loaded.

**When to use:** Any plugin UI beyond the toolbar button itself.

**Example:**
```typescript
// Source: plugin-starter/src/index.tsx (verified)

const STYLE_ID = 'ccusage-plugin-styles';

function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = pluginCSS; // string defined at module scope
    document.head.appendChild(style);
    return () => { document.getElementById(STYLE_ID)?.remove(); };
  }, []);
}
```

### Pattern 4: Storage Schema

**What:** The plugin storage is a flat `Record<string, unknown>` — use a single key (`ccusageData`) to store the entire data object.

**Storage key design:**
```typescript
// Storage write
await storage.write({ ccusageData: newData });

// Storage read
const stored = await storage.read();
const cached = stored.ccusageData as CcusageData | undefined;
```

Note: storage is **per-plugin per-project** (not global). This is fine — ccusage reads the user's global ~/.claude/projects JSONL logs regardless of which project is open in Ship Studio.

### Anti-Patterns to Avoid

- **Fetching on toolbar component mount:** The toolbar is mounted when the plugin activates, not when the user clicks it. Fetching on mount means ccusage runs every time Ship Studio loads, creating unnecessary delay and shell spawns.
- **Awaiting each shell.exec sequentially:** Three sequential `await shell.exec()` calls take 3x longer. Use `Promise.allSettled` for parallelism.
- **Storing raw stdout in storage:** Parse to typed objects before writing to storage. This protects against ccusage version changes breaking cached data.
- **Setting `status = 'error'` when only one of three calls fails:** Use partial success — if daily succeeds but weekly fails, show daily data and flag the weekly error.
- **Throwing on JSON.parse failure:** Wrap JSON.parse in try/catch; ccusage may output warnings to stdout before the JSON (e.g., network fetch for pricing).

## Don't Hand-Roll

| Problem | Don't Build | Use Instead | Why |
|---------|-------------|-------------|-----|
| Loading spinner | Custom animation | Inline text "Fetching..." + disabled button | Ship Studio has no shared spinner component; text + disabled state is sufficient and matches the starter pattern |
| JSON schema validation | Runtime type checker | TypeScript compile-time types + optional field access | ccusage output is stable; runtime validation adds complexity without real benefit |
| Retry logic | Exponential backoff | None (manual refresh only) | Per project decisions: "Manual refresh only" — user controls when to retry |
| Background cache invalidation | TTL-based timer | None | Out of scope per requirements |

**Key insight:** The shell.exec pattern is inherently simple — the hard part is handling the three concurrent calls and their failure modes cleanly. The data structure from ccusage is stable and predictable; don't over-engineer parsing.

## Common Pitfalls

### Pitfall 1: ccusage Emits Warnings Before JSON
**What goes wrong:** `JSON.parse(stdout)` throws because ccusage sometimes prints non-JSON warning text before the JSON object (e.g., "Fetching latest pricing from API...").
**Why it happens:** ccusage may print status messages to stdout (not just stderr) in some versions, or when fetching pricing data.
**How to avoid:** Extract JSON by finding the first `{` character: `const jsonStart = stdout.indexOf('{'); const json = JSON.parse(stdout.slice(jsonStart));`
**Warning signs:** JSON.parse throwing with valid-looking data; live run output shows "Fetching..." prefix text.

### Pitfall 2: npx First-Run Download Delay
**What goes wrong:** First `shell.exec('npx', ['ccusage', ...])` call hangs for 5-30 seconds while npm downloads ccusage.
**Why it happens:** npx downloads the package on first use if not cached. Subsequent runs use the cache (fast).
**How to avoid:** Set a longer timeout on the first call. The default shell.exec timeout is 120,000ms (2 minutes), which is sufficient. Do NOT reduce it. Show a loading state with a message like "Fetching usage data..." to reassure the user.
**Warning signs:** Test shows the tool working but very slowly the first time.

### Pitfall 3: Storage Read Before Component is Ready
**What goes wrong:** Component renders before `storage.read()` resolves, showing "no data" flash even when cache exists.
**Why it happens:** `storage.read()` is async; initial state is `null`/`'idle'` before the promise resolves.
**How to avoid:** Initialize `status` as `'idle'` (not `'error'`), and display a neutral empty state (not an error message) until storage read completes. The storage read should complete in <10ms (it's a local file read).
**Warning signs:** Error flash on open even when cache exists.

### Pitfall 4: Shell.exec Runs in Project Directory
**What goes wrong:** `npx ccusage` may behave differently depending on working directory if the project has a local ccusage config.
**Why it happens:** shell.exec runs commands in the project's root directory (the Ship Studio project path).
**How to avoid:** ccusage reads `~/.claude/projects/` (global user data), so project CWD doesn't affect data output. This is safe by design — just be aware the CWD is the project folder, not the user's home.
**Warning signs:** None expected for ccusage specifically.

### Pitfall 5: Icon SVG Not Recognizable
**What goes wrong:** TOOL-01 requires "a recognizable usage/cost icon." The current icon is a generic info-circle.
**Why it happens:** Phase 1 used a placeholder.
**How to avoid:** Use the dollar-sign SVG icon (Lucide `DollarSign` path) or a bar-chart icon. The dollar sign is most immediately recognizable for "cost." SVG path is well-known and can be inlined directly.
**Warning signs:** If reviewers don't immediately associate the icon with "cost," it fails TOOL-01.

## Code Examples

Verified patterns from official sources (plugin-starter CLAUDE.md + live ccusage run):

### Exact ccusage JSON Output Structure

```typescript
// Verified by live execution of npx ccusage@18.0.8

// npx ccusage daily --json
interface DailyResponse {
  daily: Array<{
    date: string;              // "2026-01-11" (YYYY-MM-DD)
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalTokens: number;
    totalCost: number;         // USD as float
    modelsUsed: string[];      // e.g. ["claude-opus-4-6", "claude-haiku-4-5-20251001"]
    modelBreakdowns: Array<{
      modelName: string;
      inputTokens: number;
      outputTokens: number;
      cacheCreationTokens: number;
      cacheReadTokens: number;
      cost: number;            // no 'total' prefix — just 'cost'
    }>;
  }>;
  totals: {
    inputTokens: number;
    outputTokens: number;
    cacheCreationTokens: number;
    cacheReadTokens: number;
    totalCost: number;
    totalTokens: number;
  };
}

// npx ccusage weekly --json
interface WeeklyResponse {
  weekly: Array<{
    week: string;              // "2026-01-11" (start of week, YYYY-MM-DD)
    // ... same token/cost/model fields as daily
  }>;
  totals: { /* same shape */ };
}

// npx ccusage monthly --json
interface MonthlyResponse {
  monthly: Array<{
    month: string;             // "2026-01" (YYYY-MM)
    // ... same token/cost/model fields as daily
  }>;
  totals: { /* same shape */ };
}
```

### shell.exec Call Pattern

```typescript
// Source: plugin-starter CLAUDE.md (verified)

const result = await shell.exec('npx', ['ccusage', 'daily', '--json']);
// result: { stdout: string, stderr: string, exit_code: number }

if (result.exit_code !== 0) {
  // Error: stderr contains the message (e.g., "command not found: ccusage")
  throw new Error(result.stderr || 'ccusage returned non-zero exit code');
}

// Safe JSON extraction (handles potential warning prefix)
const jsonStart = result.stdout.indexOf('{');
if (jsonStart === -1) throw new Error('No JSON in ccusage output');
const parsed: DailyResponse = JSON.parse(result.stdout.slice(jsonStart));
```

### storage.read / storage.write Pattern

```typescript
// Source: plugin-starter CLAUDE.md (verified)

// On mount: restore cache
useEffect(() => {
  storage.read().then(stored => {
    if (stored.ccusageData) {
      setData(stored.ccusageData as CcusageData);
      setStatus('success');
    }
  });
}, []);

// After successful fetch: persist
await storage.write({ ccusageData: newData });
```

### Recommended Icon SVG (Dollar Sign — TOOL-01)

```tsx
// Source: Lucide icon set, DollarSign icon (14x14 for toolbar)
// This icon is universally recognized for "cost"

<svg
  width="14"
  height="14"
  viewBox="0 0 24 24"
  fill="none"
  stroke="currentColor"
  strokeWidth="2"
  strokeLinecap="round"
  strokeLinejoin="round"
>
  <line x1="12" y1="1" x2="12" y2="23" />
  <path d="M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" />
</svg>
```

Alternative: bar-chart icon if "usage" rather than "cost" is the emphasis:
```tsx
<svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
  <line x1="18" y1="20" x2="18" y2="10" />
  <line x1="12" y1="20" x2="12" y2="4" />
  <line x1="6" y1="20" x2="6" y2="14" />
</svg>
```

### Modal Stub (Phase 2 Scope)

Phase 2 success criterion TOOL-02 requires "clicking the toolbar button opens the usage modal." The modal itself is Phase 3, but Phase 2 needs a functional stub that renders when open=true:

```tsx
// Minimal modal stub for Phase 2 — wires the data layer, full UI in Phase 3
function UsageModal({
  data, status, error, onRefresh, onClose
}: {
  data: CcusageData | null;
  status: FetchStatus;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const theme = useTheme();

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="ccusage-overlay" onClick={onClose}>
      <div
        className="ccusage-modal"
        style={{ background: theme.bgPrimary, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
        onClick={e => e.stopPropagation()}
      >
        {status === 'loading' && <div>Fetching usage data...</div>}
        {status === 'error' && <div style={{ color: theme.error }}>{error}</div>}
        {status === 'success' && data && (
          <div>Data loaded — {data.daily.length} days, {data.weekly.length} weeks, {data.monthly.length} months</div>
        )}
        <button onClick={onRefresh}>Refresh</button>
        <button onClick={onClose}>Close</button>
      </div>
    </div>
  );
}
```

## State of the Art

| Old Approach | Current Approach | When Changed | Impact |
|--------------|------------------|--------------|--------|
| `rollupOptions.globals` for React externalization | `data: URL` aliasing in Vite config | Phase 1 established | ES module format requires data: URLs; globals approach silently fails |
| Importing types from @shipstudio/plugin-sdk | Inline PluginContextValue interface | Established in plugin-starter | No extra dep; types inlined in src/index.tsx |

**Deprecated/outdated:**
- Using `import.meta.env` for runtime config: Not applicable in Ship Studio plugins (no env injection in plugin bundles).

## Open Questions

1. **Does ccusage write warnings to stdout or stderr?**
   - What we know: Live run of `npx ccusage daily --json` returned clean JSON with no prefix text. The `--json` flag appears to suppress non-JSON output in the current version (18.0.8).
   - What's unclear: Whether older cached ccusage versions (from npx cache) behave differently.
   - Recommendation: Still implement the `stdout.indexOf('{')` defensive parse — costs nothing and prevents a class of future bugs.

2. **What does ccusage output when there is no data (new user)?**
   - What we know: When data exists, output is well-formed JSON. Empty state untested.
   - What's unclear: Whether it returns `{ "daily": [], "totals": {...} }` or throws an error with non-zero exit.
   - Recommendation: Treat both empty arrays and non-zero exit gracefully. An empty `daily: []` array is valid and should show "No data yet" rather than an error.

3. **Is storage.write a merge or replace?**
   - What we know: The storage API signature is `write(data: Record<string, unknown>): Promise<void>`. The starter docs say to pass the full data object.
   - What's unclear: Whether write replaces all keys or merges with existing keys.
   - Recommendation: Always pass the complete storage object (not partial updates) to avoid ambiguity. For Phase 2, storage has only one key (`ccusageData`), so this is not an issue.

## Sources

### Primary (HIGH confidence)
- `/Users/juliangalluzzo/Desktop/Projects/shipstudio-plugins/plugin-starter/CLAUDE.md` — Full Ship Studio plugin API: shell.exec signature, storage API, PluginContextValue interface, theme tokens, CSS classes, lifecycle, constraints
- `/Users/juliangalluzzo/Desktop/Projects/shipstudio-plugins/plugin-starter/src/index.tsx` — Working plugin example: shell.exec usage, storage.read/write pattern, modal pattern, CSS injection, Escape handler
- `/Users/juliangalluzzo/Desktop/Projects/shipstudio-plugins/plugin-dependency-checker/src/index.tsx` — Production plugin using shell.exec for CLI tool invocation with JSON parsing, loading/error states, Promise.allSettled pattern
- Live execution of `npx ccusage@18.0.8 daily --json`, `weekly --json`, `monthly --json` — Confirmed exact JSON structure with all field names

### Secondary (MEDIUM confidence)
- ccusage GitHub README (github.com/ryoppippi/ccusage) — CLI flag reference; `--json` flag purpose confirmed

### Tertiary (LOW confidence)
- None

## Metadata

**Confidence breakdown:**
- Standard stack: HIGH — all tools verified from existing scaffold files
- Architecture patterns: HIGH — verified against plugin-starter CLAUDE.md and working plugin examples
- ccusage JSON structure: HIGH — verified by live execution
- shell.exec API: HIGH — verified from plugin-starter CLAUDE.md + production plugin usage
- Pitfalls: MEDIUM — most derived from live testing and code analysis; "warnings before JSON" is defensive/precautionary

**Research date:** 2026-03-01
**Valid until:** 2026-04-01 (ccusage updates frequently; re-verify JSON structure if version changes)
