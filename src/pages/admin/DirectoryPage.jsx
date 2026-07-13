import { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, X, Plus, AlertCircle, CheckCircle2, ChevronLeft, ChevronRight, Pencil, Trash2, UserX, UserCheck, Mail, Download, Upload } from "lucide-react";
import { usePermissions } from "../../context/PermissionContext";
import { useToast, useConfirm } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { setupService } from "../../services/setupService";
import { orgService } from "../../services/orgService";
import { authService } from "../../services/authService";
import { getEmployeeName } from "../../utils/employee";
import { getValueByAliases, parseBulkFile, parseDocList, toBoolean, toCsv, toNumber } from "../../utils/bulkUpload";
import api from "../../services/api";

const TABS = ["Employees", "Offices", "Departments", "Job Titles", "Grades", "Pay Grades", "Pay Groups", "Benefit Levels", "Allowances", "Leave Types"];
const PAGE_SIZE = 10;

const StatusBadge = ({ active }) => (
  <span className={`rounded-full px-2.5 py-1 text-xs font-semibold ${active ? "bg-emerald-50 text-emerald-700" : "bg-sunken text-ink-muted"}`}>
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

// pay_group is a uuid reference on the backend despite the spec typing it as
// a string — accept an id, name or code and normalize to the id.
const resolvePayGroupId = (value, groups) => {
  if (!value) return "";
  const match = groups.find((g) => g.id === value || g.name === value || g.code === value);
  return match ? match.id : "";
};

const genThrowawayPassword = () => {
  const chars = "ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz0123456789";
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  return Array.from(bytes, (b) => chars[b % chars.length]).join("") + "!2a";
};

// POST /api/auth/register returns the new account's AUTH id (authUser.id), but
// PUT /api/users/{id} needs the org-user id (a different record — def-11 has
// both `id` and `auth_id`). There's no lookup-by-email endpoint, so match
// across the full roster (every page, not a 100-row cap) by auth_id, falling
// back to email. Returns null when it can't link — callers must treat that as
// a failure, never silently skip the profile update.
const findNewEmployeeId = async (email, registerResponse) => {
  const authId = registerResponse?.authUser?.id || registerResponse?.user?.id || registerResponse?.id || null;
  const roster = await orgService.listAllUsers().catch(() => []);
  const lower = String(email || "").toLowerCase();
  return (
    (authId && roster.find((u) => u.auth_id === authId)?.id) ||
    roster.find((u) => String(u.email || "").toLowerCase() === lower)?.id ||
    null
  );
};

const activationLinkFor = (email) =>
  `${window.location.origin}/forgot-password?mode=activate&email=${encodeURIComponent(email)}`;

const BULK_SETUP_ALIASES = {
  Offices: { headquarter: ["headquarter", "is_headquarter", "hq"] },
  Departments: { is_active: ["is_active", "active"] },
  "Job Titles": {
    department_id: ["department_id", "department", "department_name", "department_code"],
    required_documents: ["required_documents", "documents", "required_docs"],
    is_active: ["is_active", "active"],
  },
  Grades: { is_active: ["is_active", "active"] },
  "Pay Grades": {
    benefit_level_id: ["benefit_level_id", "benefit_level", "benefit_level_name", "benefit_level_code"],
    is_active: ["is_active", "active"],
  },
  "Pay Groups": { is_active: ["is_active", "active"] },
  "Benefit Levels": { is_active: ["is_active", "active"] },
  Allowances: {
    benefit_level_id: ["benefit_level_id", "benefit_level", "benefit_level_name", "benefit_level_code"],
    is_active: ["is_active", "active"],
  },
  "Leave Types": {
    benefit_level_id: ["benefit_level_id", "benefit_level", "benefit_level_name", "benefit_level_code"],
    is_paid: ["is_paid", "paid"],
    requires_approval: ["requires_approval", "approval_required"],
    is_active: ["is_active", "active"],
  },
};

const EMPLOYEE_BULK_TEMPLATE = {
  headers: [
    "first_name",
    "last_name",
    "email",
    "phone",
    "department",
    "job_title",
    "manager_email",
    "pay_grade",
    "pay_group",
    "base_salary",
    "employment_status",
    "contract_type",
  ],
  sample: {
    first_name: "Jane",
    last_name: "Doe",
    email: "jane.doe@company.com",
    phone: "+2348012345678",
    department: "Human Resources",
    job_title: "HR Lead",
    manager_email: "hr.head@company.com",
    pay_grade: "PG_G1",
    pay_group: "Monthly Staff",
    base_salary: "450000",
    employment_status: "probation",
    contract_type: "permanent",
  },
};

const DirectoryPage = () => {
  const { can } = usePermissions();
  const toast = useToast();
  const confirm = useConfirm();

  const [tab, setTab] = useState("Employees");
  const [q, setQ] = useState("");
  const [listData, setListData] = useState([]);
  const [loading, setLoading] = useState(false);

  const [allDepartments, setAllDepartments] = useState([]);
  const [allPayGrades, setAllPayGrades] = useState([]);
  const [allPayGroups, setAllPayGroups] = useState([]);
  const [allBenefitLevels, setAllBenefitLevels] = useState([]);
  const [allJobRoles, setAllJobRoles] = useState([]);
  const [allStaff, setAllStaff] = useState([]); // manager picker + name lookups

  const [page, setPage] = useState(1);
  const [pagination, setPagination] = useState(null);

  const [refreshTick, setRefreshTick] = useState(0);
  const [lookupsTick, setLookupsTick] = useState(0);
  const refreshAll = () => {
    setRefreshTick((t) => t + 1);
    setLookupsTick((t) => t + 1);
  };

  const [selectedEmployee, setSelectedEmployee] = useState(null);
  const [showAddEmployee, setShowAddEmployee] = useState(false);
  const [setupModal, setSetupModal] = useState(null); // { mode: 'create'|'edit', record }
  const [bulkModalOpen, setBulkModalOpen] = useState(false);

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
        { header: "Address", render: (r) => <span className="font-semibold text-ink">{r.address}</span> },
        { header: "State", render: (r) => r.state },
        { header: "Country", render: (r) => r.country },
        {
          header: "Type",
          render: (r) => r.headquarter
            ? <span className="rounded bg-purple-50 px-2.5 py-1 text-xs text-brand font-semibold">Headquarters</span>
            : <span className="rounded bg-sunken px-2.5 py-1 text-xs text-ink-muted">Branch</span>,
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
        { header: "Code", render: (r) => <span className="font-mono text-brand font-semibold">{r.code}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
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
        { header: "Code", render: (r) => <span className="font-mono text-brand font-semibold">{r.code || "—"}</span> },
        { header: "Title", render: (r) => <span className="font-medium text-ink">{r.title}</span> },
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
        { header: "Code", render: (r) => <span className="font-mono text-brand font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
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
        { header: "Code", render: (r) => <span className="font-mono text-brand font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
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
        { header: "Code", render: (r) => <span className="font-mono text-brand font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
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
        { header: "Code", render: (r) => <span className="font-mono text-brand font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
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
      resource: RESOURCE_CODES.BENEFIT_LEVELS, 
      singular: "Allowance",
      list: () => setupService.getBenefitLevelAllowances(),
      create: (d) => setupService.createBenefitLevelAllowance(d),
      update: (id, d) => setupService.updateBenefitLevelAllowance(id, d),
      remove: (id) => setupService.deleteBenefitLevelAllowance(id),
      columns: [
        { header: "Name", render: (r) => <span className="font-medium text-ink">{r.name || "—"}</span> },
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
      resource: RESOURCE_CODES.LEAVE_REQUESTS, // no dedicated LEAVE_TYPE resource gate by leave
      singular: "Leave Type",
      list: () => setupService.getLeaveTypes(),
      create: (d) => setupService.createLeaveType(d),
      update: (id, d) => setupService.updateLeaveType(id, d),
      remove: (id) => setupService.deleteLeaveType(id),
      columns: [
        { header: "Code", render: (r) => <span className="font-mono text-brand font-semibold">{r.code || "—"}</span> },
        { header: "Name", render: (r) => <span className="font-medium text-ink">{r.name}</span> },
        { header: "Days", render: (r) => r.days_allowed ?? "—" },
        { header: "Paid", render: (r) => (r.is_paid ? "Yes" : "No") },
        { header: "Approval", render: (r) => (r.requires_approval ? "Required" : "Auto") },
        { header: "Status", render: (r) => <StatusBadge active={r.is_active !== false} /> },
      ],
      fields: [
        { key: "name", label: "Leave Type Name", type: "text", required: true, placeholder: "e.g. Annual Leave" },
        { key: "code", label: "Code", type: "text", placeholder: "e.g. LV_ANNUAL" },
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

  const setupBulkTemplate = useMemo(() => {
    if (!activeSetup) return null;
    const headers = activeSetup.fields.map((f) => f.key);
    const sample = {};
    headers.forEach((header) => {
      sample[header] = "";
    });

    if (tab === "Offices") {
      sample.address = "12 Marina, Lagos Island";
      sample.state = "Lagos";
      sample.country = "Nigeria";
      sample.headquarter = "true";
    } else if (tab === "Departments") {
      sample.name = "People Operations";
      sample.code = "POPS";
      sample.description = "People operations and culture";
      sample.is_active = "true";
    } else if (tab === "Job Titles") {
      sample.title = "HR Business Partner";
      sample.code = "HRBP";
      sample.department_id = "Human Resources";
      sample.required_documents = "National ID;Utility Bill";
      sample.is_active = "true";
    } else if (tab === "Grades") {
      sample.name = "Senior Associate";
      sample.code = "G4";
      sample.level = "4";
      sample.min_salary = "500000";
      sample.max_salary = "780000";
      sample.currency = "NGN";
      sample.is_active = "true";
    } else if (tab === "Pay Grades") {
      sample.name = "G4 Grade Scaler";
      sample.code = "PG_G4";
      sample.benefit_level_id = "Basic Tier";
      sample.min_salary = "500000";
      sample.max_salary = "780000";
      sample.currency = "NGN";
      sample.is_active = "true";
    } else if (tab === "Pay Groups") {
      sample.name = "Monthly Staff";
      sample.code = "PG_MONTHLY";
      sample.description = "Monthly payroll group";
      sample.is_active = "true";
    } else if (tab === "Benefit Levels") {
      sample.name = "Management Tier";
      sample.code = "BL3";
      sample.description = "Management level package";
      sample.is_active = "true";
    } else if (tab === "Allowances") {
      sample.name = "Transport Allowance";
      sample.benefit_level_id = "Basic Tier";
      sample.amount = "40000";
      sample.description = "Monthly transport support";
      sample.is_active = "true";
    } else if (tab === "Leave Types") {
      sample.name = "Compassionate Leave";
      sample.code = "LV_COMP";
      sample.benefit_level_id = "Basic Tier";
      sample.days_allowed = "5";
      sample.is_paid = "true";
      sample.requires_approval = "true";
      sample.is_active = "true";
    }

    return { headers, sample };
  }, [activeSetup, tab]);

  const downloadBulkTemplate = () => {
    const template = tab === "Employees" ? EMPLOYEE_BULK_TEMPLATE : setupBulkTemplate;
    if (!template) return;
    const csv = toCsv(template.headers, [template.sample]);
    const blob = new Blob([csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${tab.toLowerCase().replace(/\s+/g, "-")}-bulk-template.csv`;
    link.click();
    URL.revokeObjectURL(url);
  };

  const resolveByNameCodeOrId = (collection, value, labelFields) => {
    if (!value) return "";
    const needle = String(value).trim().toLowerCase();
    const entry = collection.find((item) =>
      labelFields.some((field) => String(item?.[field] || "").trim().toLowerCase() === needle)
    );
    return entry?.id || "";
  };

  const registerAndPopulateEmployee = async (record) => {
    const firstName = (getValueByAliases(record, ["first_name", "firstname", "firstName"]) || "").trim();
    const lastName = (getValueByAliases(record, ["last_name", "lastname", "lastName"]) || "").trim();
    const email = (getValueByAliases(record, ["email", "work_email"]) || "").trim();
    if (!firstName || !lastName || !email) {
      throw new Error("first_name, last_name and email are required.");
    }

    const contractType = (getValueByAliases(record, ["contract_type", "contract"]) || "permanent").trim() || "permanent";
    const reg = await api.post("/api/auth/register", {
      firstName,
      lastName,
      email,
      password: genThrowawayPassword(),
      contract: contractType,
    });

    let userId = getValueByAliases(record, ["id", "user_id"]);
    if (!userId) userId = await findNewEmployeeId(email, reg);
    if (!userId) {
      // The account exists but we can't link its profile record — fail the row
      // loudly rather than report a success with department/salary/role missing.
      throw new Error(`Account created, but its profile record couldn't be linked. Set department, salary and role from the employee's row.`);
    }

    const dept = getValueByAliases(record, ["department_id", "department", "department_name", "department_code"]);
    const role = getValueByAliases(record, ["job_role_id", "job_title", "job_role", "title"]);
    const manager = getValueByAliases(record, ["manager_id", "manager", "manager_email"]);
    const payGrade = getValueByAliases(record, ["pay_grade", "pay_grade_id", "pay_grade_code", "pay_grade_name"]);
    const payGroup = getValueByAliases(record, ["pay_group", "pay_group_id", "pay_group_code", "pay_group_name"]);
    const baseSalaryRaw = getValueByAliases(record, ["base_salary", "salary"]);

    // Collect a warning for any value that was PROVIDED but couldn't be
    // resolved, so the import never silently drops a column the admin filled in.
    const warnings = [];
    const resolveWithWarn = (raw, resolver, label) => {
      const v = raw == null ? "" : String(raw).trim();
      if (!v) return "";
      const id = resolver(v);
      if (!id) warnings.push(`${label} "${v}" not found — left unset`);
      return id;
    };
    // Staff names live in employee_biodata, so match a manager by id, email,
    // or full name (getEmployeeName) — not the top-level firstname/lastname
    // fields that don't exist on the row.
    const resolveManager = (raw) => {
      const v = raw == null ? "" : String(raw).trim();
      if (!v) return "";
      const needle = v.toLowerCase();
      const found = allStaff.find(
        (u) =>
          u.id === v ||
          String(u.email || "").toLowerCase() === needle ||
          getEmployeeName(u, "").toLowerCase() === needle
      );
      if (!found) warnings.push(`Manager "${v}" not found — left unset`);
      return found?.id || "";
    };

    let baseSalary = "";
    const rawSalary = baseSalaryRaw == null ? "" : String(baseSalaryRaw).trim();
    if (rawSalary) {
      baseSalary = toNumber(rawSalary);
      if (baseSalary === "") warnings.push(`Base salary "${rawSalary}" isn't a valid number — left unset`);
    }

    const details = pruneEmpty({
      phone: (getValueByAliases(record, ["phone", "phone_number"]) || "").trim(),
      department_id: resolveWithWarn(dept, (v) => resolveByNameCodeOrId(allDepartments, v, ["id", "name", "code"]), "Department"),
      job_role_id: resolveWithWarn(role, (v) => resolveByNameCodeOrId(allJobRoles, v, ["id", "title", "code"]), "Job title"),
      manager_id: resolveManager(manager),
      pay_grade: resolveWithWarn(payGrade, (v) => resolvePayGradeId(v, allPayGrades), "Pay grade"),
      pay_group: resolveWithWarn(payGroup, (v) => resolvePayGroupId(v, allPayGroups), "Pay group"),
      base_salary: baseSalary,
      employment_status: (getValueByAliases(record, ["employment_status", "status"]) || "probation").trim(),
      contract_type: contractType,
    });

    if (Object.keys(details).length) {
      await api.put(`/api/users/${userId}`, details);
    }

    try {
      await authService.requestPasswordReset(email);
    } catch (inviteErr) {
      console.error("[BulkUpload] Invite email failed:", inviteErr);
    }

    return { warnings };
  };

  const buildSetupPayloadFromRecord = (record) => {
    if (!activeSetup) return {};
    const aliases = BULK_SETUP_ALIASES[tab] || {};
    const payload = {};

    for (const field of activeSetup.fields) {
      const aliasList = [field.key, ...(aliases[field.key] || [])];
      const raw = getValueByAliases(record, aliasList);

      if (field.type === "checkbox") {
        payload[field.key] = toBoolean(raw, field.default ?? false);
      } else if (field.type === "number") {
        payload[field.key] = toNumber(raw);
      } else if (field.type === "doclist") {
        payload[field.key] = parseDocList(raw);
      } else {
        payload[field.key] = typeof raw === "string" ? raw.trim() : raw;
      }
    }

    if (tab === "Job Titles") {
      payload.department_id = resolveByNameCodeOrId(allDepartments, payload.department_id, ["id", "name", "code"]);
    }
    if (tab === "Pay Grades" || tab === "Allowances" || tab === "Leave Types") {
      payload.benefit_level_id = resolveByNameCodeOrId(allBenefitLevels, payload.benefit_level_id, ["id", "name", "code"]);
    }

    return pruneEmpty(payload);
  };

  const processBulkUpload = async (file) => {
    const records = await parseBulkFile(file);
    if (!records.length) {
      throw new Error("No rows found in the file.");
    }

    const failures = [];
    const warnings = [];
    let successCount = 0;

    // CSV data starts on file line 2 (line 1 is the header); a JSON array has
    // no header, so record N is simply index N+1. Label each accordingly.
    const isCsv = /\.csv$/i.test(file?.name || "");
    const label = (index) => (isCsv ? `row ${index + 2}` : `record ${index + 1}`);

    for (let index = 0; index < records.length; index += 1) {
      const row = records[index];
      try {
        if (tab === "Employees") {
          const result = await registerAndPopulateEmployee(row);
          if (result?.warnings?.length) warnings.push({ where: label(index), messages: result.warnings });
        } else {
          const payload = buildSetupPayloadFromRecord(row);
          await activeSetup.create(payload);
        }
        successCount += 1;
      } catch (err) {
        failures.push({ where: label(index), message: err?.message || "Unknown error" });
      }
    }

    refreshAll();

    // Full detail to the console for large imports; the toast carries counts
    // and a short preview so nothing is silently dropped.
    if (warnings.length) {
      console.warn("[BulkUpload] Rows imported with unset fields:",
        warnings.map((w) => `${w.where}: ${w.messages.join("; ")}`));
    }

    if (failures.length === 0 && warnings.length === 0) {
      toast.success(`Bulk upload complete: ${successCount} ${tab.toLowerCase()} record(s) created.`);
      return;
    }

    const bits = [`Imported ${successCount}/${records.length}.`];
    if (failures.length) {
      const failPreview = failures.slice(0, 2).map((f) => `${f.where}: ${f.message}`).join(" | ");
      bits.push(`${failures.length} failed${failPreview ? ` (${failPreview})` : ""}.`);
    }
    if (warnings.length) {
      const warnPreview = warnings.slice(0, 2).map((w) => `${w.where}: ${w.messages.join("; ")}`).join(" | ");
      bits.push(`${warnings.length} imported with unset fields${warnPreview ? ` (${warnPreview})` : ""} — see console.`);
    }
    const msg = bits.join(" ");
    if (failures.length) toast.error(msg); else toast.info(msg);
  };

  useEffect(() => {
    const fetchGlobalSetups = async () => {
      try {
        const [depts, grades, benefits, roles, groups, staff] = await Promise.all([
          setupService.getDepartments(),
          setupService.getPayGrades(),
          setupService.getBenefitLevels(),
          setupService.getJobRoles(),
          setupService.getPayGroups(),
          orgService.listAllUsers(),
        ]);
        setAllDepartments(depts || []);
        setAllPayGrades(grades || []);
        setAllBenefitLevels(benefits || []);
        setAllJobRoles(roles || []);
        setAllPayGroups(groups || []);
        setAllStaff(Array.isArray(staff) ? staff : staff?.users || []);
      } catch (err) {
        console.error("Error fetching onboarding setups:", err);
      }
    };
    fetchGlobalSetups();
  }, [lookupsTick]);

  const employeeSearch = tab === "Employees" ? q.trim() : "";

  useEffect(() => {
    let stale = false;
    const fetchTabData = async () => {
      setLoading(true);
      try {
        if (tab === "Employees") {
          if (employeeSearch) {
            // Client-side search needs the whole roster — the API has no
            // server-side search parameter.
            const all = await orgService.listAllUsers();
            if (stale) return;
            setListData(all);
            setPagination(null);
          } else {
            const res = await api.get(`/api/users/?page=${page}&limit=${PAGE_SIZE}`);
            if (stale) return;
            setListData(Array.isArray(res) ? res : res.users || []);
            setPagination(Array.isArray(res) ? null : res.pagination || null);
          }
        } else {
          const res = await SETUPS[tab].list();
          if (stale) return;
          setListData(res || []);
          setPagination(null);
        }
      } catch (err) {
        console.error("Error retrieving directory data:", err);
      } finally {
        if (!stale) setLoading(false);
      }
    };
    const timer = setTimeout(fetchTabData, employeeSearch ? 300 : 0);
    return () => {
      stale = true;
      clearTimeout(timer);
    };

  }, [tab, page, refreshTick, employeeSearch]);

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

  const handleSendInvite = async (item) => {
    const ok = await confirm({
      title: `Send password setup email to ${empName(item)}?`,
      message: `A setup code will be emailed to ${item.email}. They enter it on the activation page to choose their password.`,
      confirmLabel: "Send email",
    });
    if (!ok) return;
    try {
      await authService.requestPasswordReset(item.email);
      try {
        await navigator.clipboard.writeText(activationLinkFor(item.email));
        toast.success("Setup email sent — the activation link was also copied to your clipboard to share.");
      } catch {
        toast.success("Setup email sent.");
      }
    } catch (err) {
      toast.error(err?.message || "Couldn’t send the setup email.");
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
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">HRIS Hub</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">
            {tab === "Employees" ? "Employee Directory" : `${tab} Configurations`}
          </h1>
          <p className="mt-1 text-sm text-ink-muted">
            {tab === "Employees"
              ? "Centralised dynamic registry of active profiles."
              : "Configure organizational setup models for your enterprise."}
          </p>
        </div>
        <div className="flex flex-wrap gap-2">
          <button
            onClick={downloadBulkTemplate}
            className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink-2 shadow-sm hover:bg-sunken"
          >
            <Download className="h-4 w-4" /> Template
          </button>
          {((tab === "Employees" && can(RESOURCE_CODES.EMPLOYEES, "create")) ||
            (tab !== "Employees" && can(activeSetup.resource, "create"))) && (
            <button
              onClick={() => setBulkModalOpen(true)}
              className="inline-flex items-center gap-2 rounded-xl border border-line bg-card px-4 py-2.5 text-sm font-semibold text-ink-2 shadow-sm hover:bg-sunken"
            >
              <Upload className="h-4 w-4" /> Bulk upload
            </button>
          )}
          {tab === "Employees"
            ? can(RESOURCE_CODES.EMPLOYEES, "create") && (
                <button onClick={() => setShowAddEmployee(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                  <Plus className="h-4 w-4" /> New employee
                </button>
              )
            : can(activeSetup.resource, "create") && (
                <button onClick={() => setSetupModal({ mode: "create" })} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                  <Plus className="h-4 w-4" /> Add {activeSetup.singular}
                </button>
              )}
        </div>
      </div>

      <div className="flex gap-1 overflow-x-auto rounded-xl border border-line/80 bg-card p-1 shadow-sm">
        {TABS.map((t) => (
          <button key={t} onClick={() => switchTab(t)} className="relative shrink-0 whitespace-nowrap rounded-lg px-3 py-1.5 text-xs font-semibold text-ink-muted">
            {tab === t && (
              <motion.div layoutId="dir-tab" className="absolute inset-0 rounded-lg bg-gradient-to-r from-brand to-brand-2" transition={{ type: "spring", stiffness: 400, damping: 32 }} />
            )}
            <span className={`relative ${tab === t ? "text-white" : ""}`}>{t}</span>
          </button>
        ))}
      </div>

      <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
        <div className="flex flex-wrap items-center gap-3 border-b border-line-soft p-4">
          <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-line px-3 py-2 text-sm">
            <Search className="h-4 w-4 text-ink-faint" />
            <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${tab.toLowerCase()}...`} className="w-full bg-transparent outline-none placeholder:text-ink-faint" />
          </div>
        </div>

        <div className="overflow-x-auto">
          {loading ? (
            <div className="p-8 text-center text-ink-muted">Retrieving records from database...</div>
          ) : (
            <table className="w-full min-w-[720px] text-sm">
              <thead className="bg-sunken/60 text-xs uppercase tracking-wider text-ink-muted">
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
                    <td colSpan={tab === "Employees" ? 7 : setupColSpan} className="p-8 text-center text-ink-faint">
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
                        className={`border-t border-line-soft hover:bg-sunken/70 ${canUpdateEmployee ? "cursor-pointer" : ""} ${inactive ? "opacity-60" : ""}`}
                      >
                        <td className="px-4 py-3 font-semibold text-ink">{empName(item)}</td>
                        <td className="px-4 py-3 text-ink-muted">{roleTitle(item.job_role_id)}</td>
                        <td className="px-4 py-3 text-ink-muted">{deptName(item.department_id)}</td>
                        <td className="px-4 py-3">
                          {inactive ? (
                            <span className="rounded-full bg-slate-200 px-2.5 py-1 text-xs font-semibold text-ink-muted">Inactive</span>
                          ) : (
                            <span className="rounded-full bg-sunken px-2.5 py-1 text-xs font-semibold capitalize text-ink-muted">
                              {(item.employment_status || "—").replace(/_/g, " ")}
                            </span>
                          )}
                        </td>
                        <td className="px-4 py-3">₦{(Number(item.base_salary) || 0).toLocaleString()}</td>
                        <td className="px-4 py-3 text-ink-muted">{item.email}</td>
                        <td className="px-4 py-3 text-right whitespace-nowrap" onClick={(e) => e.stopPropagation()}>
                          {canUpdateEmployee && (
                            <div className="flex items-center justify-end gap-1">
                              <button onClick={() => setSelectedEmployee(item)} className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-brand" title="Edit">
                                <Pencil className="h-3.5 w-3.5" />
                              </button>
                              <button onClick={() => handleSendInvite(item)} className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-brand" title="Send password setup email">
                                <Mail className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleToggleActive(item)}
                                className={`rounded-lg p-1.5 text-ink-faint ${inactive ? "hover:bg-emerald-50 hover:text-emerald-600" : "hover:bg-amber-50 hover:text-amber-600"}`}
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
                      <tr key={item.id || i} className="border-t border-line-soft hover:bg-sunken/70">
                        {activeSetup.columns.map((c) => (
                          <td key={c.header} className="px-4 py-3 text-ink-muted">{c.render(item)}</td>
                        ))}
                        <td className="px-4 py-3 text-right whitespace-nowrap">
                          {canUpd && (
                            <button onClick={() => setSetupModal({ mode: "edit", record: item })} className="rounded-lg p-1.5 text-ink-faint hover:bg-sunken hover:text-brand" title="Edit">
                              <Pencil className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {canDel && (
                            <button onClick={() => handleDelete(item)} className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600" title="Delete">
                              <Trash2 className="h-3.5 w-3.5" />
                            </button>
                          )}
                          {!canUpd && !canDel && <span className="text-xs text-ink-ghost">—</span>}
                        </td>
                      </tr>
                    );
                  })
                )}
              </tbody>
            </table>
          )}
        </div>

        {tab === "Employees" && pagination && totalPages > 1 && (
          <div className="flex items-center justify-between gap-3 border-t border-line-soft p-4">
            <span className="text-xs text-ink-muted">
              Page {pagination.page || page} of {totalPages}
              {typeof pagination.total === "number" ? ` · ${pagination.total} employees` : ""}
            </span>
            <div className="flex items-center gap-2">
              <button onClick={() => setPage((p) => Math.max(1, p - 1))} disabled={page <= 1} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted disabled:opacity-40">
                <ChevronLeft className="h-3.5 w-3.5" /> Prev
              </button>
              <button onClick={() => setPage((p) => Math.min(totalPages, p + 1))} disabled={page >= totalPages} className="inline-flex items-center gap-1 rounded-lg border border-line px-3 py-1.5 text-xs font-semibold text-ink-muted disabled:opacity-40">
                Next <ChevronRight className="h-3.5 w-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>

      <AnimatePresence>
        {bulkModalOpen && (
          <BulkUploadModal
            tab={tab}
            onClose={() => setBulkModalOpen(false)}
            onSubmit={async (file) => {
              await processBulkUpload(file);
              setBulkModalOpen(false);
            }}
          />
        )}

        {selectedEmployee && (
          <EmployeeEditModal
            employee={selectedEmployee}
            departments={allDepartments}
            jobRoles={allJobRoles}
            payGrades={allPayGrades}
            payGroups={allPayGroups}
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
            payGroups={allPayGroups}
            staff={allStaff}
            onClose={() => setShowAddEmployee(false)}
            onSubmit={async (data) => {
              const email = data.email.trim();
              try {
                const reg = await api.post("/api/auth/register", {
                  firstName: data.firstName.trim(),
                  lastName: data.lastName.trim(),
                  email,
                  password: genThrowawayPassword(),
                  contract: data.contract_type || "permanent",
                });

                const newId = await findNewEmployeeId(email, reg).catch((lookupErr) => {
                  console.error("[DirectoryPage] New-employee lookup failed:", lookupErr);
                  return null;
                });

                if (newId) {
                  try {
                    const details = pruneEmpty({
                      phone: data.phone?.trim(),
                      department_id: data.department_id,
                      job_role_id: data.job_role_id,
                      manager_id: data.manager_id,
                      pay_grade: data.pay_grade,
                      pay_group: data.pay_group,
                      base_salary: data.baseSalary ? Number(data.baseSalary) : "",
                      employment_status: data.employment_status || "probation",
                    });
                    if (Object.keys(details).length) await api.put(`/api/users/${newId}`, details);
                  } catch (putErr) {
                    console.error("[DirectoryPage] Profile details save failed:", putErr);
                    toast.info(`Account created, but the profile details didn’t save (${putErr?.message || "unknown error"}). Open the row to finish.`);
                  }
                } else {
                  toast.info("Account created, but the profile details couldn’t be attached automatically — open the row to finish.");
                }
                try {
                  await authService.requestPasswordReset(email);
                  toast.success(`Employee onboarded — a password setup email is on its way to ${email}.`);
                } catch (mailErr) {
                  console.error("[DirectoryPage] Invite email failed:", mailErr);
                  toast.info("Employee created, but the setup email didn’t send — use the mail icon on their row to resend it.");
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


function BulkUploadModal({ tab, onClose, onSubmit }) {
  const [file, setFile] = useState(null);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError("Select a CSV or JSON file.");
      return;
    }
    setError("");
    setSaving(true);
    try {
      await onSubmit(file);
    } catch (err) {
      setError(err?.message || "Bulk upload failed.");
    } finally {
      setSaving(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-xl">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-ink">Bulk Upload · {tab}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4 px-6 py-5">
          {error && (
            <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3 text-xs text-red-800 border border-red-200">
              <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
              <span>{error}</span>
            </div>
          )}

          <div className="rounded-xl border border-line bg-sunken/60 p-4 text-sm text-ink-muted">
            <p className="font-semibold text-ink-2">Supported formats</p>
            <p className="mt-1">Upload either a CSV or JSON array file. CSV headers should match the template column names.</p>
          </div>

          <label className="block">
            <span className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Data file</span>
            <input
              type="file"
              accept=".csv,.json"
              onChange={(e) => setFile(e.target.files?.[0] || null)}
              className="mt-1.5 block w-full rounded-xl border border-line bg-card px-3 py-2 text-sm text-ink-2 file:mr-3 file:rounded-lg file:border-0 file:bg-sunken file:px-3 file:py-1.5 file:text-xs file:font-semibold file:text-ink-2"
            />
          </label>

          {file && (
            <div className="rounded-lg border border-emerald-200 bg-emerald-50 px-3 py-2 text-xs text-emerald-800">
              Ready to import: <span className="font-semibold">{file.name}</span>
            </div>
          )}

          <div className="flex gap-2 justify-end pt-1">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 bg-brand text-white rounded-xl px-5 text-sm font-semibold disabled:opacity-75">
              {saving ? "Uploading…" : "Upload and Create"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

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

  const inputCls = "w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1 focus:border-brand";
  const labelCls = "text-xs font-semibold text-ink-muted uppercase tracking-wider";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-card shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-ink">{isEdit ? "Edit" : "Add"} {config.singular}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken">
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
                    <input type="checkbox" checked={!!form[f.key]} onChange={(e) => set(f.key, e.target.checked)} className="h-4 w-4 rounded border-line text-brand" />
                    <span className="text-sm font-semibold text-ink-2">{f.label}</span>
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
                        className="inline-flex items-center gap-1 text-xs font-bold text-brand"
                      >
                        <Plus className="h-3 w-3" /> {f.addLabel || "Add"}
                      </button>
                    </div>
                    {docs.length === 0 ? (
                      <p className="mt-1.5 text-xs text-ink-faint">
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
                              className="h-10 min-w-0 flex-1 rounded-xl border border-line px-3 text-sm outline-none focus:border-brand"
                            />
                            <label className="flex items-center gap-1.5 whitespace-nowrap text-xs text-ink-muted cursor-pointer">
                              <input
                                type="checkbox"
                                checked={d.is_mandatory !== false}
                                onChange={(e) => patch(i, { is_mandatory: e.target.checked })}
                                className="h-3.5 w-3.5 rounded border-line text-brand"
                              />
                              Mandatory
                            </label>
                            <button
                              type="button"
                              onClick={() => set(f.key, docs.filter((_, j) => j !== i))}
                              className="rounded-lg p-1.5 text-ink-faint hover:bg-red-50 hover:text-red-600"
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
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 bg-brand text-white rounded-xl px-5 text-sm font-semibold disabled:opacity-75">
              {saving ? "Saving…" : isEdit ? "Save Changes" : `Create ${config.singular}`}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function EmployeeEditModal({ employee, departments = [], jobRoles = [], payGrades = [], payGroups = [], staff = [], onSaved, onClose }) {
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
    pay_group: resolvePayGroupId(employee?.pay_group, payGroups),
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

      const nullable = (v) => (v === "" || v === undefined ? null : v);
      const payload = {
        phone: nullable(form.phone.trim()),
        department_id: nullable(form.department_id),
        job_role_id: nullable(form.job_role_id),
        manager_id: nullable(form.manager_id),
        pay_grade: nullable(form.pay_grade),
        pay_group: nullable(form.pay_group),
        base_salary: form.base_salary !== "" ? Number(form.base_salary) : null,
        employment_status: form.employment_status,
        contract_type: form.contract_type,
      };

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

  const inputCls = "w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1.5 focus:border-brand";
  const labelCls = "text-xs font-semibold text-ink-muted uppercase tracking-wider block";

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-lg rounded-2xl bg-card shadow-xl max-h-[90vh] flex flex-col">
        <div className="flex items-center justify-between border-b px-6 py-4">
          <h3 className="text-lg font-bold text-ink">Edit Profile · {displayName}</h3>
          <button onClick={onClose} className="rounded-lg p-1 text-ink-faint hover:bg-sunken">
            <X className="h-4 w-4" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
          <div className="flex-1 overflow-y-auto px-6 py-5 grid gap-4 sm:grid-cols-2">
            <div>
              <label className={labelCls}>First name</label>
              <input value={form.firstName} disabled className={`${inputCls} bg-sunken text-ink-muted cursor-not-allowed`} />
            </div>
            <div>
              <label className={labelCls}>Last name</label>
              <input value={form.lastName} disabled className={`${inputCls} bg-sunken text-ink-muted cursor-not-allowed`} />
            </div>
            <p className="sm:col-span-2 -mt-2 text-[11px] text-ink-faint">
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
              <label className={labelCls}>Pay group</label>
              <select value={form.pay_group} onChange={(e) => set("pay_group", e.target.value)} className={inputCls}>
                <option value="">— None —</option>
                {payGroups.map((g) => (
                  <option key={g.id} value={g.id}>{g.name}</option>
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
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" disabled={saving} className="h-11 bg-brand text-white rounded-xl px-5 text-sm font-semibold disabled:opacity-75">
              {saving ? "Saving…" : "Save Changes"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

function AddEmployeeDrawer({ departments = [], jobRoles = [], payGrades = [], payGroups = [], staff = [], onClose, onSubmit }) {
  const [form, setForm] = useState({
    firstName: "",
    lastName: "",
    email: "",
    phone: "",
    department_id: "",
    job_role_id: "",
    manager_id: "",
    pay_grade: "",
    pay_group: "",
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

  const inputCls = "w-full h-11 border border-line rounded-xl px-3.5 mt-1.5 outline-none focus:border-brand";
  const labelCls = "text-xs font-semibold uppercase tracking-wider text-ink-muted";
  const selectCls = "w-full h-11 border border-line bg-card rounded-xl px-3.5 mt-1.5 outline-none focus:border-brand";

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <div className="fixed inset-0 z-50 flex flex-col bg-card shadow-2xl sm:left-auto sm:right-0 sm:top-0 sm:h-screen sm:w-full sm:max-w-md">
        <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-line-soft bg-card/95 px-5 py-4 backdrop-blur">
          <div>
            <div className="text-[10px] font-semibold uppercase tracking-wider text-brand">Directory</div>
            <h3 className="truncate text-base font-semibold text-ink">New employee</h3>
          </div>
          <button type="button" onClick={onClose} className="-mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-ink-muted hover:bg-sunken">
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
                <span className={labelCls}>Pay group</span>
                <select value={form.pay_group} onChange={(e) => set("pay_group", e.target.value)} className={selectCls}>
                  <option value="">— Select —</option>
                  {payGroups.map((g) => <option key={g.id} value={g.id}>{g.name}</option>)}
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

          <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-line-soft bg-card/95 px-5 py-3 backdrop-blur">
            <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-line px-4 text-sm font-semibold text-ink-2 hover:bg-sunken sm:flex-none">Cancel</button>
            <button type="submit" disabled={saving} className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 disabled:opacity-70 sm:flex-none">
              <CheckCircle2 className="h-4 w-4" /> {saving ? "Creating…" : "Create employee"}
            </button>
          </div>
        </form>
      </div>
    </>
  );
}

export default DirectoryPage;
