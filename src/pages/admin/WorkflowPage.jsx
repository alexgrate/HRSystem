import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, Plus, Trash2, HelpCircle } from "lucide-react";
import { setupService } from "../../services/setupService";
import { usePermissions } from "../../context/PermissionContext";
import { useToast } from "../../components/ui/Notifications";
import { RESOURCE_CODES } from "../../config/resourceCodes";

const getTypeColor = (type) => {
  const t = (type || "").toUpperCase();
  if (t.includes("LEAVE")) return "border-l-emerald-500";
  if (t.includes("PAYROLL")) return "border-l-amber-500";
  if (t.includes("EMPLOYEE") || t.includes("PROFILE")) return "border-l-blue-500";
  if (t.includes("DOCUMENT")) return "border-l-red-500";
  return "border-l-brand";
};

const WorkflowPage = () => {
  const { can } = usePermissions();
  const [workflows, setWorkflows] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [activeId, setActiveId] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      const [wList, rolesResponse] = await Promise.all([
        setupService.getWorkflows(),
        setupService.getJobRoles(),
      ]);
      setWorkflows(wList || []);
      setJobRoles(rolesResponse || []);
    } catch (err) {
      console.error("[WorkflowPage] Error loading workflow setups:", err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadWorkflowData();
  }, []);

  const activeFlow = workflows.find((w) => w.workflow?.id === activeId) || workflows[0] || null;

  const getApproverTitle = (step) => {
    if (step.approver_job_role_code) return step.approver_job_role_code;
    const matched = jobRoles.find((r) => r.id === step.approver_job_role_id);
    return matched ? matched.title : "Approver";
  };


  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-brand">Approval Engine</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-ink">Approval Workflow Designer</h1>
          <p className="mt-1 text-sm text-ink-muted">Configure multi-stage approval sequences for every HR process.</p>
        </div>
        {can(RESOURCE_CODES.APPROVAL_WORKFLOWS, "create") && (
          <button
            onClick={() => setShowAdd(true)}
            className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-brand to-brand-2 px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-brand/20 active:scale-95 transition-transform"
          >
            <Plus className="h-4 w-4" /> New workflow
          </button>
        )}
      </div>

      {loading ? (
        <div className="p-12 text-center text-ink-muted bg-card rounded-2xl border border-line-soft">
          Retrieving active workflows from database...
        </div>
      ) : workflows.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-line rounded-2xl bg-card">
          <HelpCircle className="mx-auto h-12 w-12 text-ink-ghost" />
          <h3 className="mt-4 text-sm font-semibold text-ink">No active workflows configured</h3>
          <p className="mt-1 text-xs text-ink-muted">Add a new workflow chain above to begin gating your transactions.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {workflows.map((p, i) => (
              <button
                key={p.workflow?.id || i}
                onClick={() => setActiveId(p.workflow?.id)}
                className={`rounded-2xl border-y border-r border-l-4 p-4 text-left transition-all ${
                  p === activeFlow
                    ? "border-brand bg-gradient-to-br from-brand/5 to-card shadow-md"
                    : "border-line/80 bg-card hover:border-line"
                } ${getTypeColor(p.workflow?.workflow_type)}`}
              >
                <div className="text-sm font-semibold text-ink capitalize">
                  {p.workflow?.name || "Unnamed Workflow"}
                </div>
                <div className="text-xs text-ink-muted mt-1 uppercase tracking-wider">
                  {(p.workflow?.workflow_type || "SYSTEM").replace('_', ' ')} process
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-brand">
                  {(p.steps || []).length}-stage approval
                </div>
              </button>
            ))}
          </div>

          {activeFlow && (
            <div className="rounded-2xl border border-line/80 bg-gradient-to-br from-sunken to-card p-8 shadow-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-ink-muted">Visual flow</div>
              <h3 className="font-semibold text-ink capitalize">{activeFlow.workflow?.name || "Unnamed Workflow"}</h3>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {(activeFlow.steps || [])
                  .sort((a, b) => a.step_order - b.step_order)
                  .map((s, i) => {
                    const approverTitle = getApproverTitle(s);
                    return (
                      <div key={s.id || i} className="flex items-center gap-2">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="relative">
                          <div className="flex h-28 w-44 flex-col items-center justify-center gap-1.5 rounded-2xl border border-line bg-card p-3 shadow-sm">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-brand to-brand-2 text-white text-xs font-bold shadow-sm shadow-brand/20">
                              {s.step_order}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-ink-faint">Stage {s.step_order}</div>
                            <div className="text-sm font-semibold text-ink-2 truncate max-w-full px-1">{approverTitle}</div>
                            
                            {s.require_all_approvers && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700 uppercase tracking-wider">
                                Requires All
                              </span>
                            )}
                          </div>
                        </motion.div>
                        {i < activeFlow.steps.length - 1 && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 + 0.05 }}>
                            <ArrowRight className="h-5 w-5 text-brand" />
                          </motion.div>
                        )}
                      </div>
                    );
                  })}
              </div>
            </div>
          )}
        </>
      )}

      <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
        <div className="flex items-center justify-between border-b border-line-soft p-5">
          <div>
            <h3 className="font-semibold text-ink">Audit-ready approval log</h3>
            <p className="text-xs text-ink-muted">Chronological database records of transactional decisions.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">SOC 2 · IMMUTABLE</span>
        </div>
        <div className="p-8 text-center text-ink-faint text-sm">
          No immutable transaction logs recorded yet in your tenant workspace.
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <WorkflowFormModal
            onClose={() => setShowAdd(false)}
            onSaved={loadWorkflowData}
            jobRoles={jobRoles}
          />
        )}
      </AnimatePresence>
    </div>
  )
}


