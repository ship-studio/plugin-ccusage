import { useState, useEffect, useCallback } from 'react';

const _w = window as any;

function usePluginContext() {
  const React = _w.__SHIPSTUDIO_REACT__;
  const CtxRef = _w.__SHIPSTUDIO_PLUGIN_CONTEXT_REF__;
  if (CtxRef && React?.useContext) {
    return React.useContext(CtxRef) as any | null;
  }
  return null;
}

interface ModelBreakdown {
  modelName: string;
  inputTokens: number;
  outputTokens: number;
  cacheCreationTokens: number;
  cacheReadTokens: number;
  cost: number;
}

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
  fetchedAt: number;
}

type FetchStatus = 'idle' | 'loading' | 'success' | 'error';

function useShell() {
  const ctx = usePluginContext();
  return ctx?.shell ?? null;
}

function usePluginStorage() {
  const ctx = usePluginContext();
  return ctx?.storage ?? null;
}

function useTheme() {
  const ctx = usePluginContext();
  return ctx?.theme ?? null;
}

function useCcusageData() {
  const shell = useShell();
  const storage = usePluginStorage();
  const [data, setData] = useState<CcusageData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Restore cache on mount
  useEffect(() => {
    if (!storage) return;
    storage.read().then((stored: Record<string, unknown>) => {
      if (stored.ccusageData) {
        setData(stored.ccusageData as CcusageData);
        setStatus('success');
      }
    });
  }, [storage]);

  const fetchData = useCallback(async () => {
    if (!shell) {
      setStatus('error');
      setError('Plugin context not available. Try reloading the plugin.');
      return;
    }
    setStatus('loading');
    setError(null);
    try {
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.allSettled([
        shell.exec('npx', ['ccusage', 'daily', '--json']),
        shell.exec('npx', ['ccusage', 'weekly', '--json']),
        shell.exec('npx', ['ccusage', 'monthly', '--json']),
      ]);

      const errors: string[] = [];
      let daily: DayEntry[] = [];
      let weekly: WeekEntry[] = [];
      let monthly: MonthEntry[] = [];
      let dailyTotals: Totals | undefined;
      let weeklyTotals: Totals | undefined;
      let monthlyTotals: Totals | undefined;

      // Helper: safely parse JSON from stdout, handling potential warning prefix
      function safeParseJson(stdout: string): any {
        const jsonStart = stdout.indexOf('{');
        if (jsonStart === -1) throw new Error('No JSON in output');
        return JSON.parse(stdout.slice(jsonStart));
      }

      // Parse daily
      if (dailyRes.status === 'fulfilled' && dailyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(dailyRes.value.stdout);
          daily = parsed.daily ?? [];
          dailyTotals = parsed.totals;
        } catch (e) {
          errors.push(`daily: Failed to parse JSON — ${String(e)}`);
        }
      } else {
        const msg = dailyRes.status === 'rejected'
          ? String(dailyRes.reason)
          : (dailyRes.value.stderr || 'Non-zero exit code');
        errors.push(`daily: ${msg}`);
      }

      // Parse weekly
      if (weeklyRes.status === 'fulfilled' && weeklyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(weeklyRes.value.stdout);
          weekly = parsed.weekly ?? [];
          weeklyTotals = parsed.totals;
        } catch (e) {
          errors.push(`weekly: Failed to parse JSON — ${String(e)}`);
        }
      } else {
        const msg = weeklyRes.status === 'rejected'
          ? String(weeklyRes.reason)
          : (weeklyRes.value.stderr || 'Non-zero exit code');
        errors.push(`weekly: ${msg}`);
      }

      // Parse monthly
      if (monthlyRes.status === 'fulfilled' && monthlyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(monthlyRes.value.stdout);
          monthly = parsed.monthly ?? [];
          monthlyTotals = parsed.totals;
        } catch (e) {
          errors.push(`monthly: Failed to parse JSON — ${String(e)}`);
        }
      } else {
        const msg = monthlyRes.status === 'rejected'
          ? String(monthlyRes.reason)
          : (monthlyRes.value.stderr || 'Non-zero exit code');
        errors.push(`monthly: ${msg}`);
      }

      // All three failed — full error
      if (errors.length === 3) {
        setStatus('error');
        setError(errors.join('\n'));
        return;
      }

      const newData: CcusageData = {
        daily, weekly, monthly,
        dailyTotals, weeklyTotals, monthlyTotals,
        fetchedAt: Date.now(),
      };
      setData(newData);
      setStatus('success'); // partial success still counts
      if (errors.length > 0) {
        setError(`Partial failure:\n${errors.join('\n')}`);
      }
      if (storage) await storage.write({ ccusageData: newData });
    } catch (err) {
      setStatus('error');
      setError(String(err));
    }
  }, [shell, storage]);

  return { data, status, error, fetchData };
}

