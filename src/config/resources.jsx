import {
  LayoutDashboard,
  Rocket,
  Users,
  UserCircle,
  GitBranch,
  Wallet,
  CalendarDays,
  ShieldCheck,
  Building2,
  Inbox,
} from "lucide-react";
import frontendResourceCatalog from "./frontend-resource-catalog.json";

import DirectoryPage from "../pages/admin/DirectoryPage";
import ESSPage from "../pages/ess/ESSPage";
import WorkflowPage from "../pages/admin/WorkflowPage";
import { SettingsPage } from "../pages/admin/SettingsPage";
import OnboardingPage from "../pages/admin/OnboardingPage";
import OrganizationSettingsPage from "../pages/admin/OrganizationSettingsPage";
import ApprovalsInboxPage from "../pages/admin/ApprovalsInboxPage";

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

function ComingSoon({ label }) {
  return (
    <div className="p-8 text-center text-slate-500 border border-dashed border-slate-200 rounded-2xl bg-white">
      Module{" "}
      <span className="font-semibold text-[#4f1a60] capitalize">{label}</span>{" "}
      is scheduled for a future milestone.
    </div>
  );
}

export const RESOURCES = [
  {
    key: "dashboard",
    label: "Dashboard",
    segment: "dashboard",
    Icon: LayoutDashboard,
    resource: null, // visible to all authenticated users
    component: () => <ComingSoon label="dashboard" />,
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
    component: () => <ComingSoon label="payroll" />,
  },
  {
    key: "leave",
    label: "Leave Administration",
    segment: "leave",
    Icon: CalendarDays,
    resource: RESOURCE_CODES.LEAVE_REQUESTS,
    action: "read",
    checks: checksFromRoutes(["/leave-requests"]),
    component: () => <ComingSoon label="leave" />,
  },
  {
    key: "settings",
    label: "Users & Permissions",
    segment: "settings",
    Icon: ShieldCheck,
    resource: RESOURCE_CODES.ROLE_PERMISSIONS,
    action: "read",
    checks: checksFromRoutes(["/access/roles", "/access/resources", "/access/assignments"]),
    component: SettingsPage,
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
