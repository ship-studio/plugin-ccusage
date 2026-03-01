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
  throw new Error("Plugin context not available.");
}
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
  const [data, setData] = useState(null);
  const [status, setStatus] = useState("idle");
  const [error, setError] = useState(null);
  useEffect(() => {
    storage.read().then((stored) => {
      if (stored.ccusageData) {
        setData(stored.ccusageData);
        setStatus("success");
      }
    });
  }, []);
  const fetchData = useCallback(async () => {
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
          errors.push(`daily: Failed to parse JSON — ${String(e)}`);
        }
      } else {
        const msg = dailyRes.status === "rejected" ? String(dailyRes.reason) : dailyRes.value.stderr || "Non-zero exit code";
        errors.push(`daily: ${msg}`);
      }
      if (weeklyRes.status === "fulfilled" && weeklyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(weeklyRes.value.stdout);
          weekly = parsed.weekly ?? [];
          weeklyTotals = parsed.totals;
        } catch (e) {
          errors.push(`weekly: Failed to parse JSON — ${String(e)}`);
        }
      } else {
        const msg = weeklyRes.status === "rejected" ? String(weeklyRes.reason) : weeklyRes.value.stderr || "Non-zero exit code";
        errors.push(`weekly: ${msg}`);
      }
      if (monthlyRes.status === "fulfilled" && monthlyRes.value.exit_code === 0) {
        try {
          const parsed = safeParseJson(monthlyRes.value.stdout);
          monthly = parsed.monthly ?? [];
          monthlyTotals = parsed.totals;
        } catch (e) {
          errors.push(`monthly: Failed to parse JSON — ${String(e)}`);
        }
      } else {
        const msg = monthlyRes.status === "rejected" ? String(monthlyRes.reason) : monthlyRes.value.stderr || "Non-zero exit code";
        errors.push(`monthly: ${msg}`);
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
      if (errors.length > 0) {
        setError(`Partial failure:
${errors.join("\n")}`);
      }
      await storage.write({ ccusageData: newData });
    } catch (err) {
      setStatus("error");
      setError(String(err));
    }
  }, [shell, storage]);
  return { data, status, error, fetchData };
}
const STYLE_ID = "ccusage-plugin-styles";
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
function UsageModal({
  data,
  status,
  error,
  onRefresh,
  onClose
}) {
  const theme = useTheme();
  useEffect(() => {
    const handler = (e) => {
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [onClose]);
  return /* @__PURE__ */ jsx("div", { className: "ccusage-overlay", onClick: onClose, children: /* @__PURE__ */ jsxs(
    "div",
    {
      className: "ccusage-modal",
      style: {
        background: theme.bgPrimary,
        border: `1px solid ${theme.border}`,
        color: theme.textPrimary
      },
      onClick: (e) => e.stopPropagation(),
      children: [
        /* @__PURE__ */ jsx("h3", { style: { margin: "0 0 12px 0" }, children: "CC Usage" }),
        status === "loading" && /* @__PURE__ */ jsx("div", { children: "Fetching usage data..." }),
        status === "error" && !data && /* @__PURE__ */ jsx("div", { style: { color: theme.error }, children: error || "An error occurred" }),
        status === "success" && data && /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsxs("div", { children: [
            data.daily.length,
            " day(s), ",
            data.weekly.length,
            " week(s), ",
            data.monthly.length,
            " month(s) loaded"
          ] }),
          data.dailyTotals && /* @__PURE__ */ jsxs("div", { style: { marginTop: 8 }, children: [
            "Total cost: $",
            data.dailyTotals.totalCost.toFixed(2)
          ] }),
          error && /* @__PURE__ */ jsx("div", { style: { color: theme.error, marginTop: 8, fontSize: "0.85em" }, children: error })
        ] }),
        status === "idle" && !data && /* @__PURE__ */ jsx("div", { style: { color: theme.textSecondary }, children: "Click Refresh to load usage data." }),
        /* @__PURE__ */ jsxs("div", { children: [
          /* @__PURE__ */ jsx("button", { onClick: onRefresh, disabled: status === "loading", children: status === "loading" ? "Loading..." : "Refresh" }),
          /* @__PURE__ */ jsx("button", { onClick: onClose, children: "Close" })
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
    /* @__PURE__ */ jsx(
      "button",
      {
        className: "toolbar-icon-btn",
        title: "CC Usage",
        onClick: handleClick,
        children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", strokeLinecap: "round", strokeLinejoin: "round", children: [
          /* @__PURE__ */ jsx("line", { x1: "12", y1: "1", x2: "12", y2: "23" }),
          /* @__PURE__ */ jsx("path", { d: "M17 5H9.5a3.5 3.5 0 0 0 0 7h5a3.5 3.5 0 0 1 0 7H6" })
        ] })
      }
    ),
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
