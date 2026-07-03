import React, { createContext, useContext, useState, useEffect, useCallback } from "react";
import { useAuth } from "./AuthContext";
import { configService } from "../services/configService";

const ConfigCtx = createContext(null);

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

  return (
    <ConfigCtx.Provider value={{ config, loading, refresh, setConfig }}>
      {children}
    </ConfigCtx.Provider>
  );
}

export function useConfig() {
  return useContext(ConfigCtx) || { config: null, loading: false, refresh: () => {} };
}
