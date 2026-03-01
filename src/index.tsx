import { useState, useEffect, useCallback } from 'react';

const _w = window as any;

function usePluginContext() {
  const React = _w.__SHIPSTUDIO_REACT__;
  const CtxRef = _w.__SHIPSTUDIO_PLUGIN_CONTEXT_REF__;
  if (CtxRef && React?.useContext) {
    const ctx = React.useContext(CtxRef);
    if (ctx) return ctx;
  }
  throw new Error('Plugin context not available.');
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
  return ctx.shell;
}

function usePluginStorage() {
  const ctx = usePluginContext();
  return ctx.storage;
}

function useTheme() {
  const ctx = usePluginContext();
  return ctx.theme;
}

function useCcusageData() {
  const shell = useShell();
  const storage = usePluginStorage();
  const [data, setData] = useState<CcusageData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

  // Restore cache on mount
  useEffect(() => {
    storage.read().then((stored: Record<string, unknown>) => {
      if (stored.ccusageData) {
        setData(stored.ccusageData as CcusageData);
        setStatus('success');
      }
    });
  }, []);

  const fetchData = useCallback(async () => {
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
      await storage.write({ ccusageData: newData });
    } catch (err) {
      setStatus('error');
      setError(String(err));
    }
  }, [shell, storage]);

  return { data, status, error, fetchData };
}

function ToolbarButton() {
  const [open, setOpen] = useState(false);
  return (
    <button
      className="toolbar-icon-btn"
      title="CC Usage"
      onClick={() => setOpen(true)}
    >
      <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2">
        <circle cx="12" cy="12" r="10" />
        <path d="M12 8v4M12 16h.01" />
      </svg>
    </button>
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
