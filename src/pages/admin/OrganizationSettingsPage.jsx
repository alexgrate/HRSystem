import { useState, useEffect, useRef, useMemo, useCallback } from "react";
import { motion, AnimatePresence, useReducedMotion } from "framer-motion";
import { Building2, Palette, Globe, Save, Upload, X, ImageIcon, RotateCcw, CheckCircle2 } from "lucide-react";
import { configService } from "../../services/configService";
import { useConfig } from "../../context/ConfigContext";
import { usePermissions } from "../../context/PermissionContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { getInitials } from "../../utils/employee";

const THEME_MODES = [
  { value: "light", label: "Light" },
  { value: "dark", label: "Dark" },
  { value: "auto", label: "Match system" },
];
const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

// Only settings the application actually consumes are surfaced here. Fields that
// were stored but never enforced anywhere (2FA, session timeout, timezone,
// date/language, legal name, and the *_requires_approval / self-service toggles)
// were removed rather than shown as controls that do nothing. Everything below is
// verified LIVE: org name + logo drive the sidebar/app shell, favicon drives the
// browser tab, the three colors + theme drive branding via ConfigContext, and
// currency drives money formatting across payroll/loans/ESS.
const DEFAULTS = {
  organization_name: "",
  logo_url: "",
  favicon_url: "",
  primary_color: "#4f1a60",
  secondary_color: "#8a2da8",
  accent_color: "#e9a8ff",
  theme_mode: "light",
  currency: "NGN",
};
const KEPT_KEYS = Object.keys(DEFAULTS);

// Extract only the fields this page owns from a full config object, so dirty
// detection and the save payload never drift onto unrelated stored columns.
const pickKept = (cfg) => {
  const out = { ...DEFAULTS };
  if (cfg) for (const k of KEPT_KEYS) if (cfg[k] != null) out[k] = cfg[k];
  return out;
};

const HEX_RE = /^#[0-9a-fA-F]{6}$/;

