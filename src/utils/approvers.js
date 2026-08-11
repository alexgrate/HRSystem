// Whether this user is a designated approver for a given workflow type —
// i.e. their job title (or a job title they're covering via active relief
// officer coverage, see extraJobRoleIds) appears as a step approver on an
// active workflow of that type, OR the workflow has a Line Manager/HOD step
// and this user is a manager/department head somewhere in the org
// (isManager/isDepartmentHead — see PermissionContext, sourced from
// GET /api/access-control/me/permissions). The backend enforces this per
// step server-side (a non-designated approval gets a 400 — job-role steps via
// setup.service.ts getEffectiveJobRoleIds, dynamic steps via
// resolveDynamicStepApproverId), so this gate exists to keep the UI honest:
// don't offer approve/reject buttons the backend will refuse.
//
// Dynamic steps are checked at the same coarse precision as job-role steps
// today (workflow-type-wide, not per-pending-request — isManager/
// isDepartmentHead don't say WHICH request you manage, only that you manage
// someone). That's a deliberate, known limitation: the backend is what
// precisely enforces every action; this only avoids offering buttons that
// are obviously wrong for this user.
//
// Fail closed when workflow data is unknown (null: fetch failed or still
// loading) — a non-admin shouldn't see buttons we can't vouch for. When
// workflows loaded but none govern this type, nothing designates approvers,
// so the caller's permission check is the only gate.
export function isDesignatedApprover(workflows, workflowType, user, isAdmin, extraJobRoleIds = [], isManager = false, isDepartmentHead = false) {
  if (isAdmin) return true;
  if (!Array.isArray(workflows)) return false;
  const flows = workflows.filter(
    (w) =>
      (w.workflow?.workflow_type || w.workflow_type) === workflowType &&
      (w.workflow?.is_active ?? w.is_active ?? true)
  );
  if (!flows.length) return true;
  const jobRoleIds = [user?.job_role_id, ...(extraJobRoleIds || [])].filter(Boolean);
  return flows.some((w) =>
    (w.steps || []).some((s) => {
      if (s.approver_type === "LINE_MANAGER") return isManager;
      if (s.approver_type === "HOD") return isDepartmentHead;
      return jobRoleIds.length > 0 && jobRoleIds.includes(s.approver_job_role_id);
    })
  );
}
