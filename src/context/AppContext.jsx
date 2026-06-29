import React, { useContext, createContext, useState, useEffect, useMemo } from "react";
import api from "../lib/api";

const AppCtx = createContext(null);

export function AppProvider({ children }) {
    const [token, setToken] = useState(localStorage.getItem("token") || null);
    const [user, setUser] = useState(() => {
        const savedUser = localStorage.getItem("user");
        return savedUser ? JSON.parse(savedUser) : null;
    });
    const [loading, setLoading] = useState(true);

    useEffect(() => {
        const verifyActiveSession = async () => {
            if (token && !user) {
                try {
                    const res = await api.get("/api/auth/me");
                    const profile = res.data?.data || res.data;
                    
                    const userSession = {
                        id: profile.id,
                        email: profile.email,
                        name: profile.email.split('@')[0],
                        role: "Employee",
                        tenantId: profile.organization_id
                    };
                    
                    localStorage.setItem("user", JSON.stringify(userSession));
                    setUser(userSession);
                } catch (e) {
                    console.error("Session restoration failed:", e);
                    logout();
                }
            }
            setLoading(false);
        };
        verifyActiveSession();
    }, [token, user]);

    const login = (newToken, userProfile) => {
        localStorage.setItem("token", newToken);
        localStorage.setItem("user", JSON.stringify(userProfile));
        setToken(newToken);
        setUser(userProfile);
    };

    const logout = () => {
        localStorage.removeItem("token");
        localStorage.removeItem("user");
        setToken(null);
        setUser(null);
    };

    const value = useMemo(() => ({
        token,
        user,
        loading,
        login,
        logout,
    }), [token, user, loading]);

    return (
        <AppCtx.Provider value={value}> 
            {children}
        </AppCtx.Provider>
    );
}

export function useApp() {
    const ctx = useContext(AppCtx);
    if (!ctx) throw new Error("useApp must be used within AppProvider");
    return ctx;
}
