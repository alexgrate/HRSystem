import { useState, useEffect, useRef } from "react";
import { Building2, Palette, Globe, ShieldCheck, GitBranch, Save, Upload, X, ImageIcon } from "lucide-react";
import { configService } from "../../services/configService";
import { useConfig } from "../../context/ConfigContext";
import { usePermissions } from "../../context/PermissionContext";
import { useToast } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";

const THEME_MODES = ["light", "dark", "auto"];
const CURRENCIES = ["NGN", "USD", "GBP", "EUR", "GHS", "KES", "ZAR"];

const DEFAULTS = {
  organization_name: "",
  organization_legal_name: "",
  logo_url: "",
  favicon_url: "",
  primary_color: "#4f1a60",
  secondary_color: "#8a2da8",
  accent_color: "#e9a8ff",
  theme_mode: "light",
  timezone: "Africa/Lagos",
  date_format: "DD/MM/YYYY",
  currency: "NGN",
  language: "en",
  enable_2fa: false,
  enforce_2fa_for_admins: false,
  session_timeout_minutes: 30,
  allow_self_service_profile_update: true,
  payroll_requires_approval: true,
  leave_requires_approval: true,
  document_upload_requires_approval: true,
};

const Section = ({ icon: Icon, title, subtitle, children }) => (
  <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
    <div className="flex items-center gap-3 border-b border-line-soft pb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-brand/10 text-brand">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h3 className="font-semibold text-ink">{title}</h3>
        {subtitle && <p className="text-xs text-ink-muted">{subtitle}</p>}
      </div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const labelCls = "text-xs font-semibold text-ink-muted uppercase tracking-wider block";
const inputCls = "w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1.5 focus:border-brand";

function Text({ label, value, onChange, disabled, placeholder, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={inputCls} />
    </div>
  );
}

// Branding images are stored as data URIs inside the config record (there is
// no server-side asset upload yet — backend ask), so every byte here rides
// along on every config fetch for every user. Everything — including SVG —
// is therefore rasterized through a canvas and re-encoded: the stored value
// is always a plain bitmap (no SVG markup, scripts or foreignObject survive)
// and its size is bounded.
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
      // SVGs can lack intrinsic dimensions — fall back to the target size.
      const w = img.naturalWidth || maxDim;
      const h = img.naturalHeight || maxDim;
      const scale = Math.min(1, maxDim / Math.max(w, h));
      const canvas = document.createElement("canvas");
      canvas.width = Math.max(1, Math.round(w * scale));
      canvas.height = Math.max(1, Math.round(h * scale));
      canvas.getContext("2d").drawImage(img, 0, 0, canvas.width, canvas.height);
      const png = canvas.toDataURL("image/png");
      const webp = canvas.toDataURL("image/webp");
      // toDataURL silently falls back to PNG for unsupported types — only
      // prefer the webp result when it really is webp, and smaller.
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

function ImageField({ label, value, onChange, disabled, maxDim, hint }) {
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
      <label className={labelCls}>{label}</label>
      <div className="mt-1.5 flex items-center gap-3">
        <div className="flex h-14 w-14 shrink-0 items-center justify-center overflow-hidden rounded-xl border border-line bg-sunken">
          {value ? (
            <img src={value} alt={label} className="h-full w-full object-contain" />
          ) : (
            <ImageIcon className="h-5 w-5 text-ink-ghost" />
          )}
        </div>
        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            disabled={disabled}
            onClick={() => inputRef.current?.click()}
            className="inline-flex items-center gap-1.5 rounded-lg border border-line px-3 py-2 text-xs font-semibold text-ink-2 hover:bg-sunken disabled:cursor-not-allowed disabled:opacity-60"
          >
            <Upload className="h-3.5 w-3.5" /> {value ? "Replace" : "Upload"}
          </button>
          {value && !disabled && (
            <button
              type="button"
              onClick={() => { setError(""); onChange(""); }}
              className="inline-flex items-center gap-1 rounded-lg px-2 py-2 text-xs font-semibold text-ink-muted hover:bg-red-50 hover:text-red-600"
            >
              <X className="h-3.5 w-3.5" /> Remove
            </button>
          )}
        </div>
        <input
          ref={inputRef}
          type="file"
          accept="image/png,image/jpeg,image/webp,image/svg+xml,image/gif,image/x-icon,.ico"
          className="hidden"
          onChange={(e) => {
            pick(e.target.files?.[0]);
            e.target.value = ""; // allow re-picking the same file
          }}
        />
      </div>
      <p className={`mt-1 text-[11px] ${error ? "text-red-600" : "text-ink-faint"}`}>
        {error || hint}
      </p>
    </div>
  );
}

