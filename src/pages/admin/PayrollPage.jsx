import React, { useEffect, useMemo, useState } from "react";
import { AnimatePresence } from "framer-motion";
import { Plus, X, AlertCircle, Check, CheckCircle2 } from "lucide-react";
import { payrollService, findApprovalRequestId } from "../../services/payrollService";
import { setupService } from "../../services/setupService";
import { usePermissions } from "../../context/PermissionContext";
import { useConfig } from "../../context/ConfigContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { getEmployeeName } from "../../utils/employee";
import api from "../../services/api";

const MONTHS = [
  "January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December",
];

const STATUS_META = {
  draft: { label: "Draft", cls: "bg-slate-100 text-slate-600", step: 0 },
  preview_generated: { label: "Preview ready", cls: "bg-sky-50 text-sky-700", step: 1 },
  submitted_pending_approval: { label: "Awaiting approval", cls: "bg-amber-50 text-amber-700", step: 2 },
  approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700", step: 3 },
  lock_in_pending_approval: { label: "Lock-in pending", cls: "bg-amber-50 text-amber-700", step: 4 },
  locked_in: { label: "Locked in", cls: "bg-violet-50 text-violet-700", step: 5 },
  distribution_pending_approval: { label: "Distribution pending", cls: "bg-amber-50 text-amber-700", step: 6 },
  distributed: { label: "Distributed", cls: "bg-emerald-600 text-white", step: 7 },
};

const MILESTONES = [
  { label: "Preview", at: 1 },
  { label: "Approval", at: 3 },
  { label: "Lock-in", at: 5 },
  { label: "Distribution", at: 7 },
];

const statusMeta = (status) => STATUS_META[status] || { label: status || "Unknown", cls: "bg-slate-100 text-slate-600", step: 0 };

const fmtMoney = (v, currency = "NGN") => {
  const n = Number(v) || 0;
  return `${currency === "NGN" ? "₦" : `${currency} `}${n.toLocaleString()}`;
};


const actionsForStatus = (status) => {
  switch (status) {
    case "draft":
    case "preview_generated":
      return [{ key: "submit", label: "Submit for approval", perm: "update", confirmMsg: "Submit this payroll run for approval?", exec: (id) => payrollService.submitRun(id) }];
    case "submitted_pending_approval":
      return [{ key: "approve", label: "Approve payroll", perm: "manage", approve: true, exec: (id, aid, c) => payrollService.approveRun(id, aid, c) }];
    case "approved":
      return [{ key: "lock", label: "Request lock-in", perm: "update", confirmMsg: "Request lock-in? A locked run can no longer be adjusted.", exec: (id) => payrollService.requestLockIn(id) }];
    case "lock_in_pending_approval":
      return [{ key: "approve-lock", label: "Approve lock-in", perm: "manage", approve: true, exec: (id, aid, c) => payrollService.approveLockIn(id, aid, c) }];
    case "locked_in":
      return [{ key: "distribute", label: "Request distribution", perm: "update", confirmMsg: "Request distribution? Employees will be notified of their payslips once approved.", exec: (id) => payrollService.requestDistribution(id) }];
    case "distribution_pending_approval":
      return [{ key: "approve-dist", label: "Approve distribution", perm: "manage", approve: true, exec: (id, aid, c) => payrollService.approveDistribution(id, aid, c) }];
    default:
      return [];
  }
};

