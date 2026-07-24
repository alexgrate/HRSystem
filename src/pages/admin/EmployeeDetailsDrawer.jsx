import { useEffect, useState } from "react";
import { motion } from "framer-motion";
import { X, Pencil, Mail, Phone, Building2, BadgeCheck, FileText } from "lucide-react";
import { usePermissions } from "../../context/PermissionContext";
import { useToast } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";
import { employeeStatusMeta } from "../../config/employeeStatus";
import { previewDocument } from "../../utils/documentPreview";
import { orgService } from "../../services/orgService";
import { approvalService } from "../../services/approvalService";
import { leaveService } from "../../services/leaveService";
import { loanService } from "../../services/loanService";
import { getEmployeeName, getInitials } from "../../utils/employee";
import { fmtMoney } from "../../utils/payroll";
import { statusBadgeCls } from "../../utils/status";
import api from "../../services/api";

const date = (v) => (v ? String(v).slice(0, 10) : "—");
const val = (v) => {
  if (v === null || v === undefined || String(v).trim() === "") return "—";
  return String(v);
};
const personName = (r) =>
  [r.title, r.first_name || r.firstname, r.last_name || r.lastname].filter(Boolean).join(" ").trim() || "—";

// One reusable section card; hides itself entirely when `hidden` (permission).
function Section({ title, children, hidden }) {
  if (hidden) return null;
  return (
    <div className="rounded-2xl border border-line/80 bg-card p-5 shadow-sm">
      <h4 className="mb-3 text-xs font-semibold uppercase tracking-wider text-brand">{title}</h4>
      {children}
    </div>
  );
}


function Fields({ items, writableKeys }) {
  const shown = items.filter(([, v]) => v !== false);
  return (
    <dl className="grid gap-x-6 gap-y-3 sm:grid-cols-2">
      {shown.map(([label, v, key]) => {
        const empty = v === null || v === undefined || String(v).trim() === "";
        const placeholder = key && writableKeys?.has(key) ? "Not provided" : "Managed by authorized personnel";
        return (
          <div key={label} className="min-w-0">
            <dt className="text-[11px] font-semibold uppercase tracking-wide text-ink-faint">{label}</dt>
            <dd className={`mt-0.5 break-words text-sm ${empty ? "italic text-ink-faint" : "text-ink-2"}`}>
              {empty ? placeholder : String(v)}
            </dd>
          </div>
        );
      })}
    </dl>
  );
}

function Empty({ children }) {
  return (
    <div className="rounded-xl border border-dashed border-line p-4 text-center text-xs text-ink-faint">
      {children}
    </div>
  );
}

function RecordList({ rows, render, empty }) {
  if (!rows || rows.length === 0) return <Empty>{empty}</Empty>;
  return (
    <ul className="space-y-3">
      {rows.map((r, i) => (
        <li key={r.id || i} className="rounded-xl border border-line-soft bg-sunken/40 p-3">
          {render(r)}
        </li>
      ))}
    </ul>
  );
}

