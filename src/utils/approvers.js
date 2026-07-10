// Whether this user is a designated approver for a given workflow type —
// i.e. their job title appears as a step approver on an active workflow of
// that type. Fail-open: if workflow data is unavailable (e.g. the caller
// can't read workflows) or no workflow of that type exists, fall back to the
// permission gate alone; the backend remains the real enforcer.
export function isDesignatedApprover(workflows, workflowType, user, isAdmin) {
  if (isAdmin) return true;
  if (!Array.isArray(workflows) || workflows.length === 0) return true;
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
