import { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { configService } from "../services/configService";

const ConfigCtx = createContext(null);

const shade = (hex, pct) => {
  const m = /^#?([0-9a-f]{6})$/i.exec(String(hex).trim());
  if (!m) return null;
  const n = parseInt(m[1], 16);
  const mix = (v) => Math.round(v * (1 - pct));
  const r = mix((n >> 16) & 255), g = mix((n >> 8) & 255), b = mix(n & 255);
  return `#${((r << 16) | (g << 8) | b).toString(16).padStart(6, "0")}`;
};

const BRAND_VARS = ["--brand-primary", "--brand-secondary", "--brand-accent", "--brand-primary-dark", "--brand-darkest"];

// Ease color changes for ~450ms around a theme/brand switch (skipped when
// the OS asks for reduced motion).
const withThemeTransition = (fn) => {
  const root = document.documentElement;
  if (!window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    root.classList.add("theme-transition");
    window.setTimeout(() => root.classList.remove("theme-transition"), 450);
  }
  fn(root);
};

const applyThemeClass = (dark) =>
  withThemeTransition((root) => root.classList.toggle("dark", dark));

const resolveDark = (mode) =>
  mode === "dark" || (mode === "auto" && window.matchMedia("(prefers-color-scheme: dark)").matches);

// Apply brand colors (with derived shades); falsy values fall back to the
// stylesheet defaults. Returns what was applied, for the boot cache.
const applyBrandVars = ({ primary_color, secondary_color, accent_color } = {}) => {
  const root = document.documentElement.style;
  const applied = {};
  const setOrClear = (name, value) => {
    if (value) root.setProperty(name, value);
    else root.removeProperty(name);
  };
  applied.primary = primary_color || null;
  applied.dark = primary_color ? shade(primary_color, 0.28) : null;
  applied.darkest = primary_color ? shade(primary_color, 0.55) : null;
  applied.secondary = secondary_color || null;
  applied.accent = accent_color || null;
  withThemeTransition(() => {
    setOrClear("--brand-primary", applied.primary);
    setOrClear("--brand-primary-dark", applied.dark);
    setOrClear("--brand-darkest", applied.darkest);
    setOrClear("--brand-secondary", applied.secondary);
    setOrClear("--brand-accent", applied.accent);
  });
  return applied;
};

export function ConfigProvider({ children }) {
  const { user } = useAuth();
  const [config, setConfig] = useState(null);
  const [loading, setLoading] = useState(false);

  const refresh = useCallback(async () => {
    setLoading(true);
    try {
      const cfg = await configService.get();
      setConfig(cfg || null);
    } catch (err) {
      console.error("[Config] Failed to load system configuration:", err);
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    if (user) refresh();
    else setConfig(null);
  }, [user, refresh]);

  // Brand colors. While signed in but config not yet loaded, keep whatever
  // the boot script applied from cache — clearing here would cause a flash.
  useEffect(() => {
    if (!user) {
      const root = document.documentElement.style;
      BRAND_VARS.forEach((v) => root.removeProperty(v));
      localStorage.removeItem("dash_brand");
      return;
    }
    if (!config) return;
    const applied = applyBrandVars(config);
    try { localStorage.setItem("dash_brand", JSON.stringify(applied)); } catch { /* storage full/blocked */ }
  }, [config, user]);

  // Theme mode. Same rule: never un-theme during the loading gap.
  useEffect(() => {
    if (!user) {
      localStorage.removeItem("dash_theme");
      document.documentElement.classList.remove("dark");
      return;
    }
    if (!config) return;
    const mode = config.theme_mode || "light";
    try { localStorage.setItem("dash_theme", mode); } catch { /* ignore */ }
    if (mode === "auto") {
      const mq = window.matchMedia("(prefers-color-scheme: dark)");
      const apply = () => applyThemeClass(mq.matches);
      apply();
      mq.addEventListener("change", apply);
      return () => mq.removeEventListener("change", apply);
    }
    applyThemeClass(mode === "dark");
  }, [config, user]);

  // Apply the organization's favicon to the browser tab once config loads.
  useEffect(() => {
    if (!config?.favicon_url) return;
    let link = document.querySelector("link[rel~='icon']");
    if (!link) {
      link = document.createElement("link");
      link.rel = "icon";
      document.head.appendChild(link);
    }
    link.href = config.favicon_url;
  }, [config?.favicon_url]);

  // Instant previews for Company Settings — apply without saving. The main
  // effects re-assert the saved values whenever config changes/refreshes.
  const previewTheme = useCallback((mode) => applyThemeClass(resolveDark(mode || "light")), []);
  const previewBrand = useCallback((colors) => applyBrandVars(colors || {}), []);

  return (
    <ConfigCtx.Provider value={{ config, loading, refresh, setConfig, previewTheme, previewBrand }}>
      {children}
    </ConfigCtx.Provider>
  );
}

export function useConfig() {
  return (
    useContext(ConfigCtx) || {
      config: null,
      loading: false,
      refresh: () => {},
      previewTheme: () => {},
      previewBrand: () => {},
    }
  );
}