const PayrollPage = () => {
  const { can } = usePermissions();
  const { config } = useConfig();
  const toast = useToast();
  const confirm = useConfirm();

  const [runs, setRuns] = useState([]);
  const [loading, setLoading] = useState(true);
  const [selectedId, setSelectedId] = useState(null);

  const [detailState, setDetailState] = useState({ forId: null, data: null });
  const [adjustments, setAdjustments] = useState([]);
  const [staff, setStaff] = useState([]);
  const [payGroups, setPayGroups] = useState([]);

  const [showNewRun, setShowNewRun] = useState(false);
  const [approveModal, setApproveModal] = useState(null);
  const [showAdjustment, setShowAdjustment] = useState(false);
  const [busy, setBusy] = useState(false);

  const canCreate = can(RESOURCE_CODES.PAYROLL, "create");
  const canUpdate = can(RESOURCE_CODES.PAYROLL, "update");
  const canManage = can(RESOURCE_CODES.PAYROLL, "manage");

  const detail = selectedId && detailState.forId === selectedId ? detailState.data : null;
  const detailLoading = !!selectedId && detailState.forId !== selectedId;

  const selectedRun = useMemo(() => {
    const fromDetail = detail?.run || (detail?.id ? detail : null);
    return fromDetail || runs.find((r) => r.id === selectedId) || null;
  }, [detail, runs, selectedId]);

  const loadRuns = async () => {
    try {
      const list = await payrollService.listRuns();
      setRuns(list);
      return list;
    } catch (err) {
      console.error("[Payroll] Failed to load runs:", err);
      toast.error(err?.message || "Couldn't load payroll runs.");
      return [];
    } finally {
      setLoading(false);
    }
  };

  const loadAdjustments = async () => {
    try {
      setAdjustments(await payrollService.listAdjustments());
    } catch (err) {
      console.error("[Payroll] Failed to load adjustments:", err);
    }
  };

  useEffect(() => {
    let stale = false;
    loadRuns();
    loadAdjustments();
    (async () => {
      try {
        const res = await api.get("/api/users/?page=1&limit=100");
        if (!stale) setStaff(Array.isArray(res) ? res : res?.users || []);
      } catch (err) {
        console.error("[Payroll] Staff list unavailable:", err);
      }
    })();
    (async () => {
      try {
        const groups = await setupService.getPayGroups();
        if (!stale) setPayGroups(Array.isArray(groups) ? groups : []);
      } catch (err) {
        console.error("[Payroll] Pay groups unavailable:", err);
      }
    })();
    return () => { stale = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Load run detail (which should carry the pending approval_request_id).
  useEffect(() => {
    if (!selectedId) return;
    let stale = false;
    payrollService.getRun(selectedId)
      .then((res) => { if (!stale) setDetailState({ forId: selectedId, data: res }); })
      .catch((err) => {
        console.error("[Payroll] Failed to load run detail:", err);
        if (!stale) setDetailState({ forId: selectedId, data: null });
      });
    return () => { stale = true; };
  }, [selectedId]);

  const refreshAfterAction = async () => {
    await Promise.all([loadRuns(), loadAdjustments()]);
    if (selectedId) {
      try {
        setDetailState({ forId: selectedId, data: await payrollService.getRun(selectedId) });
      } catch { /* keep old detail */ }
    }
  };

  const runPlainAction = async (action) => {
    if (action.confirmMsg) {
      const ok = await confirm({ title: action.label, message: action.confirmMsg, confirmLabel: action.label });
      if (!ok) return;
    }
    setBusy(true);
    try {
      await action.exec(selectedRun.id);
      toast.success(`${action.label} — done.`);
      await refreshAfterAction();
    } catch (err) {
      console.error("[Payroll] Action failed:", err);
      toast.error(err?.message || `${action.label} failed.`);
    } finally {
      setBusy(false);
    }
  };

  const runApproveAction = async (comment) => {
    const { action, target, id } = approveModal;
    const source = target === "adjustment" ? adjustments.find((a) => a.id === id) : detail;
    const approvalRequestId = findApprovalRequestId(source);
    if (!approvalRequestId) {
      toast.error("The pending approval request id isn't in the API response — ask the backend to include it on the run/adjustment payload.");
      return;
    }
    setBusy(true);
    try {
      await action.exec(id, approvalRequestId, comment);
      toast.success(`${action.label} — done.`);
      setApproveModal(null);
      await refreshAfterAction();
    } catch (err) {
      console.error("[Payroll] Approval failed:", err);
      toast.error(err?.message || `${action.label} failed.`);
    } finally {
      setBusy(false);
    }
  };

  const runAdjustments = useMemo(
    () => (selectedRun ? adjustments.filter((a) => a.payroll_run_id === selectedRun.id) : []),
    [adjustments, selectedRun]
  );

  const staffName = (employeeId) => {
    const s = staff.find((u) => u.id === employeeId);
    return s ? getEmployeeName(s) : (employeeId ? `${String(employeeId).slice(0, 8)}…` : "—");
  };

  // Runs may carry the pay group as a uuid — show the human name.
  const payGroupName = (v) => payGroups.find((g) => g.id === v || g.name === v)?.name || v;

  // Payslip lines, if the run detail includes them (shape is backend-defined).
  const runLines = useMemo(() => {
    const d = detail || {};
    const candidates = [d.payslips, d.lines, d.items, d.entries, d.run?.payslips, d.run?.lines];
    return candidates.find((c) => Array.isArray(c) && c.length) || [];
  }, [detail]);

  const meta = selectedRun ? statusMeta(selectedRun.status) : null;
  const actions = selectedRun ? actionsForStatus(selectedRun.status).filter((a) => can(RESOURCE_CODES.PAYROLL, a.perm)) : [];
  const adjustable = meta ? meta.step < 5 : false; // no more adjustments once locked in

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">Payroll Engine</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Payroll Processing</h1>
          <p className="mt-1 text-sm text-slate-500">Preview, approve, lock in and distribute monthly payroll per pay group.</p>
        </div>
        {canCreate && (
          <button
            onClick={() => setShowNewRun(true)}
            className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95"
          >
            <Plus className="h-4 w-4" /> Run payroll
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">Loading payroll runs…</div>
      ) : runs.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
          <CheckCircle2 className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No payroll runs yet</h3>
          <p className="mt-1 text-xs text-slate-500">
            Press “Run payroll” to generate a preview for a month and pay group.
          </p>
        </div>
      ) : (
        <div className="grid gap-4 lg:grid-cols-[1fr_1.5fr]">
          {/* Runs list */}
          <div className="space-y-2">
            {runs.map((r) => {
              const m = statusMeta(r.status);
              const isSel = selectedId === r.id;
              return (
                <button
                  key={r.id}
                  onClick={() => setSelectedId(r.id)}
                  className={`w-full rounded-2xl border p-4 text-left transition-all ${
                    isSel ? "border-[#4f1a60] bg-gradient-to-br from-[#4f1a60]/5 to-white shadow-md" : "border-slate-200/80 bg-white hover:border-slate-300"
                  }`}
                >
                  <div className="flex items-center justify-between gap-2">
                    <div className="font-semibold text-slate-900">
                      {MONTHS[(r.month || 1) - 1]} {r.year}
                    </div>
                    <span className={`rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${m.cls}`}>{m.label}</span>
                  </div>
                  <div className="mt-1 text-xs text-slate-500">
                    {payGroupName(r.pay_group)} · {r.total_employees ?? "—"} employees
                  </div>
                  <div className="mt-1 text-sm font-semibold text-[#4f1a60]">{fmtMoney(r.total_net, r.currency)} net</div>
                </button>
              );
            })}
          </div>

          {/* Run detail */}
          <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            {!selectedRun ? (
              <div className="p-12 text-center text-slate-400 text-sm">Select a payroll run to see its lifecycle and actions.</div>
            ) : (
              <div className="p-5 sm:p-6 space-y-5">
                <div className="flex items-start justify-between gap-3 flex-wrap">
                  <div>
                    <h3 className="text-lg font-bold text-slate-900">
                      {MONTHS[(selectedRun.month || 1) - 1]} {selectedRun.year} · {payGroupName(selectedRun.pay_group)}
                    </h3>
                    <span className={`mt-1 inline-block rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${meta.cls}`}>
                      {meta.label}
                    </span>
                  </div>
                  <div className="flex gap-2 flex-wrap">
                    {actions.map((a) => (
                      <button
                        key={a.key}
                        disabled={busy || detailLoading}
                        onClick={() =>
                          a.approve
                            ? setApproveModal({ action: { ...a, exec: a.exec }, target: "run", id: selectedRun.id })
                            : runPlainAction(a)
                        }
                        className="rounded-xl bg-[#4f1a60] px-3.5 py-2 text-xs font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-60"
                      >
                        {a.label}
                      </button>
                    ))}
                    {actions.length === 0 && selectedRun.status === "distributed" && (
                      <span className="inline-flex items-center gap-1.5 rounded-xl bg-emerald-50 px-3 py-2 text-xs font-semibold text-emerald-700">
                        <Check className="h-3.5 w-3.5" /> Fully distributed
                      </span>
                    )}
                  </div>
                </div>

                {/* Pipeline */}
                <div className="flex items-center gap-1">
                  {MILESTONES.map((ms, i) => {
                    const done = meta.step >= ms.at;
                    const active = meta.step === ms.at - 1;
                    return (
                      <React.Fragment key={ms.label}>
                        {i > 0 && <div className={`h-0.5 flex-1 rounded ${done || active ? "bg-[#4f1a60]/50" : "bg-slate-200"}`} />}
                        <div className="flex flex-col items-center gap-1">
                          <div
                            className={`flex h-7 w-7 items-center justify-center rounded-full text-[10px] font-bold ${
                              done ? "bg-[#4f1a60] text-white" : active ? "border-2 border-[#4f1a60] text-[#4f1a60] animate-pulse" : "border border-slate-300 text-slate-400"
                            }`}
                          >
                            {done ? <Check className="h-3.5 w-3.5" /> : i + 1}
                          </div>
                          <span className={`text-[10px] font-semibold ${done || active ? "text-[#4f1a60]" : "text-slate-400"}`}>{ms.label}</span>
                        </div>
                      </React.Fragment>
                    );
                  })}
                </div>

                {/* Totals */}
                <div className="grid grid-cols-3 gap-3">
                  {[
                    ["Employees", selectedRun.total_employees ?? "—"],
                    ["Total gross", fmtMoney(selectedRun.total_gross, selectedRun.currency)],
                    ["Total net", fmtMoney(selectedRun.total_net, selectedRun.currency)],
                  ].map(([label, value]) => (
                    <div key={label} className="rounded-xl border border-slate-200 p-3">
                      <div className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">{label}</div>
                      <div className="mt-0.5 text-sm font-bold text-slate-900">{value}</div>
                    </div>
                  ))}
                </div>

                {/* Payslip lines, when the API provides them */}
                {detailLoading ? (
                  <div className="p-6 text-center text-xs text-slate-400">Loading run details…</div>
                ) : runLines.length > 0 ? (
                  <div className="overflow-x-auto rounded-xl border border-slate-200">
                    <table className="w-full text-sm">
                      <thead className="bg-slate-50/60 text-[10px] uppercase tracking-wider text-slate-500">
                        <tr>
                          <th className="px-3 py-2 text-left font-semibold">Employee</th>
                          <th className="px-3 py-2 text-right font-semibold">Gross</th>
                          <th className="px-3 py-2 text-right font-semibold">Deductions</th>
                          <th className="px-3 py-2 text-right font-semibold">Net</th>
                        </tr>
                      </thead>
                      <tbody>
                        {runLines.map((l, i) => (
                          <tr key={l.id || i} className="border-t border-slate-100">
                            <td className="px-3 py-2 font-medium text-slate-800">
                              {l.employee_name || getEmployeeName(l.employee, null) || staffName(l.employee_id)}
                            </td>
                            <td className="px-3 py-2 text-right">{fmtMoney(l.gross_pay ?? l.gross ?? l.total_gross, selectedRun.currency)}</td>
                            <td className="px-3 py-2 text-right text-red-600">{fmtMoney(l.total_deductions ?? l.deductions, selectedRun.currency)}</td>
                            <td className="px-3 py-2 text-right font-semibold">{fmtMoney(l.net_pay ?? l.net ?? l.total_net, selectedRun.currency)}</td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                ) : null}

                {/* Adjustments */}
                <div className="rounded-xl border border-slate-200">
                  <div className="flex items-center justify-between border-b border-slate-100 px-4 py-3">
                    <div>
                      <h4 className="text-sm font-semibold text-slate-900">Adjustments</h4>
                      <p className="text-[11px] text-slate-500">One-off earnings or deductions for this run{adjustable ? "" : " (locked)"}.</p>
                    </div>
                    {canUpdate && adjustable && (
                      <button
                        onClick={() => setShowAdjustment(true)}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-2.5 py-1.5 text-xs font-semibold text-[#4f1a60] hover:bg-slate-50"
                      >
                        <Plus className="h-3.5 w-3.5" /> Add
                      </button>
                    )}
                  </div>
                  {runAdjustments.length === 0 ? (
                    <div className="p-5 text-center text-xs text-slate-400">No adjustments on this run.</div>
                  ) : (
                    <ul className="divide-y divide-slate-100">
                      {runAdjustments.map((a) => {
                        const st = String(a.status || "draft").toLowerCase();
                        return (
                          <li key={a.id} className="flex items-center justify-between gap-3 px-4 py-3">
                            <div className="min-w-0">
                              <div className="text-sm font-semibold text-slate-900">
                                {staffName(a.employee_id)}
                                <span className={`ml-2 text-xs font-bold ${a.adjustment_type === "deduction" ? "text-red-600" : "text-emerald-600"}`}>
                                  {a.adjustment_type === "deduction" ? "−" : "+"}{fmtMoney(a.amount, selectedRun.currency)}
                                </span>
                              </div>
                              <div className="truncate text-xs text-slate-500">
                                {a.reason} · <span className="uppercase text-[10px] font-bold tracking-wider">{st.replace(/_/g, " ")}</span>
                              </div>
                            </div>
                            <div className="flex shrink-0 gap-1.5">
                              {canUpdate && (st === "draft" || st === "created") && (
                                <button
                                  disabled={busy}
                                  onClick={async () => {
                                    setBusy(true);
                                    try {
                                      await payrollService.submitAdjustment(a.id);
                                      toast.success("Adjustment submitted for approval.");
                                      await refreshAfterAction();
                                    } catch (err) {
                                      toast.error(err?.message || "Couldn't submit adjustment.");
                                    } finally { setBusy(false); }
                                  }}
                                  className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-slate-50"
                                >
                                  Submit
                                </button>
                              )}
                              {canManage && st.includes("pend") && (
                                <>
                                  <button
                                    disabled={busy}
                                    onClick={() => setApproveModal({
                                      action: { label: "Approve adjustment", exec: (id, aid, c) => payrollService.approveAdjustment(id, aid, c) },
                                      target: "adjustment",
                                      id: a.id,
                                    })}
                                    className="rounded-lg bg-emerald-600 px-2.5 py-1 text-xs font-semibold text-white hover:bg-emerald-700"
                                  >
                                    Approve
                                  </button>
                                  <button
                                    disabled={busy}
                                    onClick={() => setApproveModal({
                                      action: { label: "Reject adjustment", exec: (id, aid, c) => payrollService.rejectAdjustment(id, aid, c) },
                                      target: "adjustment",
                                      id: a.id,
                                    })}
                                    className="rounded-lg border border-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-600 hover:bg-red-50 hover:text-red-600"
                                  >
                                    Reject
                                  </button>
                                </>
                              )}
                            </div>
                          </li>
                        );
                      })}
                    </ul>
                  )}
                </div>
              </div>
            )}
          </div>
        </div>
      )}

      <AnimatePresence>
        {showNewRun && (
          <NewRunModal
            defaultCurrency={config?.currency || "NGN"}
            payGroups={payGroups}
            onClose={() => setShowNewRun(false)}
            onCreated={async (created) => {
              setShowNewRun(false);
              const list = await loadRuns();
              const newId = created?.run?.id || created?.id;
              setSelectedId(newId || list[0]?.id || null);
              toast.success("Payroll preview generated.");
            }}
          />
        )}

        {approveModal && (
          <ApproveModal
            title={approveModal.action.label}
            busy={busy}
            onClose={() => setApproveModal(null)}
            onSubmit={runApproveAction}
          />
        )}

        {showAdjustment && selectedRun && (
          <AdjustmentModal
            run={selectedRun}
            staff={staff}
            busy={busy}
            onClose={() => setShowAdjustment(false)}
            onSubmit={async (payload) => {
              setBusy(true);
              try {
                await payrollService.createAdjustment(payload);
                toast.success("Adjustment added.");
                setShowAdjustment(false);
                await refreshAfterAction();
              } catch (err) {
                console.error("[Payroll] Adjustment create failed:", err);
                toast.error(err?.message || "Couldn't add the adjustment.");
              } finally {
                setBusy(false);
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

const inputCls = "w-full h-11 border border-slate-200 bg-white rounded-xl px-3 outline-none mt-1 focus:border-[#4f1a60]";
const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider";

function NewRunModal({ defaultCurrency, payGroups = [], onClose, onCreated }) {
  const now = new Date();
  const [month, setMonth] = useState(now.getMonth() + 1);
  const [year, setYear] = useState(now.getFullYear());
  const [payGroup, setPayGroup] = useState("");
  const [currency, setCurrency] = useState(defaultCurrency);
  const [error, setError] = useState("");
  const [saving, setSaving] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    if (!payGroup) { setError("Pick a pay group — payroll is generated per pay group."); return; }
    setError("");
    setSaving(true);
    try {
      const created = await payrollService.preview({
        month: Number(month),
        year: Number(year),
        pay_group: payGroup,
        currency: currency || undefined,
      });
      await onCreated(created);
    } catch (err) {
      console.error("[Payroll] Preview failed:", err);
      setError(err?.message || "Couldn't generate the payroll preview.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-slate-900">Run payroll</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Month</label>
              <select value={month} onChange={(e) => setMonth(e.target.value)} className={inputCls}>
                {MONTHS.map((m, i) => <option key={m} value={i + 1}>{m}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Year</label>
              <input type="number" min="2000" value={year} onChange={(e) => setYear(e.target.value)} className={inputCls} />
            </div>
          </div>
          <div>
            <label className={labelCls}>Pay group</label>
            {/* Sends the pay group id — employee records reference it as a uuid. */}
            <select value={payGroup} onChange={(e) => setPayGroup(e.target.value)} className={inputCls}>
              <option value="">— Select pay group —</option>
              {payGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
            </select>
            {payGroups.length === 0 && (
              <p className="mt-1 text-[11px] text-amber-700">No pay groups yet — create one under Directory → Pay Groups first.</p>
            )}
          </div>
          <div>
            <label className={labelCls}>Currency</label>
            <input value={currency} onChange={(e) => setCurrency(e.target.value)} className={inputCls} placeholder="NGN" />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {saving ? "Generating…" : "Generate preview"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function ApproveModal({ title, busy, onClose, onSubmit }) {
  const [comment, setComment] = useState("");
  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-slate-900">{title}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <div className="mt-4 space-y-4">
          <div>
            <label className={labelCls}>Comment (optional)</label>
            <textarea value={comment} onChange={(e) => setComment(e.target.value)} className={`${inputCls} h-20 py-2 resize-none`} placeholder="Visible in the approval trail…" />
          </div>
          <div className="flex gap-2 justify-end">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button
              onClick={() => onSubmit(comment.trim() || null)}
              disabled={busy}
              className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70"
            >
              {busy ? "Working…" : "Confirm"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function AdjustmentModal({ run, staff, busy, onClose, onSubmit }) {
  const [employeeId, setEmployeeId] = useState("");
  const [type, setType] = useState("earning");
  const [amount, setAmount] = useState("");
  const [reason, setReason] = useState("");
  const [error, setError] = useState("");

  const submit = (e) => {
    e.preventDefault();
    if (!employeeId) return setError("Pick the employee this adjustment applies to.");
    if (!amount || Number(amount) <= 0) return setError("Enter an amount greater than zero.");
    if (!reason.trim()) return setError("A reason is required — it shows in the approval trail.");
    setError("");
    onSubmit({
      payroll_run_id: run.id,
      employee_id: employeeId,
      adjustment_type: type,
      amount: Number(amount),
      reason: reason.trim(),
    });
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-slate-900">Add adjustment</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100"><X className="h-4 w-4" /></button>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-4">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
            </div>
          )}
          <div>
            <label className={labelCls}>Employee</label>
            <select value={employeeId} onChange={(e) => setEmployeeId(e.target.value)} className={inputCls}>
              <option value="">— Select —</option>
              {staff.map((s) => <option key={s.id} value={s.id}>{getEmployeeName(s, s.email)}</option>)}
            </select>
          </div>
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className={labelCls}>Type</label>
              <select value={type} onChange={(e) => setType(e.target.value)} className={inputCls}>
                <option value="earning">Earning (adds)</option>
                <option value="deduction">Deduction (removes)</option>
              </select>
            </div>
            <div>
              <label className={labelCls}>Amount</label>
              <input type="number" min="0" step="0.01" value={amount} onChange={(e) => setAmount(e.target.value)} className={inputCls} placeholder="50000" />
            </div>
          </div>
          <div>
            <label className={labelCls}>Reason</label>
            <textarea value={reason} onChange={(e) => setReason(e.target.value)} className={`${inputCls} h-20 py-2 resize-none`} placeholder="e.g. Overtime for June inventory count" />
          </div>
          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" disabled={busy} className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-70">
              {busy ? "Saving…" : "Add adjustment"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default PayrollPage;
