import React, { createContext, useContext, useState, useCallback, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

let idSeq = 0;

const TOAST_STYLES = {
  success: { Icon: CheckCircle2, ring: "ring-emerald-200", icon: "text-emerald-600", bar: "bg-emerald-500" },
  error: { Icon: AlertCircle, ring: "ring-red-200", icon: "text-red-600", bar: "bg-red-500" },
  info: { Icon: Info, ring: "ring-slate-200", icon: "text-[#4f1a60]", bar: "bg-[#4f1a60]" },
};

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolver = useRef(null);

  const dismiss = useCallback((id) => setToasts((t) => t.filter((x) => x.id !== id)), []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, type, message: String(message ?? "") }]);
      const ttl = opts.duration ?? (type === "error" ? 6000 : 4000);
      if (ttl) setTimeout(() => dismiss(id), ttl);
      return id;
    },
    [dismiss]
  );

  const toast = useMemo(
    () => ({
      success: (m, o) => push("success", m, o),
      error: (m, o) => push("error", m, o),
      info: (m, o) => push("info", m, o),
    }),
    [push]
  );

  const confirm = useCallback(
    (opts = {}) =>
      new Promise((resolve) => {
        resolver.current = resolve;
        setConfirmState({
          title: opts.title || "Are you sure?",
          message: opts.message || "",
          confirmLabel: opts.confirmLabel || "Confirm",
          cancelLabel: opts.cancelLabel || "Cancel",
          danger: !!opts.danger,
        });
      }),
    []
  );

  const closeConfirm = (result) => {
    setConfirmState(null);
    if (resolver.current) {
      resolver.current(result);
      resolver.current = null;
    }
  };

  return (
    <ToastCtx.Provider value={toast}>
      <ConfirmCtx.Provider value={confirm}>
        {children}
        {createPortal(
          <>
            <div className="pointer-events-none fixed right-4 top-4 z-[100] flex w-[calc(100%-2rem)] max-w-sm flex-col gap-2">
              <AnimatePresence initial={false}>
                {toasts.map((t) => {
                  const s = TOAST_STYLES[t.type] || TOAST_STYLES.info;
                  const Icon = s.Icon;
                  return (
                    <motion.div
                      key={t.id}
                      layout
                      initial={{ opacity: 0, x: 40, scale: 0.98 }}
                      animate={{ opacity: 1, x: 0, scale: 1 }}
                      exit={{ opacity: 0, x: 40, scale: 0.98 }}
                      transition={{ type: "spring", stiffness: 400, damping: 32 }}
                      className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-slate-200/80 bg-white p-3.5 pr-9 shadow-lg ring-1 ${s.ring}`}
                    >
                      <span className={`absolute left-0 top-0 h-full w-1 ${s.bar}`} />
                      <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${s.icon}`} />
                      <p className="text-sm leading-snug text-slate-700">{t.message}</p>
                      <button
                        onClick={() => dismiss(t.id)}
                        className="absolute right-2 top-2 rounded-md p-1 text-slate-400 hover:bg-slate-100 hover:text-slate-600"
                        aria-label="Dismiss"
                      >
                        <X className="h-3.5 w-3.5" />
                      </button>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            <AnimatePresence>
              {confirmState && (
                <motion.div
                  initial={{ opacity: 0 }}
                  animate={{ opacity: 1 }}
                  exit={{ opacity: 0 }}
                  className="fixed inset-0 z-[110] flex items-center justify-center bg-slate-900/40 p-4 backdrop-blur-sm"
                  onClick={() => closeConfirm(false)}
                >
                  <motion.div
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm rounded-2xl bg-white p-6 shadow-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${confirmState.danger ? "bg-red-50 text-red-600" : "bg-[#4f1a60]/10 text-[#4f1a60]"}`}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 className="text-base font-bold text-slate-900">{confirmState.title}</h3>
                        {confirmState.message && <p className="mt-1 text-sm text-slate-500">{confirmState.message}</p>}
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button onClick={() => closeConfirm(false)} className="h-10 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-600 hover:bg-slate-50">
                        {confirmState.cancelLabel}
                      </button>
                      <button
                        onClick={() => closeConfirm(true)}
                        className={`h-10 rounded-xl px-4 text-sm font-semibold text-white ${confirmState.danger ? "bg-red-600 hover:bg-red-700" : "bg-[#4f1a60] hover:bg-[#3d1248]"}`}
                      >
                        {confirmState.confirmLabel}
                      </button>
                    </div>
                  </motion.div>
                </motion.div>
              )}
            </AnimatePresence>
          </>,
          document.body
        )}
      </ConfirmCtx.Provider>
    </ToastCtx.Provider>
  );
}

export function useToast() {
  const ctx = useContext(ToastCtx);
  if (!ctx) throw new Error("useToast must be used within NotificationProvider");
  return ctx;
}

export function useConfirm() {
  const ctx = useContext(ConfirmCtx);
  if (!ctx) throw new Error("useConfirm must be used within NotificationProvider");
  return ctx;
}
