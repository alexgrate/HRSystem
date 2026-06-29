import React, { useEffect, useMemo, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { Search, Filter, X, Mail, Phone, Lock, AlertTriangle, Plus, AlertCircle, CheckCircle2, Building, Layers } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { setupService } from "../../services/setupService";
import api from "../../services/api";
import { title } from "framer-motion/client";

const TABS = ["Employees", "Offices", "Departments", "Job Titles", "Pay Grades", "Benefit Levels"];

const DirectoryPage = () => {
    const { user } = useAuth();
    const [tab, setTab] = useState("Employees");
    const [q, setQ] = useState("");
    const [listData, setListData] = useState([]);
    const [loading, setLoading] = useState(false);
    const [showAdd, setShowAdd] = useState(false);
    
    const [showAddOffice, setShowAddOffice] = useState(false);
    const [showAddDept, setShowAddDept] = useState(false);

    const [showAddPayGrade, setShowAddPayGrade] = useState(false);
    const [showAddBenefitLevel, setShowAddBenefitLevel] = useState(false);

    const [showAddJobRole, setShowAddJobRole] = useState(false);

    const [allDepartments, setAllDepartments] = useState([]);
    const [allPayGrades, setAllPayGrades] = useState([]);
    const [allBenefitLevels, setAllBenefitLevels] = useState([]);

    useEffect(() => {
        const fetchGlobalSetups = async () => {
            try {
                const [depts, grades, benefits] = await Promise.all([
                    setupService.getDepartments(),
                    setupService.getPayGrades(),
                    setupService.getBenefitLevels()
                ]);
                setAllDepartments(depts || []);
                setAllPayGrades(grades || []);
                setAllBenefitLevels(benefits || []);
            } catch (err) {
                console.error("Error fetching onboarding setups:", err);
            }
        };
        fetchGlobalSetups();
    }, []);

    useEffect(() => {
        const fetchTabData = async () => {
            setLoading(true);
            try {
                let res;
                if (tab === "Employees") {
                    res = await api.get("/api/users/"); 
                    console.log("[DirectoryPage] GET /api/users/ raw response payload:", res);

                    if (Array.isArray(res)) {
                        setListData(res);
                    } else {
                        setListData(res.users || []);
                    }
                } else if (tab === "Offices") {
                    res = await setupService.getOffices(); 
                    console.log("[DirectoryPage] GET Offices raw response payload:", res);
                    setListData(res || []);
                } else if (tab === "Departments") {
                    res = await setupService.getDepartments(); 
                    setListData(res || []);
                } else if (tab === "Job Titles") {
                    res = await api.get("/api/job-roles/");
                    console.log("[DirectoryPage] GET Job Roles raw response payload:", res);
                    setListData(res || []);
                } else if (tab === "Pay Grades") {
                    res = await setupService.getPayGrades(); 
                    setListData(res || []);
                } else if (tab === "Benefit Levels") {
                    res = await setupService.getBenefitLevels(); 
                    setListData(res || []);
                }
            } catch (err) {
                console.error("Error retrieving dashboard setups:", err);
            } finally {
                setLoading(false);
            }
        };

        fetchTabData();
    }, [tab, showAdd, showAddOffice, showAddDept, showAddPayGrade, showAddBenefitLevel, showAddJobRole]);

    const filteredData = listData.filter((item) => {
        if (!q) return true;
        
        const s = q.toLowerCase();

        const nameMatch = item?.name && item.name.toLowerCase().includes(s);
        const emailMatch = item?.email && item.email.toLowerCase().includes(s);
        const titleMatch = item?.title && item.title.toLowerCase().includes(s);
        const addressMatch = item?.address && item.address.toLowerCase().includes(s);
        const stateMatch = item?.state && item.state.toLowerCase().includes(s);
        const codeMatch = item?.code && item.code.toLowerCase().includes(s);

        return nameMatch || emailMatch || titleMatch || addressMatch || stateMatch || codeMatch;
    });


    const dynamicDepartments = useMemo(() => {
        return Array.from(new Set(listData.map((item) => item?.department).filter(Boolean)));
    }, [listData])

    const dynamicManagers = useMemo(() => {
        return listData.map((item) => item?.name).filter(Boolean);
    }, [listData]);

    return (
        <div className="space-y-6">
            <div className="flex items-end justify-between flex-wrap gap-4">
                <div>
                    <div className="text-xs font-semibold uppercase tracking-wider text-[#4f1a60]">HRIS Hub</div>
                    <h1 className="mt-1 text-2xl sm:text-3xl font-bold tracking-tight text-slate-900">
                        {tab === "Employees" ? "Employee Directory" : `${tab} Configurations`}
                    </h1>
                    <p className="mt-1 text-sm text-slate-500">
                        {tab === "Employees" 
                        ? "Centralised dynamic registry of active profiles." 
                        : `Configure organizational setup models for your enterprise.`
                        }
                    </p>
                </div>
                <div className="flex flex-wrap gap-2">
                    {tab === "Employees" && (
                        <button onClick={() => setShowAdd(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                            <Plus className="h-4 w-4" /> New employee
                        </button>
                    )}
                    {tab === "Offices" && (
                        <button onClick={() => setShowAddOffice(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                            <Building className="h-4 w-4" /> Add Office Location
                        </button>
                    )}
                    {tab === "Departments" && (
                        <button onClick={() => setShowAddDept(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                            <Layers className="h-4 w-4" /> Add Department
                        </button>
                    )}
                    {tab === "Job Titles" && (
                        <button onClick={() => setShowAddJobRole(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                            <Plus className="h-4 w-4" /> Add Job Title
                        </button>
                    )}
                    {tab === "Pay Grades" && (
                        <button onClick={() => setShowAddPayGrade(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                            <Plus className="h-4 w-4" /> Add Pay Grade
                        </button>
                    )}
                    {tab === "Benefit Levels" && (
                        <button onClick={() => setShowAddBenefitLevel(true)} className="inline-flex items-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 py-2.5 text-sm font-semibold text-white shadow-sm hover:opacity-95">
                            <Plus className="h-4 w-4" /> Add Benefit Level
                        </button>
                    )}
                </div>
            </div>

            <div className="flex flex-wrap gap-1 rounded-xl border border-slate-200/80 bg-white p-1 shadow-sm">
                {TABS.map((t) => (
                    <button key={t} onClick={() => { setTab(t); setQ(""); }} className="relative rounded-lg px-3 py-1.5 text-xs font-semibold text-slate-600">
                        {tab === t && (
                            <motion.div 
                                layoutId="dir-tab" 
                                className="absolute inset-0 rounded-lg bg-gradient-to-r from-[#4f1a60] to-[#8a2da8]" 
                                transition={{ type: "spring", stiffness: 400, damping: 32 }} 
                            />
                        )}
                        <span className={`relative ${tab === t ? "text-white" : ""}`}>{t}</span>
                    </button>
                ))}
            </div>

            <div className="rounded-2xl border border-slate-200/80 bg-white shadow-sm">
                <div className="flex flex-wrap items-center gap-3 border-b border-slate-100 p-4">
                    <div className="flex flex-1 min-w-[240px] items-center gap-2 rounded-lg border border-slate-200 px-3 py-2 text-sm">
                        <Search className="h-4 w-4 text-slate-400" />
                        <input value={q} onChange={(e) => setQ(e.target.value)} placeholder={`Filter ${tab.toLowerCase()}...`} className="w-full bg-transparent outline-none placeholder:text-slate-400" />
                    </div>
                </div>

                <div className="overflow-x-auto">
                    {loading ? (
                        <div className="p-8 text-center text-slate-500">Retrieving setup profiles from database...</div>
                    ) : (
                        <table className="w-full text-sm">
                            <thead className="bg-slate-50/60 text-xs uppercase tracking-wider text-slate-500">
                                {tab === "Employees" && (
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Employee</th>
                                        <th className="px-4 py-3 text-left font-semibold">Contract Type</th>
                                        <th className="px-4 py-3 text-left font-semibold">Base Salary</th>
                                        <th className="px-4 py-3 text-left font-semibold">Email</th>
                                    </tr>
                                )}
                                {tab === "Offices" && (
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Address</th>
                                        <th className="px-4 py-3 text-left font-semibold">State</th>
                                        <th className="px-4 py-3 text-left font-semibold">Country</th>
                                        <th className="px-4 py-3 text-left font-semibold">Type</th>
                                    </tr>
                                )}
                                {tab === "Departments" && (
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Department Code</th>
                                        <th className="px-4 py-3 text-left font-semibold">Name</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    </tr>
                                )}
                                {tab === "Job Titles" && (
                                    <tr>
                                        <th className="px-4 py-3 text-left font-semibold">Role Code</th>
                                        <th className="px-4 py-3 text-left font-semibold">Title</th>
                                        <th className="px-4 py-3 text-left font-semibold">Status</th>
                                    </tr>
                                )}
                            </thead>
                            <tbody>
                                {filteredData.length === 0 ? (
                                    <tr>
                                        <td colSpan="5" className="p-8 text-center text-slate-400">No active records registered.</td>
                                    </tr>
                                ) : (
                                    filteredData.map((item, i) => (
                                        <tr key={item.id || i} className="border-t border-slate-100 hover:bg-slate-50/70">
                                            {tab === "Employees" && (
                                                <>
                                                    <td className="px-4 py-3 font-semibold text-slate-900">{item?.email ? item.email.split('@')[0] : "No Name"}</td>
                                                    <td className="px-4 py-3 capitalize">{item.contract_type || "Contract"}</td>
                                                    <td className="px-4 py-3">₦{(Number(item.base_salary) || 0).toLocaleString()}</td>
                                                    <td className="px-4 py-3 text-slate-500">{item.email}</td>
                                                </>
                                            )}
                                            {tab === "Offices" && (
                                                <>
                                                    <td className="px-4 py-3 font-semibold text-slate-900">{item.address}</td>
                                                    <td className="px-4 py-3">{item.state}</td>
                                                    <td className="px-4 py-3">{item.country}</td>
                                                    <td className="px-4 py-3">
                                                        {item.headquarter ? (
                                                        <span className="rounded bg-purple-50 px-2.5 py-1 text-xs text-[#4f1a60] font-semibold">Headquarters</span>
                                                        ) : (
                                                        <span className="rounded bg-slate-100 px-2.5 py-1 text-xs text-slate-600">Branch</span>
                                                        )}
                                                    </td>
                                                </>
                                            )}
                                            {tab === "Departments" && (
                                                <>
                                                    <td className="px-4 py-3 font-mono text-[#4f1a60] font-semibold">{item.code}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{item.name}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700 font-semibold">Active</span>
                                                    </td>
                                                </>
                                            )}
                                            {tab === "Job Titles" && (
                                                <>
                                                    <td className="px-4 py-3 font-mono text-[#4f1a60] font-semibold">{item.code || "—"}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{item.title || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <span className="rounded-full bg-emerald-50 px-2.5 py-1 text-xs text-emerald-700 font-semibold">Active</span>
                                                    </td>
                                                </>
                                            )}
                                            {tab === "Pay Grades" && (
                                                <>
                                                    <td className="px-4 py-3 font-mono text-[#4f1a60] font-semibold">{item.code || "—"}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{item.name || "—"}</td>
                                                    <td className="px-4 py-3 text-slate-600">
                                                        ₦{(Number(item.min_salary) || 0).toLocaleString()} - ₦{(Number(item.max_salary) || 0).toLocaleString()}
                                                    </td>
                                                </>
                                            )}
                                            {tab === "Benefit Levels" && (
                                                <>
                                                    <td className="px-4 py-3 font-mono text-[#4f1a60] font-semibold">{item.code || "—"}</td>
                                                    <td className="px-4 py-3 font-medium text-slate-900">{item.name || "—"}</td>
                                                    <td className="px-4 py-3">
                                                        <span className={`rounded-full px-2 py-0.5 text-xs font-semibold ${item.is_active ? 'bg-emerald-50 text-emerald-700' : 'bg-slate-100 text-slate-600'}`}>
                                                            {item.is_active ? 'Active' : 'Inactive'}
                                                        </span>
                                                    </td>
                                                </>
                                            )}
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    )}
                </div>
            </div>

            <AnimatePresence>
                {showAddOffice && <OfficeFormModal onClose={() => setShowAddOffice(false)} />}
                {showAddDept && <DeptFormModal onClose={() => setShowAddDept(false)} />}
                {showAddJobRole && (<JobRoleFormModal onClose={() => setShowAddJobRole(false)} departments={allDepartments} />)}
                {showAddPayGrade && <PayGradeFormModal onClose={() => setShowAddPayGrade(false)} />}
                {showAddBenefitLevel && <BenefitLevelFormModal onClose={() => setShowAddBenefitLevel(false)} />}

                {showAdd && (
                    <AddEmployeeDrawer 
                        departments={allDepartments}
                        payGrades={allPayGrades}
                        benefitLevels={allBenefitLevels}
                        managers={dynamicManagers}
                        onClose={() => setShowAdd(false)}
                        onSubmit={async (data) => {
                            try {
                                const nameParts = data.name.trim().split(" ");
                                const firstname = nameParts[0] || "";
                                const lastname = nameParts.slice(1).join(" ") || "";

                                const payload = {
                                    email: data.email.trim(),
                                    organization_id: user?.organization_id,
                                    contract_type: data.status === "Contract" ? "contractor" : "permanent",
                                    employment_status: data.status.toLowerCase(),
                                    active: true,
                                    biodata: {
                                        firstname: firstname,
                                        lastname: lastname
                                    }
                                };

                                console.log("[DirectoryPage] Dispatching payload to POST /api/users/:", payload);

                                await api.post("/api/users/", payload);
                                setShowAdd(false);
                                alert("Employee onboarded successfully!");
                            } catch (err) {
                                console.error("[DirectoryPage] Onboarding failed:", err);
                                alert(err?.error?.message || err?.message || "Error onboarding employee.");
                            }
                        }}
                    />
                )}
            </AnimatePresence>
        </div>
    )
}

function OfficeFormModal({ onClose }) {
    const [address, setAddress] = useState("");
    const [state, setState] = useState("");
    const [country, setCountry] = useState("Nigeria");
    const [hq, setHq] = useState(false);

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await setupService.createOffice({ address, state, country, headquarter: hq });
            onClose();
        } catch (err) {
            alert("Error building office configuration.");
        }
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Add Office Location</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Street Address</label>
                    <input value={address} onChange={e => setAddress(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" required />
                </div>
                <div className="grid grid-cols-2 gap-3">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">State</label>
                        <input value={state} onChange={e => setState(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" required />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Country</label>
                        <input value={country} onChange={e => setCountry(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" required />
                    </div>
                </div>
                <label className="flex items-center gap-2 cursor-pointer pt-2">
                    <input type="checkbox" checked={hq} onChange={e => setHq(e.target.checked)} className="h-4 w-4 text-[#4f1a60] rounded border-slate-300" />
                    <span className="text-sm font-semibold text-slate-700">Set as Headquarters</span>
                </label>
                <div className="flex gap-2 justify-end pt-4">
                    <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
                    <button type="submit" className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold">Save Location</button>
                </div>
            </form>
      </div>
    </div>
  );
}

function DeptFormModal({ onClose }) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [desc, setDesc] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            await setupService.createDepartment({ name, code, description: desc });
            onClose();
        } catch (err) {
            alert("Error adding department.");
        }
    };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
        <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
            <h3 className="text-lg font-bold text-slate-900">Add Department</h3>
            <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Name</label>
                    <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" required />
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Code</label>
                    <input value={code} onChange={e => setCode(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="e.g. FIN-01" required />
                </div>
                <div>
                    <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                    <textarea value={desc} onChange={e => setDesc(e.target.value)} className="w-full h-20 border border-slate-200 rounded-xl p-3 outline-none mt-1 resize-none" />
                </div>
                <div className="flex gap-2 justify-end pt-4">
                    <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
                    <button type="submit" className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold">Save Department</button>
                </div>
            </form>
        </div>
    </div>
  );
}

function JobRoleFormModal({ onClose, departments }) {
  const [title, setTitle] = useState("");
  const [code, setCode] = useState("");
  const [departmentId, setDepartmentId] = useState(departments[0]?.id || "");
  const [description, setDescription] = useState("");

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      const payload = {
        title: title.trim(),
        code: code.trim() || null,
        department_id: departmentId, 
        description: description.trim() || null,
        is_active: true
      };

      await api.post("/api/job-roles/", payload); 
      onClose();
    } catch (err) {
      console.error("Job Role creation failed:", err);
      alert(err?.message || "Error adding job title configuration.");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
      <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
        <h3 className="text-lg font-bold text-slate-900">Add Job Title</h3>
        <form onSubmit={handleSubmit} className="mt-4 space-y-4">
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Job Title Name</label>
            <input value={title} onChange={e => setTitle(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="e.g. HR Manager" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Role Code</label>
            <input value={code} onChange={e => setCode(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="e.g. HRM-01" required />
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Department Assignment</label>
            <select value={departmentId} onChange={e => setDepartmentId(e.target.value)} className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3 outline-none mt-1" required>
              <option value="">— Select Department —</option>
              {departments.map((d) => (
                <option key={d.id} value={d.id}>{d.name}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
            <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-20 border border-slate-200 rounded-xl p-3 outline-none mt-1 resize-none" />
          </div>
          <div className="flex gap-2 justify-end pt-4">
            <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
            <button type="submit" className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold">Save Job Title</button>
          </div>
        </form>
      </div>
    </div>
  );
}

function PayGradeFormModal({ onClose }) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [minSalary, setMinSalary] = useState("");
    const [maxSalary, setMaxSalary] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: name.trim(),
                code: code.trim() || null,
                min_salary: minSalary ? Number(minSalary) : null, 
                max_salary: maxSalary ? Number(maxSalary) : null, 
                currency: "NGN",
                description: description.trim() || null,
                is_active: true
            };

            await setupService.createPayGrade(payload);
            onClose();
        } catch (err) {
            console.error("Pay Grade Creation failed:", err);
            alert(err?.message || "Error adding pay grade configuration.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-900">Add Pay Grade</h3>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Pay Grade Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="e.g. Executive Grade 1" required />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Grade Code</label>
                        <input value={code} onChange={e => setCode(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="e.g. EXEC-01" />
                    </div>
                    <div className="grid grid-cols-2 gap-3">
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Min Salary (₦)</label>
                            <input type="number" value={minSalary} onChange={e => setMinSalary(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="500000" />
                        </div>
                        <div>
                            <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Max Salary (₦)</label>
                            <input type="number" value={maxSalary} onChange={e => setMaxSalary(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="1000000" />
                        </div>
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-20 border border-slate-200 rounded-xl p-3 outline-none mt-1 resize-none" />
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
                        <button type="submit" className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold">Save Pay Grade</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function BenefitLevelFormModal({ onClose }) {
    const [name, setName] = useState("");
    const [code, setCode] = useState("");
    const [description, setDescription] = useState("");

    const handleSubmit = async (e) => {
        e.preventDefault();
        try {
            const payload = {
                name: name.trim(),
                code: code.trim() || null,
                description: description.trim() || null,
                is_active: true 
            };

            await setupService.createBenefitLevel(payload); 
            onClose();
        } catch (err) {
            console.error("Benefit Level Creation failed:", err);
            alert(err?.message || "Error adding benefit level configuration.");
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-900/40 backdrop-blur-sm p-4">
            <div className="w-full max-w-md rounded-2xl bg-white p-6 shadow-xl">
                <h3 className="text-lg font-bold text-slate-900">Add Benefit Level</h3>
                <form onSubmit={handleSubmit} className="mt-4 space-y-4">
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Benefit Level Name</label>
                        <input value={name} onChange={e => setName(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="e.g. Remote Executive Allowance" required />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Benefit Code</label>
                        <input value={code} onChange={e => setCode(e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3 outline-none mt-1" placeholder="e.g. BEN-EXEC" />
                    </div>
                    <div>
                        <label className="text-xs font-semibold text-slate-500 uppercase tracking-wider">Description</label>
                        <textarea value={description} onChange={e => setDescription(e.target.value)} className="w-full h-20 border border-slate-200 rounded-xl p-3 outline-none mt-1 resize-none" />
                    </div>
                    <div className="flex gap-2 justify-end pt-4">
                        <button type="button" onClick={onClose} className="h-11 border border-slate-200 rounded-xl px-4 text-sm font-semibold text-slate-600">Cancel</button>
                        <button type="submit" className="h-11 bg-[#4f1a60] text-white rounded-xl px-4 text-sm font-semibold">Save Benefit Level</button>
                    </div>
                </form>
            </div>
        </div>
    );
}

function AddEmployeeDrawer({ departments, payGrades, benefitLevels, managers, onClose, onSubmit }) {
    const [form, setForm] = useState({
        name: "",
        email: "",
        phone: "",
        department: departments[0] || "",
        title: "",
        grade: payGrades[0]?.code || "",
        benefitLevel: benefitLevels[0]?.code || "",
        status: "Probation",
        contractEnd: "",
        manager: "",
        baseSalary: 500000,
    });
    const [errors, setErrors] = useState({})
    const [submitted, setSubmitted] = useState(false)

    useEffect(() => {
        const prev = document.body.style.overflow;
        document.body.style.overflow = "hidden";
        return () => { document.body.style.overflow = prev; };
    }, []);

    const set = (k, v) => {
        setForm((p) => ({ ...p, [k]: v }));
    };

    const validate = () => {
        const next = {};
        if (!form.name.trim()) next.name = "Name is required";
        if (!form.email.trim() || !/^\S+@\S+\.\S+$/.test(form.email)) next.email = "Enter a valid email address";
        if (!form.title.trim()) next.title = "Job title is required";
        if (form.status === "Contract" && !form.contractEnd) next.contractEnd = "Contract end date required";
        if (!form.baseSalary || form.baseSalary <= 0) next.baseSalary = "Salary must be greater than 0";
        return next;
    };

    const handleSubmit = (e) => {
        e.preventDefault();
        setSubmitted(true);
    const next = validate();
        setErrors(next);
    if (Object.keys(next).length) return;

    onSubmit({
        name: form.name.trim(),
        email: form.email.trim(),
        phone: form.phone.trim(),
        department: form.department,
        title: form.title.trim(),
        grade: form.grade,
        benefitLevel: form.benefitLevel,
        status: form.status,
        contractEnd: form.status === "Contract" ? form.contractEnd : undefined,
        manager: form.manager || undefined,
        baseSalary: Number(form.baseSalary),
    });
    };

    return (
        <>
            <div onClick={onClose} className="fixed inset-0 z-40 bg-slate-900/40 backdrop-blur-sm" />
            <div className="fixed inset-0 z-50 flex flex-col bg-white shadow-2xl sm:left-auto sm:right-0 sm:top-0 sm:h-screen sm:w-full sm:max-w-md">
                <div className="sticky top-0 z-10 flex items-center justify-between gap-3 border-b border-slate-100 bg-white/95 px-5 py-4 backdrop-blur">
                    <div>
                        <div className="text-[10px] font-semibold uppercase tracking-wider text-[#4f1a60]">Directory</div>
                        <h3 className="truncate text-base font-semibold text-slate-900">New employee</h3>
                    </div>
                    <button type="button" onClick={onClose} className="-mr-1 inline-flex h-10 w-10 shrink-0 items-center justify-center rounded-xl text-slate-500 hover:bg-slate-100">
                        <X className="h-5 w-5" />
                    </button>
                </div>

                <form onSubmit={handleSubmit} className="flex min-h-0 flex-1 flex-col">
                    <div className="flex-1 overflow-y-auto overscroll-contain px-5 py-5 sm:px-6 space-y-4">
                        {submitted && Object.keys(errors).length > 0 && (
                            <div className="mb-4 flex items-start gap-2.5 rounded-xl border border-red-200 bg-red-50 px-3.5 py-3 text-sm text-red-800">
                                <AlertCircle className="mt-0.5 h-4 w-4 shrink-0 text-red-600" />
                                <div>
                                    <div className="font-semibold">Form verification failed</div>
                                    <div className="text-xs text-red-700/80">Please check all required fields [14].</div>
                                </div>
                            </div>
                        )}

                        <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Full name</span>
                            <input value={form.name} onChange={(e) => set("name", e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]" placeholder="Jane Doe" required />
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Email</span>
                                <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]" placeholder="jane@company.com" required />
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Phone</span>
                                <input type="tel" value={form.phone} onChange={(e) => set("phone", e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]" placeholder="+234 …" />
                            </label>
                        </div>

                        <label className="block">
                            <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Job title</span>
                            <input value={form.title} onChange={(e) => set("title", e.target.value)} className="w-full h-11 border border-slate-200 rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]" placeholder="Senior Analyst" required />
                        </label>

                        <div className="grid grid-cols-2 gap-4">
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Department</span>
                                <select value={form.department} onChange={(e) => set("department", e.target.value)} className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]">
                                    <option value="">— Select Department —</option>
                                    {departments.map((d) => (
                                        <option key={d.id} value={d.id}>{d.name} ({d.code || "—"})</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Manager</span>
                                <select value={form.manager} onChange={(e) => set("manager", e.target.value)} className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]">
                                    <option value="">— None —</option>
                                    {managers.map((m) => <option key={m}>{m}</option>)}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Grade</span>
                                <select value={form.grade} onChange={(e) => set("grade", e.target.value)} className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]">
                                    <option value="">— Select Grade —</option>
                                    {payGrades.map((g) => (
                                        <option key={g.id} value={g.code || g.name}>{g.name} ({g.code || "—"})</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Benefit level</span>
                                <select value={form.benefitLevel} onChange={(e) => set("benefitLevel", e.target.value)} className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]">
                                    <option value="">— Select Benefit Level —</option>
                                    {benefitLevels.map((b) => (
                                        <option key={b.id} value={b.code || b.name}>{b.name} ({b.code || "—"})</option>
                                    ))}
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Status</span>
                                <select value={form.status} onChange={(e) => set("status", e.target.value)} className="w-full h-11 border border-slate-200 bg-white rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]">
                                    <option>Probation</option>
                                    <option>Contract</option>
                                    <option>Confirmed</option>
                                </select>
                            </label>
                            <label className="block">
                                <span className="text-xs font-semibold uppercase tracking-wider text-slate-600">Base salary (₦)</span>
                                <input type="number" value={form.baseSalary} onChange={(e) => set("baseSalary", Number(e.target.value))} className="w-full h-11 border border-slate-200 rounded-xl px-3.5 mt-1.5 outline-none focus:border-[#4f1a60]" />
                            </label>
                        </div>
                    </div>

                    <div className="sticky bottom-0 z-10 flex items-center justify-end gap-2 border-t border-slate-100 bg-white/95 px-5 py-3 backdrop-blur">
                        <button type="button" onClick={onClose} className="h-11 flex-1 rounded-xl border border-slate-200 px-4 text-sm font-semibold text-slate-700 hover:bg-slate-50 sm:flex-none">Cancel</button>
                        <button type="submit" className="inline-flex h-11 flex-1 items-center justify-center gap-2 rounded-xl bg-gradient-to-r from-[#4f1a60] to-[#8a2da8] px-4 text-sm font-semibold text-white shadow-sm hover:opacity-95 sm:flex-none">
                            <CheckCircle2 className="h-4 w-4" /> Create employee
                        </button>
                    </div>
                </form>
            </div>
        </>
    )
}

export default DirectoryPage