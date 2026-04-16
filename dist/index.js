import { jsxs, Fragment, jsx } from "data:text/javascript,export const jsx=window.__SHIPSTUDIO_REACT__.createElement;export const jsxs=window.__SHIPSTUDIO_REACT__.createElement;export const Fragment=window.__SHIPSTUDIO_REACT__.Fragment;";
import { useState, useCallback, useEffect } from "data:text/javascript,export default window.__SHIPSTUDIO_REACT__;export const useState=window.__SHIPSTUDIO_REACT__.useState;export const useEffect=window.__SHIPSTUDIO_REACT__.useEffect;export const useCallback=window.__SHIPSTUDIO_REACT__.useCallback;export const useMemo=window.__SHIPSTUDIO_REACT__.useMemo;export const useRef=window.__SHIPSTUDIO_REACT__.useRef;export const useContext=window.__SHIPSTUDIO_REACT__.useContext;export const createElement=window.__SHIPSTUDIO_REACT__.createElement;export const Fragment=window.__SHIPSTUDIO_REACT__.Fragment;";
const _w = window;
function usePluginContext() {
  const React = _w.__SHIPSTUDIO_REACT__;
  const CtxRef = _w.__SHIPSTUDIO_PLUGIN_CONTEXT_REF__;
  if (CtxRef && (React == null ? void 0 : React.useContext)) {
    const ctx = React.useContext(CtxRef);
    if (ctx) return ctx;
  }
  const directCtx = _w.__SHIPSTUDIO_PLUGIN_CONTEXT__;
  if (directCtx) return directCtx;
  return null;
}
function useShell() {
  const ctx = usePluginContext();
  return (ctx == null ? void 0 : ctx.shell) ?? null;
}
function usePluginStorage() {
  const ctx = usePluginContext();
  return (ctx == null ? void 0 : ctx.storage) ?? null;
}
function useTheme() {
  const ctx = usePluginContext();
  return (ctx == null ? void 0 : ctx.theme) ?? null;
}
function fmt(n) {
  return n.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}
