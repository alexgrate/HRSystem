import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, Sparkles, Quote, AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";


const Login = () => {
    const { login } = useAuth()
    const navigate = useNavigate()
    const [email, setEmail] = useState("")
    const [password, setPassword] = useState("")
    const [error, setError] = useState("")
    const [submitting, setSubmitting] = useState(false)

    const submit = async (e) => {
        e.preventDefault();
        setError("");
        setSubmitting(true);
        try {
            await login(email, password);
            navigate("/app");
        } catch (err) {
            setError(err?.error?.message || err?.message || "Invalid email credentials or password.");
        } finally {
            setSubmitting(false);
        }
    };

    return (
        <div className="relative min-h-screen bg-[#faf8f3] text-slate-900">
            <div className="pointer-events-none absolute inset-0 opacity-[0.5] grain" />
            <div className="relative mx-auto grid min-h-screen w-full max-w-[1400px] grid-cols-1 lg:grid-cols-[1.1fr_1fr]">
                <div className="relative hidden flex-col justify-between overflow-hidden bg-gradient-to-br from-[#2a0d35] via-[#3d1248] to-[#4f1a60] p-10 text-white lg:flex xl:p-14">
                    <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#e9a8ff]/10 blur-3xl" />
                    <div className="pointer-events-none absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-[#8a2da8]/30 blur-3xl" />
                    <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />

                    <div className="relative flex items-center gap-2.5">
                        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur">
                            <svg width="22" height="22" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg" className="text-white">
                                <path d="M12 2L2 22h20L12 2z" stroke="currentColor" strokeWidth="2" strokeLinejoin="round"/>
                            </svg>
                        </div>
                        <div className="font-display text-xl"><span className="italic font-semibold">dash</span>.</div>
                        <div className="ml-1 text-[10px] uppercase tracking-[0.3em] text-white/50">HRIS</div>
                    </div>

                    <motion.div
                        initial={{ opacity: 0, y: 18 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
                        className="relative max-w-xl"
                    >
                        <div className="text-[11px] uppercase tracking-[0.34em] text-white/55">—Workforce</div>
                        <h1 className="mt-5 text-[64px] leading-[0.95] tracking-tight xl:text-[80px] font-bold font-serif">
                            The quiet<br />
                            <span className="italic text-[#e9a8ff]">architecture</span><br />
                            of <span className="italic">people</span>.
                        </h1>
                        <p className="mt-6 max-w-md text-[13px] leading-relaxed text-white/70">
                            A multi-tenant HRIS for modern African enterprises. Onboarding,
                            payroll, leave, and PITA local tax — structured dynamically.
                        </p>
                    </motion.div>

                    <div className="relative grid grid-cols-3 gap-px overflow-hidden rounded-2xl bg-white/10 ring-1 ring-inset ring-white/10 backdrop-blur">
                        {[["1,400+", "Employees served"], ["12", "Tenants live"], ["99.99%", "Annual uptime"]].map(([n, l]) => (
                        <div key={l} className="bg-[#2a0d35]/40 p-5">
                            <div className="text-3xl font-bold">{n}</div>
                            <div className="mt-1 text-[10px] uppercase tracking-[0.18em] text-white/55">{l}</div>
                        </div>
                        ))}
                    </div>
                </div>

                <div className="relative flex flex-col justify-center px-6 py-10 sm:px-10 lg:px-14">
                    <motion.div
                        initial={{ opacity: 0, y: 14 }} 
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ duration: 0.5 }}
                        className="mx-auto w-full max-w-md"
                    >
                        <div className="text-[11px] uppercase tracking-[0.3em] text-[#4f1a60]/70">— Welcome back</div>
                        <h2 className="mt-3 text-[44px] leading-[1.02] text-slate-900 sm:text-[52px] font-serif">
                            Sign in to your<br /><span className="italic">workplace</span>.
                        </h2>
                        <p className="mt-3 text-sm text-slate-500">
                            Continue with your work email to access your isolated workspace.
                        </p>

                        {error && (
                            <div className="mt-4 flex items-center gap-2 rounded-xl bg-red-50 p-3.5 text-sm text-red-800 border border-red-150">
                                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                                <span>{error}</span>
                            </div>
                        )}

                        <form onSubmit={submit} className="mt-8 space-y-5">
                            <div>
                                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Work email</label>
                                <div className="mt-2 flex items-center gap-2 border-b border-slate-300 py-2.5 focus-within:border-[#4f1a60]">
                                    <Mail className="h-4 w-4 text-slate-400" />
                                    <input 
                                        type="email"
                                        value={email} 
                                        onChange={(e) => setEmail(e.target.value)} 
                                        className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400" 
                                        required
                                    />
                                </div>
                            </div>
                            <div>
                                <label className="text-[11px] font-semibold uppercase tracking-[0.18em] text-slate-500">Password</label>
                                <div className="mt-2 flex items-center gap-2 border-b border-slate-300 py-2.5 focus-within:border-[#4f1a60]">
                                    <Lock className="h-4 w-4 text-slate-400" />
                                    <input 
                                        type="password" 
                                        value={password} 
                                        onChange={(e) => setPassword(e.target.value)} 
                                        className="w-full bg-transparent text-[15px] outline-none" 
                                        required
                                    />
                                </div>
                            </div>

                            <div className="flex items-center justify-between pt-1 text-xs">
                                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                                    <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-[#4f1a60]" defaultChecked />
                                    Trust this device
                                </label>
                                <a className="font-semibold text-[#4f1a60] hover:underline" href="#forgot">Forgot password?</a>
                            </div>

                            <motion.button
                                whileHover={{ y: -1 }} 
                                whileTap={{ scale: 0.99 }}
                                type="submit"
                                disabled={submitting}
                                className="group mt-3 flex w-full items-center justify-between rounded-full bg-[#4f1a60] px-6 py-4 text-[13px] font-semibold uppercase tracking-[0.18em] text-white shadow-[0_18px_40px_-18px_rgba(79,26,96,0.65)] hover:bg-[#3d1248] disabled:opacity-70"
                            >
                                <span>{submitting ? "Signing in..." : "Sign in to dash"}</span>
                                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                                    <ArrowRight className="h-3.5 w-3.5" />
                                </span>
                            </motion.button>
                        </form>

                        <figure className="mt-10 rounded-2xl border border-slate-200 bg-white/60 p-5 backdrop-blur">
                            <Quote className="h-4 w-4 text-[#4f1a60]" />
                            <blockquote className="mt-2 text-[18px] leading-snug text-slate-800 font-serif">
                                "dash replaced four spreadsheets, two consultants, and a great deal of quiet payroll panic."
                            </blockquote>
                            <figcaption className="mt-3 text-[11px] uppercase tracking-[0.2em] text-slate-500">
                                — Head of People · dash MFB
                            </figcaption>
                        </figure>
                    </motion.div>
                </div>
            </div>
        </div>
    )
}

export default Login