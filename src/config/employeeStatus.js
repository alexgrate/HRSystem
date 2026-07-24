
export const EMPLOYEE_STATUS = {
  ACTIVE: "ACTIVE",
  ON_LEAVE: "ON_LEAVE",
  INACTIVE: "INACTIVE",
  SUSPENDED: "SUSPENDED",
  TERMINATED: "TERMINATED",
  RESIGNED: "RESIGNED",
  RETIRED: "RETIRED",
};


export const EMPLOYEE_STATUS_ORDER = [
  EMPLOYEE_STATUS.ACTIVE,
  EMPLOYEE_STATUS.ON_LEAVE,
  EMPLOYEE_STATUS.INACTIVE,
  EMPLOYEE_STATUS.SUSPENDED,
  EMPLOYEE_STATUS.TERMINATED,
  EMPLOYEE_STATUS.RESIGNED,
  EMPLOYEE_STATUS.RETIRED,
];


export const EMPLOYEE_STATUS_META = {
  ACTIVE: { label: "Active", cls: "bg-emerald-50 text-emerald-700" },
  ON_LEAVE: { label: "On leave", cls: "bg-sky-50 text-sky-700" },
  INACTIVE: { label: "Inactive", cls: "bg-sunken text-ink-muted" },
  SUSPENDED: { label: "Suspended", cls: "bg-amber-50 text-amber-700" },
  TERMINATED: { label: "Terminated", cls: "bg-red-50 text-red-700" },
  RESIGNED: { label: "Resigned", cls: "bg-red-50 text-red-700" },
  RETIRED: { label: "Retired", cls: "bg-violet-50 text-violet-700" },
};

export const ACCESS_REVOKING_STATUSES = [
  EMPLOYEE_STATUS.INACTIVE,
  EMPLOYEE_STATUS.SUSPENDED,
  EMPLOYEE_STATUS.TERMINATED,
  EMPLOYEE_STATUS.RESIGNED,
  EMPLOYEE_STATUS.RETIRED,
];

export const normalizeStatus = (value) => {
  const s = String(value || "").toUpperCase();
  return EMPLOYEE_STATUS_META[s] ? s : EMPLOYEE_STATUS.ACTIVE;
};

export const employeeStatusMeta = (value) =>
  EMPLOYEE_STATUS_META[normalizeStatus(value)];

export const isAccessRevoking = (value) =>
  ACCESS_REVOKING_STATUSES.includes(normalizeStatus(value));

export const STATUS_CONFIRM_COPY = {
  INACTIVE: {
    title: "Deactivate this employee?",
    message:
      "They will immediately lose access — all active sessions are revoked and they can no longer log in. They'll need to contact HR to regain access. Records are kept.",
    confirmLabel: "Deactivate",
  },
  SUSPENDED: {
    title: "Suspend this employee?",
    message:
      "They will immediately lose access — all active sessions are revoked and login is blocked for the duration of the suspension. They'll need to contact HR to regain access.",
    confirmLabel: "Suspend",
  },
  TERMINATED: {
    title: "Terminate this employee?",
    message:
      "Employment ends: they immediately lose access, all active sessions are revoked, and login is permanently blocked. Regaining access requires HR. Payroll, leave and audit history are preserved.",
    confirmLabel: "Terminate",
  },
  RESIGNED: {
    title: "Mark this employee as resigned?",
    message:
      "Employment ends: the End Date is stamped automatically, they immediately lose access, and all active sessions are revoked. Payroll, leave and audit history are preserved.",
    confirmLabel: "Mark resigned",
  },
  RETIRED: {
    title: "Mark this employee as retired?",
    message:
      "Employment ends: the End Date is stamped automatically, they immediately lose access, and all active sessions are revoked. Payroll, leave and audit history are preserved.",
    confirmLabel: "Mark retired",
  },
};