function fmtTokens(n) {
  if (n >= 1e6) return (n / 1e6).toFixed(1) + "M";
  if (n >= 1e3) return (n / 1e3).toFixed(1) + "k";
  return String(n);
}
function shortModel(name2) {
  return name2.replace("claude-", "").replace(/-\d{8}$/, "");
}
function timeAgo(ts) {
  const diff = Math.floor((Date.now() - ts) / 1e3);
  if (diff < 60) return "just now";
  if (diff < 3600) return `${Math.floor(diff / 60)}m ago`;
  if (diff < 86400) return `${Math.floor(diff / 3600)}h ago`;
  return `${Math.floor(diff / 86400)}d ago`;
}
function useCcusageData() {
  const shell = useShell();
  const storage = usePluginStorage();
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  useEffect(() => {
    if (!storage) return;
    storage.read().then((stored) => {
      if (stored.ccusageData) {
        setData(stored.ccusageData);
        setStatus("success");
      }
    });
  }, [storage]);
  const fetchData = useCallback(async () => {
    if (!shell) {
      setStatus("error");
      setError("Plugin context not available. Try reloading the plugin.");
      return;
    }
    setStatus("loading");
    setError(null);
    try {
      let safeParseJson = function(stdout) {
        const jsonStart = stdout.indexOf("{");
        if (jsonStart === -1) throw new Error("No JSON in output");
        return JSON.parse(stdout.slice(jsonStart));
      };
      const [dailyRes, weeklyRes, monthlyRes] = await Promise.allSettled([
        shell.exec("npx", ["ccusage", "daily", "--json"]),
        shell.exec("npx", ["ccusage", "weekly", "--json"]),
        shell.exec("npx", ["ccusage", "monthly", "--json"])
      ]);
      const errors = [];
      let daily = [];
      let weekly = [];
      let monthly = [];
      let dailyTotals;
      let weeklyTotals;
      let monthlyTotals;
      if (dailyRes.status === "fulfilled" && dailyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(dailyRes.value.stdout);
          daily = parsed.daily ?? [];
          dailyTotals = parsed.totals;
        } catch (e) {
          errors.push(`daily: ${e}`);
        }
      } else {
        errors.push(`daily: ${dailyRes.status === "rejected" ? dailyRes.reason : dailyRes.value.stderr || "failed"}`);
      }
      if (weeklyRes.status === "fulfilled" && weeklyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(weeklyRes.value.stdout);
          weekly = parsed.weekly ?? [];
          weeklyTotals = parsed.totals;
        } catch (e) {
          errors.push(`weekly: ${e}`);
        }
      } else {
        errors.push(`weekly: ${weeklyRes.status === "rejected" ? weeklyRes.reason : weeklyRes.value.stderr || "failed"}`);
      }
      if (monthlyRes.status === "fulfilled" && monthlyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(monthlyRes.value.stdout);
          monthly = parsed.monthly ?? [];
          monthlyTotals = parsed.totals;
        } catch (e) {
          errors.push(`monthly: ${e}`);
        }
      } else {
        errors.push(`monthly: ${monthlyRes.status === "rejected" ? monthlyRes.reason : monthlyRes.value.stderr || "failed"}`);
      }
      if (errors.length === 3) {
        setStatus("error");
        setError(errors.join("\n"));
        return;
      }
      const newData = {
        daily,
        weekly,
        monthly,
        dailyTotals,
        weeklyTotals,
        monthlyTotals,
        fetchedAt: Date.now()
      };
      setData(newData);
      setStatus("success");
      if (errors.length > 0) setError(`Partial failure:
${errors.join("\n")}`);
      if (storage) await storage.write({ ccusageData: newData });
    } catch (err) {
      setStatus("error");
      setError(String(err));
    }
  }, [shell, storage]);
  return { data, status, error, fetchData };
}
const STYLE_ID = "ccusage-plugin-styles";
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
    const style = document.createElement("style");
    style.id = STYLE_ID;
    style.textContent = pluginCSS;
    document.head.appendChild(style);
    return () => {
      var _a;
      (_a = document.getElementById(STYLE_ID)) == null ? void 0 : _a.remove();
    };
  }, []);
}
function TotalsCards({ totals, theme }) {
  return /* @__PURE__ */ jsxs("div", { className: "ccusage-totals", children: [
    /* @__PURE__ */ jsxs("div", { className: "ccusage-stat", style: { background: theme.bgTertiary }, children: [
      /* @__PURE__ */ jsxs("div", { className: "ccusage-stat-value", style: { color: theme.accent }, children: [
        "$",
        fmt(totals.totalCost)
      ] }),
      /* @__PURE__ */ jsx("div", { className: "ccusage-stat-label", style: { color: theme.textMuted }, children: "Total Cost" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "ccusage-stat", style: { background: theme.bgTertiary }, children: [
      /* @__PURE__ */ jsx("div", { className: "ccusage-stat-value", style: { color: theme.textPrimary }, children: fmtTokens(totals.totalTokens) }),
      /* @__PURE__ */ jsx("div", { className: "ccusage-stat-label", style: { color: theme.textMuted }, children: "Tokens" })
    ] }),
    /* @__PURE__ */ jsxs("div", { className: "ccusage-stat", style: { background: theme.bgTertiary }, children: [
      /* @__PURE__ */ jsx("div", { className: "ccusage-stat-value", style: { color: theme.textPrimary }, children: fmtTokens(totals.cacheReadTokens) }),
      /* @__PURE__ */ jsx("div", { className: "ccusage-stat-label", style: { color: theme.textMuted }, children: "Cache Hits" })
    ] })
  ] });
}
function EntryRow({
  label,
  cost,
  tokens,
  maxCost,
  theme,
  models
}) {
  const [expanded, setExpanded] = useState(false);
  const barPct = maxCost > 0 ? Math.max(2, cost / maxCost * 100) : 0;
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsxs(
      "div",
      {
        className: "ccusage-row",
        style: { background: theme.bgSecondary, cursor: models.length > 0 ? "pointer" : "default" },
        onClick: () => models.length > 0 && setExpanded(!expanded),
        children: [
          /* @__PURE__ */ jsx("div", { className: "ccusage-row-date", style: { color: theme.textPrimary }, children: label }),
          /* @__PURE__ */ jsx("div", { className: "ccusage-row-tokens", style: { color: theme.textMuted }, children: fmtTokens(tokens) }),
          /* @__PURE__ */ jsxs("div", { className: "ccusage-row-cost", style: { color: theme.accent }, children: [
            "$",
            fmt(cost)
          ] }),
          /* @__PURE__ */ jsx("div", { className: "ccusage-row-bar", style: { background: theme.bgTertiary }, children: /* @__PURE__ */ jsx("div", { className: "ccusage-row-bar-fill", style: { width: `${barPct}%`, background: theme.accent } }) })
        ]
      }
    ),
    expanded && models.length > 0 && /* @__PURE__ */ jsx("div", { style: { padding: "4px 12px 8px 24px" }, children: models.map((m) => /* @__PURE__ */ jsxs("div", { style: { display: "flex", justifyContent: "space-between", padding: "3px 0", fontSize: "11px" }, children: [
      /* @__PURE__ */ jsx("span", { className: "ccusage-model-tag", style: { background: theme.bgTertiary, color: theme.textSecondary }, children: shortModel(m.modelName) }),
      /* @__PURE__ */ jsxs("span", { style: { fontFamily: "monospace", color: theme.textSecondary }, children: [
        "$",
        fmt(m.cost)
      ] })
    ] }, m.modelName)) })
  ] });
}
function TabContent({ data, tab, theme }) {
  const entries = tab === "daily" ? data.daily : tab === "weekly" ? data.weekly : data.monthly;
  const totals = tab === "daily" ? data.dailyTotals : tab === "weekly" ? data.weeklyTotals : data.monthlyTotals;
  if (entries.length === 0) {
    return /* @__PURE__ */ jsxs("div", { className: "ccusage-empty", children: [
      "No ",
      tab,
      " data available."
    ] });
  }
  const maxCost = Math.max(...entries.map((e) => e.totalCost));
  const recent = [...entries].reverse().slice(0, 30);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    totals && /* @__PURE__ */ jsx(TotalsCards, { totals, theme }),
    /* @__PURE__ */ jsx("div", { className: "ccusage-section-title", style: { color: theme.textMuted }, children: tab === "daily" ? "Recent Days" : tab === "weekly" ? "Recent Weeks" : "Recent Months" }),
    recent.map((entry) => {
      const label = "date" in entry ? entry.date.slice(5) : "week" in entry ? entry.week : entry.month;
      return /* @__PURE__ */ jsx(
        EntryRow,
        {
          label,
          cost: entry.totalCost,
          tokens: entry.totalTokens,
          maxCost,
          theme,
          models: entry.modelBreakdowns
        },
        label
      );
    })
  ] });
}
function UsageModal({
  data,
  status,
  error,
  onRefresh,
  onClose
}) {
  const themeRaw = useTheme();
  const theme = themeRaw ?? {
    bgPrimary: "#1e1e1e",
    bgSecondary: "#252525",
    bgTertiary: "#2d2d2d",
    textPrimary: "#cccccc",
    textSecondary: "#999999",
    textMuted: "#666666",
    border: "#404040",
    accent: "#007acc",
    accentHover: "#005a9e",
    action: "#007acc",
    actionText: "#ffffff",
    error: "#f44747",
    success: "#89d185"
  };
  const [tab, setTab] = useState("daily");
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  const tabs = [
    { key: "daily", label: "Daily" },
    { key: "weekly", label: "Weekly" },
    { key: "monthly", label: "Monthly" }
  ];
  return /* @__PURE__ */ jsx("div", { className: "ccusage-overlay", onClick: onClose, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: "ccusage-modal",
      style: { background: theme.bgPrimary, border: `1px solid ${theme.border}`, color: theme.textPrimary },
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsxs("div", { className: "ccusage-header", style: { borderBottom: `1px solid ${theme.border}` }, children: [
          /* @__PURE__ */ jsxs("div", { className: "ccusage-header-left", children: [
            /* @__PURE__ */ jsxs("svg", { width: 14, height: 14, viewBox: "0 0 24 24", fill: "none", stroke: theme.accent, strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
              /* @__PURE__ */ jsx("line", { x1: "18", y1: "20", x2: "18", y2: "10" }),
              /* @__PURE__ */ jsx("line", { x1: "12", y1: "20", x2: "12", y2: "4" }),
              /* @__PURE__ */ jsx("line", { x1: "6", y1: "20", x2: "6", y2: "14" })
            ] }),
            "CC Usage"
          ] }),
          /* @__PURE__ */ jsx("button", { className: "ccusage-close", onClick: onClose, children: "✕" })
        ] }),
        status === "success" && data && /* @__PURE__ */ jsx("div", { className: "ccusage-tabs", style: { borderBottom: `1px solid ${theme.border}` }, children: tabs.map((t) => {
          const active = tab === t.key;
          return /* @__PURE__ */ jsx(
            "button",
            {
              className: "ccusage-tab",
              style: {
                color: active ? theme.accent : theme.textMuted,
                opacity: active ? 1 : 0.5,
                background: "none",
                border: "none",
                borderBottom: active ? `2px solid ${theme.accent}` : "2px solid transparent",
                borderRadius: 0,
                outline: "none",
                boxShadow: "none"
              },
              onClick: () => setTab(t.key),
              children: t.label
            },
            t.key
          );
        }) }),
        /* @__PURE__ */ jsxs("div", { className: "ccusage-body", children: [
          status === "loading" && /* @__PURE__ */ jsxs("div", { style: { textAlign: "center", padding: "40px 0", color: theme.textMuted }, children: [
            /* @__PURE__ */ jsx("div", { className: "ccusage-spinner", style: { borderTopColor: theme.accent } }),
            /* @__PURE__ */ jsx("div", { style: { marginTop: 12, fontSize: 12 }, children: "Fetching usage data..." })
          ] }),
          status === "error" && !data && /* @__PURE__ */ jsx("div", { style: { background: `${theme.error}15`, color: theme.error, padding: "12px 14px", borderRadius: 6, fontSize: 12 }, children: error || "Failed to fetch usage data." }),
          status === "success" && data && /* @__PURE__ */ jsxs(Fragment, { children: [
            /* @__PURE__ */ jsx(TabContent, { data, tab, theme }),
            error && /* @__PURE__ */ jsx("div", { style: { background: `${theme.error}15`, color: theme.error, padding: "8px 12px", borderRadius: 6, fontSize: 11, marginTop: 12 }, children: error })
          ] }),
          status === "idle" && !data && /* @__PURE__ */ jsx("div", { className: "ccusage-empty", style: { color: theme.textMuted }, children: "Click Refresh to load your Claude Code usage data." })
        ] }),
        /* @__PURE__ */ jsxs("div", { className: "ccusage-footer", style: { borderTop: `1px solid ${theme.border}` }, children: [
          /* @__PURE__ */ jsxs("div", { style: { display: "flex", flexDirection: "column", gap: 4 }, children: [
            /* @__PURE__ */ jsx("span", { style: { color: theme.textMuted }, children: (data == null ? void 0 : data.fetchedAt) ? `Updated ${timeAgo(data.fetchedAt)}` : "Not yet loaded" }),
            /* @__PURE__ */ jsx(
              "a",
              {
                href: "https://github.com/ryoppippi/ccusage",
                target: "_blank",
                rel: "noopener noreferrer",
                style: { color: theme.textMuted, fontSize: 10, opacity: 0.5, textDecoration: "none" },
                onMouseEnter: (e) => {
                  e.target.style.opacity = "0.8";
                },
                onMouseLeave: (e) => {
                  e.target.style.opacity = "0.5";
                },
                children: "powered by ccusage"
              }
            )
          ] }),
          /* @__PURE__ */ jsx(
            "button",
            {
              className: "ccusage-refresh",
              style: { background: theme.action, color: theme.actionText },
              onClick: onRefresh,
              disabled: status === "loading",
              children: status === "loading" ? "Loading..." : "Refresh"
            }
          )
        ] })
      ]
    }
  ) });
}
function ToolbarButton() {
  const { data, status, error, fetchData } = useCcusageData();
  const [open, setOpen] = useState(false);
  useInjectStyles();
  const handleClick = useCallback(() => {
    setOpen(true);
    if (status === "idle" || status === "error") {
      fetchData();
    }
  }, [status, fetchData]);
  return /* @__PURE__ */ jsxs(Fragment, { children: [
    /* @__PURE__ */ jsx("button", { className: "toolbar-icon-btn", title: "CC Usage", onClick: handleClick, children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
      /* @__PURE__ */ jsx("line", { x1: "18", y1: "20", x2: "18", y2: "10" }),
      /* @__PURE__ */ jsx("line", { x1: "12", y1: "20", x2: "12", y2: "4" }),
      /* @__PURE__ */ jsx("line", { x1: "6", y1: "20", x2: "6", y2: "14" })
    ] }) }),
    open && /* @__PURE__ */ jsx(
      UsageModal,
      {
        data,
        status,
        error,
        onRefresh: fetchData,
        onClose: () => setOpen(false)
      }
    )
  ] });
}
const name = "CC Usage";
const slots = {
  toolbar: ToolbarButton
};
function onActivate() {
  console.log("[plugin-ccusage] Plugin activated");
}
function onDeactivate() {
  console.log("[plugin-ccusage] Plugin deactivated");
}
export {
  name,
  onActivate,
  onDeactivate,
  slots
};
