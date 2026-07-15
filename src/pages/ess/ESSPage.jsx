import { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Upload, Banknote, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useConfig } from "../../context/ConfigContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { setupService } from "../../services/setupService";
import { approvalService } from "../../services/approvalService";
import { leaveService } from "../../services/leaveService";
import { payrollService } from "../../services/payrollService";
import { loanService, computeLoanTerms, addMonthsISO } from "../../services/loanService";
import { orgService } from "../../services/orgService";
import { getEmployeeName, getInitials } from "../../utils/employee";
import { inclusiveDays } from "../../utils/leave";
import { MONTHS, fmtMoney, extractRunLines, findEmployeeLine, lineAmounts } from "../../utils/payroll";
import { statusBadgeCls } from "../../utils/status";
import { TabPills } from "../../components/ui/TabPills";
import api from "../../services/api";

function useOrgNames(user) {
    const [lookups, setLookups] = useState({ departments: [], jobRoles: [] });
    const departmentId = user?.department_id || null;
    const jobRoleId = user?.job_role_id || null;

    // Keyed on the actual ids, not a boolean — a mid-session reassignment
    // (possibly to a department/role created after these lists were cached)
    // refetches so the new name resolves. The full job-roles list is needed
    // anyway by the team directory; there's no single-name lookup endpoint.
    useEffect(() => {
        if (!departmentId && !jobRoleId) return;
        let mounted = true;
        (async () => {
            const [departments, jobRoles] = await Promise.all([
                setupService.getDepartments().catch(() => []),
                setupService.getJobRoles().catch(() => []),
            ]);
            if (mounted) setLookups({ departments: departments || [], jobRoles: jobRoles || [] });
        })();
        return () => { mounted = false; };
    }, [departmentId, jobRoleId]);

    return {
        department: lookups.departments.find((d) => d.id === user?.department_id)?.name || "",
        jobTitle: lookups.jobRoles.find((r) => r.id === user?.job_role_id)?.title || "",
        jobRoles: lookups.jobRoles,
    };
}

const ESSPage = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState("profile");
    const [drawer, setDrawer] = useState(null);

    const [activeLeaveRequest, setActiveLeaveRequest] = useState(null)
    // Bumped after a successful submission so sibling components re-fetch —
    // without this, new requests only appear after a manual page reload.
    const [leaveTick, setLeaveTick] = useState(0);
    const [profileTick, setProfileTick] = useState(0);

    // Loans mirror the leave flow: modal state holds the active loan-type
    // catalog (loaded by the tracker) so the modal never re-fetches it.
    const [loanModalOpen, setLoanModalOpen] = useState(null);
    const [activeLoanSchedule, setActiveLoanSchedule] = useState(null);
    const [loanTick, setLoanTick] = useState(0);

    const bio = user?.employee_biodata || user?.biodata || {};
    const firstName = bio.firstname || "";
    const { department: departmentName, jobTitle, jobRoles } = useOrgNames(user);

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-brand">Self-service</div>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink"> {firstName ? `Hi, ${firstName} 👋` : "Hi, Employee 👋"}</h1>
                    <p className="mt-1 text-sm text-ink-muted">
                        {jobTitle && <span>{jobTitle}</span>}
                        {jobTitle && departmentName && <span> · </span>}
                        {departmentName && <span>{departmentName}</span>}
                    </p>
                </div>
            </div>

            <TabPills
                layoutId="ess-tab"
                active={tab}
                onChange={setTab}
                tabs={[
                    { key: "profile", label: "Profile" },
                    { key: "leave", label: "Leave" },
                    { key: "payslips", label: "Payslips" },
                    { key: "loans", label: "Loans" },
                    { key: "docs", label: "Documents" },
                    { key: "team", label: "My Team" },
                ]}
            />

            {tab === "profile" && (
                <>
                    <ProfileChange onSubmitted={() => setProfileTick((t) => t + 1)} />
                    <MyProfileRequests refreshKey={profileTick} />
                </>
            )}
            {tab === "leave" && <LeaveTracker onRequestLeave={setActiveLeaveRequest} refreshKey={leaveTick} />}
            {tab === "payslips" && <Payslips onOpen={(run) => setDrawer(run)} />}
            {tab === "loans" && (
                <LoansTracker
                    refreshKey={loanTick}
                    onRequestLoan={setLoanModalOpen}
                    onOpenSchedule={setActiveLoanSchedule}
                    onChanged={() => setLoanTick((t) => t + 1)}
                />
            )}
            {tab === "docs" && <DocsUpload />}
            {tab === "team" && (
                <TeamDirectory
                    departmentId={user?.department_id}
                    departmentName={departmentName}
                    jobRoles={jobRoles}
                />
            )}

            <AnimatePresence>
                {drawer && <PayslipDrawer run={drawer} jobTitle={jobTitle} onClose={() => setDrawer(null)} />}
                {activeLeaveRequest && (
                    <LeaveRequestModal
                        leaveType={activeLeaveRequest.type}
                        remaining={activeLeaveRequest.remaining}
                        existingRequests={activeLeaveRequest.requests}
                        onClose={() => setActiveLeaveRequest(null)}
                        onSubmitted={() => setLeaveTick((t) => t + 1)}
                    />
                )}
                {loanModalOpen && (
                    <LoanRequestModal
                        loanTypes={loanModalOpen}
                        onClose={() => setLoanModalOpen(null)}
                        onSubmitted={() => setLoanTick((t) => t + 1)}
                    />
                )}
                {activeLoanSchedule && (
                    <LoanScheduleDrawer
                        loan={activeLoanSchedule.loan}
                        typeName={activeLoanSchedule.typeName}
                        onClose={() => setActiveLoanSchedule(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}


function ProfileChange({ onSubmitted }) {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [form, setForm] = useState({
        phone: user?.phone || "",
        address: user?.employee_biodata?.address || "",
        bankName: user?.employee_bank_details?.bank_name || "",
        accountNumber: user?.employee_bank_details?.account_number || "",
    });

    const handleChange = (field, value) => {
        setForm((prev) => ({ ...prev, [field]: value }));
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading) return;
        setLoading(true);
        try {

            const changesObj = {};

            const currentPhone = user?.phone || "";
            const currentAddress = user?.employee_biodata?.address || "";
            const currentBankName = user?.employee_bank_details?.bank_name || "";
            const currentAccountNumber = user?.employee_bank_details?.account_number || "";

            if (form.phone.trim() && form.phone.trim() !== currentPhone) {
                changesObj.phone = form.phone.trim();
            }
            if (form.address.trim() && form.address.trim() !== currentAddress) {
                changesObj.address = form.address.trim();
            }
            if (form.bankName.trim() && form.bankName.trim() !== currentBankName) {
                changesObj.bank_name = form.bankName.trim();
            }
            if (form.accountNumber.trim() && form.accountNumber.trim() !== currentAccountNumber) {
                changesObj.account_number = form.accountNumber.trim();
            }

            if (Object.keys(changesObj).length === 0) {
                toast.info("Nothing to submit — change your phone, address or bank details first.");
                setLoading(false);
                return;
            }

            const payload = {
                changes: changesObj,
                recordCreates: [],
                documentMeta: []
            };

            await api.post("/api/profile-update-requests/profile-update-request", payload);
            toast.success("Profile change request submitted for HR approval!");
            onSubmitted?.();
        } catch (err) {
            console.error("[ESS] Request failed:", err);
            toast.error(err?.error?.message || err?.message || "Error submitting profile change request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
            <form onSubmit={handleSubmit}>
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="font-semibold text-ink">Profile change requests</h3>
                    <p className="text-xs text-ink-muted">Edits require HR validation before being applied to your immutable record.</p>
                </div>
                <button
                    type="submit"
                    disabled={loading}
                    className="rounded-xl bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-75"
                >
                    {loading ? "Submitting..." : "Submit Requests"}
                </button>
            </div>

            <div className="grid gap-3 md:grid-cols-2">
                <div className="relative rounded-xl border border-line p-3 focus-within:border-brand transition-colors">
                    <label className="text-xs font-semibold text-ink-muted block">Phone Number</label>
                    <input 
                        value={form.phone} 
                        onChange={(e) => handleChange("phone", e.target.value)} 
                        className="mt-1 w-full bg-transparent text-sm text-ink-2 outline-none" 
                    />
                </div>
                <div className="relative rounded-xl border border-line p-3 focus-within:border-brand transition-colors">
                    <label className="text-xs font-semibold text-ink-muted block">Home Address</label>
                    <input 
                        value={form.address} 
                        onChange={(e) => handleChange("address", e.target.value)} 
                        className="mt-1 w-full bg-transparent text-sm text-ink-2 outline-none" 
                    />
                </div>
                <div className="relative rounded-xl border border-line p-3 focus-within:border-brand transition-colors">
                    <label className="text-xs font-semibold text-ink-muted block">Bank Name</label>
                    <input 
                        value={form.bankName} 
                        onChange={(e) => handleChange("bankName", e.target.value)} 
                        className="mt-1 w-full bg-transparent text-sm text-ink-2 outline-none" 
                    />
                </div>
                <div className="relative rounded-xl border border-line p-3 focus-within:border-brand transition-colors">
                    <label className="text-xs font-semibold text-ink-muted block">Account Number</label>
                    <input 
                        value={form.accountNumber}
                        onChange={(e) => handleChange("accountNumber", e.target.value)}
                        className="mt-1 w-full bg-transparent text-sm text-ink-2 outline-none"
                    />
                </div>
            </div>
            </form>
        </div>
    );
}

function MyProfileRequests({ refreshKey = 0 }) {
    const { user } = useAuth();
    const [state, setState] = useState({ loading: true, items: [], unavailable: false });
    const employeeId = user?.id;

    useEffect(() => {
        if (!employeeId) return;
        let mounted = true;
        (async () => {
            try {
                const res = await approvalService.getMyProfileUpdates(employeeId);
                const rows = Array.isArray(res) ? res : res?.requests || res?.items || res?.data || [];
                // Defense in depth: the endpoint is org-wide with an
                // employee_id filter — never display rows that aren't the
                // current user's, even if the backend ignores the param.
                const items = rows.filter((r) => !r.employee_id || r.employee_id === employeeId);
                if (mounted) setState({ loading: false, items, unavailable: false });
            } catch (err) {
                console.error("[ESS] Request history unavailable:", err);
                if (mounted) setState({ loading: false, items: [], unavailable: true });
            }
        })();
        return () => { mounted = false; };
    }, [employeeId, refreshKey]);

    if (state.loading) return null;

    // NOTE(backend): the only history endpoint is the admin-gated org-wide
    // list, so regular employees 403 here. Until a self-history endpoint
    // exists, say so instead of silently hiding the section.
    if (state.unavailable) {
        return (
            <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
                <h3 className="font-semibold text-ink">My change requests</h3>
                <p className="text-xs text-ink-muted">Track the status of updates you’ve submitted.</p>
                <div className="mt-4 p-6 text-center text-xs text-ink-faint border border-dashed border-line rounded-xl">
                    Your submission history can’t be displayed with your current permissions.
                    Requests you submit still reach HR for review — ask them for an update on a
                    pending change.
                </div>
            </div>
        );
    }

    const badge = statusBadgeCls;

    return (
        <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
            <h3 className="font-semibold text-ink">My change requests</h3>
            <p className="text-xs text-ink-muted">Track the status of updates you’ve submitted.</p>
            {state.items.length === 0 ? (
                <div className="mt-4 p-6 text-center text-xs text-ink-faint border border-dashed border-line rounded-xl">
                    No change requests submitted yet.
                </div>
            ) : (
                <ul className="mt-4 divide-y divide-line-soft">
                    {state.items.map((r, i) => {
                        const changes = r.changes || r.payload?.changes || {};
                        const entries = Object.entries(changes);
                        // The org endpoint returns summary rows (counts only,
                        // no field values) — say what we know instead of
                        // rendering an empty body.
                        const itemCount = Number(r.total_items) || entries.length || 1;
                        return (
                            <li key={r.id || r.request_id || i} className="flex items-start justify-between gap-4 py-3">
                                <div className="min-w-0 text-xs text-ink-muted">
                                    {entries.length ? (
                                        entries.map(([k, v]) => (
                                            <div key={k}>
                                                <span className="font-semibold capitalize">{k.replace(/_/g, " ")}:</span> {String(v)}
                                            </div>
                                        ))
                                    ) : (
                                        <div>
                                            {itemCount} field update{itemCount === 1 ? "" : "s"} submitted for review
                                        </div>
                                    )}
                                    {r.created_at && (
                                        <div className="mt-1 text-[10px] text-ink-faint">{String(r.created_at).slice(0, 10)}</div>
                                    )}
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${badge(r.status)}`}>
                                    {r.status || "pending"}
                                </span>
                            </li>
                        );
                    })}
                </ul>
            )}
        </div>
    );
}

function TeamDirectory({ departmentId, departmentName, jobRoles = [] }) {
    const { user } = useAuth();
    const [members, setMembers] = useState([]);
    const [loading, setLoading] = useState(!!departmentId);
    const [blocked, setBlocked] = useState(false);

    useEffect(() => {
        if (!departmentId) return;
        let mounted = true;
        (async () => {
            try {
                const all = await orgService.listAllUsers();
                if (mounted) {
                    setMembers(all.filter((u) =>
                        u.department_id === departmentId && u.id !== user?.id && u.active !== false
                    ));
                }
            } catch (err) {
                console.error("[ESS] Team load failed:", err);
                if (mounted) setBlocked(true);
            } finally {
                if (mounted) setLoading(false);
            }
        })();
        return () => { mounted = false; };
    }, [departmentId, user?.id]);

    const roleTitle = (id) => jobRoles.find((r) => r.id === id)?.title || "";

    if (loading) {
        return <div className="p-8 text-center text-ink-muted bg-card border rounded-2xl">Loading your team...</div>;
    }
    if (!departmentId) {
        return (
            <div className="p-8 text-center text-ink-faint bg-card border border-dashed rounded-2xl">
                You haven’t been assigned to a department yet. Ask HR to complete your profile.
            </div>
        );
    }
    if (blocked) {
        return (
            <div className="p-8 text-center text-ink-faint bg-card border border-dashed rounded-2xl">
                The employee directory isn’t available for your role.
            </div>
        );
    }
    if (members.length === 0) {
        return (
            <div className="p-8 text-center text-ink-faint bg-card border border-dashed rounded-2xl">
                No other colleagues in {departmentName || "your department"} yet.
            </div>
        );
    }

    return (
        <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
            {members.map((m) => {
                const name = getEmployeeName(m, "Colleague");
                const initials = getInitials(name);
                return (
                    <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-xs font-bold text-white">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-ink">{name}</div>
                            <div className="truncate text-xs text-ink-muted">{roleTitle(m.job_role_id) || m.email}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

const leaveStatusCls = (s) => {
    if (s.startsWith("approv")) return "bg-emerald-50 text-emerald-700";
    if (s.startsWith("reject") || s.startsWith("cancel")) return "bg-red-50 text-red-700";
    return "bg-amber-50 text-amber-700";
};

function LeaveTracker({ onRequestLeave, refreshKey = 0 }) {
    const [loading, setLoading] = useState(false);
    const [leaveTypes, setLeaveTypes] = useState([]);
    const [myRequests, setMyRequests] = useState([]);

    useEffect(() => {
        const fetchLeaves = async () => {
        setLoading(true);
        try {
            const [types, mine] = await Promise.all([
                setupService.getLeaveTypes(),
                leaveService.list().catch(() => []),
            ]);
            setLeaveTypes(Array.isArray(types) ? types : []);
            setMyRequests(Array.isArray(mine) ? mine : []);
        } catch (err) {
            console.error("[LeaveTracker] Error loading leaves:", err);
        } finally {
            setLoading(false);
        }
        };
        fetchLeaves();
    }, [refreshKey]);

    // NOTE(backend): there is no balance endpoint and the API accepts any
    // request (verified: 45 days against a 10-day allowance → 201), so these
    // client-side calendar-day sums are the only guard the user sees.
    const daysFor = (typeId, statusPrefix) =>
        myRequests
            .filter((r) => (r.leave_type_id || r.leave_type?.id) === typeId)
            .filter((r) => String(r.status || "").toLowerCase().startsWith(statusPrefix))
            .reduce((sum, r) => sum + inclusiveDays(r.start_date, r.end_date), 0);

    const usedDays = (typeId) => daysFor(typeId, "approv");
    const pendingDays = (typeId) => daysFor(typeId, "pend");

    const typeNameOf = (r) =>
        r.leave_type?.name ||
        leaveTypes.find((t) => t.id === (r.leave_type_id || r.leave_type))?.name ||
        "Leave";

    return (
        <div className="space-y-6">
            {loading ? (
                <div className="p-8 text-center text-ink-muted bg-card border rounded-2xl">Retrieving leave balances...</div>
            ) : leaveTypes.length === 0 ? (
                <div className="p-8 text-center text-ink-faint bg-card border border-dashed rounded-2xl">
                    No leave packages configured in your organization yet.
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {leaveTypes.map((g) => {
                        const daysAllowed = Number(g.days_allowed) || 0;
                        // Real consumption, not capped — over-consumption is
                        // surfaced instead of hidden. Pending days are shown
                        // as reserved so double-booking is visible too.
                        const daysUsed = usedDays(g.id);
                        const daysPending = pendingDays(g.id);
                        const remaining = daysAllowed - daysUsed - daysPending;
                        const overBy = daysUsed - daysAllowed;
                        const pct = daysAllowed > 0 ? Math.min(1, daysUsed / daysAllowed) : 0;
                        const C = 2 * Math.PI * 42;
                        return (
                            <motion.div key={g.id || g.code} whileHover={{ y: -4 }} className="rounded-2xl border border-line/80 bg-card p-6 text-center shadow-sm">
                                <div className="relative mx-auto h-32 w-32">
                                    <svg viewBox="0 0 100 100" className="-rotate-90">
                                        <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                                        <motion.circle cx="50" cy="50" r="42" stroke="var(--brand-primary)" strokeWidth="10" fill="none" strokeLinecap="round"
                                        strokeDasharray={C}
                                        initial={{ strokeDashoffset: C }}
                                        animate={{ strokeDashoffset: C * (1 - pct) }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className={`text-2xl font-bold ${remaining < 0 ? "text-red-600" : "text-ink"}`}>{remaining}</div>
                                        <div className="text-[10px] uppercase text-ink-muted">days left</div>
                                    </div>
                                </div>
                                <div className="mt-4 font-semibold text-ink capitalize">{g.name}</div>
                                <div className="text-xs text-ink-muted">
                                    {daysUsed} of {daysAllowed} used
                                    {daysPending > 0 && <span className="text-amber-600"> · {daysPending} pending</span>}
                                    {overBy > 0 && <span className="font-semibold text-red-600"> · over by {overBy}</span>}
                                </div>
                                <button onClick={() => onRequestLeave({ type: g, remaining, requests: myRequests })} className="mt-4 w-full rounded-lg bg-brand px-3 py-2 text-xs font-semibold text-white active:scale-95 transition-transform">
                                    Request leave
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
                <h4 className="font-semibold text-ink">My leave requests</h4>
                <p className="text-xs text-ink-muted">Everything you’ve requested, with its current status.</p>
                {myRequests.length === 0 ? (
                    <div className="p-8 text-center text-ink-faint text-sm">
                        You haven’t requested any leave yet.
                    </div>
                ) : (
                    <ul className="mt-4 divide-y divide-line-soft">
                        {myRequests.map((r, i) => {
                            const s = String(r.status || "pending").toLowerCase();
                            return (
                                <li key={r.id || i} className="flex items-center justify-between gap-3 py-3">
                                    <div className="min-w-0">
                                        <div className="text-sm font-semibold text-ink">
                                            {typeNameOf(r)}
                                            <span className="ml-2 text-xs font-normal text-ink-muted">
                                                {String(r.start_date).slice(0, 10)} → {String(r.end_date).slice(0, 10)} · {inclusiveDays(r.start_date, r.end_date)} day{inclusiveDays(r.start_date, r.end_date) === 1 ? "" : "s"}
                                            </span>
                                        </div>
                                        {r.reason && <div className="truncate text-xs text-ink-faint">“{r.reason}”</div>}
                                    </div>
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${leaveStatusCls(s)}`}>
                                        {s.replace(/_/g, " ")}
                                    </span>
                                </li>
                            );
                        })}
                    </ul>
                )}
            </div>
        </div>
    );
}

function LeaveRequestModal({ leaveType, remaining = null, existingRequests = [], onClose, onSubmitted }) {
  const toast = useToast();
  const confirm = useConfirm();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const requestedDays = startDate && endDate && endDate >= startDate ? inclusiveDays(startDate, endDate) : 0;

  // The backend accepts any dates (no balance or overlap validation), so
  // this modal is the only guard: block overlaps outright, and make
  // over-budget requests an explicit informed choice.
  const overlapping = (start, end) =>
    existingRequests.find((r) => {
      const s = String(r.status || "").toLowerCase();
      if (!s.startsWith("pend") && !s.startsWith("approv")) return null;
      const rs = String(r.start_date || "").slice(0, 10);
      const re = String(r.end_date || "").slice(0, 10);
      return rs && re && rs <= end && start <= re;
    });

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (loading) return;
    if (endDate < startDate) {
      toast.error("End date can’t be before the start date.");
      return;
    }
    const clash = overlapping(startDate, endDate);
    if (clash) {
      toast.error(
        `These dates overlap your existing request (${String(clash.start_date).slice(0, 10)} → ${String(clash.end_date).slice(0, 10)}). Cancel or adjust that one first.`
      );
      return;
    }
    if (remaining != null && requestedDays > remaining) {
      const ok = await confirm({
        title: "Exceed your remaining balance?",
        message: `This request is ${requestedDays} calendar days, but you have ${Math.max(remaining, 0)} day${remaining === 1 ? "" : "s"} of ${leaveType.name} left (pending requests included). HR can still reject it.`,
        confirmLabel: "Submit anyway",
        danger: true,
      });
      if (!ok) return;
    }
    setLoading(true);
    try {
      const payload = {
        leave_type_id: leaveType.id,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      };
      await api.post("/api/leave-requests/", payload);
      toast.success(`Leave request for ${leaveType.name} submitted successfully!`);
      onSubmitted?.();
      onClose();
    } catch (err) {
      console.error("[ESS] Leave submission failed:", err);
      toast.error(err?.error?.message || err?.message || "Error submitting leave request.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-ink capitalize">Request {leaveType.name}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 border border-line rounded-xl px-3 outline-none mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">End Date</label>
              <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} className="w-full h-11 border border-line rounded-xl px-3 outline-none mt-1" required />
            </div>
          </div>
          {requestedDays > 0 && (
            <div className={`text-xs ${remaining != null && requestedDays > remaining ? "font-semibold text-red-600" : "text-ink-muted"}`}>
              {requestedDays} calendar day{requestedDays === 1 ? "" : "s"}
              {remaining != null && ` · ${Math.max(remaining, 0)} remaining for ${leaveType.name}`}
            </div>
          )}
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Purpose / Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full h-24 border border-line rounded-xl p-3 outline-none mt-1 resize-none" placeholder="Provide a brief reason for cover..." required />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={loading} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-75">
              {loading ? "Submitting..." : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

// Loan-specific chip colors (statuses the shared statusBadgeCls can't tell
// apart): 'active' is a healthy in-flight state, not a warning, and 'repaid'
// is a stronger success than 'approved'. 'defaulted' is mapped defensively —
// no backend code path ever sets it today.
const LOAN_STATUS_META = {
    draft: { label: "Draft", cls: "bg-sunken text-ink-muted" },
    pending_approval: { label: "Pending approval", cls: "bg-amber-50 text-amber-700" },
    approved: { label: "Approved", cls: "bg-emerald-50 text-emerald-700" },
    active: { label: "Active", cls: "bg-sky-50 text-sky-700" },
    repaid: { label: "Repaid", cls: "bg-emerald-600 text-white" },
    rejected: { label: "Rejected", cls: "bg-red-50 text-red-700" },
    cancelled: { label: "Cancelled", cls: "bg-sunken text-ink-muted" },
    defaulted: { label: "Defaulted", cls: "bg-red-50 text-red-700" },
};

const loanStatusMeta = (status) =>
    LOAN_STATUS_META[String(status || "").toLowerCase()] || {
        label: String(status || "unknown").replace(/_/g, " "),
        cls: "bg-sunken text-ink-muted",
    };

const LOAN_CHIP_CLS = "shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider";

const scheduleChipCls = (s) => {
    if (s === "paid") return "bg-emerald-50 text-emerald-700";
    if (s === "overdue") return "bg-red-50 text-red-700";
    return "bg-sunken text-ink-muted";
};

// Local calendar date, not toISOString() — that returns the UTC date, which
// is yesterday/tomorrow for users west/east of Greenwich around midnight.
const localTodayISO = () => {
    const d = new Date();
    return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
};

// Statuses past approval — a repayment schedule exists for these.
const LOAN_SCHEDULE_STATUSES = ["approved", "active", "repaid", "defaulted"];

function LoanRow({ loan, typeName, currency, busy, onSchedule, onRemind, onCancel, dim = false }) {
    const status = String(loan.status || "").toLowerCase();
    const meta = loanStatusMeta(status);
    const pending = status === "pending_approval";
    const tenure = Math.trunc(Number(loan.tenure_month)) || 0;
    return (
        <li className={`flex flex-wrap items-center justify-between gap-3 py-3 ${dim ? "opacity-70" : ""}`}>
            <div className="min-w-0">
                <div className="text-sm font-semibold text-ink">
                    {typeName}
                    <span className="ml-2 text-xs font-normal text-ink-muted">
                        {fmtMoney(loan.amount, currency)} · {tenure} month{tenure === 1 ? "" : "s"}
                        {loan.created_at && <> · requested {String(loan.created_at).slice(0, 10)}</>}
                    </span>
                </div>
                {loan.reason && <div className="truncate text-xs text-ink-faint">“{loan.reason}”</div>}
            </div>
            <div className="flex shrink-0 flex-wrap items-center gap-2">
                {LOAN_SCHEDULE_STATUSES.includes(status) && (
                    <button
                        onClick={onSchedule}
                        className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-brand hover:bg-sunken"
                    >
                        View schedule
                    </button>
                )}
                {pending && (
                    <>
                        <button
                            disabled={busy}
                            onClick={onRemind}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted hover:bg-sunken disabled:opacity-60"
                        >
                            Remind
                        </button>
                        <button
                            disabled={busy}
                            onClick={onCancel}
                            className="rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-red-600 hover:bg-red-50 disabled:opacity-60"
                        >
                            Cancel
                        </button>
                    </>
                )}
                <span className={`${LOAN_CHIP_CLS} ${meta.cls}`}>{meta.label}</span>
            </div>
        </li>
    );
}

function LoansTracker({ onRequestLoan, onOpenSchedule, onChanged, refreshKey = 0 }) {
    const toast = useToast();
    const confirm = useConfirm();
    const { config } = useConfig();
    const currency = config?.currency || "NGN";

    const [loading, setLoading] = useState(true);
    const [failed, setFailed] = useState(false);
    const [loans, setLoans] = useState([]);
    const [loanTypes, setLoanTypes] = useState([]);
    const [busyId, setBusyId] = useState(null);

    useEffect(() => {
        let mounted = true;
        const fetchLoans = async () => {
            setLoading(true);
            try {
                const [mine, types] = await Promise.all([
                    loanService.listMine(),
                    loanService.listLoanTypes("active"),
                ]);
                if (!mounted) return;
                setLoans(Array.isArray(mine) ? mine : []);
                setLoanTypes(Array.isArray(types) ? types : []);
                setFailed(false);
            } catch (err) {
                console.error("[Loans] Error loading loans:", err);
                if (mounted) setFailed(true);
            } finally {
                if (mounted) setLoading(false);
            }
        };
        fetchLoans();
        return () => { mounted = false; };
    }, [refreshKey]);

    // Only active loan products are listed, so a loan against a retired
    // product falls back to a generic label rather than an empty string.
    const typeNameOf = (loan) => loanTypes.find((t) => t.id === loan.loan_type_id)?.name || "Loan";

    // Money owed is still owed — approved and active both count as open.
    // Terminal negatives (cancelled/rejected) drop to the de-emphasized
    // "Past requests" list; the API keeps soft-cancelled rows in the list.
    const statusOf = (l) => String(l.status || "").toLowerCase();
    const openLoans = loans.filter((l) => ["approved", "active"].includes(statusOf(l)));
    const pastLoans = loans.filter((l) => ["cancelled", "rejected"].includes(statusOf(l)));
    const currentLoans = loans.filter((l) => !["cancelled", "rejected"].includes(statusOf(l)));

    const openSchedule = (loan) => onOpenSchedule({ loan, typeName: typeNameOf(loan) });

    const handleRemind = async (loan) => {
        if (busyId) return;
        setBusyId(loan.id);
        try {
            await loanService.remind(loan.id);
            toast.success("Reminder sent to your approvers.");
        } catch (err) {
            console.error("[Loans] Reminder failed:", err);
            toast.error(err?.error?.message || err?.message || "Couldn't send the reminder.");
        } finally {
            setBusyId(null);
        }
    };

    const handleCancel = async (loan) => {
        if (busyId) return;
        const ok = await confirm({
            title: "Cancel this loan request?",
            message: `Your ${typeNameOf(loan)} request for ${fmtMoney(loan.amount, currency)} will be withdrawn from approval. This can't be undone.`,
            confirmLabel: "Cancel request",
            danger: true,
        });
        if (!ok) return;
        setBusyId(loan.id);
        try {
            await loanService.cancel(loan.id);
            toast.success("Loan request cancelled.");
            onChanged?.();
        } catch (err) {
            console.error("[Loans] Cancel failed:", err);
            toast.error(err?.error?.message || err?.message || "Couldn't cancel the loan request.");
        } finally {
            setBusyId(null);
        }
    };

    if (loading) {
        return <div className="p-8 text-center text-ink-muted bg-card border rounded-2xl">Retrieving your loans...</div>;
    }
    if (failed) {
        return (
            <div className="p-8 text-center text-ink-faint bg-card border border-dashed rounded-2xl">
                Your loans couldn’t be loaded right now. Please try again shortly.
            </div>
        );
    }
    if (loans.length === 0) {
        return (
            <div className="p-12 text-center border border-dashed border-line rounded-2xl bg-card">
                <Banknote className="mx-auto h-12 w-12 text-ink-ghost" />
                <h4 className="mt-4 font-semibold text-ink">No loans yet</h4>
                <p className="mt-1 text-sm text-ink-muted">
                    {loanTypes.length
                        ? "Request a staff loan and repay it in monthly installments."
                        : "Loan requests open up once HR configures at least one active loan product."}
                </p>
                <button
                    onClick={() => onRequestLoan(loanTypes)}
                    disabled={!loanTypes.length}
                    className="mt-4 rounded-xl bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-60"
                >
                    Request a loan
                </button>
            </div>
        );
    }

    return (
        <div className="space-y-6">
            {openLoans.length > 0 && (
                <div className="grid gap-6 lg:grid-cols-3">
                    {openLoans.map((loan) => {
                        // Strings from the API — Number() before any math.
                        const total = Number(loan.total_repayable) || 0;
                        const repaid = Number(loan.amount_repaid) || 0;
                        const outstanding = Math.max(0, total - repaid);
                        const pct = total > 0 ? Math.min(1, repaid / total) : 0;
                        const C = 2 * Math.PI * 42;
                        const meta = loanStatusMeta(loan.status);
                        return (
                            <motion.div key={loan.id} whileHover={{ y: -4 }} className="rounded-2xl border border-line/80 bg-card p-6 text-center shadow-sm">
                                <div className="relative mx-auto h-32 w-32">
                                    <svg viewBox="0 0 100 100" className="-rotate-90">
                                        <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                                        <motion.circle cx="50" cy="50" r="42" stroke="var(--brand-primary)" strokeWidth="10" fill="none" strokeLinecap="round"
                                            strokeDasharray={C}
                                            initial={{ strokeDashoffset: C }}
                                            animate={{ strokeDashoffset: C * (1 - pct) }}
                                            transition={{ duration: 1, ease: "easeOut" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="text-2xl font-bold text-ink">{Math.round(pct * 100)}%</div>
                                        <div className="text-[10px] uppercase text-ink-muted">repaid</div>
                                    </div>
                                </div>
                                <div className="mt-4 font-semibold text-ink capitalize">{typeNameOf(loan)}</div>
                                <div className="mt-1 text-xs text-ink-muted">
                                    <span className="font-semibold text-ink-2">{fmtMoney(outstanding, currency)}</span> outstanding
                                    {" · "}{fmtMoney(loan.monthly_installment, currency)}/month
                                </div>
                                <div className="mt-3 flex items-center justify-center gap-3">
                                    <span className={`${LOAN_CHIP_CLS} ${meta.cls}`}>{meta.label}</span>
                                    <button onClick={() => openSchedule(loan)} className="text-xs font-semibold text-brand">
                                        View schedule →
                                    </button>
                                </div>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <div className="rounded-2xl border border-line/80 bg-card p-6 shadow-sm">
                <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                    <div>
                        <h4 className="font-semibold text-ink">My loan requests</h4>
                        <p className="text-xs text-ink-muted">Every loan you’ve requested, with its current status.</p>
                    </div>
                    <button
                        onClick={() => onRequestLoan(loanTypes)}
                        disabled={!loanTypes.length}
                        title={loanTypes.length ? undefined : "No active loan products are configured yet — contact HR."}
                        className="rounded-xl bg-brand text-white px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-60"
                    >
                        Request a loan
                    </button>
                </div>
                {!loanTypes.length && (
                    <p className="mb-3 text-xs text-ink-faint">
                        New loan requests are unavailable until HR configures at least one active loan product.
                    </p>
                )}
                {currentLoans.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-faint border border-dashed border-line rounded-xl">
                        No open loan requests.
                    </div>
                ) : (
                    <ul className="divide-y divide-line-soft">
                        {currentLoans.map((loan) => (
                            <LoanRow
                                key={loan.id}
                                loan={loan}
                                typeName={typeNameOf(loan)}
                                currency={currency}
                                busy={busyId === loan.id}
                                onSchedule={() => openSchedule(loan)}
                                onRemind={() => handleRemind(loan)}
                                onCancel={() => handleCancel(loan)}
                            />
                        ))}
                    </ul>
                )}

                {pastLoans.length > 0 && (
                    <div className="mt-6 border-t border-line-soft pt-4">
                        <h5 className="text-xs font-semibold uppercase tracking-wider text-ink-faint">Past requests</h5>
                        <ul className="divide-y divide-line-soft">
                            {pastLoans.map((loan) => (
                                <LoanRow
                                    key={loan.id}
                                    loan={loan}
                                    typeName={typeNameOf(loan)}
                                    currency={currency}
                                    dim
                                />
                            ))}
                        </ul>
                    </div>
                )}
            </div>
        </div>
    );
}

function LoanRequestModal({ loanTypes = [], onClose, onSubmitted }) {
    const toast = useToast();
    const { config } = useConfig();
    const currency = config?.currency || "NGN";
    const today = localTodayISO();

    const [typeId, setTypeId] = useState(loanTypes[0]?.id || "");
    const [amount, setAmount] = useState("");
    const [tenure, setTenure] = useState("");
    const [startDate, setStartDate] = useState(today);
    const [reason, setReason] = useState("");
    const [error, setError] = useState("");
    const [loading, setLoading] = useState(false);

    const type = loanTypes.find((t) => t.id === typeId) || null;
    const maxTenure = Math.trunc(Number(type?.repayment_period_months)) || null;
    const ratePerAnnum = Number(type?.interest_per_annum) || 0;

    const amountNum = Number(amount);
    const tenureNum = Math.trunc(Number(tenure));
    const amountValid = amount !== "" && amountNum > 0;
    const tenureValid = tenure !== "" && tenureNum >= 1 && (!maxTenure || tenureNum <= maxTenure);

    // Live preview mirroring the backend's own amortization — the backend
    // stores these terms exactly as sent.
    const terms = type && amountValid && tenureValid ? computeLoanTerms(amountNum, ratePerAnnum, tenureNum) : null;
    const endDate = startDate && tenureValid ? addMonthsISO(startDate, tenureNum) : "";
    const canSubmit = !!type && amountValid && tenureValid && !!startDate && !!reason.trim();

    const handleSubmit = async (e) => {
        e.preventDefault();
        if (loading || !canSubmit) return;
        setLoading(true);
        setError("");
        try {
            await loanService.create({
                loan_type_id: type.id,
                amount: amountNum,
                // The backend uses the loan type's rate regardless — send it
                // so the stored row matches what the preview promised.
                interest_rate: ratePerAnnum,
                tenure_month: tenureNum,
                monthly_installment: terms.installment,
                total_repayable: terms.total,
                reason: reason.trim(),
                start_date: startDate,
                end_date: endDate,
            });
            toast.success(`${type.name} request submitted for approval!`);
            onSubmitted?.();
            onClose();
        } catch (err) {
            console.error("[Loans] Loan submission failed:", err);
            const msg = err?.error?.message || err?.message || "Error submitting loan request.";
            setError(msg);
            toast.error(msg);
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md max-h-[90vh] overflow-y-auto rounded-2xl bg-card p-6 shadow-xl">
                <div className="flex items-center justify-between border-b pb-3">
                    <h3 className="text-lg font-bold text-ink">Request a loan</h3>
                    <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken">
                        <X className="h-4 w-4" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    {error && (
                        <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                            <AlertCircle className="h-4 w-4 shrink-0 text-red-600" /> <span>{error}</span>
                        </div>
                    )}
                    <div>
                        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Loan type</label>
                        <select
                            value={typeId}
                            onChange={(e) => setTypeId(e.target.value)}
                            className="w-full h-11 border border-line rounded-xl px-3 outline-none mt-1 bg-transparent text-sm text-ink-2"
                            required
                        >
                            <option value="" disabled>— Select a loan type —</option>
                            {loanTypes.map((t) => (
                                <option key={t.id} value={t.id}>{t.name}</option>
                            ))}
                        </select>
                        {type && (
                            <p className="mt-1 text-xs text-ink-muted">
                                {ratePerAnnum}%/yr · max {maxTenure ?? "—"} months
                                {type.description ? ` · ${type.description}` : ""}
                            </p>
                        )}
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Amount</label>
                            <input
                                type="number"
                                min="1"
                                step="0.01"
                                value={amount}
                                onChange={(e) => setAmount(e.target.value)}
                                placeholder="50000"
                                className="w-full h-11 border border-line rounded-xl px-3 outline-none mt-1"
                                required
                            />
                            {amount !== "" && !amountValid && (
                                <p className="mt-1 text-xs font-semibold text-red-600">Enter an amount greater than 0.</p>
                            )}
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Tenure (months)</label>
                            <input
                                type="number"
                                min="1"
                                max={maxTenure ?? undefined}
                                step="1"
                                value={tenure}
                                onChange={(e) => setTenure(e.target.value)}
                                placeholder={maxTenure ? `1–${maxTenure}` : "6"}
                                className="w-full h-11 border border-line rounded-xl px-3 outline-none mt-1"
                                required
                            />
                            {tenure !== "" && !tenureValid && (
                                <p className="mt-1 text-xs font-semibold text-red-600">
                                    {maxTenure ? `Tenure must be between 1 and ${maxTenure} months.` : "Tenure must be at least 1 month."}
                                </p>
                            )}
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Start Date</label>
                        <input
                            type="date"
                            value={startDate}
                            min={today}
                            onChange={(e) => setStartDate(e.target.value)}
                            className="w-full h-11 border border-line rounded-xl px-3 outline-none mt-1"
                            required
                        />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Purpose / Reason</label>
                        <textarea
                            value={reason}
                            onChange={(e) => setReason(e.target.value)}
                            className="w-full h-24 border border-line rounded-xl p-3 outline-none mt-1 resize-none"
                            placeholder="What is this loan for?"
                            required
                        />
                    </div>
                    {terms && (
                        <div className="rounded-xl bg-gradient-to-r from-brand/10 to-brand-2/5 p-4 space-y-1">
                            <div className="flex items-center justify-between">
                                <span className="text-sm font-semibold text-ink-2">Monthly installment</span>
                                <span className="text-2xl font-bold text-brand">{fmtMoney(terms.installment, currency)}</span>
                            </div>
                            <div className="flex items-center justify-between text-xs text-ink-muted">
                                <span>Total repayable over {tenureNum} month{tenureNum === 1 ? "" : "s"}</span>
                                <span className="font-semibold">{fmtMoney(terms.total, currency)}</span>
                            </div>
                            {endDate && <div className="text-xs text-ink-faint">Repayments run until {endDate}.</div>}
                        </div>
                    )}
                    <div className="flex gap-2 justify-end pt-2">
                        <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
                        <button type="submit" disabled={loading || !canSubmit} className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-75">
                            {loading ? "Submitting..." : "Submit Loan Request"}
                        </button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function LoanScheduleDrawer({ loan, typeName = "Loan", onClose }) {
    const { config } = useConfig();
    const currency = config?.currency || "NGN";
    const [state, setState] = useState({ loading: true, data: null, error: false });

    useEffect(() => {
        let stale = false;
        (async () => {
            try {
                const data = await loanService.getSchedule(loan.id);
                if (!stale) setState({ loading: false, data, error: false });
            } catch (err) {
                console.error("[Loans] Error loading repayment schedule:", err);
                if (!stale) setState({ loading: false, data: null, error: true });
            }
        })();
        return () => { stale = true; };
    }, [loan.id]);

    // The schedule response carries a fresher copy of the loan — prefer it.
    const loanRow = state.data?.loan || loan;
    const summary = state.data?.summary || null;
    const schedule = Array.isArray(state.data?.schedule) ? state.data.schedule : [];
    const meta = loanStatusMeta(loanRow.status);

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
            <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-2xl flex-col bg-card shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-line-soft p-4">
                    <h3 className="font-semibold text-ink">Repayment schedule · {typeName}</h3>
                    <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken"><X className="h-4 w-4" /></button>
                </div>
                <div className="flex-1 overflow-y-auto bg-sunken p-6">
                    <div className="mx-auto max-w-xl rounded-2xl bg-card shadow-lg ring-1 ring-line p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h4 className="font-bold text-ink text-lg capitalize">{typeName}</h4>
                                <p className="text-xs text-ink-muted">
                                    {String(loanRow.start_date).slice(0, 10)} → {String(loanRow.end_date).slice(0, 10)}
                                </p>
                            </div>
                            <span className={`${LOAN_CHIP_CLS} ${meta.cls}`}>{meta.label}</span>
                        </div>

                        <div className="grid grid-cols-3 gap-4 text-xs">
                            <div>
                                <span className="text-ink-faint block">Principal</span>
                                <span className="font-semibold text-ink">{fmtMoney(loanRow.amount, currency)}</span>
                            </div>
                            <div>
                                <span className="text-ink-faint block">Interest rate</span>
                                <span className="font-semibold text-ink">{Number(loanRow.interest_rate) || 0}%/yr</span>
                            </div>
                            <div>
                                <span className="text-ink-faint block">Monthly installment</span>
                                <span className="font-semibold text-ink">{fmtMoney(loanRow.monthly_installment, currency)}</span>
                            </div>
                        </div>

                        {state.loading ? (
                            <div className="p-8 text-center text-ink-faint text-xs border-t border-dashed">
                                Retrieving your repayment schedule…
                            </div>
                        ) : state.error || !summary ? (
                            <div className="p-8 text-center text-ink-faint text-xs border-t border-dashed">
                                The repayment schedule couldn’t be retrieved right now. Please try again later or contact HR.
                            </div>
                        ) : (
                            <>
                                <div className="flex items-center justify-between gap-3 rounded-xl bg-gradient-to-r from-brand/10 to-brand-2/5 p-4">
                                    <div>
                                        <div className="text-sm font-semibold text-ink-2">Outstanding balance</div>
                                        <div className="text-xs text-ink-muted">
                                            {fmtMoney(summary.amount_repaid, currency)} of {fmtMoney(summary.total_repayable, currency)} repaid
                                            {" · "}{summary.periods_paid} paid / {summary.periods_remaining} remaining
                                        </div>
                                    </div>
                                    <div className="text-2xl font-bold text-brand">{fmtMoney(summary.outstanding_balance, currency)}</div>
                                </div>

                                <div className="overflow-x-auto rounded-xl border border-line">
                                    <table className="w-full min-w-[440px] text-sm">
                                        <thead className="bg-sunken/60 text-[10px] uppercase tracking-wider text-ink-muted">
                                            <tr>
                                                <th className="px-3 py-2 text-left font-semibold">#</th>
                                                <th className="px-3 py-2 text-left font-semibold">Due date</th>
                                                <th className="px-3 py-2 text-right font-semibold">Amount</th>
                                                <th className="px-3 py-2 text-left font-semibold">Status</th>
                                                <th className="px-3 py-2 text-left font-semibold">Paid on</th>
                                            </tr>
                                        </thead>
                                        <tbody>
                                            {schedule.map((p) => (
                                                <tr key={p.period} className="border-t border-line-soft">
                                                    <td className="px-3 py-2 text-ink-muted">{p.period}</td>
                                                    <td className="px-3 py-2 text-ink-2">{p.due_date}</td>
                                                    <td className="px-3 py-2 text-right text-ink-2">{fmtMoney(p.scheduled_amount, currency)}</td>
                                                    <td className="px-3 py-2">
                                                        <span className={`${LOAN_CHIP_CLS} ${scheduleChipCls(p.status)}`}>{p.status}</span>
                                                    </td>
                                                    <td className="px-3 py-2 text-ink-muted">
                                                        {p.payment_date ? String(p.payment_date).slice(0, 10) : "—"}
                                                    </td>
                                                </tr>
                                            ))}
                                        </tbody>
                                    </table>
                                </div>

                                {loanRow.repayment_method === "payroll_deduction" && (
                                    <p className="text-xs text-ink-faint">
                                        Repaid automatically via payroll — each approved payroll distribution records your deduction.
                                    </p>
                                )}
                            </>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
}

function Payslips({ onOpen }) {
    const [payruns, setPayruns] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPayslips = async () => {
        setLoading(true);
        try {
            const list = await payrollService.listRuns();
            setPayruns((Array.isArray(list) ? list : []).filter((r) => ["locked_in", "distributed"].includes(r.status)));
        } catch (err) {
            console.error("[Payslips] Error loading payroll history:", err);
        } finally {
            setLoading(false);
        }
        };
        fetchPayslips();
    }, []);

    return (
        <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
            <div className="border-b border-line-soft p-5">
                <h3 className="font-semibold text-ink">Payroll history</h3>
                <p className="text-xs text-ink-muted">Dynamic system payslips registered to your account.</p>
            </div>
            {loading ? (
                <div className="p-8 text-center text-ink-muted">Retrieving payslips...</div>
            ) : payruns.length === 0 ? (
                <div className="p-8 text-center text-ink-faint text-sm">No locked payslips logged for your account yet.</div>
            ) : (
                <ul className="divide-y divide-line-soft">
                    {payruns.map((m, i) => (
                        <motion.li key={m.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                            <button onClick={() => onOpen(m)} className="flex w-full items-center justify-between p-4 hover:bg-sunken">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-brand/10 text-brand"><FileText className="h-4 w-4" /></div>
                                    <div className="text-left">
                                        <div className="text-sm font-semibold text-ink">{MONTHS[(m.month || 1) - 1]} {m.year} · Payslip</div>
                                        <div className="text-xs text-ink-muted">{m.status === "distributed" ? "Paid" : "Locked in — payment pending"}</div>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-brand">View →</span>
                            </button>
                        </motion.li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function PayslipDrawer({ run, jobTitle = "", onClose }) {
    const { user } = useAuth();
    const period = `${MONTHS[(run.month || 1) - 1]} ${run.year}`;
    const paid = run.status === "distributed";

    const [state, setState] = useState({ loading: true, line: null, error: false });

    useEffect(() => {
        let stale = false;
        (async () => {
            try {
                const detail = await payrollService.getRun(run.id);
                const line = findEmployeeLine(extractRunLines(detail), user);
                if (!stale) setState({ loading: false, line, error: false });
            } catch (err) {
                console.error("[Payslip] Error loading run detail:", err);
                if (!stale) setState({ loading: false, line: null, error: true });
            }
        })();
        return () => { stale = true; };
    }, [run.id, user]);

    const amounts = state.line ? lineAmounts(state.line) : null;
    const fullName = state.line?.snapshot?.employee_name || getEmployeeName(user, "");

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
            <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-2xl flex-col bg-card shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-line-soft p-4">
                    <h3 className="font-semibold text-ink">Payslip · {period}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken"><X className="h-4 w-4" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-sunken p-6">
                    <div className="mx-auto max-w-xl rounded-2xl bg-card shadow-lg ring-1 ring-line p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h4 className="font-bold text-ink text-lg">Workplace Payslip</h4>
                                <p className="text-xs text-ink-muted">Pay Period: {period}</p>
                            </div>
                            <div className="text-right">
                                {paid ? (
                                    <span className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 font-semibold">PAID</span>
                                ) : (
                                    <span className="rounded bg-violet-50 px-2 py-1 text-xs text-violet-700 font-semibold">LOCKED IN</span>
                                )}
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-ink-faint block">Employee</span>
                                <span className="font-semibold text-ink">{fullName}</span>
                                <span className="text-ink-muted block">{jobTitle}</span>
                            </div>
                        </div>

                        {state.loading ? (
                            <div className="p-8 text-center text-ink-faint text-xs border-t border-dashed">
                                Retrieving your payslip…
                            </div>
                        ) : amounts ? (
                            <div className="space-y-2 border-t pt-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-brand">Earnings</div>
                                <Line label="Basic Salary" value={fmtMoney(amounts.base, run.currency)} />
                                <Line label="Allowances" value={fmtMoney(amounts.allowances, run.currency)} />
                                {amounts.gross != null && <Line label="Gross Pay" value={fmtMoney(amounts.gross, run.currency)} bold />}

                                <div className="text-xs font-semibold uppercase tracking-wider text-brand pt-2">Deductions</div>
                                <Line label="Total Deductions" value={fmtMoney(amounts.deductions, run.currency)} />

                                <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-brand/10 to-brand-2/5 p-4">
                                    <div className="text-sm font-semibold text-ink-2">Net Pay</div>
                                    <div className="text-2xl font-bold text-brand">{fmtMoney(amounts.net, run.currency)}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-ink-faint text-xs border-t border-dashed">
                                {state.error
                                    ? "Your payslip details couldn't be retrieved right now. Please try again later or contact HR."
                                    : "You aren't included in this payroll run. If you believe this is an error, contact HR."}
                            </div>
                        )}
                    </div>
                </div>
            </motion.div>
        </>
    );
}

function Line({ label, value, bold }) {
    return (
        <div className={`flex justify-between border-b border-dashed border-line-soft py-2 text-sm ${bold ? "font-semibold text-ink" : "text-ink-2"}`}>
        <span>{label}</span><span>{value}</span>
        </div>
    );
}

const DOC_ACCEPTED_TYPES = { "application/pdf": "PDF", "image/png": "PNG", "image/jpeg": "JPG" };
const DOC_MAX_BYTES = 8 * 1024 * 1024;

function UploadDropzone({ id, onPick }) {
    return (
        <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-sunken/60 px-4 py-6 text-center">
            <Upload className="h-5 w-5 text-ink-faint" />
            <input
                type="file"
                id={id}
                accept=".pdf,.png,.jpg,.jpeg,application/pdf,image/png,image/jpeg"
                className="hidden"
                onChange={(e) => {
                    onPick(e.target.files[0]);
                    e.target.value = ""; // allow re-picking the same file
                }}
            />
            <label htmlFor={id} className="mt-2 text-xs text-ink-muted cursor-pointer">
                Drop file or <span className="font-semibold text-brand">browse</span>
            </label>
        </div>
    );
}

function DocsUpload() {
    const { user } = useAuth();
    const toast = useToast();
    const [loading, setLoading] = useState(true);
    const [requiredDocs, setRequiredDocs] = useState([]);
    const [uploads, setUploads] = useState([]);
    const [tick, setTick] = useState(0);

    useEffect(() => {
        let stale = false;
        (async () => {
            try {
                // Requirements come from the job role; /api/documentations/
                // lists what's already been uploaded (with approval status).
                // The unfiltered list is org-wide (everyone's uploads plus
                // leave/profile-update attachments) — ask the server for just
                // this employee's own documents.
                const [roleRes, docsRes] = await Promise.all([
                    user?.job_role_id ? api.get(`/api/job-roles/${user.job_role_id}`).catch(() => null) : Promise.resolve(null),
                    user?.id
                        ? api.get(`/api/documentations/?feature_type=EMPLOYEE_DOCUMENT&uploaded_by_employee_id=${encodeURIComponent(user.id)}`).catch(() => [])
                        : Promise.resolve([]),
                ]);
                if (stale) return;
                const jr = roleRes?.jobRole || roleRes?.job_role || roleRes || {};
                setRequiredDocs(Array.isArray(jr.required_documents) ? jr.required_documents : []);
                const rows = Array.isArray(docsRes) ? docsRes : docsRes?.documents || docsRes?.items || [];
                // Defense in depth: only the user's own uploads, even if the
                // backend ignores the query filter.
                setUploads(rows.filter((d) => d.uploaded_by_employee_id === user?.id));
            } finally {
                if (!stale) setLoading(false);
            }
        })();
        return () => { stale = true; };
    }, [user?.job_role_id, user?.id, tick]);

    const handleUpload = async (doc, file) => {
        if (!file) return;
        if (!DOC_ACCEPTED_TYPES[file.type]) {
            toast.error("That file type isn't accepted — use a PDF, PNG or JPG.");
            return;
        }
        if (file.size > DOC_MAX_BYTES) {
            toast.error("File is too large — the limit is 8 MB.");
            return;
        }
        const formData = new FormData();
        formData.append("file", file);
        // Contract (confirmed against the API): feature_type is required;
        // title/description are persisted, and without a title the backend
        // falls back to the raw file name. title is also how requirement
        // cards recognise their upload (matched by title === doc.name).
        // required_document_id/name are still ignored — sent anyway for when
        // the backend learns to link uploads to requirements (backend ask).
        formData.append("feature_type", "EMPLOYEE_DOCUMENT");
        if (doc?.name) formData.append("title", doc.name);
        if (doc?.id) {
            formData.append("required_document_id", doc.id);
            formData.append("description", `Required document: ${doc.name} (${doc.id})`);
        }
        if (doc?.name) formData.append("name", doc.name);
        try {
            await api.post("/api/documentations/upload", formData, {
                headers: { "Content-Type": "multipart/form-data" },
            });
            toast.success(`${doc?.name || file.name} uploaded and queued for approval!`);
            setTick((t) => t + 1);
        } catch (err) {
            console.error("[DocsUpload] Upload failed:", err);
            toast.error(err?.error?.message || err?.message || "Error uploading document.");
        }
    };

    const docStatus = (d) => String(d.status || "pending").toLowerCase();
    // Shared helper uses startsWith — "pending_approval" stays amber instead
    // of reading as approved (the old includes("approv") bug).
    const statusChip = (d) => statusBadgeCls(d.status);
    // Uploads are linked to requirement cards by title (set to doc.name at
    // upload time); prefer an approved copy over a newer pending one.
    const uploadFor = (name) =>
        uploads.find((d) => d.title === name && docStatus(d).startsWith("approv")) ||
        uploads.find((d) => d.title === name);

    if (loading) {
        return <div className="p-8 text-center text-ink-muted bg-card border rounded-2xl">Retrieving document templates...</div>;
    }

    return (
        <div className="space-y-4">
            <div className="grid gap-4 md:grid-cols-2">
                {requiredDocs.map((d) => {
                    const uploaded = uploadFor(d.name);
                    return (
                        <div key={d.id} className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
                            <div className="flex items-start justify-between gap-2">
                                <div>
                                    <div className="font-semibold text-ink">{d.name || ""}</div>
                                    <div className="text-xs text-ink-muted mt-0.5">PDF, PNG or JPG up to 8MB{d.is_mandatory ? " · Required" : ""}</div>
                                </div>
                                {uploaded && (
                                    <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusChip(uploaded)}`}>
                                        {docStatus(uploaded).replace(/_/g, " ")}
                                    </span>
                                )}
                            </div>
                            <UploadDropzone id={`file-${d.id}`} onPick={(file) => handleUpload(d, file)} />
                        </div>
                    );
                })}
                <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
                    <div>
                        <div className="font-semibold text-ink">{requiredDocs.length ? "Other document" : "Upload a document"}</div>
                        <div className="text-xs text-ink-muted mt-0.5">PDF, PNG or JPG up to 8MB</div>
                    </div>
                    <UploadDropzone id="file-general" onPick={(file) => handleUpload(null, file)} />
                </div>
            </div>

            <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
                <div className="border-b border-line-soft p-5">
                    <h3 className="font-semibold text-ink">My uploaded documents</h3>
                    <p className="text-xs text-ink-muted">Each upload goes through approval — track its status here.</p>
                </div>
                {uploads.length === 0 ? (
                    <div className="p-6 text-center text-xs text-ink-faint">Nothing uploaded yet.</div>
                ) : (
                    <ul className="divide-y divide-line-soft">
                        {uploads.map((d) => (
                            <li key={d.id} className="flex items-center justify-between gap-3 p-4">
                                <div className="flex min-w-0 items-center gap-3">
                                    <div className="flex h-9 w-9 shrink-0 items-center justify-center rounded-lg bg-brand/10 text-brand"><FileText className="h-4 w-4" /></div>
                                    <div className="min-w-0">
                                        <div className="truncate text-sm font-semibold text-ink">{d.title || d.original_file_name || "Document"}</div>
                                        <div className="text-xs text-ink-muted">{String(d.created_at || "").slice(0, 10)}</div>
                                    </div>
                                </div>
                                <span className={`shrink-0 rounded-full px-2.5 py-1 text-[10px] font-bold uppercase tracking-wider ${statusChip(d)}`}>
                                    {docStatus(d).replace(/_/g, " ")}
                                </span>
                            </li>
                        ))}
                    </ul>
                )}
            </div>
        </div>
    );
}


export default ESSPage