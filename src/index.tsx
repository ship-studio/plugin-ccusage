import { useState, useEffect, useCallback } from 'react';

const _w = window as any;

// ---------------------------------------------------------------------------
// Plugin Context
// ---------------------------------------------------------------------------

function usePluginContext() {
  const React = _w.__SHIPSTUDIO_REACT__;
  const CtxRef = _w.__SHIPSTUDIO_PLUGIN_CONTEXT_REF__;
  if (CtxRef && React?.useContext) {
    return React.useContext(CtxRef) as any | null;
  }
  return null;
}

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

// ---------------------------------------------------------------------------
// Types
// ---------------------------------------------------------------------------

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
type TabKey = 'daily' | 'weekly' | 'monthly';

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function fmt(n: number): string {
  return n.toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

function fmtTokens(n: number): string {
  if (n >= 1_000_000) return (n / 1_000_000).toFixed(1) + 'M';
  if (n >= 1_000) return (n / 1_000).toFixed(1) + 'k';
  return String(n);
}

function shortModel(name: string): string {
  return name
    .replace('claude-', '')
    .replace(/-\d{8}$/, '');
}

function timeAgo(ts: number): string {
  const diff = Math.floor((Date.now() - ts) / 1000);
  if (diff < 60) return 'just now';
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}

// ---------------------------------------------------------------------------
// Data Hook
// ---------------------------------------------------------------------------

function useCcusageData() {
  const shell = useShell();
  const storage = usePluginStorage();
  const [data, setData] = useState<CcusageData | null>(null);
  const [status, setStatus] = useState<FetchStatus>('idle');
  const [error, setError] = useState<string | null>(null);

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

      function safeParseJson(stdout: string): any {
        const jsonStart = stdout.indexOf('{');
        if (jsonStart === -1) throw new Error('No JSON in output');
        return JSON.parse(stdout.slice(jsonStart));
      }

      if (dailyRes.status === 'fulfilled' && dailyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(dailyRes.value.stdout);
          daily = parsed.daily ?? [];
          dailyTotals = parsed.totals;
        } catch (e) { errors.push(`daily: ${e}`); }
      } else {
        errors.push(`daily: ${dailyRes.status === 'rejected' ? dailyRes.reason : (dailyRes.value.stderr || 'failed')}`);
      }

      if (weeklyRes.status === 'fulfilled' && weeklyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(weeklyRes.value.stdout);
          weekly = parsed.weekly ?? [];
          weeklyTotals = parsed.totals;
        } catch (e) { errors.push(`weekly: ${e}`); }
      } else {
        errors.push(`weekly: ${weeklyRes.status === 'rejected' ? weeklyRes.reason : (weeklyRes.value.stderr || 'failed')}`);
      }

      if (monthlyRes.status === 'fulfilled' && monthlyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(monthlyRes.value.stdout);
          monthly = parsed.monthly ?? [];
          monthlyTotals = parsed.totals;
        } catch (e) { errors.push(`monthly: ${e}`); }
      } else {
        errors.push(`monthly: ${monthlyRes.status === 'rejected' ? monthlyRes.reason : (monthlyRes.value.stderr || 'failed')}`);
      }

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
      setStatus('success');
      if (errors.length > 0) setError(`Partial failure:\n${errors.join('\n')}`);
      if (storage) await storage.write({ ccusageData: newData });
    } catch (err) {
      setStatus('error');
      setError(String(err));
    }
  }, [shell, storage]);

  return { data, status, error, fetchData };
}

// ---------------------------------------------------------------------------
// CSS
// ---------------------------------------------------------------------------

const STYLE_ID = 'ccusage-plugin-styles';

