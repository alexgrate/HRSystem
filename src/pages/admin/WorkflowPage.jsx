import React, { useState, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { ArrowRight, User, Users, Wallet, ShieldCheck, Plus, CheckCircle2, XCircle, MessageSquare, Trash2, HelpCircle } from "lucide-react";
import { setupService } from "../../services/setupService";
import api from "../../services/api";

const getTypeColor = (type) => {
  const t = (type || "").toUpperCase();
  if (t.includes("LEAVE")) return "border-l-emerald-500";
  if (t.includes("PAYROLL")) return "border-l-amber-500";
  if (t.includes("EMPLOYEE") || t.includes("PROFILE")) return "border-l-blue-500";
  if (t.includes("DOCUMENT")) return "border-l-red-500";
  return "border-l-[#4f1a60]";
};

const WorkflowPage = () => {
  const [workflows, setWorkflows] = useState([]);
  const [jobRoles, setJobRoles] = useState([]);
  const [active, setActive] = useState(0);
  const [loading, setLoading] = useState(true);
  const [showAdd, setShowAdd] = useState(false);

  const loadWorkflowData = async () => {
    setLoading(true);
    try {
      const [wList, rolesResponse] = await Promise.all([
        setupService.getWorkflows(),
        api.get("/api/job-roles/")
      ]);
      
      console.log("[WorkflowPage] GET Workflows API Response:", wList);
      
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
  }, [showAdd]);

  const activeFlow = workflows[active];

  const getApproverTitle = (step) => {
    if (step.approver_job_role_code) return step.approver_job_role_code;
    const matched = jobRoles.find((r) => r.id === step.approver_job_role_id);
    return matched ? matched.title : "Approver";
  };


  return (
    <div className="space-y-6">
      <div className="flex items-end justify-between flex-wrap gap-4">
        <div>
          <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">Approval Engine</div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">Approval Workflow Designer</h1>
          <p className="mt-1 text-sm text-slate-500">Configure multi-stage approval sequences for every HR process.</p>
        </div>
        <button 
          onClick={() => setShowAdd(true)} 
          className="flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-md shadow-[#4f1a60]/20 active:scale-95 transition-transform"
        >
          <Plus className="h-4 w-4" /> New workflow
        </button>
      </div>

      {loading ? (
        <div className="p-12 text-center text-slate-500 bg-white rounded-2xl border border-slate-100">
          Retrieving active workflows from database...
        </div>
      ) : workflows.length === 0 ? (
        <div className="p-12 text-center border border-dashed border-slate-200 rounded-2xl bg-white">
          <HelpCircle className="mx-auto h-12 w-12 text-slate-300" />
          <h3 className="mt-4 text-sm font-semibold text-slate-900">No active workflows configured</h3>
          <p className="mt-1 text-xs text-slate-500">Add a new workflow chain above to begin gating your transactions.</p>
        </div>
      ) : (
        <>
          <div className="grid gap-3 md:grid-cols-3">
            {workflows.map((p, i) => (
              <button 
                key={p.workflow?.id || i} 
                onClick={() => setActive(i)} 
                className={`rounded-2xl border-y border-r border-l-4 p-4 text-left transition-all ${
                  active === i 
                    ? "border-[#4f1a60] bg-gradient-to-br from-[#4f1a60]/5 to-white shadow-md" 
                    : "border-slate-200/80 bg-white hover:border-slate-300"
                } ${getTypeColor(p.workflow?.workflow_type)}`} 
              >
                <div className="text-sm font-semibold text-slate-900 capitalize">
                  {p.workflow?.name || "Unnamed Workflow"}
                </div>
                <div className="text-xs text-slate-500 mt-1 uppercase tracking-wider">
                  {(p.workflow?.workflow_type || "SYSTEM").replace('_', ' ')} process
                </div>
                <div className="mt-2 inline-flex items-center gap-1 text-[11px] font-semibold text-[#4f1a60]">
                  {(p.steps || []).length}-stage approval
                </div>
              </button>
            ))}
          </div>

          {activeFlow && (
            <div className="rounded-2xl border border-slate-200/80 bg-gradient-to-br from-slate-50 to-white p-8 shadow-sm">
              <div className="mb-1 text-xs font-semibold uppercase tracking-wider text-slate-500">Visual flow</div>
              <h3 className="font-semibold text-slate-900 capitalize">{activeFlow.workflow?.name || "Unnamed Workflow"}</h3>
              <div className="mt-8 flex flex-wrap items-center justify-center gap-2">
                {(activeFlow.steps || [])
                  .sort((a, b) => a.step_order - b.step_order)
                  .map((s, i) => {
                    const approverTitle = getApproverTitle(s);
                    return (
                      <div key={s.id || i} className="flex items-center gap-2">
                        <motion.div initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} transition={{ delay: i * 0.1 }} className="relative">
                          <div className="flex h-28 w-44 flex-col items-center justify-center gap-1.5 rounded-2xl border border-slate-200 bg-white p-3 shadow-sm">
                            <div className="flex h-8 w-8 items-center justify-center rounded-full bg-gradient-to-br from-[#4f1a60] to-[#8a2da8] text-white text-xs font-bold shadow-sm shadow-[#4f1a60]/20">
                              {s.step_order}
                            </div>
                            <div className="text-[10px] uppercase tracking-wider text-slate-400">Stage {s.step_order}</div>
                            <div className="text-sm font-semibold text-slate-800 truncate max-w-full px-1">{approverTitle}</div>
                            
                            {s.require_all_approvers && (
                              <span className="rounded bg-emerald-50 px-1.5 py-0.5 text-[8px] font-bold text-emerald-700 uppercase tracking-wider">
                                Requires All
                              </span>
                            )}
                          </div>
                        </motion.div>
                        {i < activeFlow.steps.length - 1 && (
                          <motion.div initial={{ opacity: 0 }} animate={{ opacity: 1 }} transition={{ delay: i * 0.1 + 0.05 }}>
                            <ArrowRight className="h-5 w-5 text-[#4f1a60]" />
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

      <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
        <div className="flex items-center justify-between border-b border-slate-100 p-5">
          <div>
            <h3 className="font-semibold text-slate-900">Audit-ready approval log</h3>
            <p className="text-xs text-slate-500">Chronological database records of transactional decisions.</p>
          </div>
          <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-[10px] font-bold text-emerald-700">SOC 2 · IMMUTABLE</span>
        </div>
        <div className="p-8 text-center text-slate-400 text-sm">
          No immutable transaction logs recorded yet in your tenant workspace.
        </div>
      </div>

      <AnimatePresence>
        {showAdd && (
          <WorkflowFormModal 
            onClose={() => setShowAdd(false)} 
            jobRoles={jobRoles} 
          />
        )}
      </AnimatePresence>
    </div>
  )
}


function WorkflowFormModal({ onClose, jobRoles }) {
  const [name, setName] = useState("");
  const [workflowType, setWorkflowType] = useState("LEAVE_REQUEST");
  const [steps, setSteps] = useState([
    { id: Date.now(), approver_job_role_id: "" }
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

      console.log("[WorkflowPage] Dispatching payload to POST /api/setups/approval-workflows:", payload);

      await setupService.createWorkflow(payload);
      onClose();
    } catch (err) {
      console.error("Workflow creation failed:", err);
      alert(err?.error?.message || err?.message || "Error creating workflow chain.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4 overflow-y-auto">
      <div className="w-full max-w-lg rounded-2xl bg-white p-6 shadow-xl my-8">
        <h3 className="text-lg font-bold text-slate-900">Configure Approval Workflow</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Workflow Name</label>
            <input 
              value={name} 
              onChange={e => setName(e.target.value)} 
              className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" 
              placeholder="e.g. Department Manager Leave Review" 
              required 
            />
          </div>

          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Process Type</label>
            <select 
              value={workflowType} 
              onChange={e => setWorkflowType(e.target.value)} 
              className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 outline-none mt-1"
            >
              <option value="LEAVE_REQUEST">Leave Request</option>
              <option value="PAYROLL_SUBMISSION">Payroll Submission</option>
              <option value="EMPLOYEE_UPDATE">Profile Update</option>
              <option value="DOCUMENT_UPLOAD">Document Upload</option>
            </select>
          </div>

          <div>
            <div className="flex items-center justify-between">
              <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Approval Steps Chain</label>
              <button 
                type="button" 
                onClick={addStep} 
                className="inline-flex items-center gap-1 text-xs font-bold text-[#4f1a60]"
              >
                <Plus className="h-3 w-3" /> Add Step
              </button>
            </div>

            <div className="mt-2 space-y-3 max-h-48 overflow-y-auto border border-slate-100 p-2 rounded-xl bg-slate-50/50">
              {steps.map((step, index) => (
                <div key={step.id} className="flex items-center gap-2">
                  <span className="text-xs font-bold text-slate-400 w-16">Step {index + 1}</span>
                  <select 
                    value={step.approver_job_role_id} 
                    onChange={e => updateStepRole(step.id, e.target.value)}
                    className="flex-1 h-11 border border-slate-200 bg-white rounded-xl px-3 outline-none"
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
                    className="p-2 text-slate-400 hover:text-red-600 disabled:opacity-50"
                    disabled={steps.length === 1}
                  >
                    <Trash2 className="h-4 w-4" />
                  </button>
                </div>
              ))}
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-4">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold">Save Workflow</button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default WorkflowPage