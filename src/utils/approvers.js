// Whether this user is a designated approver for a given workflow type —
// i.e. their job title appears as a step approver on an active workflow of
// that type. The backend enforces this per step server-side (a non-designated
// approval gets a 400), so this gate exists to keep the UI honest: don't
// offer approve/reject buttons the backend will refuse.
//
// Fail closed when workflow data is unknown (null: fetch failed or still
// loading) — a non-admin shouldn't see buttons we can't vouch for. When
// workflows loaded but none govern this type, nothing designates approvers,
// so the caller's permission check is the only gate.
export function isDesignatedApprover(workflows, workflowType, user, isAdmin) {
  if (isAdmin) return true;
  if (!Array.isArray(workflows)) return false;
  const flows = workflows.filter(
    (w) =>
      (w.workflow?.workflow_type || w.workflow_type) === workflowType &&
      (w.workflow?.is_active ?? w.is_active ?? true)
  );
  if (!flows.length) return true;
  const jobRoleId = user?.job_role_id;
  if (!jobRoleId) return false;
  return flows.some((w) => (w.steps || []).some((s) => s.approver_job_role_id === jobRoleId));
}