const Section = ({ icon: Icon, title, subtitle, children }) => (
  <section className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm sm:p-6">
    <div className="flex items-center gap-3 border-b border-line-soft pb-4">
      <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-[18px] w-[18px]" aria-hidden="true" />
      </div>
      <div className="min-w-0">
        <h2 className="font-semibold text-ink">{title}</h2>
        {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      </div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
  </section>
);

const labelCls = "text-xs font-semibold text-ink-muted uppercase tracking-wider block";
const inputCls =
  "w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1.5 text-ink focus:border-brand focus:ring-2 focus:ring-brand/25";
const hintCls = "mt-1 text-[11px] text-ink-faint";

function Text({ id, label, value, onChange, disabled, placeholder, hint, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <input id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={inputCls} />
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

// Branding images are stored as data URIs inside the config record (there is no
// server-side asset upload yet), so every byte rides along on every config fetch
// for every user. Everything — including SVG — is rasterized through a canvas and
// re-encoded: the stored value is always a plain bitmap (no SVG markup/scripts
// survive) and its size is bounded.
const OUTPUT_CAP = 300 * 1024;

const fileToDataUri = (file, maxDim) =>
  new Promise((resolve, reject) => {
    if (file.size > 2 * 1024 * 1024) return reject(new Error("Image is too large — pick a file under 2 MB."));
    if (!/^image\/(png|jpe?g|webp|gif|svg\+xml|x-icon|vnd\.microsoft\.icon)$/.test(file.type)) {
      return reject(new Error("Use a PNG, JPG, WebP, SVG or ICO image."));
    }
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const w = img.naturalWidth || maxDim;
      const h = img.naturalHeight || maxDim;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL("image/png");
      const webp = canvas.toDataURL("image/webp");
      const out = webp.startsWith("data:image/webp") && webp.length < png.length ? webp : png;
      if (out.length > OUTPUT_CAP) {
        return reject(new Error("Image is too detailed to store — use a simpler or smaller image."));
      }
      resolve(out);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("That file doesn't look like a valid image."));
    };
    img.src = url;
  });

function ImageField({ id, label, value, onChange, disabled, maxDim, hint }) {
  const inputRef = useRef(null);
  const [error, setError] = useState("");

  const pick = async (file) => {
    if (!file) return;
    try {
      setError("");
      onChange(await fileToDataUri(file, maxDim));
    } catch (err) {
      setError(err.message);
    }
  };

  return (
    <div>
      <span className={labelCls} id={`${id}-label`}>{label}</span>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-sunken">
          {value ? (
            <img src={value} alt={`${label} preview`} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-ink-ghost" aria-hidden="true" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            aria-labelledby={`${id}-label`}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-2 hover:bg-sunken focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" aria-hidden="true" /> {value ? "Replace" : "Upload"}
          </button>
          {value && !disabled && (
            <button
              type="button"
              onClick={() => { setError(""); onChange(""); }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600 focus:outline-none focus:ring-2 focus:ring-red-400/40"
            >
              <X className="h-3.5 w-3.5" aria-hidden="true" /> Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/x-icon,.ico"
          className="hidden"
          aria-hidden="true"
          tabIndex={-1}
          onChange={(e) => { pick(e.target.files?.[0]); e.target.value = ""; }}
        />
      </div>
      <p className={`mt-1 text-[11px] ${error ? "text-red-600" : "text-ink-faint"}`} role={error ? "alert" : undefined}>
        {error || hint}
      </p>
    </div>
  );
}

function Select({ id, label, value, onChange, disabled, options, hint }) {
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <select id={id} value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputCls}>
        {options.map((o) =>
          typeof o === "string"
            ? <option key={o} value={o}>{o}</option>
            : <option key={o.value} value={o.value}>{o.label}</option>
        )}
      </select>
      {hint && <p className={hintCls}>{hint}</p>}
    </div>
  );
}

function Color({ id, label, value, onChange, disabled }) {
  const valid = HEX_RE.test(String(value || ""));
  return (
    <div>
      <label htmlFor={id} className={labelCls}>{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <input
          id={`${id}-swatch`}
          type="color"
          aria-label={`${label} picker`}
          value={valid ? value : "#000000"}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          className="h-11 w-14 shrink-0 cursor-pointer rounded-lg border border-line bg-card p-1 disabled:cursor-not-allowed"
        />
        <input
          id={id}
          value={value ?? ""}
          onChange={(e) => onChange(e.target.value)}
          disabled={disabled}
          aria-invalid={!valid}
          className={`h-11 flex-1 rounded-xl border px-3 font-mono text-sm text-ink outline-none focus:ring-2 focus:ring-brand/25 ${valid ? "border-line focus:border-brand" : "border-red-400 focus:border-red-500"}`}
        />
      </div>
      {!valid && <p className="mt-1 text-[11px] text-red-600" role="alert">Use a 6-digit hex like #4f1a60.</p>}
    </div>
  );
}

const OrganizationSettingsPage = () => {
  const { config, setConfig, refresh, previewTheme, previewBrand } = useConfig();
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();
  const reduce = useReducedMotion();
  const canEdit = can(RESOURCE_CODES.SYSTEM_CONFIG, "update") || can(RESOURCE_CODES.SYSTEM_CONFIG, "manage");

  const [form, setForm] = useState(DEFAULTS);
  const [baseline, setBaseline] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [hasConfig, setHasConfig] = useState(false);
  const [savedAt, setSavedAt] = useState(null);

  useEffect(() => {
    let mounted = true;
    (async () => {
      setLoading(true);
      try {
        const cfg = config || (await configService.get());
        if (mounted && cfg) {
          const kept = pickKept(cfg);
          setForm(kept);
          setBaseline(kept);
          setHasConfig(true);
          if (!config) setConfig(cfg);
        }
      } catch (err) {
        console.error("[OrgSettings] load failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Colors preview live as they change — saving makes them permanent.
  const changeColor = (key, v) => {
    setForm((prev) => {
      const next = { ...prev, [key]: v };
      previewBrand({ primary_color: next.primary_color, secondary_color: next.secondary_color, accent_color: next.accent_color });
      return next;
    });
  };

  // Leaving without saving restores the saved theme and colors. Config lives in a
  // ref so the restore runs ONLY on unmount (a cleanup keyed on [config] would
  // fire on every save with pre-save values, reverting what was just saved).
  const configRef = useRef(config);
  useEffect(() => { configRef.current = config; }, [config]);
  useEffect(() => {
    return () => {
      previewTheme(configRef.current?.theme_mode || "light");
      previewBrand(configRef.current || {});
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const dirty = useMemo(() => KEPT_KEYS.some((k) => form[k] !== baseline[k]), [form, baseline]);

  const invalid = useMemo(() => {
    const bad = [];
    if (!HEX_RE.test(String(form.primary_color))) bad.push("Primary color");
    if (!HEX_RE.test(String(form.secondary_color))) bad.push("Secondary color");
    if (!HEX_RE.test(String(form.accent_color))) bad.push("Accent color");
    return bad;
  }, [form.primary_color, form.secondary_color, form.accent_color]);

  // Warn before leaving the tab/closing with unsaved changes.
  useEffect(() => {
    if (!dirty) return;
    const onBeforeUnload = (e) => { e.preventDefault(); e.returnValue = ""; };
    window.addEventListener("beforeunload", onBeforeUnload);
    return () => window.removeEventListener("beforeunload", onBeforeUnload);
  }, [dirty]);

  const handleDiscard = useCallback(async () => {
    if (!dirty) return;
    const ok = await confirm({
      title: "Discard unsaved changes?",
      message: "This restores the last saved organization settings.",
      confirmLabel: "Discard",
      danger: true,
    });
    if (!ok) return;
    setForm(baseline);
    previewBrand(baseline);
    previewTheme(baseline.theme_mode || "light");
  }, [dirty, baseline, confirm, previewBrand, previewTheme]);

  const handleSave = async (e) => {
    e?.preventDefault?.();
    if (!canEdit || !dirty) return;
    if (invalid.length) {
      toast.error(`Fix ${invalid.join(", ")} before saving.`);
      return;
    }
    setSaving(true);
    try {
      // Identity/image fields are sent RAW (empty string clears) — the API's
      // COALESCE keeps a column only when the value is null, so sending null
      // (the old `|| null`) silently ignored a cleared logo/name.
      const payload = {
        organization_name: form.organization_name ?? "",
        logo_url: form.logo_url ?? "",
        favicon_url: form.favicon_url ?? "",
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        theme_mode: form.theme_mode,
        currency: form.currency,
      };
      const saved = hasConfig ? await configService.update(payload) : await configService.create(payload);
      setHasConfig(true);
      const merged = { ...(config || {}), ...payload, ...(saved || {}) };
      setConfig(merged);
      setBaseline(pickKept(merged));
      setForm(pickKept(merged));
      setSavedAt(Date.now());
      refresh();
      toast.success("Organization settings saved.");
    } catch (err) {
      console.error("[OrgSettings] save failed:", err);
      toast.error(err?.message || "Failed to save settings.");
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="p-12 text-center text-ink-muted bg-card rounded-2xl border border-line-soft">Loading organization settings…</div>;
  }

  const orgName = form.organization_name?.trim();

  return (
    <form onSubmit={handleSave} className="space-y-6 pb-24">
      <div className="flex flex-wrap items-end justify-between gap-4">
        <div className="min-w-0">
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Organization</div>
          <h1 className="mt-1 text-2xl font-bold tracking-tight text-ink sm:text-3xl">Company Settings</h1>
          <p className="mt-1 text-sm text-ink-muted">Branding, identity and currency for your workspace — applied live across the app.</p>
        </div>
        {canEdit && !dirty && savedAt && (
          <div className="inline-flex items-center gap-1.5 rounded-lg bg-emerald-50 px-3 py-1.5 text-xs font-semibold text-emerald-700" aria-live="polite">
            <CheckCircle2 className="h-3.5 w-3.5" aria-hidden="true" /> All changes saved
          </div>
        )}
      </div>

      {!canEdit && (
        <div className="inline-flex items-center gap-2 rounded-lg border border-amber-200 bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700">
          Read-only — you need Manage rights on System Config to edit.
        </div>
      )}

      {/* Live identity preview (how the sidebar renders name + logo, with fallback). */}
      <div className="flex items-center gap-3 rounded-2xl border border-line-soft bg-sunken/50 p-4">
        <div className="flex h-11 w-11 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-card">
          {form.logo_url
            ? <img src={form.logo_url} alt="" className="h-full w-full object-contain" />
            : <span className="text-sm font-bold text-brand">{getInitials(orgName || "Workspace")}</span>}
        </div>
        <div className="min-w-0">
          <div className="truncate text-sm font-semibold text-ink">{orgName || "Workspace"}</div>
          <div className="text-[11px] text-ink-faint">Preview — how your workspace appears in the sidebar</div>
        </div>
      </div>

      <Section icon={Building2} title="Organization" subtitle="Names and logos shown across the workspace.">
        <Text
          id="org-name" label="Organization name" value={form.organization_name}
          onChange={(v) => set("organization_name", v)} disabled={!canEdit} placeholder="Acme Corp" full
          hint="Shown in the sidebar and page headers. Falls back to “Workspace” when empty."
        />
        <ImageField
          id="org-logo" label="Company logo" value={form.logo_url} onChange={(v) => set("logo_url", v)}
          disabled={!canEdit} maxDim={512} hint="PNG, JPG or SVG — shown in the sidebar. Resized and embedded automatically."
        />
        <ImageField
          id="org-favicon" label="Favicon" value={form.favicon_url} onChange={(v) => set("favicon_url", v)}
          disabled={!canEdit} maxDim={64} hint="Square image for the browser tab — shrunk to 64px."
        />
      </Section>

      <Section icon={Palette} title="Branding" subtitle="Applied live across the whole workspace after saving.">
        <Color id="color-primary" label="Primary color" value={form.primary_color} onChange={(v) => changeColor("primary_color", v)} disabled={!canEdit} />
        <Color id="color-secondary" label="Secondary color" value={form.secondary_color} onChange={(v) => changeColor("secondary_color", v)} disabled={!canEdit} />
        <Color id="color-accent" label="Accent color" value={form.accent_color} onChange={(v) => changeColor("accent_color", v)} disabled={!canEdit} />
        <Select
          id="theme-mode" label="Theme mode" value={form.theme_mode}
          onChange={(v) => { set("theme_mode", v); previewTheme(v); }} disabled={!canEdit} options={THEME_MODES}
          hint="“Match system” follows the device’s light/dark preference."
        />
      </Section>

      <Section icon={Globe} title="Localization" subtitle="Regional formatting used across the app.">
        <Select
          id="currency" label="Currency" value={form.currency} onChange={(v) => set("currency", v)}
          disabled={!canEdit} options={CURRENCIES}
          hint="Default currency for payroll, loans and self-service amounts."
        />
      </Section>

      {/* Sticky action bar — appears only when there are unsaved changes. */}
      <AnimatePresence>
        {canEdit && dirty && (
          <motion.div
            initial={reduce ? { opacity: 0 } : { y: 60, opacity: 0 }}
            animate={reduce ? { opacity: 1 } : { y: 0, opacity: 1 }}
            exit={reduce ? { opacity: 0 } : { y: 60, opacity: 0 }}
            transition={{ type: "tween", duration: 0.18 }}
            role="region"
            aria-label="Unsaved changes"
            className="fixed inset-x-0 bottom-0 z-40 border-t border-line bg-card/95 px-4 py-3 shadow-[0_-4px_16px_rgba(0,0,0,0.06)] backdrop-blur sm:px-6"
          >
            <div className="mx-auto flex max-w-5xl flex-wrap items-center justify-between gap-3">
              <span className="text-sm font-medium text-ink-muted" aria-live="polite">
                You have unsaved changes.
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={handleDiscard}
                  disabled={saving}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-sm font-semibold text-ink-muted hover:bg-sunken focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-50"
                >
                  <RotateCcw className="h-4 w-4" aria-hidden="true" /> Discard
                </button>
                <button
                  type="submit"
                  disabled={saving || invalid.length > 0}
                  className="inline-flex items-center gap-2 rounded-lg bg-gradient-to-r from-brand to-brand-2 px-4 py-2 text-sm font-semibold text-white shadow-sm hover:opacity-95 focus:outline-none focus:ring-2 focus:ring-brand/40 disabled:opacity-60"
                >
                  <Save className="h-4 w-4" aria-hidden="true" /> {saving ? "Saving…" : "Save changes"}
                </button>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </form>
  );
};

export default OrganizationSettingsPage;
