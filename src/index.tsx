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