const STYLE_ID = 'ccusage-plugin-styles';

const pluginCSS = `
.ccusage-overlay {
  position: fixed;
  top: 0;
  left: 0;
  right: 0;
  bottom: 0;
  background: rgba(0, 0, 0, 0.5);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 9999;
}
.ccusage-modal {
  min-width: 400px;
  max-width: 600px;
  max-height: 80vh;
  overflow-y: auto;
  border-radius: 8px;
  padding: 20px;
  box-shadow: 0 4px 24px rgba(0, 0, 0, 0.3);
}
.ccusage-modal button {
  cursor: pointer;
  padding: 6px 12px;
  border-radius: 4px;
  border: 1px solid currentColor;
  background: transparent;
  color: inherit;
  margin-right: 8px;
  margin-top: 12px;
}
.ccusage-modal button:hover {
  opacity: 0.8;
}
`;

function useInjectStyles() {
  useEffect(() => {
    if (document.getElementById(STYLE_ID)) return;
    const style = document.createElement('style');
    style.id = STYLE_ID;
    style.textContent = pluginCSS;
    document.head.appendChild(style);
    return () => { document.getElementById(STYLE_ID)?.remove(); };
  }, []);
}

function UsageModal({
  data,
  status,
  error,
  onRefresh,
  onClose,
}: {
  data: CcusageData | null;
  status: FetchStatus;
  error: string | null;
  onRefresh: () => void;
  onClose: () => void;
}) {
  const themeRaw = useTheme();
  const theme = themeRaw ?? {
    bgPrimary: '#1e1e1e', bgSecondary: '#252525', bgTertiary: '#2d2d2d',
    textPrimary: '#cccccc', textSecondary: '#999999', textMuted: '#666666',
    border: '#404040', accent: '#007acc', error: '#f44747', success: '#89d185',
  } as any;

  // Close on Escape key
  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  return (
    <div className="ccusage-overlay" onClick={onClose}>
      <div
        className="ccusage-modal"
        style={{
          background: theme.bgPrimary,
          border: `1px solid ${theme.border}`,
          color: theme.textPrimary,
        }}
        onClick={(e) => e.stopPropagation()}
      >
        <h3 style={{ margin: '0 0 12px 0' }}>CC Usage</h3>

        {status === 'loading' && <div>Fetching usage data...</div>}

        {status === 'error' && !data && (
          <div style={{ color: theme.error }}>{error || 'An error occurred'}</div>
        )}

        {status === 'success' && data && (
          <div>
            <div>
              {data.daily.length} day(s), {data.weekly.length} week(s), {data.monthly.length} month(s) loaded
            </div>
            {data.dailyTotals && (
              <div style={{ marginTop: 8 }}>
                Total cost: ${data.dailyTotals.totalCost.toFixed(2)}
              </div>
            )}
            {error && (
              <div style={{ color: theme.error, marginTop: 8, fontSize: '0.85em' }}>
                {error}
              </div>
            )}
          </div>
        )}

        {status === 'idle' && !data && (
          <div style={{ color: theme.textSecondary }}>Click Refresh to load usage data.</div>
        )}

        <div>
          <button onClick={onRefresh} disabled={status === 'loading'}>
            {status === 'loading' ? 'Loading...' : 'Refresh'}
          </button>
          <button onClick={onClose}>Close</button>
        </div>
      </div>
    </div>
  );
}

function ToolbarButton() {
  const { data, status, error, fetchData } = useCcusageData();
  const [open, setOpen] = useState(false);

  useInjectStyles();

  const handleClick = useCallback(() => {
    setOpen(true);
    if (status === 'idle' || status === 'error') {
      fetchData();
    }
  }, [status, fetchData]);

  return (
    <>
      <button
        className="toolbar-icon-btn"
        title="CC Usage"
        onClick={handleClick}
      >
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
          onRefresh={fetchData}
          onClose={() => setOpen(false)}
        />
      )}
    </>
  );
}

export const name = 'CC Usage';

export const slots = {
  toolbar: ToolbarButton,
};

export function onActivate() {
  console.log('[plugin-ccusage] Plugin activated');
}

export function onDeactivate() {
  console.log('[plugin-ccusage] Plugin deactivated');
}
