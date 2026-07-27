import {
  LayoutDashboard,
  Rocket,
  Users,
  UserCircle,
  GitBranch,
  Wallet,
  CalendarDays,
  CalendarClock,
  HandCoins,
  ShieldCheck,
  Building2,
  Inbox,
  ScrollText,
  ClipboardCheck,
} from "lucide-react";
import { lazy } from "react";

// Every page is lazy-loaded so each route becomes its own chunk — eager
// imports here previously bundled the whole app into one 660 kB file.
const DirectoryPage = lazy(() => import("../pages/admin/DirectoryPage"));
const ESSPage = lazy(() => import("../pages/ess/ESSPage"));
const WorkflowPage = lazy(() => import("../pages/admin/WorkflowPage"));
const SettingsPage = lazy(() => import("../pages/admin/SettingsPage").then((m) => ({ default: m.SettingsPage })));
const OnboardingPage = lazy(() => import("../pages/admin/OnboardingPage"));
const OrganizationSettingsPage = lazy(() => import("../pages/admin/OrganizationSettingsPage"));
const ApprovalsInboxPage = lazy(() => import("../pages/admin/ApprovalsInboxPage"));
const PayrollPage = lazy(() => import("../pages/admin/PayrollPage"));
const DashboardPage = lazy(() => import("../pages/DashboardPage"));
const AuditTrailPage = lazy(() => import("../pages/admin/AuditTrailPage"));
const LeaveAdminPage = lazy(() => import("../pages/admin/LeaveAdminPage"));
const AdministrationPeriodsPage = lazy(() => import("../pages/admin/AdministrationPeriodsPage"));
const LoanAdminPage = lazy(() => import("../pages/admin/LoanAdminPage"));
const AppraisalPage = lazy(() => import("../pages/admin/AppraisalPage"));

// Single source of truth for the app shell: sidebar nav, route table, and the
// default-landing redirect all iterate this array. `resource`/`action` are
// plain codes from the backend's dynamic resource+action catalog
// (GET /api/access-control/catalog) — the only place a route's permission
// requirement is declared; nothing to hand-sync elsewhere. `resource: null`
// means "visible to any authenticated user" (the page gates its own content,
// e.g. by relationship rather than a single resource code).
export const RESOURCES = [
  {
    key: "dashboard",
    label: "Dashboard",
    segment: "dashboard",
    Icon: LayoutDashboard,
    resource: null,
    component: DashboardPage,
  },
  {
    key: "setup",
    label: "Getting Started",
    segment: "setup",
    Icon: Rocket,
    resource: "SETUP_INITIALIZATION",
    action: "manage",
    component: OnboardingPage,
  },
  {
    key: "directory",
    label: "Directory & Setups",
    segment: "directory",
    Icon: Users,
    resource: "EMPLOYEE",
    action: "read",
    component: DirectoryPage,
  },
  {
    key: "self-service",
    label: "Self-Service Portal",
    segment: "self-service",
    Icon: UserCircle,
    resource: null,
    component: ESSPage,
  },
  {
    key: "workflows",
    label: "Approval Workflows",
    segment: "workflows",
    Icon: GitBranch,
    resource: "APPROVAL_WORKFLOW_DEFINITION",
    action: "read",
    component: WorkflowPage,
  },
  {
    key: "approvals",
    label: "Approvals Inbox",
    segment: "approvals",
    Icon: Inbox,
    // The inbox multiplexes four approval types — access with any of them.
    resource: ["LEAVE_REQUEST", "DOCUMENT", "PROFILE_UPDATE_REQUEST", "STAFF_LOAN"],
    action: "approve",
    component: ApprovalsInboxPage,
  },
  {
    key: "payroll",
    label: "Payroll Processing",
    segment: "payroll",
    Icon: Wallet,
    resource: "PAYROLL_RUN",
    action: "manage",
    component: PayrollPage,
  },
  {
    key: "leave",
    label: "Leave Administration",
    segment: "leave",
    Icon: CalendarDays,
    // The org-wide admin console — gate on the elevated "manage" (see
    // everyone's requests) capability, not plain "read" which every
    // employee holds for their own leave requests.
    resource: "LEAVE_REQUEST",
    action: "manage",
    component: LeaveAdminPage,
  },
  {
    key: "administration-periods",
    label: "Administration Periods",
    segment: "administration-periods",
    Icon: CalendarClock,
    resource: "ADMINISTRATION_PERIOD",
    action: "manage",
    component: AdministrationPeriodsPage,
  },
  {
    key: "loans",
    label: "Loans",
    segment: "loans",
    Icon: HandCoins,
    resource: "STAFF_LOAN",
    action: "manage",
    component: LoanAdminPage,
  },
  {
    key: "appraisals",
    label: "Appraisals",
    segment: "appraisals",
    Icon: ClipboardCheck,
    // Visible to every authenticated user: the page adapts its tabs to the
    // viewer (all employees get their own appraisal; managers & dept heads
    // additionally get Team Reviews; admins get Cycles/Indicators/Reports).
    // The appraisal domain authorizes largely by relationship (department
    // head / manager / designated reviewer), not a single resource code, so
    // per-action gating happens inside the page instead of at the route.
    resource: null,
    component: AppraisalPage,
  },
  {
    key: "settings",
    label: "Access Management",
    segment: "settings",
    Icon: ShieldCheck,
    // Roles, permission grants, and user↔role assignments are an
    // Administrator-only capability — fixed, not a grantable resource/action
    // — so no role can ever be configured to see or touch this page.
    resource: null,
    adminOnly: true,
    component: SettingsPage,
  },
  {
    key: "audit",
    label: "Audit Trail",
    segment: "audit",
    Icon: ScrollText,
    resource: "AUDIT_LOG",
    action: "read",
    component: AuditTrailPage,
  },
  {
    key: "organization",
    label: "Company Settings",
    segment: "organization",
    Icon: Building2,
    resource: "SYSTEM_CONFIG",
    action: "read",
    component: OrganizationSettingsPage,
  },
];

export const pathFor = (resource) => `/app/${resource.segment}`;