export default function EmployeeDetailsDrawer({ employee, jobRoles = [], departments = [], onClose, onEdit }) {
  const { can, isAdmin } = usePermissions();
  const toast = useToast();
  const empId = employee?.id;

  // Backend returns financial fields (base_salary, estimated_gross, bank) to any
  // EMPLOYEE 'read' holder (includeFinancial = isSelf || EMPLOYEE.read), and the
  // Directory grid shows salary on 'read' too — so gate on read, not update.
  const canFinancial = isAdmin || can(RESOURCE_CODES.EMPLOYEES, "read");
  const canLeave = isAdmin || can(RESOURCE_CODES.LEAVE_REQUESTS, "read");
  const canLoans = isAdmin || can(RESOURCE_CODES.LOANS, "read");
  const canDocs = isAdmin || can(RESOURCE_CODES.DOCUMENTS, "read");
  const canProfileReqs = isAdmin || can(RESOURCE_CODES.PROFILE_UPDATE, "read");

  const [writableKeys, setWritableKeys] = useState(new Set());
  const [state, setState] = useState({ loading: true, error: false, full: null, records: null });
  const [leave, setLeave] = useState({ loading: canLeave, rows: [] });
  const [loans, setLoans] = useState({ loading: canLoans, rows: [] });
  const [docs, setDocs] = useState({ loading: canDocs, rows: [] });
  const [reqs, setReqs] = useState({ loading: canProfileReqs, rows: [] });

  useEffect(() => {
    if (!empId) return;
    let stale = false;
    setState({ loading: true, error: false, full: null, records: null });
    (async () => {
      try {
        const [full, records] = await Promise.all([
          orgService.getEmployee(empId).catch(() => employee),
          orgService.getEmployeeRecords(empId).catch(() => null),
        ]);
        if (!stale) setState({ loading: false, error: false, full: full || employee, records });
      } catch {
        if (!stale) setState({ loading: false, error: true, full: employee, records: null });
      }
    })();
    return () => { stale = true; };
  }, [empId, employee]);

  useEffect(() => {
    let stale = false;
    approvalService.getProfileFields()
      .then((res) => { if (!stale) setWritableKeys(new Set((Array.isArray(res) ? res : []).filter((f) => f.can_write).map((f) => f.field_key))); })
      .catch(() => {});
    return () => { stale = true; };
  }, []);

  // Related history — each guarded by permission, each filtered to this employee.
  useEffect(() => {
    if (!empId) return;
    let stale = false;
    const mine = (rows) => (Array.isArray(rows) ? rows : []).filter((r) => r.employee_id === empId);
    if (canLeave) leaveService.listAll(empId).then((r) => !stale && setLeave({ loading: false, rows: mine(r) })).catch(() => !stale && setLeave({ loading: false, rows: [] }));
    if (canLoans) loanService.listAll().then((r) => !stale && setLoans({ loading: false, rows: mine(r) })).catch(() => !stale && setLoans({ loading: false, rows: [] }));
    if (canDocs) api.get(`/api/documentations/?uploaded_by_employee_id=${encodeURIComponent(empId)}`)
      .then((r) => !stale && setDocs({ loading: false, rows: (Array.isArray(r) ? r : r?.documents || []).filter((d) => d.uploaded_by_employee_id === empId) }))
      .catch(() => !stale && setDocs({ loading: false, rows: [] }));
    if (canProfileReqs) api.get(`/api/profile-update-requests/profile-update-request/organization?employee_id=${encodeURIComponent(empId)}`)
      .then((r) => { const rows = r?.requests || (Array.isArray(r) ? r : []); return !stale && setReqs({ loading: false, rows: rows.filter((x) => x.employee_id === empId) }); })
      .catch(() => !stale && setReqs({ loading: false, rows: [] }));
    return () => { stale = true; };
  }, [empId, canLeave, canLoans, canDocs, canProfileReqs]);

  const full = state.full || employee || {};
  const bio = full.employee_biodata || full.biodata || {};
  const bank = full.employee_bank_details || full.bankDetails || {};
  const education = full.employee_education || full.education || [];
  const records = state.records || {};

  const roleTitle = jobRoles.find((r) => r.id === full.job_role_id)?.title || "—";
  const deptName = departments.find((d) => d.id === full.department_id)?.name || "—";
  const name = getEmployeeName(full, "Employee");
  const initials = getInitials(name);

  return (
    <>
      <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
      <motion.div
        initial={{ x: "100%" }}
        animate={{ x: 0 }}
        exit={{ x: "100%" }}
        transition={{ type: "spring", stiffness: 300, damping: 32 }}
        role="dialog"
        aria-label={`Employee details for ${name}`}
        className="fixed right-0 top-0 z-50 flex h-screen w-full max-w-3xl flex-col bg-sunken shadow-2xl"
      >
        {/* Header */}
        <div className="flex items-start justify-between gap-3 border-b border-line-soft bg-card p-4 sm:p-5">
          <div className="flex min-w-0 items-center gap-3">
            <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-sm font-bold text-white">
              {initials}
            </div>
            <div className="min-w-0">
              <div className="truncate text-lg font-bold text-ink">{name}</div>
              <div className="truncate text-xs text-ink-muted">
                {roleTitle !== "—" && <span>{roleTitle}</span>}
                {roleTitle !== "—" && deptName !== "—" && <span> · </span>}
                {deptName !== "—" && <span>{deptName}</span>}
              </div>
              <div className="mt-1 flex flex-wrap items-center gap-1.5">
                <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${employeeStatusMeta(full.status).cls}`}>
                  {employeeStatusMeta(full.status).label}
                </span>
                {full.employment_status && (
                  <span className="rounded-full bg-sunken px-2 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-ink-muted">
                    {String(full.employment_status).replace(/_/g, " ")}
                  </span>
                )}
                {full.staff_id && <span className="text-[10px] text-ink-faint">ID: {full.staff_id}</span>}
              </div>
            </div>
          </div>
          <div className="flex shrink-0 items-center gap-1">
            {onEdit && (
              <button onClick={() => onEdit(employee)} className="inline-flex items-center gap-1 rounded-lg border border-line px-2.5 py-1.5 text-xs font-semibold text-ink-muted hover:bg-sunken">
                <Pencil className="h-3.5 w-3.5" /> Edit
              </button>
            )}
            <button aria-label="Close" onClick={onClose} className="rounded-lg p-1.5 text-ink-muted hover:bg-sunken">
              <X className="h-4 w-4" />
            </button>
          </div>
        </div>

        {/* Body */}
        <div className="flex-1 overflow-y-auto p-4 sm:p-5">
          {state.loading ? (
            <div className="p-10 text-center text-sm text-ink-muted">Loading employee details…</div>
          ) : (
            <div className="space-y-4">
              {/* Quick contact row */}
              <div className="grid gap-3 sm:grid-cols-3">
                <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-card p-3">
                  <Mail className="h-4 w-4 shrink-0 text-brand" />
                  <span className="truncate text-xs text-ink-2">{val(full.email)}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-card p-3">
                  <Phone className="h-4 w-4 shrink-0 text-brand" />
                  <span className="truncate text-xs text-ink-2">{val(full.phone)}</span>
                </div>
                <div className="flex items-center gap-2 rounded-xl border border-line/80 bg-card p-3">
                  <Building2 className="h-4 w-4 shrink-0 text-brand" />
                  <span className="truncate text-xs text-ink-2">{deptName}</span>
                </div>
              </div>

              <Section title="Personal Information">
                <Fields writableKeys={writableKeys} items={[
                  ["Title", bio.title, "title"], ["First name", bio.firstname, "firstname"], ["Last name", bio.lastname, "lastname"],
                  ["Other names", bio.othernames, "othernames"], ["Gender", bio.gender, "gender"], ["Date of birth", bio.date_of_birth ? date(bio.date_of_birth) : "", "date_of_birth"],
                  ["Marital status", bio.marital_status, "marital_status"], ["Religion", bio.religion, "religion"], ["Nationality", bio.country, "country"],
                  ["Mother's maiden name", bio.mothers_maiden_name, "mothers_maiden_name"],
                ]} />
              </Section>

              <Section title="Employment Information">
                <Fields writableKeys={writableKeys} items={[
                  ["Employment status", full.employment_status ? String(full.employment_status).replace(/_/g, " ") : ""],
                  ["Contract type", full.contract_type], ["Job title", roleTitle === "—" ? "" : roleTitle],
                  ["Department", deptName === "—" ? "" : deptName], ["Level", full.level],
                  ["Start date", full.start_date ? date(full.start_date) : ""], ["End date", full.end_date ? date(full.end_date) : ""],
                  ["Report location", full.report_location_name], ["Staff ID", full.staff_id],
                ]} />
              </Section>

              <Section title="Contact Information">
                <Fields writableKeys={writableKeys} items={[
                  ["Email", full.email, "email"], ["Phone", full.phone, "phone"],
                  ["Alternate phone", bio.alternate_phone, "alternate_phone"], ["Alternate email", bio.alternate_email, "alternate_email"],
                ]} />
              </Section>

              <Section title="Address">
                <Fields writableKeys={writableKeys} items={[
                  ["Address", bio.address, "address"], ["LGA", bio.lga, "lga"], ["State", bio.state, "state"], ["Country", bio.country, "country"],
                ]} />
              </Section>

              <Section title="Emergency Contact">
                <Fields writableKeys={writableKeys} items={[["Spouse", bio.spouse, "spouse"], ["Spouse phone", bio.spouse_phone, "spouse_phone"]]} />
              </Section>

              <Section title="Financial Information" hidden={!canFinancial}>
                <Fields writableKeys={writableKeys} items={[
                  ["Bank name", bank.bank_name, "bank_name"], ["Account name", bank.account_name, "account_name"],
                  ["Account number", bank.account_number, "account_number"], ["Account type", bank.account_type, "account_type"], ["BVN", bank.bvn, "bvn"],
                ]} />
              </Section>

              <Section title="Compensation" hidden={!canFinancial}>
                <Fields writableKeys={writableKeys} items={[
                  ["Base salary", full.base_salary != null && full.base_salary !== "" ? fmtMoney(full.base_salary) : ""],
                  ["Estimated gross", full.estimated_gross_salary != null && full.estimated_gross_salary !== "" ? fmtMoney(full.estimated_gross_salary) : ""],
                ]} />
              </Section>

              <Section title="Next of Kin">
                <RecordList rows={records.next_of_kin} empty="No next of kin on record." render={(r) => (
                  <>
                    <div className="text-sm font-semibold text-ink">{personName(r)} <span className="ml-1 text-xs font-normal text-ink-muted">{val(r.relationship)}</span></div>
                    <div className="mt-0.5 text-xs text-ink-muted">{val(r.phone)}{r.email ? ` · ${r.email}` : ""}{r.purpose ? ` · ${r.purpose}` : ""}</div>
                    {r.address && <div className="text-xs text-ink-faint">{r.address}</div>}
                  </>
                )} />
              </Section>

              <Section title="Family">
                <RecordList rows={records.family} empty="No family members on record." render={(r) => (
                  <>
                    <div className="text-sm font-semibold text-ink">{personName(r)} <span className="ml-1 text-xs font-normal text-ink-muted">{val(r.relationship)}</span></div>
                    <div className="mt-0.5 text-xs text-ink-muted">{val(r.phone)}{r.email ? ` · ${r.email}` : ""}</div>
                  </>
                )} />
              </Section>

              <Section title="Dependants">
                <RecordList rows={records.dependants} empty="No dependants on record." render={(r) => (
                  <>
                    <div className="text-sm font-semibold text-ink">{personName(r)} <span className="ml-1 text-xs font-normal text-ink-muted">{val(r.relationship)}</span></div>
                    <div className="mt-0.5 text-xs text-ink-muted">{val(r.phone)}{r.email ? ` · ${r.email}` : ""}</div>
                  </>
                )} />
              </Section>

              <Section title="Education">
                <RecordList rows={education} empty="No education history on record." render={(r) => (
                  <>
                    <div className="text-sm font-semibold text-ink">{val(r.school)}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{[r.degree, r.course, r.grade].filter(Boolean).join(" · ") || "—"}</div>
                    <div className="text-xs text-ink-faint">{date(r.start_date)} → {r.end_date ? date(r.end_date) : "Present"}</div>
                  </>
                )} />
              </Section>

              <Section title="Work Experience">
                <RecordList rows={records.experience} empty="No work experience on record." render={(r) => (
                  <>
                    <div className="text-sm font-semibold text-ink">{val(r.position)} <span className="ml-1 text-xs font-normal text-ink-muted">{r.company ? `@ ${r.company}` : ""}</span></div>
                    <div className="mt-0.5 text-xs text-ink-faint">{date(r.start_date)} → {r.end_date ? date(r.end_date) : "Present"}</div>
                    {r.reason_for_leaving && <div className="text-xs text-ink-muted">Reason for leaving: {r.reason_for_leaving}</div>}
                  </>
                )} />
              </Section>

              <Section title="Training & Certifications">
                <RecordList rows={records.training} empty="No training or certifications on record." render={(r) => (
                  <>
                    <div className="text-sm font-semibold text-ink">{val(r.course || r.license_name)}</div>
                    <div className="mt-0.5 text-xs text-ink-muted">{[r.institution, r.issuing_body].filter(Boolean).join(" · ") || "—"}</div>
                    <div className="text-xs text-ink-faint">{date(r.start_date)}{r.end_date ? ` → ${date(r.end_date)}` : ""}</div>
                  </>
                )} />
              </Section>

              <Section title="Documents" hidden={!canDocs}>
                {docs.loading ? <Empty>Loading…</Empty> : (
                  <RecordList rows={docs.rows} empty="No documents uploaded." render={(d) => (
                    <div className="flex items-center justify-between gap-3">
                      <div className="flex min-w-0 items-center gap-2">
                        <FileText className="h-4 w-4 shrink-0 text-brand" />
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink">{d.title || d.original_file_name || "Document"}</div>
                          <div className="text-[11px] text-ink-faint">{date(d.created_at)}</div>
                        </div>
                      </div>
                      <div className="flex shrink-0 items-center gap-2">
                        <button onClick={() => previewDocument(d.id, toast)} className="rounded-lg border border-line px-2 py-1 text-[11px] font-semibold text-brand hover:bg-sunken">
                          Preview
                        </button>
                        <span className={`rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeCls(d.status)}`}>
                          {String(d.status || "pending").replace(/_/g, " ")}
                        </span>
                      </div>
                    </div>
                  )} />
                )}
              </Section>

              <Section title="Leave History" hidden={!canLeave}>
                {leave.loading ? <Empty>Loading…</Empty> : (
                  <RecordList rows={leave.rows} empty="No leave requests." render={(r) => (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{r.leave_type_name || r.leave_type?.name || "Leave"}</div>
                        <div className="text-xs text-ink-muted">{date(r.start_date)} → {date(r.end_date)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeCls(r.status)}`}>
                        {String(r.status || "pending").replace(/_/g, " ")}
                      </span>
                    </div>
                  )} />
                )}
              </Section>

              <Section title="Loan History" hidden={!canLoans}>
                {loans.loading ? <Empty>Loading…</Empty> : (
                  <RecordList rows={loans.rows} empty="No loan requests." render={(l) => (
                    <div className="flex items-center justify-between gap-3">
                      <div className="min-w-0">
                        <div className="truncate text-sm font-semibold text-ink">{fmtMoney(l.amount)}</div>
                        <div className="text-xs text-ink-muted">{Math.trunc(Number(l.tenure_month)) || 0} months · requested {date(l.created_at)}</div>
                      </div>
                      <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeCls(l.status)}`}>
                        {String(l.status || "").replace(/_/g, " ")}
                      </span>
                    </div>
                  )} />
                )}
              </Section>

              <Section title="Profile Update Requests" hidden={!canProfileReqs}>
                {reqs.loading ? <Empty>Loading…</Empty> : (
                  <RecordList rows={reqs.rows} empty="No profile update requests." render={(r) => {
                    const items = Array.isArray(r.items) ? r.items : [];
                    const fields = items.map((i) => i.field_name).filter(Boolean).join(", ");
                    return (
                      <div className="flex items-center justify-between gap-3">
                        <div className="min-w-0">
                          <div className="truncate text-sm font-semibold text-ink">{fields || `${r.total_items || items.length || 1} field update(s)`}</div>
                          <div className="text-xs text-ink-faint">{date(r.created_at)}</div>
                        </div>
                        <span className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider ${statusBadgeCls(r.status)}`}>
                          {String(r.status || "pending").replace(/_/g, " ")}
                        </span>
                      </div>
                    );
                  }} />
                )}
              </Section>

              <div className="flex items-center justify-center gap-1.5 pt-1 text-[11px] text-ink-faint">
                <BadgeCheck className="h-3.5 w-3.5" /> Immutable record — edits require an approved change request.
              </div>
            </div>
          )}
        </div>
      </motion.div>
    </>
  );
}
