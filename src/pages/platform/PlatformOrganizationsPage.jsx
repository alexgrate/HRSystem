import { useEffect, useState } from "react";
import { X, Plus, Building2, Users, HandCoins } from "lucide-react";
import { platformOrganizationService } from "../../services/platformOrganizationService";
import { useToast, useConfirm } from "../../components/ui/Notifications";

const fmtDate = (v) => (v ? String(v).slice(0, 10) : "—");
const fmtMoney = (n) => `₦${Number(n || 0).toLocaleString()}`;

const StatusBadge = ({ active }) => (
  <span
    className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${
      active ? "bg-emerald-50 text-emerald-700" : "bg-red-50 text-red-700"
    }`}
  >
    {active ? "Active" : "Inactive"}
  </span>
);

const inputCls = "mt-1 w-full h-10 rounded-xl border border-line bg-transparent px-3 text-sm text-ink-2 outline-none focus:border-brand";
const labelCls = "text-xs font-semibold uppercase tracking-wider text-ink-muted";

function OrgFormFields({ form, setForm, disabled = {} }) {
  return (
    <div className="grid gap-3 sm:grid-cols-2">
      <div>
        <label className={labelCls}>Organization name</label>
        <input className={inputCls} value={form.name || ""} disabled={disabled.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} required />
      </div>
      <div>
        <label className={labelCls}>Slug</label>
        <input className={inputCls} value={form.slug || ""} disabled={disabled.slug} onChange={(e) => setForm((f) => ({ ...f, slug: e.target.value }))} required={!disabled.slug} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Description</label>
        <input className={inputCls} value={form.description || ""} onChange={(e) => setForm((f) => ({ ...f, description: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Representative name</label>
        <input className={inputCls} value={form.representative_name || ""} onChange={(e) => setForm((f) => ({ ...f, representative_name: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Representative title</label>
        <input className={inputCls} value={form.representative_title || ""} onChange={(e) => setForm((f) => ({ ...f, representative_title: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Contact email</label>
        <input type="email" className={inputCls} value={form.contact_email || ""} onChange={(e) => setForm((f) => ({ ...f, contact_email: e.target.value }))} />
      </div>
      <div>
        <label className={labelCls}>Contact phone</label>
        <input className={inputCls} value={form.contact_phone || ""} onChange={(e) => setForm((f) => ({ ...f, contact_phone: e.target.value }))} />
      </div>
      <div className="sm:col-span-2">
        <label className={labelCls}>Address</label>
        <input className={inputCls} value={form.address || ""} onChange={(e) => setForm((f) => ({ ...f, address: e.target.value }))} />
      </div>
    </div>
  );
}

function CreateOrganizationModal({ onClose, onCreated }) {
  const toast = useToast();
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const submit = async (e) => {
    e.preventDefault();
    if (saving) return;
    if (!form.name?.trim() || !form.slug?.trim()) {
      setError("Name and slug are required.");
      return;
    }
    setSaving(true);
    setError("");
    try {
      await platformOrganizationService.create(form);
      toast.success("Organization created.");
      onCreated();
      onClose();
    } catch (err) {
      setError(err?.error?.message || err?.message || "Failed to create organization.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink">New organization</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && <div className="rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">{error}</div>}
          <OrgFormFields form={form} setForm={setForm} />
          <div className="flex justify-end gap-2 pt-2">
            <button type="button" onClick={onClose} className="h-11 rounded-xl border border-line px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 rounded-xl bg-brand px-4 text-sm font-semibold text-white disabled:opacity-60">
              {saving ? "Creating..." : "Create organization"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function OrganizationDrawer({ orgId, onClose, onChanged }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [detail, setDetail] = useState(null);
  const [loading, setLoading] = useState(true);
  const [form, setForm] = useState({});
  const [saving, setSaving] = useState(false);
  const [busy, setBusy] = useState(false);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    platformOrganizationService
      .get(orgId)
      .then((org) => {
        if (stale) return;
        setDetail(org);
        setForm({
          name: org.name,
          slug: org.slug,
          description: org.description || "",
          representative_name: org.representative_name || "",
          representative_title: org.representative_title || "",
          contact_email: org.contact_email || "",
          contact_phone: org.contact_phone || "",
          address: org.address || "",
        });
      })
      .catch((err) => toast.error(err?.error?.message || err?.message || "Couldn't load organization."))
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [orgId]);

  const save = async () => {
    if (saving) return;
    setSaving(true);
    try {
      const updated = await platformOrganizationService.update(orgId, form);
      setDetail((d) => ({ ...d, ...updated }));
      toast.success("Organization updated.");
      onChanged();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to update organization.");
    } finally {
      setSaving(false);
    }
  };

  const toggleActive = async () => {
    if (busy || !detail) return;
    if (detail.is_active) {
      const ok = await confirm({
        title: "Deactivate this organization?",
        message: `Every employee of ${detail.name} will immediately be blocked from logging in.`,
        confirmLabel: "Deactivate",
        danger: true,
      });
      if (!ok) return;
    }
    setBusy(true);
    try {
      const updated = detail.is_active
        ? await platformOrganizationService.deactivate(orgId)
        : await platformOrganizationService.activate(orgId);
      setDetail((d) => ({ ...d, ...updated }));
      toast.success(detail.is_active ? "Organization deactivated." : "Organization activated.");
      onChanged();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to update organization status.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
      <div className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-lg flex-col bg-card shadow-2xl">
        <div className="flex items-center justify-between gap-3 border-b border-line-soft p-4">
          <div className="min-w-0">
            <h3 className="truncate font-semibold text-ink">{detail?.name || "Organization"}</h3>
            {detail && <StatusBadge active={detail.is_active} />}
          </div>
          <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken"><X className="h-4 w-4" /></button>
        </div>

        {loading ? (
          <div className="flex-1 p-6 text-center text-sm text-ink-muted">Loading…</div>
        ) : !detail ? (
          <div className="flex-1 p-6 text-center text-sm text-ink-faint">Organization not found.</div>
        ) : (
          <div className="flex-1 space-y-5 overflow-y-auto p-5">
            <div className="grid grid-cols-3 gap-3">
              <div className="rounded-xl border border-line p-3 text-center">
                <Users className="mx-auto h-4 w-4 text-ink-faint" />
                <div className="mt-1 text-lg font-bold text-ink">{detail.stats?.total_employees ?? 0}</div>
                <div className="text-[10px] uppercase text-ink-faint">Employees</div>
              </div>
              <div className="rounded-xl border border-line p-3 text-center">
                <Building2 className="mx-auto h-4 w-4 text-ink-faint" />
                <div className="mt-1 text-lg font-bold text-ink">{detail.stats?.department_count ?? 0}</div>
                <div className="text-[10px] uppercase text-ink-faint">Departments</div>
              </div>
              <div className="rounded-xl border border-line p-3 text-center">
                <HandCoins className="mx-auto h-4 w-4 text-ink-faint" />
                <div className="mt-1 text-lg font-bold text-ink">{detail.stats?.loan_count ?? 0}</div>
                <div className="text-[10px] uppercase text-ink-faint">Loans</div>
              </div>
            </div>
            <p className="text-xs text-ink-faint">
              {fmtMoney(detail.stats?.loan_volume)} total loan volume · created {fmtDate(detail.created_at)}
              {!detail.is_active && detail.deactivated_at && <> · deactivated {fmtDate(detail.deactivated_at)}{detail.deactivated_reason ? ` (${detail.deactivated_reason})` : ""}</>}
            </p>

            <div className="border-t border-line-soft pt-4">
              <OrgFormFields form={form} setForm={setForm} disabled={{ slug: true }} />
              <div className="mt-4 flex flex-wrap gap-2">
                <button onClick={save} disabled={saving} className="h-10 rounded-xl bg-brand px-4 text-xs font-semibold text-white disabled:opacity-60">
                  {saving ? "Saving..." : "Save changes"}
                </button>
                <button
                  onClick={toggleActive}
                  disabled={busy}
                  className={`h-10 rounded-xl px-4 text-xs font-semibold disabled:opacity-60 ${
                    detail.is_active ? "border border-red-200 bg-red-50 text-red-700 hover:bg-red-100" : "bg-emerald-600 text-white hover:bg-emerald-700"
                  }`}
                >
                  {busy ? "Working..." : detail.is_active ? "Deactivate organization" : "Activate organization"}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </>
  );
}

export default function PlatformOrganizationsPage() {
  const [orgs, setOrgs] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);
  const [showCreate, setShowCreate] = useState(false);
  const [tick, setTick] = useState(0);

  useEffect(() => {
    let stale = false;
    setLoading(true);
    platformOrganizationService
      .list()
      .then((rows) => { if (!stale) setOrgs(Array.isArray(rows) ? rows : []); })
      .catch((err) => console.error("[Platform] Failed to load organizations:", err))
      .finally(() => { if (!stale) setLoading(false); });
    return () => { stale = true; };
  }, [tick]);

  const refresh = () => setTick((t) => t + 1);

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Organizations</h1>
          <p className="text-sm text-ink-muted">Every organization on the platform, with representative/contact info and status.</p>
        </div>
        <button
          onClick={() => setShowCreate(true)}
          className="inline-flex items-center gap-1.5 rounded-xl bg-brand px-4 py-2.5 text-xs font-semibold text-white shadow-sm"
        >
          <Plus className="h-3.5 w-3.5" /> New organization
        </button>
      </div>

      <div className="overflow-x-auto rounded-2xl border border-line/80 bg-card shadow-sm">
        <table className="w-full text-sm">
          <thead className="border-b border-line-soft bg-sunken/40 text-left text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
            <tr>
              <th className="px-4 py-3">Organization</th>
              <th className="px-4 py-3">Representative</th>
              <th className="px-4 py-3">Contact</th>
              <th className="px-4 py-3 text-right">Employees</th>
              <th className="px-4 py-3 text-right">Active loans</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Created</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-line-soft">
            {loading ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-muted">Loading organizations…</td></tr>
            ) : orgs.length === 0 ? (
              <tr><td colSpan={7} className="px-4 py-8 text-center text-ink-faint">No organizations yet.</td></tr>
            ) : (
              orgs.map((org) => (
                <tr key={org.id} onClick={() => setSelectedId(org.id)} className="cursor-pointer hover:bg-sunken/40">
                  <td className="px-4 py-3">
                    <div className="font-semibold text-ink">{org.name}</div>
                    <div className="text-xs text-ink-faint">{org.slug}</div>
                  </td>
                  <td className="px-4 py-3 text-ink-2">{org.representative_name || "—"}</td>
                  <td className="px-4 py-3 text-ink-2">{org.contact_email || "—"}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{org.employee_count}</td>
                  <td className="px-4 py-3 text-right text-ink-2">{org.active_loan_count}</td>
                  <td className="px-4 py-3"><StatusBadge active={org.is_active} /></td>
                  <td className="px-4 py-3 text-ink-faint">{fmtDate(org.created_at)}</td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {selectedId && (
        <OrganizationDrawer orgId={selectedId} onClose={() => setSelectedId(null)} onChanged={refresh} />
      )}
      {showCreate && (
        <CreateOrganizationModal onClose={() => setShowCreate(false)} onCreated={refresh} />
      )}
    </div>
  );
}
