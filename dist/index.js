import { jsx, jsxs } from "data:text/javascript,export const jsx=window.__SHIPSTUDIO_REACT__.createElement;export const jsxs=window.__SHIPSTUDIO_REACT__.createElement;export const Fragment=window.__SHIPSTUDIO_REACT__.Fragment;";
import { useState } from "data:text/javascript,export default window.__SHIPSTUDIO_REACT__;export const useState=window.__SHIPSTUDIO_REACT__.useState;export const useEffect=window.__SHIPSTUDIO_REACT__.useEffect;export const useCallback=window.__SHIPSTUDIO_REACT__.useCallback;export const useMemo=window.__SHIPSTUDIO_REACT__.useMemo;export const useRef=window.__SHIPSTUDIO_REACT__.useRef;export const useContext=window.__SHIPSTUDIO_REACT__.useContext;export const createElement=window.__SHIPSTUDIO_REACT__.createElement;export const Fragment=window.__SHIPSTUDIO_REACT__.Fragment;";
function ToolbarButton() {
  const [open, setOpen] = useState(false);
  return /* @__PURE__ */ jsx(
    "button",
    {
      className: "toolbar-icon-btn",
      title: "CC Usage",
      onClick: () => setOpen(true),
      children: /* @__PURE__ */ jsxs("svg", { width: "14", height: "14", viewBox: "0 0 24 24", fill: "none", stroke: "currentColor", strokeWidth: "2", children: [
        /* @__PURE__ */ jsx("circle", { cx: "12", cy: "12", r: "10" }),
        /* @__PURE__ */ jsx("path", { d: "M12 8v4M12 16h.01" })
      ] })
    }
  );
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
