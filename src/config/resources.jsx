import {
  LayoutDashboard,
  Rocket,
  Users,
  UserCircle,
  GitBranch,
  Wallet,
  CalendarDays,
  HandCoins,
  ShieldCheck,
  Building2,
  Inbox,
  ScrollText,
} from "lucide-react";
import { lazy } from "react";
import frontendResourceCatalog from "./frontend-resource-catalog.json";

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
const LoanAdminPage = lazy(() => import("../pages/admin/LoanAdminPage"));

import { RESOURCE_CODES } from "./resourceCodes";
export { RESOURCE_CODES };

const CATALOG_ROUTE_RESOURCE = {
  "/setup": RESOURCE_CODES.SETUP,
  "/setup/workflows": RESOURCE_CODES.APPROVAL_WORKFLOWS,
  "/users": RESOURCE_CODES.EMPLOYEES,
  "/departments": RESOURCE_CODES.DEPARTMENTS,
  "/office-locations": RESOURCE_CODES.OFFICE_LOCATIONS,
  "/job-roles": RESOURCE_CODES.JOB_ROLES,
  "/grades": RESOURCE_CODES.GRADES,
  "/benefit-levels": RESOURCE_CODES.BENEFIT_LEVELS,
  "/pay-grades": RESOURCE_CODES.PAY_GRADES,
  "/pay-groups": RESOURCE_CODES.PAY_GROUPS,
  "/payroll": RESOURCE_CODES.PAYROLL,
  "/leave-requests": RESOURCE_CODES.LEAVE_REQUESTS,
  "/approvals/leave-requests": RESOURCE_CODES.LEAVE_REQUESTS,
  "/approvals/documents": RESOURCE_CODES.DOCUMENTS,
  "/approvals/profile-updates": RESOURCE_CODES.PROFILE_UPDATE,
  "/access/roles": RESOURCE_CODES.ROLE_PERMISSIONS,
  "/access/resources": RESOURCE_CODES.ROLE_PERMISSIONS,
  "/access/assignments": RESOURCE_CODES.ROLE_MAPPING,
  "/settings/system": RESOURCE_CODES.SYSTEM_CONFIG,
};

const PAGE_PERMISSIONS_BY_ROUTE = new Map(
  (frontendResourceCatalog?.modules || []).flatMap((moduleDef) =>
    (moduleDef.pages || []).map((page) => [page.frontend_route, page.permissions || []])
  )
);

function checkFromCatalogRoute(route) {
  const resource = CATALOG_ROUTE_RESOURCE[route];
  if (!resource) return null;
  return {
    resource,
    permissions: PAGE_PERMISSIONS_BY_ROUTE.get(route) || [],
  };
}

function checksFromRoutes(routes = []) {
  return routes.map((route) => checkFromCatalogRoute(route)).filter(Boolean);
}

export const RESOURCES = [
  {
    key: "dashboard",
    label: "Dashboard",
    segment: "dashboard",
    Icon: LayoutDashboard,
    resource: null, // visible to all authenticated users
    component: DashboardPage,
  },
  {
    key: "setup",
    label: "Getting Started",
    segment: "setup",
    Icon: Rocket,
    resource: RESOURCE_CODES.SETUP,
    action: "create",
    checks: checksFromRoutes(["/setup"]),
    component: OnboardingPage,
  },
  {
    key: "directory",
    label: "Directory & Setups",
    segment: "directory",
    Icon: Users,
    resource: RESOURCE_CODES.EMPLOYEES,
    action: "read",
    checks: checksFromRoutes([
      "/users",
      "/departments",
      "/office-locations",
      "/job-roles",
      "/grades",
      "/benefit-levels",
      "/pay-grades",
      "/pay-groups",
    ]),
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
    resource: RESOURCE_CODES.APPROVAL_WORKFLOWS,
    action: "read",
    checks: checksFromRoutes(["/setup/workflows"]),
    component: WorkflowPage,
  },
  {
    key: "approvals",
    label: "Approvals Inbox",
    segment: "approvals",
    Icon: Inbox,
    // The inbox multiplexes three approval types — access with any of them.
    resource: [RESOURCE_CODES.LEAVE_REQUESTS, RESOURCE_CODES.DOCUMENTS, RESOURCE_CODES.PROFILE_UPDATE],
    action: "read",
    checks: checksFromRoutes([
      "/approvals/leave-requests",
      "/approvals/documents",
      "/approvals/profile-updates",
    ]),
    component: ApprovalsInboxPage,
  },
  {
    key: "payroll",
    label: "Payroll Processing",
    segment: "payroll",
    Icon: Wallet,
    resource: RESOURCE_CODES.PAYROLL,
    action: "read",
    checks: checksFromRoutes(["/payroll"]),
    component: PayrollPage,
  },
  {
    key: "leave",
    label: "Leave Administration",
    segment: "leave",
    Icon: CalendarDays,
    resource: RESOURCE_CODES.LEAVE_REQUESTS,
    action: "review",
    // The org-wide admin console — gate on the review-level approvals page,
    // not "/leave-requests" (the ESS "My Leave Requests" page), which every
    // employee can read and would make this appear for the whole company.
    checks: checksFromRoutes(["/approvals/leave-requests"]),
    component: LeaveAdminPage,
  },
  {
    key: "loans",
    label: "Loans",
    segment: "loans",
    Icon: HandCoins,
    resource: RESOURCE_CODES.LOANS,
    action: "read",
    component: LoanAdminPage,
  },
  {
    key: "settings",
    label: "Users & Permissions",
    segment: "settings",
    Icon: ShieldCheck,
    resource: RESOURCE_CODES.ROLE_PERMISSIONS,
    action: "manage",
    // Gate on the roles/resources pages (real create/update/delete grants).
    // "/access/assignments" is excluded: its resource:assign key can't gate
    // anything — the backend reports canAssign as a resource capability, so
    // it's true for every employee.
    checks: checksFromRoutes(["/access/roles", "/access/resources"]),
    component: SettingsPage,
  },
  {
    key: "audit",
    label: "Audit Trail",
    segment: "audit",
    Icon: ScrollText,
    // Confirm the seeded catalog uses this code — until granted, admins only.
    resource: RESOURCE_CODES.AUDIT_LOGS,
    action: "read",
    component: AuditTrailPage,
  },
  {
    key: "organization",
    label: "Company Settings",
    segment: "organization",
    Icon: Building2,
    resource: RESOURCE_CODES.SYSTEM_CONFIG,
    action: "read",
    checks: checksFromRoutes(["/settings/system"]),
    component: OrganizationSettingsPage,
  },
];

export const pathFor = (resource) => `/app/${resource.segment}`;