function WorkflowFormModal({ onClose, onSaved, jobRoles }) {
  const toast = useToast();
  const [name, setName] = useState("");
  const [workflowType, setWorkflowType] = useState("LEAVE_REQUEST");
  const [steps, setSteps] = useState([
    { id: 1, approver_job_role_id: "" }
  ]);

  const addStep = () => {
    setSteps((prev) => [...prev, { id: Date.now(), approver_job_role_id: "" }]);
  };

  const removeStep = (id) => {
    if (steps.length === 1) return;
    setSteps((prev) => prev.filter((s) => s.id !== id));
  };

  const updateStepRole = (id, roleId) => {
    setSteps((prev) =>
      prev.map((s) => (s.id === id ? { ...s, approver_job_role_id: roleId } : s))
    );
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        name: name.trim(),
        workflow_type: workflowType,
        is_active: true,
        steps: steps.map((s, idx) => ({
          step_order: idx + 1,
          approver_job_role_id: s.approver_job_role_id,
          require_all_approvers: false
        }))
      };

      await setupService.createWorkflow(payload);
      toast.success("Workflow created.");
      onSaved?.();
      onClose();
    } catch (err) {
      console.error("Workflow creation failed:", err);
      toast.error(err?.error?.message || err?.message || "Error creating workflow chain.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-card p-6 shadow-xl my-8">
        <h3 className="text-lg font-bold text-ink">Configure Approval Workflow</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Workflow Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full h-11 border border-line rounded-xl px-3 outline-none mt-1" 
              placeholder="e.g. Department Manager Leave Review" 
              required 
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Process Type</label>
            <select 
              value={workflowType} 
              onChange={e => setWorkflowType(e.target.value)} 
              className="w-full h-11 border border-line bg-card rounded-xl px-3 outline-none mt-1"
            >
              <option value="LEAVE_REQUEST">Leave Request</option>
              <option value="PAYROLL_SUBMISSION">Payroll Submission</option>
              <option value="EMPLOYEE_UPDATE">Profile Update</option>
              <option value="DOCUMENT_UPLOAD">Document Upload</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-ink-muted uppercase tracking-wider">Approval Steps Chain</label>
              <button 
                type="button" 
                onClick={addStep} 
                className="inline-flex items-center gap-1 text-xs font-bold text-brand"
              >
                <Plus className="h-3 w-3" /> Add Step
              </button>
            </div>

            <div className="mt-2 space-y-3 max-h-48 overflow-y-auto border border-line-soft p-2 rounded-xl bg-sunken/50">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-ink-faint w-16">Step {index + 1}</span>
                  <select 
                    value={step.approver_job_role_id} 
                    onChange={e => updateStepRole(step.id, e.target.value)}
                    className="flex-1 h-11 border border-line bg-card rounded-xl px-3 outline-none"
                    required
                  >
                    <option value="">— Select Approving Job Role —</option>
                    {jobRoles.map((r) => (
                      <option key={r.id} value={r.id}>{r.title}</option>
                    ))}
                  </select>
                  <button 
                    type="button" 
                    onClick={() => removeStep(step.id)}
                    className="p-2 text-ink-faint hover:text-red-600 disabled:opacity-50"
                    disabled={steps.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button type="button" onClick={onClose} className="h-11 border border-line rounded-xl px-4 text-sm font-semibold text-ink-muted">Cancel</button>
            <button type="submit" className="h-11 bg-brand text-white rounded-xl px-4 text-sm font-semibold">Save Workflow</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkflowPage