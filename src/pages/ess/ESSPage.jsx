import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { X, FileText, Upload } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useToast } from "../../components/ui/Notifications";
import { setupService } from "../../services/setupService";
import { approvalService } from "../../services/approvalService";
import { getEmployeeName, getInitials } from "../../utils/employee";
import api from "../../services/api";

function useOrgNames(user) {
    const [lookups, setLookups] = useState({ departments: [], jobRoles: [] });
    const hasIds = !!(user?.department_id || user?.job_role_id);

    useEffect(() => {
        if (!hasIds) return;
        let mounted = true;
        (async () => {
            const [departments, jobRoles] = await Promise.all([
                setupService.getDepartments().catch(() => []),
                setupService.getJobRoles().catch(() => []),
            ]);
            if (mounted) setLookups({ departments: departments || [], jobRoles: jobRoles || [] });
        })();
        return () => { mounted = false; };
    }, [hasIds]);

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

    const bio = user?.employee_biodata || user?.biodata || {};
    const firstName = bio.firstname || "";
    const { department: departmentName, jobTitle, jobRoles } = useOrgNames(user);

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">Self-service</div>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900"> {firstName ? `Hi, ${firstName} 👋` : "Hi, Employee 👋"}</h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {jobTitle && <span>{jobTitle}</span>}
                        {jobTitle && departmentName && <span> · </span>}
                        {departmentName && <span>{departmentName}</span>}
                    </p>
                </div>
            </div>

            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm w-fit max-w-full overflow-x-auto">
                {["profile", "leave", "payslips", "docs", "team"].map((t) => (
                <button key={t} onClick={() => setTab(t)} className="relative rounded-lg px-4 py-1.5 text-xs font-semibold capitalize">
                    {tab === t && (
                        <motion.div
                            layoutId="ess-tab"
                            className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#4f1a60] to-[#8a2da8]"
                            transition={{ type: "spring", stiffness: 400, damping: 32 }}
                        />
                    )}
                    <span className={`relative ${tab === t ? "text-white" : "text-slate-600"}`}>
                        {t === "docs" ? "Documents" : t === "team" ? "My Team" : t}
                    </span>
                </button>
                ))}
            </div>

            {tab === "profile" && (
                <>
                    <ProfileChange />
                    <MyProfileRequests />
                </>
            )}
            {tab === "leave" && <LeaveTracker onRequestLeave={setActiveLeaveRequest} />}
            {tab === "payslips" && <Payslips onOpen={(m) => setDrawer({ month: m })} />}
            {tab === "docs" && <DocsUpload />}
            {tab === "team" && (
                <TeamDirectory
                    departmentId={user?.department_id}
                    departmentName={departmentName}
                    jobRoles={jobRoles}
                />
            )}

            <AnimatePresence>
                {drawer && <PayslipDrawer month={drawer.month} jobTitle={jobTitle} onClose={() => setDrawer(null)} />}
                {activeLeaveRequest && (
                    <LeaveRequestModal 
                        leaveType={activeLeaveRequest}
                        onClose={() => setActiveLeaveRequest(null)}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}


function ProfileChange() {
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
                toast.info("Change your phone or address before submitting.");
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
        } catch (err) {
            console.error("[ESS] Request failed:", err);
            toast.error(err?.error?.message || err?.message || "Error submitting profile change request.");
        } finally {
            setLoading(false);
        }
    };

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <div className="mb-4 flex items-center justify-between flex-wrap gap-2">
                <div>
                    <h3 className="font-semibold text-slate-900">Profile change requests</h3>
                    <p className="text-xs text-slate-500">Edits require HR validation before being applied to your immutable record.</p>
                </div>
                <button 
                    onClick={handleSubmit} 
                    disabled={loading}
                    className="rounded-xl bg-[#4f1a60] text-white px-4 py-2 text-xs font-semibold shadow-sm disabled:opacity-75"
                >
                    {loading ? "Submitting..." : "Submit Requests"}
                </button>
            </div>
        
            <div className="grid gap-3 md:grid-cols-2">
                <div className="relative rounded-xl border border-slate-200 p-3 focus-within:border-[#4f1a60] transition-colors">
                    <label className="text-xs font-semibold text-slate-600 block">Phone Number</label>
                    <input 
                        value={form.phone} 
                        onChange={(e) => handleChange("phone", e.target.value)} 
                        className="mt-1 w-full bg-transparent text-sm text-slate-800 outline-none" 
                    />
                </div>
                <div className="relative rounded-xl border border-slate-200 p-3 focus-within:border-[#4f1a60] transition-colors">
                    <label className="text-xs font-semibold text-slate-600 block">Home Address</label>
                    <input 
                        value={form.address} 
                        onChange={(e) => handleChange("address", e.target.value)} 
                        className="mt-1 w-full bg-transparent text-sm text-slate-800 outline-none" 
                    />
                </div>
                <div className="relative rounded-xl border border-slate-200 p-3 focus-within:border-[#4f1a60] transition-colors">
                    <label className="text-xs font-semibold text-slate-600 block">Bank Name</label>
                    <input 
                        value={form.bankName} 
                        onChange={(e) => handleChange("bankName", e.target.value)} 
                        className="mt-1 w-full bg-transparent text-sm text-slate-800 outline-none" 
                    />
                </div>
                <div className="relative rounded-xl border border-slate-200 p-3 focus-within:border-[#4f1a60] transition-colors">
                    <label className="text-xs font-semibold text-slate-600 block">Account Number</label>
                    <input 
                        value={form.accountNumber} 
                        onChange={(e) => handleChange("accountNumber", e.target.value)} 
                        className="mt-1 w-full bg-transparent text-sm text-slate-800 outline-none" 
                    />
                </div>
            </div>
        </div>
    );
}

function MyProfileRequests() {
    const { user } = useAuth();
    const [state, setState] = useState({ loading: true, items: [], unavailable: false });
    const employeeId = user?.id;

    useEffect(() => {
        if (!employeeId) return;
        let mounted = true;
        (async () => {
            try {
                const res = await approvalService.getMyProfileUpdates(employeeId);
                const items = Array.isArray(res) ? res : res?.requests || res?.items || res?.data || [];
                if (mounted) setState({ loading: false, items, unavailable: false });
            } catch (err) {
                console.error("[ESS] Request history unavailable:", err);
                if (mounted) setState({ loading: false, items: [], unavailable: true });
            }
        })();
        return () => { mounted = false; };
    }, [employeeId]);

    if (state.loading || state.unavailable) return null;

    const badge = (status) => {
        const s = (status || "pending").toLowerCase();
        if (s.includes("approv")) return "bg-emerald-50 text-emerald-700";
        if (s.includes("reject") || s.includes("decl")) return "bg-red-50 text-red-700";
        return "bg-amber-50 text-amber-700";
    };

    return (
        <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
            <h3 className="font-semibold text-slate-900">My change requests</h3>
            <p className="text-xs text-slate-500">Track the status of updates you’ve submitted.</p>
            {state.items.length === 0 ? (
                <div className="mt-4 p-6 text-center text-xs text-slate-400 border border-dashed border-slate-200 rounded-xl">
                    No change requests submitted yet.
                </div>
            ) : (
                <ul className="mt-4 divide-y divide-slate-100">
                    {state.items.map((r, i) => {
                        const changes = r.changes || r.payload?.changes || {};
                        return (
                            <li key={r.id || i} className="flex items-start justify-between gap-4 py-3">
                                <div className="min-w-0 text-xs text-slate-600">
                                    {Object.entries(changes).map(([k, v]) => (
                                        <div key={k}>
                                            <span className="font-semibold capitalize">{k.replace(/_/g, " ")}:</span> {String(v)}
                                        </div>
                                    ))}
                                    {r.created_at && (
                                        <div className="mt-1 text-[10px] text-slate-400">{String(r.created_at).slice(0, 10)}</div>
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
                const res = await api.get("/api/users/?limit=100");
                const all = Array.isArray(res) ? res : res?.users || [];
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
        return <div className="p-8 text-center text-slate-500 bg-white border rounded-2xl">Loading your team...</div>;
    }
    if (!departmentId) {
        return (
            <div className="p-8 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
                You haven’t been assigned to a department yet. Ask HR to complete your profile.
            </div>
        );
    }
    if (blocked) {
        return (
            <div className="p-8 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
                The employee directory isn’t available for your role.
            </div>
        );
    }
    if (members.length === 0) {
        return (
            <div className="p-8 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
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
                    <div key={m.id} className="flex items-center gap-3 rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm">
                        <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-[#4f1a60] to-[#8a2da8] text-xs font-bold text-white">
                            {initials}
                        </div>
                        <div className="min-w-0">
                            <div className="truncate text-sm font-semibold text-slate-900">{name}</div>
                            <div className="truncate text-xs text-slate-500">{roleTitle(m.job_role_id) || m.email}</div>
                        </div>
                    </div>
                );
            })}
        </div>
    );
}

function LeaveTracker({ onRequestLeave }) {
    const [loading, setLoading] = useState(false);
    const [leaveTypes, setLeaveTypes] = useState([]);

    useEffect(() => {
        const fetchLeaves = async () => {
        setLoading(true);
        try {
            const res = await setupService.getLeaveTypes();
            setLeaveTypes(Array.isArray(res) ? res : []);
        } catch (err) {
            console.error("[LeaveTracker] Error loading leaves:", err);
        } finally {
            setLoading(false);
        }
        };
        fetchLeaves();
    }, []);

    return (
        <div className="space-y-6">
            {loading ? (
                <div className="p-8 text-center text-slate-500 bg-white border rounded-2xl">Retrieving leave balances...</div>
            ) : leaveTypes.length === 0 ? (
                <div className="p-8 text-center text-slate-400 bg-white border border-dashed rounded-2xl">
                    No leave packages configured in your organization yet.
                </div>
            ) : (
                <div className="grid gap-6 lg:grid-cols-3">
                    {leaveTypes.map((g) => {
                        const daysAllowed = Number(g.days_allowed) || 0;
                        const daysUsed = 0; 
                        const pct = daysAllowed > 0 ? (daysUsed / daysAllowed) : 0;
                        const C = 2 * Math.PI * 42;
                        return (
                            <motion.div key={g.id || g.code} whileHover={{ y: -4 }} className="rounded-2xl border border-slate-200/80 bg-white p-6 text-center shadow-sm">
                                <div className="relative mx-auto h-32 w-32">
                                    <svg viewBox="0 0 100 100" className="-rotate-90">
                                        <circle cx="50" cy="50" r="42" stroke="#f1f5f9" strokeWidth="10" fill="none" />
                                        <motion.circle cx="50" cy="50" r="42" stroke="#4f1a60" strokeWidth="10" fill="none" strokeLinecap="round"
                                        strokeDasharray={C}
                                        initial={{ strokeDashoffset: C }}
                                        animate={{ strokeDashoffset: C * (1 - pct) }}
                                        transition={{ duration: 1, ease: "easeOut" }}
                                        />
                                    </svg>
                                    <div className="absolute inset-0 flex flex-col items-center justify-center">
                                        <div className="text-2xl font-bold text-slate-900">{daysAllowed - daysUsed}</div>
                                        <div className="text-[10px] uppercase text-slate-500">days left</div>
                                    </div>
                                </div>
                                <div className="mt-4 font-semibold text-slate-900 capitalize">{g.name}</div>
                                <div className="text-xs text-slate-500">{daysUsed} of {daysAllowed} used</div>
                                <button onClick={() => onRequestLeave(g)} className="mt-4 w-full rounded-lg bg-[#4f1a60] px-3 py-2 text-xs font-semibold text-white active:scale-95 transition-transform">
                                    Request leave
                                </button>
                            </motion.div>
                        );
                    })}
                </div>
            )}

            <div className="rounded-2xl border border-slate-200/80 bg-white p-6 shadow-sm">
                <h4 className="font-semibold text-slate-900">Upcoming team leaves</h4>
                <div className="p-8 text-center text-slate-400 text-sm">
                    No upcoming employee leaves logged in your department.
                </div>
            </div>
        </div>
    );
}

function LeaveRequestModal({ leaveType, onClose }) {
  const toast = useToast();
  const [startDate, setStartDate] = useState("");
  const [endDate, setEndDate] = useState("");
  const [reason, setReason] = useState("");
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      if (endDate < startDate) {
        toast.error("End date can’t be before the start date.");
        setLoading(false);
        return;
      }
      const payload = {
        leave_type_id: leaveType.id,
        start_date: startDate,
        end_date: endDate,
        reason: reason.trim()
      };
      await api.post("/api/leave-requests/", payload);
      toast.success(`Leave request for ${leaveType.name} submitted successfully!`);
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
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <div className="flex items-center justify-between border-b pb-3">
          <h3 className="text-lg font-bold text-slate-900 capitalize">Request {leaveType.name}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>
        
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Start Date</label>
              <input type="date" value={startDate} onChange={e => setStartDate(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" required />
            </div>
            <div>
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">End Date</label>
              <input type="date" value={endDate} min={startDate || undefined} onChange={e => setEndDate(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" required />
            </div>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Purpose / Reason</label>
            <textarea value={reason} onChange={e => setReason(e.target.value)} className="w-full h-24 border border-slate-200 rounded-xl p-3 outline-none mt-1 resize-none" placeholder="Provide a brief reason for cover..." required />
          </div>
          <div className="flex gap-2 justify-end pt-2">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" disabled={loading} className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold disabled:opacity-75">
              {loading ? "Submitting..." : "Submit Leave Request"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function Payslips({ onOpen }) {
    const [payruns, setPayruns] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        const fetchPayslips = async () => {
        setLoading(true);
        try {
            const res = await api.get("/api/payroll/runs");
            const list = Array.isArray(res) ? res : res?.runs || res?.items || res?.data || [];
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
        <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
            <div className="border-b border-slate-100 p-5">
                <h3 className="font-semibold text-slate-900">Payroll history</h3>
                <p className="text-xs text-slate-500">Dynamic system payslips registered to your account.</p>
            </div>
            {loading ? (
                <div className="p-8 text-center text-slate-500">Retrieving payslips...</div>
            ) : payruns.length === 0 ? (
                <div className="p-8 text-center text-slate-400 text-sm">No locked payslips logged for your account yet.</div>
            ) : (
                <ul className="divide-y divide-slate-100">
                    {payruns.map((m, i) => (
                        <motion.li key={m.id || i} initial={{ opacity: 0, x: -8 }} animate={{ opacity: 1, x: 0 }} transition={{ delay: i * 0.04 }}>
                            <button onClick={() => onOpen(m.month)} className="flex w-full items-center justify-between p-4 hover:bg-slate-50">
                                <div className="flex items-center gap-3">
                                    <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-[#4f1a60]/10 text-[#4f1a60]"><FileText className="h-4 w-4" /></div>
                                    <div className="text-left">
                                        <div className="text-sm font-semibold text-slate-900">Month {m.month} · Payslip</div>
                                        <div className="text-xs text-slate-500">Net pay ₦{(Number(m.total_net) || 0).toLocaleString()}</div>
                                    </div>
                                </div>
                                <span className="text-xs font-semibold text-[#4f1a60]">View →</span>
                            </button>
                        </motion.li>
                    ))}
                </ul>
            )}
        </div>
    );
}

function PayslipDrawer({ month, jobTitle = "", onClose }) {
    const { user } = useAuth();
    const fullName = getEmployeeName(user, "");
    const salary = Number(user?.base_salary) || 0;

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/30 backdrop-blur-sm" />
            <motion.div
                initial={{ x: "100%" }} animate={{ x: 0 }} exit={{ x: "100%" }}
                transition={{ type: "spring", stiffness: 300, damping: 30 }}
                className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-2xl flex-col bg-white shadow-2xl"
            >
                <div className="flex items-center justify-between border-b border-slate-100 p-4">
                    <h3 className="font-semibold text-slate-900">Payslip · Month {month}</h3>
                    <div className="flex items-center gap-2">
                        <button onClick={onClose} className="rounded-lg p-1.5 text-slate-500 hover:bg-slate-100"><X className="h-4 w-4" /></button>
                    </div>
                </div>
                <div className="flex-1 overflow-y-auto bg-slate-50 p-6">
                    <div className="mx-auto max-w-xl rounded-2xl bg-white shadow-lg ring-1 ring-slate-200 p-6 space-y-4">
                        <div className="flex items-center justify-between border-b pb-4">
                            <div>
                                <h4 className="font-bold text-slate-900 text-lg">Workplace Payslip</h4>
                                <p className="text-xs text-slate-500">Pay Date: Month {month}</p>
                            </div>
                            <div className="text-right">
                                <span className="rounded bg-emerald-50 px-2 py-1 text-xs text-emerald-700 font-semibold">PAID</span>
                            </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4 text-xs">
                            <div>
                                <span className="text-slate-400 block">Employee</span>
                                <span className="font-semibold text-slate-900">{fullName}</span>
                                <span className="text-slate-500 block">{jobTitle}</span>
                            </div>
                        </div>

                        {salary > 0 ? (
                            <div className="space-y-2 border-t pt-4">
                                <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">Earnings</div>
                                <Line label="Basic Salary" value={salary.toLocaleString()} />
                                
                                <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60] pt-2">Deductions</div>
                                <Line label="Pension (8%)" value={(salary * 0.08).toLocaleString()} />
                                <Line label="NHF (2.5%)" value={(salary * 0.025).toLocaleString()} />
                                
                                <div className="mt-5 flex items-center justify-between rounded-xl bg-gradient-to-r from-[#4f1a60]/10 to-[#8a2da8]/5 p-4">
                                    <div className="text-sm font-semibold text-slate-700">Estimated Net Pay</div>
                                    <div className="text-2xl font-bold text-[#4f1a60]">₦{(salary - (salary * 0.105)).toLocaleString()}</div>
                                </div>
                            </div>
                        ) : (
                            <div className="p-8 text-center text-slate-400 text-xs border-t border-dashed">
                                No active base salary logged on your profile database.
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
        <div className={`flex justify-between border-b border-dashed border-slate-100 py-2 text-sm ${bold ? "font-semibold text-slate-900" : "text-slate-700"}`}>
        <span>{label}</span><span>₦{value}</span>
        </div>
    );
}

function DocsUpload() {
    const toast = useToast();
    const [loading, setLoading] = useState(false);
    const [requiredDocs, setRequiredDocs] = useState([]);

    useEffect(() => {
        const fetchRequiredDocs = async () => {
            setLoading(true);
            try {
                const res = await api.get("/api/documentations/");
                setRequiredDocs(res || []);
            } catch (err) {
                console.error("[DocsUpload] Error loading criteria:", err);
            } finally {
                setLoading(false);
            }
        };
        fetchRequiredDocs();
    }, []);

  const handleUpload = async (doc, file) => {
        if (!file) return;
        const formData = new FormData();
        formData.append("file", file);
        // Link the upload to the requirement card it was dropped on — without
        // this the backend can't tell which required document it satisfies.
        // TODO(backend): confirm the expected field name for the reference.
        formData.append("required_document_id", doc.id);
        if (doc.name) formData.append("name", doc.name);
        try {
            await api.post("/api/documentations/upload", formData, {
                headers: {
                "Content-Type": "multipart/form-data",
                },
        });
            toast.success(`${doc.name || "Document"} uploaded and queued for approval!`);
        } catch (err) {
            console.error("[DocsUpload] Upload failed:", err);
            toast.error(err?.message || "Error uploading document.");
        }
  };

  return (
    <div className="grid gap-4 md:grid-cols-2">
        {loading ? (
            <div className="p-8 text-center text-slate-500 bg-white border rounded-2xl md:col-span-2">Retrieving document templates...</div>
        ) : requiredDocs.length === 0 ? (
            <div className="p-8 text-center text-slate-400 bg-white border border-dashed rounded-2xl md:col-span-2">
                No required documents assigned to your profile yet.
            </div>
        ) : (
            requiredDocs.map((d) => (
                <div key={d.id} className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm">
                    <div className="flex items-start justify-between">
                        <div>
                            <div className="font-semibold text-slate-900">{d.name || ""}</div>
                            <div className="text-xs text-slate-500 mt-0.5">PDF, PNG or JPG up to 8MB</div>
                        </div>
                    </div>
                    <div className="mt-4 flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-slate-200 bg-slate-50/60 px-4 py-6 text-center">
                        <Upload className="h-5 w-5 text-slate-400" />
                        <input
                            type="file"
                            id={`file-${d.id}`}
                            className="hidden"
                            onChange={(e) => {
                                handleUpload(d, e.target.files[0]);
                                e.target.value = ""; // allow re-picking the same file
                            }}
                        />
                        <label htmlFor={`file-${d.id}`} className="mt-2 text-xs text-slate-600 cursor-pointer">
                            Drop file or <span className="font-semibold text-[#4f1a60]">browse</span>
                        </label>
                    </div>
                </div>
            ))
        )}
    </div>
  );
}


export default ESSPage