import React, { useState, useEffect } from "react";
import { Building2, Palette, Globe, ShieldCheck, GitBranch, Save } from "lucide-react";
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
  <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
    <div className="flex items-center gap-3 border-b border-slate-100 pb-4">
      <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-[#4f1a60]/10 text-[#4f1a60]">
        <Icon className="h-4.5 w-4.5" />
      </div>
      <div>
        <h3 className="font-semibold text-slate-900">{title}</h3>
        {subtitle && <p className="text-xs text-slate-500">{subtitle}</p>}
      </div>
    </div>
    <div className="mt-5 grid gap-4 sm:grid-cols-2">{children}</div>
  </div>
);

const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider block";
const inputCls = "w-full h-11 border border-slate-200 bg-white rounded-xl px-3 outline-none mt-1.5 focus:border-[#4f1a60]";

function Text({ label, value, onChange, disabled, placeholder, full }) {
  return (
    <div className={full ? "sm:col-span-2" : ""}>
      <label className={labelCls}>{label}</label>
      <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} placeholder={placeholder} className={inputCls} />
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
        <input type="color" value={value || "#000000"} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-11 w-14 cursor-pointer rounded-lg border border-slate-200 bg-white p-1 disabled:cursor-not-allowed" />
        <input value={value ?? ""} onChange={(e) => onChange(e.target.value)} disabled={disabled} className="h-11 flex-1 rounded-xl border border-slate-200 px-3 font-mono text-sm outline-none focus:border-[#4f1a60]" />
      </div>
    </div>
  );
}

function Toggle({ label, description, value, onChange, disabled }) {
  return (
    <label className={`flex items-start justify-between gap-4 rounded-xl border border-slate-200 p-3 sm:col-span-2 ${disabled ? "opacity-70" : "cursor-pointer"}`}>
      <div>
        <div className="text-sm font-semibold text-slate-800">{label}</div>
        {description && <div className="text-xs text-slate-500">{description}</div>}
      </div>
      <button
        type="button"
        disabled={disabled}
        onClick={() => onChange(!value)}
        className={`relative mt-0.5 h-6 w-11 shrink-0 rounded-full transition-colors ${value ? "bg-[#4f1a60]" : "bg-slate-300"} disabled:cursor-not-allowed`}
        aria-pressed={value}
      >
        <span className={`absolute top-0.5 h-5 w-5 rounded-full bg-white shadow transition-all ${value ? "left-[22px]" : "left-0.5"}`} />
      </button>
    </label>
  );
}

const OrganizationSettingsPage = () => {
  const { config, setConfig, refresh } = useConfig();
  const { can } = usePermissions();
  const toast = useToast();
  const canEdit = can(RESOURCE_CODES.SYSTEM_CONFIG, "update") || can(RESOURCE_CODES.SYSTEM_CONFIG, "manage");

  const [form, setForm] = useState(DEFAULTS);
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  // Whether a config row already exists — decided by what we actually fetched,
  // not by the context (which can lag or fail independently). Getting this
  // wrong makes Save POST a duplicate create for an existing config.
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
          if (!config) setConfig(cfg); // share what we fetched with the rest of the app
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

  const handleSave = async () => {
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
        session_timeout_minutes: Number(form.session_timeout_minutes) || 30,
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
    return <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">Loading organization settings…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">Organization</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Company Settings</h1>
          <p className="mt-1 text-sm text-slate-500">Branding, localization, security and approval rules for your organization.</p>
        </div>
        {canEdit && (
          <button onClick={handleSave} disabled={saving} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-70">
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
        <Text label="Logo URL" value={form.logo_url} onChange={(v) => set("logo_url", v)} disabled={!canEdit} placeholder="https://…/logo.png" />
        <Text label="Favicon URL" value={form.favicon_url} onChange={(v) => set("favicon_url", v)} disabled={!canEdit} placeholder="https://…/favicon.ico" />
      </Section>

      <Section icon={Palette} title="Branding" subtitle="Theme colors (saved now; live theming comes later).">
        <Color label="Primary color" value={form.primary_color} onChange={(v) => set("primary_color", v)} disabled={!canEdit} />
        <Color label="Secondary color" value={form.secondary_color} onChange={(v) => set("secondary_color", v)} disabled={!canEdit} />
        <Color label="Accent color" value={form.accent_color} onChange={(v) => set("accent_color", v)} disabled={!canEdit} />
        <Select label="Theme mode" value={form.theme_mode} onChange={(v) => set("theme_mode", v)} disabled={!canEdit} options={THEME_MODES} />
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
