import { createContext, useContext, useState, useCallback, useEffect, useMemo, useRef } from "react";
import { createPortal } from "react-dom";
import { motion, AnimatePresence } from "framer-motion";
import { CheckCircle2, AlertCircle, Info, X, AlertTriangle } from "lucide-react";

const ToastCtx = createContext(null);
const ConfirmCtx = createContext(null);

let idSeq = 0;

const TOAST_STYLES = {
  success: { Icon: CheckCircle2, ring: "ring-emerald-200", icon: "text-emerald-600", bar: "bg-emerald-500" },
  error: { Icon: AlertCircle, ring: "ring-red-200", icon: "text-red-600", bar: "bg-red-500" },
  info: { Icon: Info, ring: "ring-line", icon: "text-brand", bar: "bg-brand" },
};

export function NotificationProvider({ children }) {
  const [toasts, setToasts] = useState([]);
  const [confirmState, setConfirmState] = useState(null);
  const resolver = useRef(null);
  const timers = useRef(new Map());

  const dismiss = useCallback((id) => {
    const timer = timers.current.get(id);
    if (timer) {
      clearTimeout(timer);
      timers.current.delete(id);
    }
    setToasts((t) => t.filter((x) => x.id !== id));
  }, []);

  // Clear every pending auto-dismiss timer if the provider unmounts.
  useEffect(() => {
    const map = timers.current;
    return () => map.forEach(clearTimeout);
  }, []);

  const push = useCallback(
    (type, message, opts = {}) => {
      const id = ++idSeq;
      setToasts((t) => [...t, { id, type, message: String(message ?? "") }]);
      const ttl = opts.duration ?? (type === "error" ? 6000 : 4000);
      if (ttl) timers.current.set(id, setTimeout(() => dismiss(id), ttl));
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
        // A second confirm() while one is open would orphan the first
        // caller's promise forever — resolve it as "cancelled" instead.
        if (resolver.current) resolver.current(false);
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

  // While a confirm is open, behave like a real modal: move focus into the
  // dialog (and back where it was on close), keep Tab cycling inside it, and
  // let Escape answer "no" — the form behind the overlay must not keep
  // receiving keystrokes (e.g. the login form during a session takeover).
  const panelRef = useRef(null);
  const cancelBtnRef = useRef(null);
  const restoreFocusRef = useRef(null);
  useEffect(() => {
    if (!confirmState) return;
    restoreFocusRef.current = document.activeElement;
    cancelBtnRef.current?.focus();

    const onKeyDown = (e) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        closeConfirm(false);
        return;
      }
      if (e.key !== "Tab" || !panelRef.current) return;
      const focusables = panelRef.current.querySelectorAll(
        'button, [href], input, select, textarea, [tabindex]:not([tabindex="-1"])'
      );
      if (!focusables.length) return;
      const first = focusables[0];
      const last = focusables[focusables.length - 1];
      if (!panelRef.current.contains(document.activeElement)) {
        e.preventDefault();
        first.focus();
      } else if (e.shiftKey && document.activeElement === first) {
        e.preventDefault();
        last.focus();
      } else if (!e.shiftKey && document.activeElement === last) {
        e.preventDefault();
        first.focus();
      }
    };

    document.addEventListener("keydown", onKeyDown, true);
    return () => {
      document.removeEventListener("keydown", onKeyDown, true);
      restoreFocusRef.current?.focus?.();
    };
  }, [confirmState]);

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
                      className={`pointer-events-auto relative flex items-start gap-3 overflow-hidden rounded-xl border border-line/80 bg-card p-3.5 pr-9 shadow-lg ring-1 ${s.ring}`}
                    >
                      <span className={`absolute left-0 top-0 h-full w-1 ${s.bar}`} />
                      <Icon className={`mt-0.5 h-4.5 w-4.5 shrink-0 ${s.icon}`} />
                      <p className="text-sm leading-snug text-ink-2">{t.message}</p>
                      <button
                        onClick={() => dismiss(t.id)}
                        className="absolute right-2 top-2 rounded-md p-1 text-ink-faint hover:bg-sunken hover:text-ink-muted"
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
                    ref={panelRef}
                    role="alertdialog"
                    aria-modal="true"
                    aria-labelledby="confirm-dialog-title"
                    aria-describedby={confirmState.message ? "confirm-dialog-message" : undefined}
                    initial={{ opacity: 0, scale: 0.96, y: 8 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 0.96, y: 8 }}
                    transition={{ type: "spring", stiffness: 400, damping: 32 }}
                    onClick={(e) => e.stopPropagation()}
                    className="w-full max-w-sm rounded-2xl bg-card p-6 shadow-xl"
                  >
                    <div className="flex items-start gap-3">
                      <div className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full ${confirmState.danger ? "bg-red-50 text-red-600" : "bg-brand/10 text-brand"}`}>
                        <AlertTriangle className="h-5 w-5" />
                      </div>
                      <div className="min-w-0">
                        <h3 id="confirm-dialog-title" className="text-base font-bold text-ink">{confirmState.title}</h3>
                        {confirmState.message && <p id="confirm-dialog-message" className="mt-1 text-sm text-ink-muted">{confirmState.message}</p>}
                      </div>
                    </div>
                    <div className="mt-6 flex justify-end gap-2">
                      <button ref={cancelBtnRef} onClick={() => closeConfirm(false)} className="h-10 rounded-xl border border-line px-4 text-sm font-semibold text-ink-muted hover:bg-sunken">
                        {confirmState.cancelLabel}
                      </button>
                      <button
                        onClick={() => closeConfirm(true)}
                        className={`h-10 rounded-xl px-4 text-sm font-semibold text-white ${confirmState.danger ? "bg-red-600 hover:bg-red-700" : "bg-brand hover:bg-brand-dark"}`}
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
