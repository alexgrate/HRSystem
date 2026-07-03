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

import DirectoryPage from "../pages/admin/DirectoryPage";
import ESSPage from "../pages/ess/ESSPage";
import WorkflowPage from "../pages/admin/WorkflowPage";
import { SettingsPage } from "../pages/admin/SettingsPage";
import OnboardingPage from "../pages/admin/OnboardingPage";
import OrganizationSettingsPage from "../pages/admin/OrganizationSettingsPage";
import ApprovalsInboxPage from "../pages/admin/ApprovalsInboxPage";

import { RESOURCE_CODES } from "./resourceCodes";
export { RESOURCE_CODES };

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
    action: "read",
    component: OnboardingPage,
  },
  {
    key: "directory",
    label: "Directory & Setups",
    segment: "directory",
    Icon: Users,
    resource: RESOURCE_CODES.EMPLOYEES,
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
    resource: RESOURCE_CODES.APPROVAL_WORKFLOWS,
    action: "read",
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
    component: ApprovalsInboxPage,
  },
  {
    key: "payroll",
    label: "Payroll Processing",
    segment: "payroll",
    Icon: Wallet,
    resource: RESOURCE_CODES.PAYROLL,
    action: "read",
    component: () => <ComingSoon label="payroll" />,
  },
  {
    key: "leave",
    label: "Leave Administration",
    segment: "leave",
    Icon: CalendarDays,
    resource: RESOURCE_CODES.LEAVE_REQUESTS,
    action: "read",
    component: () => <ComingSoon label="leave" />,
  },
  {
    key: "settings",
    label: "Users & Permissions",
    segment: "settings",
    Icon: ShieldCheck,
    resource: RESOURCE_CODES.ROLE_PERMISSIONS,
    action: "read",
    component: SettingsPage,
  },
  {
    key: "organization",
    label: "Company Settings",
    segment: "organization",
    Icon: Building2,
    resource: RESOURCE_CODES.SYSTEM_CONFIG,
    action: "read",
    component: OrganizationSettingsPage,
  },
];

export const pathFor = (resource) => `/app/${resource.segment}`;