function NumberField({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputCls} />
    </div>
  );
}

function Select({ label, value, onChange, disabled, options }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <select value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className={inputCls}>
        {options.map((o) => <option key={o} value={o}>{o}</option>)}
      </select>
    </div>
  );
}

function Color({ label, value, onChange, disabled }) {
  return (
    <div>
      <label className={labelCls}>{label}</label>
      <div className="mt-1.5 flex items-center gap-2">
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-11 w-14 cursor-pointer rounded-lg border border-line bg-card p-1 disabled:cursor-not-allowed" />
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-11 flex-1 rounded-xl border border-line px-3 font-mono text-sm outline-none focus:border-brand" />
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange, disabled }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-line p-3 sm:col-span-2 ${disabled ? "opacity-70" : "cursor-pointer"}`}>
      <div>
        <div className="text-sm font-semibold text-ink-2">{label}</div>
        {description && <div className="text-xs text-ink-muted">{description}</div>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-brand" : "bg-slate-300"} disabled:cursor-not-allowed`}
        aria-pressed={value}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-card shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

const OrganizationSettingsPage = () => {
  const { config, setConfig, refresh, previewTheme, previewBrand } = useConfig();
  const { can } = usePermissions();
  const toast = useToast();
  const canEdit = can(RESOURCE_CODES.SYSTEM_CONFIG, "update") || can(RESOURCE_CODES.SYSTEM_CONFIG, "manage");

  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  const [hasConfig, setHasConfig] = useState(false);

  useEffect(() => {
    let mounted = true;
    const load = async () => {
      setLoading(true);
      try {
        const cfg = config || (await configService.get());
        if (mounted && cfg) {
          setForm({ ...DEFAULTS, ...cfg });
          setHasConfig(true);
          if (!config) setConfig(cfg);
        }
      } catch (err) {
        console.error("[OrgSettings] load failed:", err);
      } finally {
        if (mounted) setLoading(false);
      }
    };
    load();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  // Colors preview live as you pick them — saving makes them permanent.
  const changeColor = (key, v) => {
    const next = { ...form, [key]: v };
    setForm(next);
    previewBrand({
      primary_color: next.primary_color,
      secondary_color: next.secondary_color,
      accent_color: next.accent_color,
    });
  };

  // Leaving without saving restores the saved theme and colors. The config
  // lives in a ref so the restore runs ONLY on unmount — a cleanup keyed on
  // [config] would also fire on every save (setConfig) with the pre-save
  // closure values, visibly reverting the theme the user just saved.
  const configRef = useRef(config);
  useEffect(() => {
    configRef.current = config;
  }, [config]);
  useEffect(() => {
    return () => {
      previewTheme(configRef.current?.theme_mode || "light");
      previewBrand(configRef.current || {});
    };
    // previewTheme/previewBrand are stable (empty-dep useCallback in ConfigContext).
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async () => {
    // Validate instead of silently coercing (0 or garbage used to become 30).
    const timeoutMinutes = Number(form.session_timeout_minutes);
    if (!Number.isInteger(timeoutMinutes) || timeoutMinutes < 5 || timeoutMinutes > 1440) {
      toast.error("Session timeout must be a whole number between 5 and 1440 minutes.");
      return;
    }
    setSaving(true);
    try {
      const payload = {
        organization_name: form.organization_name || null,
        organization_legal_name: form.organization_legal_name || null,
        logo_url: form.logo_url || null,
        favicon_url: form.favicon_url || null,
        primary_color: form.primary_color,
        secondary_color: form.secondary_color,
        accent_color: form.accent_color,
        theme_mode: form.theme_mode,
        timezone: form.timezone,
        date_format: form.date_format,
        currency: form.currency,
        language: form.language,
        enable_2fa: !!form.enable_2fa,
        enforce_2fa_for_admins: !!form.enforce_2fa_for_admins,
        session_timeout_minutes: timeoutMinutes,
        allow_self_service_profile_update: !!form.allow_self_service_profile_update,
        payroll_requires_approval: !!form.payroll_requires_approval,
        leave_requires_approval: !!form.leave_requires_approval,
        document_upload_requires_approval: !!form.document_upload_requires_approval,
      };
      // Update if a config row exists, otherwise create it.
      const saved = hasConfig ? await configService.update(payload) : await configService.create(payload);
      setHasConfig(true);
      setConfig(saved || { ...(config || {}), ...payload });
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

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Organization</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Company Settings</h1>
          <p className="mt-1 text-sm text-ink-muted">Branding, localization, security and approval rules for your organization.</p>
        </div>
        {canEdit && (
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-70">
            <Save className="h-4 w-4" /> {saving ? "Saving…" : "Save changes"}
          </button>
        )}
      </div>

      {!canEdit && (
        <div className="inline-flex items-center gap-2 rounded-lg bg-amber-50 px-3 py-1.5 text-xs font-semibold text-amber-700 border border-amber-200">
          <ShieldCheck className="h-3.5 w-3.5" /> Read-only — you need Manage rights on System Config to edit.
        </div>
      )}

      <Section icon={Building2} title="Organization" subtitle="Names and logos shown across the workspace.">
        <Text label="Organization name" value={form.organization_name} onChange={(v) => set("organization_name", v)} disabled={!canEdit} placeholder="Acme Corp" />
        <Text label="Legal name" value={form.organization_legal_name} onChange={(v) => set("organization_legal_name", v)} disabled={!canEdit} placeholder="Acme Corporation Ltd" />
        <ImageField
          label="Company logo"
          value={form.logo_url}
          onChange={(v) => set("logo_url", v)}
          disabled={!canEdit}
          maxDim={512}
          hint="PNG, JPG or SVG — shown in the sidebar. Resized and embedded automatically."
        />
        <ImageField
          label="Favicon"
          value={form.favicon_url}
          onChange={(v) => set("favicon_url", v)}
          disabled={!canEdit}
          maxDim={64}
          hint="Square image for the browser tab — shrunk to 64px."
        />
      </Section>

      <Section icon={Palette} title="Branding" subtitle="Applied live across the whole workspace after saving.">
        <Color label="Primary color" value={form.primary_color} onChange={(v) => changeColor("primary_color", v)} disabled={!canEdit} />
        <Color label="Secondary color" value={form.secondary_color} onChange={(v) => changeColor("secondary_color", v)} disabled={!canEdit} />
        <Color label="Accent color" value={form.accent_color} onChange={(v) => changeColor("accent_color", v)} disabled={!canEdit} />
        <Select label="Theme mode" value={form.theme_mode} onChange={(v) => { set("theme_mode", v); previewTheme(v); }} disabled={!canEdit} options={THEME_MODES} />
      </Section>

      <Section icon={Globe} title="Localization">
        <Text label="Timezone" value={form.timezone} onChange={(v) => set("timezone", v)} disabled={!canEdit} placeholder="Africa/Lagos" />
        <Text label="Date format" value={form.date_format} onChange={(v) => set("date_format", v)} disabled={!canEdit} placeholder="DD/MM/YYYY" />
        <Select label="Currency" value={form.currency} onChange={(v) => set("currency", v)} disabled={!canEdit} options={CURRENCIES} />
        <Text label="Language" value={form.language} onChange={(v) => set("language", v)} disabled={!canEdit} placeholder="en" />
      </Section>

      <Section icon={ShieldCheck} title="Security">
        <NumberField label="Session timeout (minutes)" value={form.session_timeout_minutes} onChange={(v) => set("session_timeout_minutes", v)} disabled={!canEdit} />
        <div />
        <Toggle label="Enable two-factor authentication" description="Allow 2FA for all users." value={form.enable_2fa} onChange={(v) => set("enable_2fa", v)} disabled={!canEdit} />
        <Toggle label="Enforce 2FA for admins" description="Require admins to use 2FA." value={form.enforce_2fa_for_admins} onChange={(v) => set("enforce_2fa_for_admins", v)} disabled={!canEdit} />
      </Section>

      <Section icon={GitBranch} title="Approvals & Self-service">
        <Toggle label="Allow self-service profile updates" description="Employees can request changes to their own profile." value={form.allow_self_service_profile_update} onChange={(v) => set("allow_self_service_profile_update", v)} disabled={!canEdit} />
        <Toggle label="Payroll requires approval" value={form.payroll_requires_approval} onChange={(v) => set("payroll_requires_approval", v)} disabled={!canEdit} />
        <Toggle label="Leave requires approval" value={form.leave_requires_approval} onChange={(v) => set("leave_requires_approval", v)} disabled={!canEdit} />
        <Toggle label="Document upload requires approval" value={form.document_upload_requires_approval} onChange={(v) => set("document_upload_requires_approval", v)} disabled={!canEdit} />
      </Section>
    </div>
  );
};

export default OrganizationSettingsPage;
