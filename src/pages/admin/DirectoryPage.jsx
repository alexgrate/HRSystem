import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Trash2, UserX, UserCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { usePermissions } from "../../context/PermissionContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { setupService } from "../../services/setupService";
import { getEmployeeName } from "../../utils/employee";
import api from "../../services/api";

const TABS = ["Employees", "Offices", "Departments", "Job Titles", "Grades", "Pay Grades", "Pay Groups", "Benefit Levels", "Allowances", "Leave Types"];
const PAGE_SIZE = 10;

const StatusBadge = ({ active }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-slate-100 text-slate-600"}`}>
    {active ? "Active" : "Inactive"}
  </span>
);


const pruneEmpty = (obj) =>
  Object.fromEntries(Object.entries(obj).filter(([, v]) => v !== "" && v !== null && v !== undefined));

const resolvePayGradeId = (value, grades) => {
  if (!value) return "";
  const match = grades.find((g) => g.id === value || g.name === value || g.code === value);
  return match ? match.id : "";
};

const DirectoryPage = () => {
  const { user } = useAuth();
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState("Employees");
  const [q, setQ] = useState("");
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [allDepartments, setAllDepartments] = useState([]);
  const [allPayGrades, setAllPayGrades] = useState([]);
  const [allBenefitLevels, setAllBenefitLevels] = useState([]);
  const [allJobRoles, setAllJobRoles] = useState([]);
  const [allStaff, setAllStaff] = useState([]); // manager picker + name lookups

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);
  const [searchCapped, setSearchCapped] = useState(false);

  const [refreshTick, setRefreshTick] = useState(0);
  const [lookupsTick, setLookupsTick] = useState(0);
  const refreshAll = () => {
    setRefreshTick((t) => t + 1);
    setLookupsTick((t) => t + 1);
  };

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [setupModal, setSetupModal] = useState(null); // { mode: 'create'|'edit', record }

  const canUpdateEmployee = can(RESOURCE_CODES.EMPLOYEES, "update");

  const SETUPS = useMemo(() => ({
    Offices: {
      resource: RESOURCE_CODES.OFFICE_LOCATIONS,
      singular: "Office Location",
      list: () => setupService.getOffices(),
      create: (d) => setupService.createOffice(d),
      update: (id, d) => setupService.updateOffice(id, d),
      remove: (id) => setupService.deleteOffice(id),
      columns: [
        { header: "Address", render: (r) => <span className="font-semibold text-slate-900">{r.address}</span> },
        { header: "State", render: (r) => r.state },
        { header: "Country", render: (r) => r.country },
        {
          header: "Type",
          render: (r) => r.headquarter
            ? <span className="rounded bg-purple-50 px-2.5 py-1 text-xs text-[#4f1a60] font-semibold">Headquarters</span>
            : <span className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Branch</span>,
        },
      ],
      fields: [
        { key: "address", label: "Street Address", type: "text", required: true },
        { key: "state", label: "State", type: "text", required: true },
        { key: "country", label: "Country", type: "text", required: true, default: "Nigeria" },
        { key: "headquarter", label: "Set as Headquarters", type: "checkbox" },
      ],
    },
    Departments: {
      resource: RESOURCE_CODES.DEPARTMENTS,
      singular: "Department",
      list: () => setupService.getDepartments(),
      create: (d) => setupService.createDepartment(d),
      update: (id, d) => setupService.updateDepartment(id, d),
      remove: (id) => setupService.deleteDepartment(id),
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-[#4f1a60] font-semibold">{r.code}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "name", label: "Department Name", type: "text", required: true },
        { key: "code", label: "Department Code", type: "text", required: true, placeholder: "e.g. FIN" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
    "Job Titles": {
      resource: RESOURCE_CODES.JOB_ROLES,
      singular: "Job Title",
      list: () => setupService.getJobRoles(),
      create: (d) => setupService.createJobRole(d),
      update: (id, d) => setupService.updateJobRole(id, d),
      remove: (id) => setupService.deleteJobRole(id),
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-[#4f1a60] font-semibold">{r.code || "—"}</span> },
        { header: "Title", render: (r) => <span className="font-medium text-slate-900">{r.title}</span> },
        { header: "Department", render: (r) => allDepartments.find((d) => d.id === r.department_id)?.name || "—" },
        { header: "Required Docs", render: (r) => (r.required_documents?.length ? `${r.required_documents.length} doc${r.required_documents.length > 1 ? "s" : ""}` : "—") },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "title", label: "Job Title", type: "text", required: true, placeholder: "e.g. HR Manager" },
        { key: "code", label: "Role Code", type: "text", required: true, placeholder: "e.g. HRM" },
        { key: "department_id", label: "Department", type: "select", required: true, options: allDepartments.map((d) => ({ value: d.id, label: d.name })) },
        { key: "description", label: "Description", type: "textarea" },
        { key: "required_documents", label: "Required Documents", type: "doclist", addLabel: "Add document", placeholder: "e.g. National ID" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
    "Pay Grades": {
      resource: RESOURCE_CODES.PAY_GRADES,
      singular: "Pay Grade",
      list: () => setupService.getPayGrades(),
      create: (d) => setupService.createPayGrade(d),
      update: (id, d) => setupService.updatePayGrade(id, d),
      remove: (id) => setupService.deletePayGrade(id),
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-[#4f1a60] font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: "Range", render: (r) => `₦${(Number(r.min_salary) || 0).toLocaleString()} - ₦${(Number(r.max_salary) || 0).toLocaleString()}` },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "name", label: "Pay Grade Name", type: "text", required: true },
        { key: "code", label: "Grade Code", type: "text" },
        { key: "benefit_level_id", label: "Benefit Level", type: "select", options: allBenefitLevels.map((b) => ({ value: b.id, label: b.name })) },
        { key: "min_salary", label: "Min Salary (₦)", type: "number" },
        { key: "max_salary", label: "Max Salary (₦)", type: "number" },
        { key: "currency", label: "Currency", type: "text", default: "NGN" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
    "Benefit Levels": {
      resource: RESOURCE_CODES.BENEFIT_LEVELS,
      singular: "Benefit Level",
      list: () => setupService.getBenefitLevels(),
      create: (d) => setupService.createBenefitLevel(d),
      update: (id, d) => setupService.updateBenefitLevel(id, d),
      remove: (id) => setupService.deleteBenefitLevel(id),
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-[#4f1a60] font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "name", label: "Benefit Level Name", type: "text", required: true },
        { key: "code", label: "Benefit Code", type: "text" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
    Grades: {
      resource: RESOURCE_CODES.GRADES,
      singular: "Grade",
      list: () => setupService.getGrades(),
      create: (d) => setupService.createGrade(d),
      update: (id, d) => setupService.updateGrade(id, d),
      remove: (id) => setupService.deleteGrade(id),
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-[#4f1a60] font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: "Level", render: (r) => r.level ?? "—" },
        { header: "Range", render: (r) => `₦${(Number(r.min_salary) || 0).toLocaleString()} - ₦${(Number(r.max_salary) || 0).toLocaleString()}` },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "name", label: "Grade Name", type: "text", required: true, placeholder: "e.g. Entry Level" },
        { key: "code", label: "Grade Code", type: "text", placeholder: "e.g. G1" },
        { key: "level", label: "Level", type: "text", placeholder: "e.g. 1" },
        { key: "min_salary", label: "Min Salary (₦)", type: "number" },
        { key: "max_salary", label: "Max Salary (₦)", type: "number" },
        { key: "currency", label: "Currency", type: "text", default: "NGN" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
    "Pay Groups": {
      resource: RESOURCE_CODES.PAY_GROUPS,
      singular: "Pay Group",
      list: () => setupService.getPayGroups(),
      create: (d) => setupService.createPayGroup(d),
      update: (id, d) => setupService.updatePayGroup(id, d),
      remove: (id) => setupService.deletePayGroup(id),
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-[#4f1a60] font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "name", label: "Pay Group Name", type: "text", required: true, placeholder: "e.g. Monthly Staff" },
        { key: "code", label: "Code", type: "text", placeholder: "e.g. PG_MONTHLY" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
    Allowances: {
      resource: RESOURCE_CODES.BENEFIT_LEVELS, // allowances hang off benefit levels
      singular: "Allowance",
      list: () => setupService.getBenefitLevelAllowances(),
      create: (d) => setupService.createBenefitLevelAllowance(d),
      // list + create only — backend has no PUT/DELETE for allowances yet
      columns: [
        { header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name || "—"}</span> },
        { header: "Benefit Level", render: (r) => allBenefitLevels.find((b) => b.id === r.benefit_level_id)?.name || "—" },
        { header: "Amount", render: (r) => (r.amount != null ? `₦${Number(r.amount).toLocaleString()}` : "—") },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      // NOTE: allowance schema isn't in the API doc — fields are a best guess;
      // a create attempt's validation error will confirm the real shape.
      fields: [
        { key: "name", label: "Allowance Name", type: "text", required: true, placeholder: "e.g. Housing Allowance" },
        { key: "benefit_level_id", label: "Benefit Level", type: "select", required: true, options: allBenefitLevels.map((b) => ({ value: b.id, label: b.name })) },
        { key: "amount", label: "Amount (₦)", type: "number" },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
    "Leave Types": {
      resource: RESOURCE_CODES.LEAVE_REQUESTS, // no dedicated LEAVE_TYPE resource; gate by leave
      singular: "Leave Type",
      list: () => setupService.getLeaveTypes(),
      create: (d) => setupService.createLeaveType(d),
      // no update/remove — backend exposes list + create only for leave types
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-[#4f1a60] font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-slate-900">{r.name}</span> },
        { header: "Days", render: (r) => r.days_allowed ?? "—" },
        { header: "Paid", render: (r) => (r.is_paid ? "Yes" : "No") },
        { header: "Approval", render: (r) => (r.requires_approval ? "Required" : "Auto") },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "name", label: "Leave Type Name", type: "text", required: true, placeholder: "e.g. Annual Leave" },
        { key: "code", label: "Code", type: "text", placeholder: "e.g. LV_ANNUAL" },
        // Backend rejects leave types without a benefit level attached.
        { key: "benefit_level_id", label: "Benefit Level", type: "select", required: true, options: allBenefitLevels.map((b) => ({ value: b.id, label: b.name })) },
        { key: "days_allowed", label: "Days Allowed", type: "number" },
        { key: "is_paid", label: "Paid Leave", type: "checkbox", default: true },
        { key: "requires_approval", label: "Requires Approval", type: "checkbox", default: true },
        { key: "description", label: "Description", type: "textarea" },
        { key: "is_active", label: "Active", type: "checkbox", default: true },
      ],
    },
  }), [allDepartments, allBenefitLevels]);

  const activeSetup = tab === "Employees" ? null : SETUPS[tab];

  useEffect(() => {
    const fetchGlobalSetups = async () => {
      try {
        const [depts, grades, benefits, roles, staff] = await Promise.all([
          setupService.getDepartments(),
          setupService.getPayGrades(),
          setupService.getBenefitLevels(),
          setupService.getJobRoles(),
          api.get("/api/users/?limit=100"),
        ]);
        setAllDepartments(depts || []);
        setAllPayGrades(grades || []);
        setAllBenefitLevels(benefits || []);
        setAllJobRoles(roles || []);
        setAllStaff(Array.isArray(staff) ? staff : staff?.users || []);
      } catch (err) {
        console.error("Error fetching onboarding setups:", err);
      }
    };
    fetchGlobalSetups();
  }, [lookupsTick]);

  const employeeSearch = tab === "Employees" ? q.trim() : "";

  useEffect(() => {
    // Stale guard: a slow response from a previously selected tab must never
    // land in the current tab's table — its rows would be edited/deleted
    // against the wrong endpoints.
    let stale = false;
    const fetchTabData = async () => {
      setLoading(true);
      try {
        if (tab === "Employees") {
          // While searching, pull a wide window so the filter covers the whole
          // directory (the backend has no search param yet), not just the
          // currently visible page.
          const url = employeeSearch
            ? `/api/users/?page=1&limit=100`
            : `/api/users/?page=${page}&limit=${PAGE_SIZE}`;
          const res = await api.get(url);
          if (stale) return;
          if (Array.isArray(res)) {
            setListData(res);
            setPagination(null);
            setSearchCapped(false);
          } else {
            setListData(res.users || []);
            setPagination(employeeSearch ? null : res.pagination || null);
            setSearchCapped(!!employeeSearch && (res.pagination?.total || 0) > 100);
          }
        } else {
          const res = await SETUPS[tab].list();
          if (stale) return;
          setListData(res || []);
          setPagination(null);
          setSearchCapped(false);
        }
      } catch (err) {
        console.error("Error retrieving directory data:", err);
      } finally {
        if (!stale) setLoading(false);
      }
    };
    // Debounce keystroke-driven refetches on the Employees tab only.
    const timer = setTimeout(fetchTabData, employeeSearch ? 300 : 0);
    return () => {
      stale = true;
      clearTimeout(timer);
    };
    // SETUPS list fns don't depend on the memo's inputs, so it's safe to omit.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tab, page, refreshTick, employeeSearch]);

  // Lookups so we can show real names instead of raw ids.
  const empName = (u) => getEmployeeName(u);
  const deptName = (id) => allDepartments.find((d) => d.id === id)?.name || "—";
  const roleTitle = (id) => allJobRoles.find((r) => r.id === id)?.title || "—";

  const filteredData = listData.filter((item) => {
    if (!q) return true;
    const s = q.toLowerCase();
    const nameMatch =
      (item?.name && item.name.toLowerCase().includes(s)) ||
      (tab === "Employees" && empName(item).toLowerCase().includes(s));
    const emailMatch = item?.email && item.email.toLowerCase().includes(s);
    const titleMatch = item?.title && item.title.toLowerCase().includes(s);
    const addressMatch = item?.address && item.address.toLowerCase().includes(s);
    const stateMatch = item?.state && item.state.toLowerCase().includes(s);
    const codeMatch = item?.code && item.code.toLowerCase().includes(s);
    return nameMatch || emailMatch || titleMatch || addressMatch || stateMatch || codeMatch;
  });

  const totalPages = pagination?.totalPages || 1;

  const handleDelete = async (item) => {
    const cfg = SETUPS[tab];
    const ok = await confirm({
      title: `Delete ${cfg.singular.toLowerCase()}?`,
      message: "This can’t be undone.",
      confirmLabel: "Delete",
      danger: true,
    });
    if (!ok) return;
    try {
      await cfg.remove(item.id);
      refreshAll();
      toast.success(`${cfg.singular} deleted.`);
    } catch (err) {
      toast.error(err?.message || `Failed to delete ${cfg.singular.toLowerCase()}.`);
    }
  };

  // Soft offboarding — flip `active` rather than hard-deleting the person.
  const handleToggleActive = async (item) => {
    const isActive = item.active !== false;
    const ok = await confirm({
      title: `${isActive ? "Deactivate" : "Reactivate"} ${empName(item)}?`,
      message: isActive ? "They’ll lose access, but their records are kept." : "They’ll regain access.",
      confirmLabel: isActive ? "Deactivate" : "Reactivate",
      danger: isActive,
    });
    if (!ok) return;
    try {
      await api.put(`/api/users/${item.id}`, { active: !isActive });
      setRefreshTick((t) => t + 1);
      toast.success(`${empName(item)} ${isActive ? "deactivated" : "reactivated"}.`);
    } catch (err) {
      toast.error(err?.message || "Failed to update employee status.");
    }
  };

  const switchTab = (t) => {
    setTab(t);
    setQ("");
    setPage(1);
    setSetupModal(null);
  };

  const setupColSpan = activeSetup ? activeSetup.columns.length + 1 : 4;

  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">HRIS Hub</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
            {tab === "Employees" ? "Employee Directory" : `${tab} Configurations`}
          </h1>
          <p className="mt-1 text-sm text-slate-500">
            {tab === "Employees"
              ? "Centralised dynamic registry of active profiles."
              : "Configure organizational setup models for your enterprise."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          {tab === "Employees"
            ? can(RESOURCE_CODES.EMPLOYEES, "create") && (
                <button onClick={() => setShowAddEmployee(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                  <Plus className="h-4 w-4" /> New employee
                </button>
              )
            : can(activeSetup.resource, "create") && (
                <button onClick={() => setSetupModal({ mode: "create" })} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                  <Plus className="h-4 w-4" /> Add {activeSetup.singular}
                </button>
              )}
        </div>
      </div>

      <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
        {TABS.map((t) => (
          <button key={t} onClick={() => switchTab(t)} className="relative rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
            {tab === t && (
              <motion.div layoutId="dir-tab" className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#4f1a60] to-[#8a2da8]" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
            )}
            <span className={`relative ${tab === t ? "text-white" : ""}`}>{t}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-slate-400" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${tab.toLowerCase()}...`} className="w-full bg-transparent outline-none placeholder:text-slate-400" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-slate-500">Retrieving records from database...</div>
          ) : (
            <table className="w-full text-sm">
              <thead className="bg-slate-50/60 text-xs uppercase tracking-wider text-slate-500">
                <tr>
                  {tab === "Employees" ? (
                    <>
                      <th className="px-4 py-3 text-left font-semibold">Employee</th>
                      <th className="px-4 py-3 text-left font-semibold">Job Title</th>
                      <th className="px-4 py-3 text-left font-semibold">Department</th>
                      <th className="px-4 py-3 text-left font-semibold">Status</th>
                      <th className="px-4 py-3 text-left font-semibold">Base Salary</th>
                      <th className="px-4 py-3 text-left font-semibold">Email</th>
                      <th className="px-4 py-3"></th>
                    </>
                  ) : (
                    <>
                      {activeSetup.columns.map((c) => (
                        <th key={c.header} className="px-4 py-3 text-left font-semibold">{c.header}</th>
                      ))}
                      <th className="px-4 py-3"></th>
                    </>
                  )}
                </tr>
              </thead>
              <tbody>
                {filteredData.length === 0 ? (
                  <tr>
                    <td colSpan={tab === "Employees" ? 7 : setupColSpan} className="p-8 text-center text-slate-400">
                      No active records registered.
                    </td>
                  </tr>
                ) : tab === "Employees" ? (
                  filteredData.map((item, i) => {
                    const inactive = item.active === false;
                    return (
                      <tr
                        key={item.id || i}
                        onClick={() => { if (canUpdateEmployee) setSelectedEmployee(item); }}
                        className={`border-t border-slate-100 hover:bg-slate-50/70 ${canUpdateEmployee ? "cursor-pointer" : ""} ${inactive ? "opacity-60" : ""}`}
                      >
                        <td className="px-4 py-3 font-semibold text-slate-900">{empName(item)}</td>
                        <td className="px-4 py-3 text-slate-600">{roleTitle(item.job_role_id)}</td>
                        <td className="px-4 py-3 text-slate-600">{deptName(item.department_id)}</td>
                        <td className="px-4 py-3">
                          {inactive ? (
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-slate-500">Inactive</span>
                          ) : (
                            <span className="rounded-full bg-slate-100 px-2.5 py-1 text-xs font-semibold capitalize text-slate-600">
                              {(item.employment_status || "—").replace(/_/g, " ")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">₦{(Number(item.base_salary) || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-slate-500">{item.email}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {canUpdateEmployee && (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setSelectedEmployee(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#4f1a60]" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(item)}
                                className={`rounded-lg p-1.5 text-slate-400 ${inactive ? "hover:bg-emerald-50 hover:text-emerald-600" : "hover:bg-amber-50 hover:text-amber-600"}`}
                                title={inactive ? "Reactivate" : "Deactivate"}
                              >
                                {inactive ? <UserCheck className="h-3.5 w-3.5" /> : <UserX className="h-3.5 w-3.5" />}
                              </button>
                            </div>
                          )}
                        </td>
                      </tr>
                    );
                  })
                ) : (
                  filteredData.map((item, i) => {
                    const canUpd = !!activeSetup.update && can(activeSetup.resource, "update");
                    const canDel = !!activeSetup.remove && can(activeSetup.resource, "delete");
                    return (
                      <tr key={item.id || i} className="border-t border-slate-100 hover:bg-slate-50/70">
                        {activeSetup.columns.map((c) => (
                          <td key={c.header} className="px-4 py-3 text-slate-600">{c.render(item)}</td>
                        ))}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canUpd && (
                            <button onClick={() => setSetupModal({ mode: "edit", record: item })} className="rounded-lg p-1.5 text-slate-400 hover:bg-slate-100 hover:text-[#4f1a60]" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => handleDelete(item)} className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!canUpd && !canDel && <span className="text-xs text-slate-300">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {tab === "Employees" && searchCapped && (
          <div className="border-t border-slate-100 p-3 text-center text-xs text-amber-700 bg-amber-50/60">
            Search covers the first 100 employees — refine the search if who you’re looking for isn’t shown.
          </div>
        )}

        {tab === "Employees" && pagination && totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-slate-100 p-4">
            <span className="text-xs text-slate-500">
              Page {pagination.page || page} of {totalPages}
              {typeof pagination.total === "number" ? ` · ${pagination.total} employees` : ""}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 px-3 py-1.5 text-xs font-semibold text-slate-600 disabled:opacity-40">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {selectedEmployee && (
          <EmployeeEditModal
            employee={selectedEmployee}
            departments={allDepartments}
            jobRoles={allJobRoles}
            payGrades={allPayGrades}
            staff={allStaff}
            onSaved={() => setRefreshTick((t) => t + 1)}
            onClose={() => setSelectedEmployee(null)}
          />
        )}

        {setupModal && activeSetup && (
          <SetupModal
            config={activeSetup}
            record={setupModal.mode === "edit" ? setupModal.record : null}
            onClose={() => setSetupModal(null)}
            onSaved={refreshAll}
          />
        )}

        {showAddEmployee && (
          <AddEmployeeDrawer
            departments={allDepartments}
            jobRoles={allJobRoles}
            payGrades={allPayGrades}
            staff={allStaff}
            onClose={() => setShowAddEmployee(false)}
            onSubmit={async (data) => {
              try {
                // DEPLOY-TIME SWITCH: replace this POST /api/users create with
                // POST /api/auth/register (firstName, lastName, email, password,
                // contract). register provisions a real auth identity (so the
                // employee can log in) and attaches the org from the request host
                // — which is why it only works once deployed per-tenant, not on
                // localhost. Keep the follow-up PUT below for department/role/etc.
                //
                // 1) Create the account — only the fields createUserSchema accepts.
                const created = await api.post("/api/users/", {
                  email: data.email.trim(),
                  organization_id: user?.organization_id,
                  contract_type: data.contract_type || "permanent",
                  employment_status: data.employment_status || "probation",
                  active: true,
                  biodata: { firstname: data.firstName.trim(), lastname: data.lastName.trim() },
                });

                // 2) Persist the rest of the profile via update (create can't take these).
                const newId = created?.id || created?.user?.id || created?.data?.id;
                if (newId) {
                  try {
                    const details = pruneEmpty({
                      phone: data.phone?.trim(),
                      department_id: data.department_id,
                      job_role_id: data.job_role_id,
                      manager_id: data.manager_id,
                      pay_grade: data.pay_grade,
                      base_salary: data.baseSalary ? Number(data.baseSalary) : "",
                    });
                    if (Object.keys(details).length) await api.put(`/api/users/${newId}`, details);
                    toast.success("Employee onboarded successfully!");
                  } catch (putErr) {
                    // The account exists — only the extra fields failed. Don't lose the create.
                    console.error("[DirectoryPage] Profile details save failed:", putErr);
                    toast.info(`Employee created, but the profile details didn’t save (${putErr?.message || "unknown error"}). Open the row to finish.`);
                  }
                } else {
                  toast.info("Employee created, but the extra details couldn’t be saved automatically — open the row to finish the profile.");
                }

                setShowAddEmployee(false);
                refreshAll();
              } catch (err) {
                console.error("[DirectoryPage] Onboarding failed:", err);
                toast.error(err?.error?.message || err?.message || "Error onboarding employee.");
              }
            }}
          />
        )}
      </AnimatePresence>
    </div>
  );
};

// Generic create/edit modal driven by a setup config's `fields`.
function SetupModal({ config, record, onClose, onSaved }) {
  const toast = useToast();
  const isEdit = !!record;
  const [form, setForm] = useState(() => {
    const init = {};
    for (const f of config.fields) {
      const fallback =
        f.type === "checkbox" ? (f.default ?? false)
        : f.type === "doclist" ? []
        : (f.default ?? "");
      init[f.key] = record?.[f.key] ?? fallback;
    }
    return init;
  });
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const submit = async (e) => {
    e.preventDefault();
    for (const f of config.fields) {
      if (f.required && f.type !== "doclist" && !String(form[f.key] ?? "").trim()) {
        setError(`${f.label} is required.`);
        return;
      }
    }
    setError("");
    setSaving(true);
    try {
      const raw = {};
      for (const f of config.fields) {
        const v = form[f.key];
        if (f.type === "checkbox") raw[f.key] = !!v;
        else if (f.type === "number") raw[f.key] = v === "" || v === null || v === undefined ? "" : Number(v);
        else if (f.type === "doclist")
          raw[f.key] = (v || [])
            .filter((d) => d.name && d.name.trim())
            .map((d) => ({
              name: d.name.trim(),
              description: d.description?.trim() || null,
              is_mandatory: d.is_mandatory !== false,
            }));
        else raw[f.key] = typeof v === "string" ? v.trim() : v;
      }
      const payload = pruneEmpty(raw);
      if (isEdit) await config.update(record.id, payload);
      else await config.create(payload);
      toast.success(`${config.singular} ${isEdit ? "updated" : "created"}.`);
      onSaved?.();
      onClose();
    } catch (err) {
      setError(err?.message || "Something went wrong. Please try again.");
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full h-11 border border-slate-200 bg-white rounded-xl px-3 outline-none mt-1 focus:border-[#4f1a60]";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">{isEdit ? "Edit" : "Add"} {config.singular}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={submit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 space-y-4">
            {error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            {config.fields.map((f) => {
              if (f.type === "checkbox") {
                return (
                  <label key={f.key} className="flex items-center gap-2 cursor-pointer">
                    <input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 rounded border-slate-300 text-[#4f1a60]" />
                    <span className="text-sm font-semibold text-slate-700">{f.label}</span>
                  </label>
                );
              }
              if (f.type === "doclist") {
                const docs = form[f.key] || [];
                const patch = (i, changes) => set(f.key, docs.map((d, j) => (j === i ? { ...d, ...changes } : d)));
                return (
                  <div key={f.key}>
                    <div className="flex items-center justify-between">
                      <label className={labelCls}>{f.label}</label>
                      <button
                        type="button"
                        onClick={() => set(f.key, [...docs, { name: "", is_mandatory: true }])}
                        className="inline-flex items-center gap-1 text-xs font-bold text-[#4f1a60]"
                      >
                        <Plus className="h-3 w-3" /> {f.addLabel || "Add"}
                      </button>
                    </div>
                    {docs.length === 0 ? (
                      <p className="mt-1.5 text-xs text-slate-400">
                        None yet — employees hired into this title won’t be asked to upload documents.
                      </p>
                    ) : (
                      <div className="mt-2 space-y-2">
                        {docs.map((d, i) => (
                          <div key={i} className="flex items-center gap-2">
                            <input
                              value={d.name || ""}
                              onChange={(e) => patch(i, { name: e.target.value })}
                              placeholder={f.placeholder || ""}
                              className="h-10 min-w-0 flex-1 rounded-xl border border-slate-200 px-3 text-sm outline-none focus:border-[#4f1a60]"
                            />
                            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-slate-600 cursor-pointer">
                              <input
                                type="checkbox"
                                checked={d.is_mandatory !== false}
                                onChange={(e) => patch(i, { is_mandatory: e.target.checked })}
                                className="h-3.5 w-3.5 rounded border-slate-300 text-[#4f1a60]"
                              />
                              Mandatory
                            </label>
                            <button
                              type="button"
                              onClick={() => set(f.key, docs.filter((_, j) => j !== i))}
                              className="rounded-lg p-1.5 text-slate-400 hover:bg-red-50 hover:text-red-600"
                            >
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              }
              return (
                <div key={f.key}>
                  <label className={labelCls}>{f.label}</label>
                  {f.type === "textarea" ? (
                    <textarea value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className={`${inputCls} h-20 py-2 resize-none`} />
                  ) : f.type === "select" ? (
                    <select value={form[f.key] ?? ""} onChange={(e) => set(f.key, e.target.value)} className={inputCls}>
                      <option value="">— Select —</option>
                      {(f.options || []).map((o) => (
                        <option key={o.value} value={o.value}>{o.label}</option>
                      ))}
                    </select>
                  ) : (
                    <input
                      type={f.type === "number" ? "number" : "text"}
                      value={form[f.key] ?? ""}
                      onChange={(e) => set(f.key, e.target.value)}
                      placeholder={f.placeholder || ""}
                      className={inputCls}
                    />
                  )}
                </div>
              );
            })}
          </div>

          <div className="flex gap-2 justify-end border-t px-6 py-4">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 bg-[#4f1a60] text-white rounded-xl px-5 text-sm font-semibold disabled:opacity-75">
              {saving ? "Saving…" : isEdit ? "Save Changes" : `Create ${config.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeEditModal({ employee, departments = [], jobRoles = [], payGrades = [], staff = [], onSaved, onClose }) {
  const toast = useToast();
  const bio = employee?.employee_biodata || employee?.biodata || {};
  const [form, setForm] = useState({
    firstName: bio.firstname || "",
    lastName: bio.lastname || "",
    phone: employee?.phone || "",
    department_id: employee?.department_id || "",
    job_role_id: employee?.job_role_id || "",
    manager_id: employee?.manager_id || "",
    pay_grade: resolvePayGradeId(employee?.pay_grade, payGrades),
    base_salary: employee?.base_salary ?? "",
    employment_status: employee?.employment_status || "probation",
    contract_type: employee?.contract_type || "permanent",
  });
  const [saving, setSaving] = useState(false);
  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSaving(true);
    try {
      // "" (e.g. "— None —" selected) means CLEAR the field: send null so the
      // backend actually removes the value. pruneEmpty would silently drop it.
      const nullable = (v) => (v === "" || v === undefined ? null : v);
      const payload = {
        phone: nullable(form.phone.trim()),
        department_id: nullable(form.department_id),
        job_role_id: nullable(form.job_role_id),
        manager_id: nullable(form.manager_id),
        pay_grade: nullable(form.pay_grade),
        base_salary: form.base_salary !== "" ? Number(form.base_salary) : null,
        employment_status: form.employment_status,
        contract_type: form.contract_type,
      };
      // NOTE: `biodata` (name) is intentionally NOT sent — the backend's biodata
      // UPDATE path 500s ("could not determine data type"). Names are set at
      // creation; re-enable here once the backend fixes that query.

      await api.put(`/api/users/${employee.id}`, payload);
      toast.success("Profile updated.");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Profile update failed:", err);
      toast.error(err?.message || "Error updating employee profile.");
    } finally {
      setSaving(false);
    }
  };

  const displayName =
    [form.firstName, form.lastName].filter(Boolean).join(" ") ||
    (employee?.email ? employee.email.split("@")[0] : "Employee");

  const inputCls = "w-full h-11 border border-slate-200 bg-white rounded-xl px-3 outline-none mt-1.5 focus:border-[#4f1a60]";
  const labelCls = "text-xs font-semibold text-slate-500 uppercase tracking-wider block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-white shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-slate-900">Edit Profile · {displayName}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-slate-400 hover:bg-slate-100">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>First name</label>
              <input value={form.firstName} disabled className={`${inputCls} bg-slate-50 text-slate-500 cursor-not-allowed`} />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input value={form.lastName} disabled className={`${inputCls} bg-slate-50 text-slate-500 cursor-not-allowed`} />
            </div>
            <p className="sm:col-span-2 -mt-2 text-[11px] text-slate-400">
              Name is set when the employee is created and can’t be edited here yet.
            </p>
            <div>
              <label className={labelCls}>Phone</label>
              <input value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+234 …" />
            </div>
            <div>
              <label className={labelCls}>Base salary (₦)</label>
              <input type="number" value={form.base_salary} onChange={(e) => set("base_salary", e.target.value)} className={inputCls} />
            </div>
            <div>
              <label className={labelCls}>Department</label>
              <select value={form.department_id} onChange={(e) => set("department_id", e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Job title</label>
              <select value={form.job_role_id} onChange={(e) => set("job_role_id", e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {jobRoles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
              </select>
            </div>
            <div>
              <label className={labelCls}>Manager</label>
              <select value={form.manager_id} onChange={(e) => set("manager_id", e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {staff.filter((s) => s.id !== employee.id).map((s) => (
                  <option key={s.id} value={s.id}>{getEmployeeName(s, s.email)}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Pay grade</label>
              <select value={form.pay_grade} onChange={(e) => set("pay_grade", e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {payGrades.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ""}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Contract type</label>
              <select value={form.contract_type} onChange={(e) => set("contract_type", e.target.value)} className={inputCls}>
                {["permanent", "part_time", "fixed_term", "temporary", "intern", "contractor"].map((c) => (
                  <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                ))}
              </select>
            </div>
            <div>
              <label className={labelCls}>Employment status</label>
              <select value={form.employment_status} onChange={(e) => set("employment_status", e.target.value)} className={inputCls}>
                {["probation", "confirmed", "suspended", "terminated", "resigned"].map((s) => (
                  <option key={s} value={s}>{s}</option>
                ))}
              </select>
            </div>
          </div>

          <div className="flex gap-2 justify-end border-t px-6 py-4">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 bg-[#4f1a60] text-white rounded-xl px-5 text-sm font-semibold disabled:opacity-75">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddEmployeeDrawer({ departments = [], jobRoles = [], payGrades = [], staff = [], onClose, onSubmit }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department_id: "",
    job_role_id: "",
    manager_id: "",
    pay_grade: "",
    contract_type: "permanent",
    employment_status: "probation",
    baseSalary: "",
  });
  const [errors, setErrors] = useState({});
  const [submitted, setSubmitted] = useState(false);
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = prev; };
  }, []);

  const set = (k, v) => setForm((p) => ({ ...p, [k]: v }));

  const validate = () => {
    const next = {};
    if (!form.firstName.trim()) next.firstName = "Required";
    if (!form.lastName.trim()) next.lastName = "Required";
    if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
    if (form.baseSalary !== "" && Number(form.baseSalary) < 0) next.baseSalary = "Salary can't be negative";
    return next;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitted(true);
    const next = validate();
    setErrors(next);
    if (Object.keys(next).length) return;
    setSaving(true);
    try {
      await onSubmit({ ...form });
    } finally {
      setSaving(false);
    }
  };

  const inputCls = "w-full h-11 border border-slate-200 rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-slate-600";
  const selectCls = "w-full h-11 border border-slate-200 bg-white rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]";

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex flex-col bg-white shadow-2xl sm:left-auto sm:right-0 sm:top-0 sm:h-screen sm:w-full sm:max-w-md">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4f1a60]">Directory</div>
            <h3 className="truncate text-base font-semibold text-slate-900">New employee</h3>
          </div>
          <button type="button" onClick={onClose} className="-mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
            <X className="h-5 w-5" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 space-y-4">
            {submitted && Object.keys(errors).length > 0 && (
              <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                <div>
                  <div className="font-semibold">Please check the form</div>
                  <div className="text-xs text-red-700/80">First name, last name and a valid email are required.</div>
                </div>
              </div>
            )}

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>First name</span>
                <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className={inputCls} placeholder="Jane" required />
              </label>
              <label className="block">
                <span className={labelCls}>Last name</span>
                <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className={inputCls} placeholder="Doe" required />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>Email</span>
                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className={inputCls} placeholder="jane@company.com" required />
              </label>
              <label className="block">
                <span className={labelCls}>Phone</span>
                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className={inputCls} placeholder="+234 …" />
              </label>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <label className="block">
                <span className={labelCls}>Department</span>
                <select value={form.department_id} onChange={(e) => set("department_id", e.target.value)} className={selectCls}>
                  <option value="">— Select —</option>
                  {departments.map((d) => <option key={d.id} value={d.id}>{d.name}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Job title</span>
                <select value={form.job_role_id} onChange={(e) => set("job_role_id", e.target.value)} className={selectCls}>
                  <option value="">— Select —</option>
                  {jobRoles.map((r) => <option key={r.id} value={r.id}>{r.title}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Manager</span>
                <select value={form.manager_id} onChange={(e) => set("manager_id", e.target.value)} className={selectCls}>
                  <option value="">— None —</option>
                  {staff.map((s) => (
                    <option key={s.id} value={s.id}>{getEmployeeName(s, s.email)}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Pay grade</span>
                <select value={form.pay_grade} onChange={(e) => set("pay_grade", e.target.value)} className={selectCls}>
                  <option value="">— Select —</option>
                  {payGrades.map((g) => <option key={g.id} value={g.id}>{g.name}{g.code ? ` (${g.code})` : ""}</option>)}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Contract type</span>
                <select value={form.contract_type} onChange={(e) => set("contract_type", e.target.value)} className={selectCls}>
                  {["permanent", "part_time", "fixed_term", "temporary", "intern", "contractor"].map((c) => (
                    <option key={c} value={c}>{c.replace(/_/g, " ")}</option>
                  ))}
                </select>
              </label>
              <label className="block">
                <span className={labelCls}>Status</span>
                <select value={form.employment_status} onChange={(e) => set("employment_status", e.target.value)} className={selectCls}>
                  {["probation", "confirmed", "suspended"].map((s) => <option key={s} value={s}>{s}</option>)}
                </select>
              </label>
              <label className="block col-span-2">
                <span className={labelCls}>Base salary (₦)</span>
                <input type="number" value={form.baseSalary} onChange={(e) => set("baseSalary", e.target.value)} className={inputCls} placeholder="500000" />
              </label>
            </div>
          </div>

          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
            <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-70 sm:flex-none">
              <CheckCircle2 className="h-4 w-4" /> {saving ? "Creating…" : "Create employee"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default DirectoryPage;
