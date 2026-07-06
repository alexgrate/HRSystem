import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
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

  useEffect(() => {
    const root = document.documentElement.style;
    if (!config) {
      BRAND_VARS.forEach((v) => root.removeProperty(v));
      return;
    }
    const { primary_color, secondary_color, accent_color } = config;
    if (primary_color) {
      root.setProperty("--brand-primary", primary_color);
      const dark = shade(primary_color, 0.28);
      const darkest = shade(primary_color, 0.55);
      if (dark) root.setProperty("--brand-primary-dark", dark);
      if (darkest) root.setProperty("--brand-darkest", darkest);
    }
    if (secondary_color) root.setProperty("--brand-secondary", secondary_color);
    if (accent_color) root.setProperty("--brand-accent", accent_color);
  }, [config]);


  useEffect(() => {
    const root = document.documentElement;
    const mode = config?.theme_mode || "light";
    if (mode === "dark") {
      root.classList.add("dark");
      return;
    }
    if (mode === "light" || !config) {
      root.classList.remove("dark");
      return;
    }
    // auto
    const mq = window.matchMedia("(prefers-color-scheme: dark)");
    const apply = () => root.classList.toggle("dark", mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, [config]);

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

  return (
    <ConfigCtx.Provider value={{ config, loading, refresh, setConfig }}>
      {children}
    </ConfigCtx.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigCtx) || { config: null, loading: false, refresh: () => {} };
}