const pluginCSS = `
@keyframes ccusage-fadeIn {
  from { opacity: 0; transform: scale(0.96); }
  to { opacity: 1; transform: scale(1); }
}
.ccusage-overlay {
  position: fixed;
  inset: 0;
  background: rgba(0, 0, 0, 0.6);
  backdrop-filter: blur(2px);
  display: flex;
  align-items: center;
  justify-content: center;
  z-index: 10000;
  animation: ccusage-fadeIn 0.15s ease-out;
}
.ccusage-modal {
  width: 520px;
  max-height: 80vh;
  border-radius: 12px;
  overflow: hidden;
  display: flex;
  flex-direction: column;
  box-shadow: 0 8px 32px rgba(0, 0, 0, 0.4);
  animation: ccusage-fadeIn 0.2s ease-out;
}
.ccusage-header {
  display: flex;
  justify-content: space-between;
  align-items: center;
  padding: 14px 16px;
  font-size: 13px;
  font-weight: 600;
}
.ccusage-header-left {
  display: flex;
  align-items: center;
  gap: 8px;
}
.ccusage-close {
  background: none;
  border: none;
  color: inherit;
  cursor: pointer;
  font-size: 14px;
  padding: 2px 6px;
  opacity: 0.4;
  line-height: 1;
  border-radius: 4px;
}
.ccusage-close:hover {
  opacity: 0.8;
  background: rgba(255, 255, 255, 0.06);
}
.ccusage-tabs {
  display: flex;
  gap: 0;
  padding: 0 16px;
}
.ccusage-tab {
  padding: 10px 14px;
  font-size: 12px;
  font-weight: 500;
  cursor: pointer;
  margin-bottom: -1px;
  transition: opacity 0.15s;
}
.ccusage-tab:hover { opacity: 0.8 !important; }
.ccusage-body {
  flex: 1;
  min-height: 0;
  overflow-y: auto;
  padding: 16px;
}
.ccusage-footer {
  padding: 12px 16px;
  display: flex;
  align-items: center;
  justify-content: space-between;
  font-size: 11px;
}
.ccusage-refresh {
  padding: 6px 14px;
  border-radius: 6px;
  border: none;
  cursor: pointer;
  font-size: 12px;
  font-weight: 500;
  transition: filter 0.12s, opacity 0.12s;
}
.ccusage-refresh:hover { filter: brightness(0.9); }
.ccusage-refresh:disabled { opacity: 0.5; cursor: not-allowed; }
.ccusage-section-title {
  font-size: 11px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-bottom: 8px;
}
.ccusage-row {
  display: flex;
  align-items: center;
  padding: 10px 12px;
  border-radius: 6px;
  margin-bottom: 4px;
  font-size: 12px;
  transition: background 0.1s;
}
.ccusage-row:hover { filter: brightness(1.1); }
.ccusage-row-date {
  width: 90px;
  flex-shrink: 0;
  font-weight: 500;
}
.ccusage-row-cost {
  width: 70px;
  text-align: right;
  font-family: monospace;
  font-weight: 600;
  flex-shrink: 0;
}
.ccusage-row-tokens {
  flex: 1;
  text-align: right;
  font-family: monospace;
  font-size: 11px;
}
.ccusage-row-bar {
  width: 60px;
  height: 4px;
  border-radius: 2px;
  flex-shrink: 0;
  margin-left: 12px;
  overflow: hidden;
}
.ccusage-row-bar-fill {
  height: 100%;
  border-radius: 2px;
  transition: width 0.3s ease;
}
.ccusage-totals {
  display: flex;
  gap: 12px;
  margin-bottom: 16px;
}
.ccusage-stat {
  flex: 1;
  padding: 12px;
  border-radius: 8px;
  text-align: center;
}
.ccusage-stat-value {
  font-size: 18px;
  font-weight: 700;
  font-family: monospace;
}
.ccusage-stat-label {
  font-size: 10px;
  font-weight: 600;
  text-transform: uppercase;
  letter-spacing: 0.5px;
  margin-top: 4px;
}
.ccusage-model-tag {
  display: inline-block;
  padding: 2px 8px;
  border-radius: 4px;
  font-size: 10px;
  font-weight: 500;
  margin-right: 4px;
  margin-bottom: 4px;
}
.ccusage-empty {
  text-align: center;
  padding: 32px 0;
  font-size: 12px;
  opacity: 0.5;
}
@keyframes ccusage-spin {
  to { transform: rotate(360deg); }
}
.ccusage-spinner {
  display: inline-block;
  width: 16px;
  height: 16px;
  border: 2px solid transparent;
  border-top-color: currentColor;
  border-radius: 50%;
  animation: ccusage-spin 0.8s linear infinite;
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

// ---------------------------------------------------------------------------
// Components
// ---------------------------------------------------------------------------

function TotalsCards({ totals, theme }: { totals: Totals; theme: any }) {
  return (
    <div className="ccusage-totals">
      <div className="ccusage-stat" style={{ background: theme.bgTertiary }}>
        <div className="ccusage-stat-value" style={{ color: theme.accent }}>
          ${fmt(totals.totalCost)}
        </div>
        <div className="ccusage-stat-label" style={{ color: theme.textMuted }}>Total Cost</div>
      </div>
      <div className="ccusage-stat" style={{ background: theme.bgTertiary }}>
        <div className="ccusage-stat-value" style={{ color: theme.textPrimary }}>
          {fmtTokens(totals.totalTokens)}
        </div>
        <div className="ccusage-stat-label" style={{ color: theme.textMuted }}>Tokens</div>
      </div>
      <div className="ccusage-stat" style={{ background: theme.bgTertiary }}>
        <div className="ccusage-stat-value" style={{ color: theme.textPrimary }}>
          {fmtTokens(totals.cacheReadTokens)}
        </div>
        <div className="ccusage-stat-label" style={{ color: theme.textMuted }}>Cache Hits</div>
      </div>
    </div>
  );
}

function EntryRow({
  label,
  cost,
  tokens,
  maxCost,
  theme,
  models,
}: {
  label: string;
  cost: number;
  tokens: number;
  maxCost: number;
  theme: any;
  models: ModelBreakdown[];
}) {
  const [expanded, setExpanded] = useState(false);
  const barPct = maxCost > 0 ? Math.max(2, (cost / maxCost) * 100) : 0;

  return (
    <>
      <div
        className="ccusage-row"
        style={{ background: theme.bgSecondary, cursor: models.length > 0 ? 'pointer' : 'default' }}
        onClick={() => models.length > 0 && setExpanded(!expanded)}
      >
        <div className="ccusage-row-date" style={{ color: theme.textPrimary }}>{label}</div>
        <div className="ccusage-row-tokens" style={{ color: theme.textMuted }}>{fmtTokens(tokens)}</div>
        <div className="ccusage-row-cost" style={{ color: theme.accent }}>${fmt(cost)}</div>
        <div className="ccusage-row-bar" style={{ background: theme.bgTertiary }}>
          <div className="ccusage-row-bar-fill" style={{ width: `${barPct}%`, background: theme.accent }} />
        </div>
      </div>
      {expanded && models.length > 0 && (
        <div style={{ padding: '4px 12px 8px 24px' }}>
          {models.map((m) => (
            <div key={m.modelName} style={{ display: 'flex', justifyContent: 'space-between', padding: '3px 0', fontSize: '11px' }}>
              <span className="ccusage-model-tag" style={{ background: theme.bgTertiary, color: theme.textSecondary }}>
                {shortModel(m.modelName)}
              </span>
              <span style={{ fontFamily: 'monospace', color: theme.textSecondary }}>${fmt(m.cost)}</span>
            </div>
          ))}
        </div>
      )}
    </>
  );
}

function TabContent({ data, tab, theme }: { data: CcusageData; tab: TabKey; theme: any }) {
  const entries = tab === 'daily' ? data.daily : tab === 'weekly' ? data.weekly : data.monthly;
  const totals = tab === 'daily' ? data.dailyTotals : tab === 'weekly' ? data.weeklyTotals : data.monthlyTotals;

  if (entries.length === 0) {
    return <div className="ccusage-empty">No {tab} data available.</div>;
  }

  const maxCost = Math.max(...entries.map((e) => e.totalCost));
  const recent = [...entries].reverse().slice(0, 30);

  return (
    <>
      {totals && <TotalsCards totals={totals} theme={theme} />}
      <div className="ccusage-section-title" style={{ color: theme.textMuted }}>
        {tab === 'daily' ? 'Recent Days' : tab === 'weekly' ? 'Recent Weeks' : 'Recent Months'}
      </div>
      {recent.map((entry) => {
        const label = 'date' in entry ? (entry as DayEntry).date.slice(5) :
                      'week' in entry ? (entry as WeekEntry).week :
                      (entry as MonthEntry).month;
        return (
          <EntryRow
            key={label}
            label={label}
            cost={entry.totalCost}
            tokens={entry.totalTokens}
            maxCost={maxCost}
            theme={theme}
            models={entry.modelBreakdowns}
          />
        );
      })}
    </>
  );
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
    border: '#404040', accent: '#007acc', accentHover: '#005a9e',
    action: '#007acc', actionText: '#ffffff', error: '#f44747', success: '#89d185',
  } as any;

  const [tab, setTab] = useState<TabKey>('daily');

  useEffect(() => {
    const handler = (e: KeyboardEvent) => { if (e.key === 'Escape') onClose(); };
    window.addEventListener('keydown', handler);
    return () => window.removeEventListener('keydown', handler);
  }, [onClose]);

  const tabs: { key: TabKey; label: string }[] = [
    { key: 'daily', label: 'Daily' },
    { key: 'weekly', label: 'Weekly' },
    { key: 'monthly', label: 'Monthly' },
  ];

  return (
    <div className="ccusage-overlay" onClick={onClose}>
      <div
        className="ccusage-modal"
        style={{ background: theme.bgPrimary, border: `1px solid ${theme.border}`, color: theme.textPrimary }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div className="ccusage-header" style={{ borderBottom: `1px solid ${theme.border}` }}>
          <div className="ccusage-header-left">
            <svg width={14} height={14} viewBox="0 0 24 24" fill="none" stroke={theme.accent} strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
              <line x1="18" y1="20" x2="18" y2="10" />
              <line x1="12" y1="20" x2="12" y2="4" />
              <line x1="6" y1="20" x2="6" y2="14" />
            </svg>
            CC Usage
          </div>
          <button className="ccusage-close" onClick={onClose}>&#x2715;</button>
        </div>

        {/* Tabs */}
        {status === 'success' && data && (
          <div className="ccusage-tabs" style={{ borderBottom: `1px solid ${theme.border}` }}>
            {tabs.map((t) => {
              const active = tab === t.key;
              return (
                <button
                  key={t.key}
                  className="ccusage-tab"
                  style={{
                    color: active ? theme.accent : theme.textMuted,
                    opacity: active ? 1 : 0.5,
                    background: 'none',
                    border: 'none',
                    borderBottom: active ? `2px solid ${theme.accent}` : '2px solid transparent',
                    borderRadius: 0,
                    outline: 'none',
                    boxShadow: 'none',
                  }}
                  onClick={() => setTab(t.key)}
                >
                  {t.label}
                </button>
              );
            })}
          </div>
        )}

        {/* Body */}
        <div className="ccusage-body">
          {status === 'loading' && (
            <div style={{ textAlign: 'center', padding: '40px 0', color: theme.textMuted }}>
              <div className="ccusage-spinner" style={{ borderTopColor: theme.accent }} />
              <div style={{ marginTop: 12, fontSize: 12 }}>Fetching usage data...</div>
            </div>
          )}

          {status === 'error' && !data && (
            <div style={{ background: `${theme.error}15`, color: theme.error, padding: '12px 14px', borderRadius: 6, fontSize: 12 }}>
              {error || 'Failed to fetch usage data.'}
            </div>
          )}

          {status === 'success' && data && (
            <>
              <TabContent data={data} tab={tab} theme={theme} />
              {error && (
                <div style={{ background: `${theme.error}15`, color: theme.error, padding: '8px 12px', borderRadius: 6, fontSize: 11, marginTop: 12 }}>
                  {error}
                </div>
              )}
            </>
          )}

          {status === 'idle' && !data && (
            <div className="ccusage-empty" style={{ color: theme.textMuted }}>
              Click Refresh to load your Claude Code usage data.
            </div>
          )}
        </div>

        {/* Footer */}
        <div className="ccusage-footer" style={{ borderTop: `1px solid ${theme.border}` }}>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 4 }}>
            <span style={{ color: theme.textMuted }}>
              {data?.fetchedAt ? `Updated ${timeAgo(data.fetchedAt)}` : 'Not yet loaded'}
            </span>
            <a
              href="https://github.com/ryoppippi/ccusage"
              target="_blank"
              rel="noopener noreferrer"
              style={{ color: theme.textMuted, fontSize: 10, opacity: 0.5, textDecoration: 'none' }}
              onMouseEnter={(e) => { (e.target as HTMLElement).style.opacity = '0.8'; }}
              onMouseLeave={(e) => { (e.target as HTMLElement).style.opacity = '0.5'; }}
            >
              powered by ccusage
            </a>
          </div>
          <button
            className="ccusage-refresh"
            style={{ background: theme.action, color: theme.actionText }}
            onClick={onRefresh}
            disabled={status === 'loading'}
          >
            {status === 'loading' ? 'Loading...' : 'Refresh'}
          </button>
        </div>
      </div>
    </div>
  );
}

// ---------------------------------------------------------------------------
// Toolbar Button
// ---------------------------------------------------------------------------

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
      <button className="toolbar-icon-btn" title="CC Usage" onClick={handleClick}>
        <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
          <line x1="18" y1="20" x2="18" y2="10" />
          <line x1="12" y1="20" x2="12" y2="4" />
          <line x1="6" y1="20" x2="6" y2="14" />
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

// ---------------------------------------------------------------------------
// Plugin Exports
// ---------------------------------------------------------------------------

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
