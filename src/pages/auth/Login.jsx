import React, { useState } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import logoImg from "../../assets/dashIcon.jpg"

const Login = () => {
  const { login } = useAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false); 
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

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
    <div className="relative h-screen w-screen overflow-hidden bg-[#faf8f3] text-slate-900 select-none">
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] grain" />

      <div className="relative mx-auto h-full w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        
        <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#2a0d35] via-[#3d1248] to-[#4f1a60] p-12 text-white lg:flex xl:p-16">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#e9a8ff]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-[#8a2da8]/30 blur-3xl" />
          <div className="pointer-events-none absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />

          <div className="relative flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur overflow-hidden p-1.5 shadow-inner">
              <img 
                src={logoImg}
                className="h-full w-full object-contain animate-fade-in" 
                alt="Dash Logo" 
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="font-serif text-2xl tracking-tight"><span className="italic font-bold">dash</span>.</div>
            <div className="ml-2 text-[9px] uppercase tracking-[0.35em] text-white/40">HR Suite</div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 18 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-xl pr-6 my-auto py-16"
          >
            <div className="text-[11px] uppercase tracking-[0.34em] text-white/55">Workforce Setup</div>
            <h1 className="mt-5 font-serif text-[60px] leading-[0.95] tracking-tight xl:text-[76px] font-bold">
              The quiet<br />
              <span className="italic text-[#e9a8ff]">architecture</span><br />
              of <span className="italic">people</span>.
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
              A dynamic, multi-tenant HRIS for modern African enterprises. Onboarding,
              payroll setups, leaving schedules, and PITA local tax structured cleanly.
            </p>
          </motion.div>

          <div className="relative text-[10px] uppercase tracking-[0.25em] text-white/40">
            Powered by Dash Microfinance Bank Ltd © 2026
          </div>
        </div>

        <div className="relative flex h-full flex-col justify-between px-6 py-12 sm:px-16 lg:px-20">
          
          <div className="flex items-center gap-3.5 lg:hidden shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-[#4f1a60] p-1.5 shadow-md overflow-hidden">
              <img
                src={logoImg}
                className="h-full w-full object-contain"
                alt="Dash Logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="font-serif text-xl text-slate-900"><span className="italic font-bold">dash</span>.</div>
          </div>

          <motion.div
            initial={{ opacity: 0, y: 14 }} 
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto w-full max-w-md space-y-6 my-auto"
          >
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-[#4f1a60]/70">Welcome back</div>
              <h2 className="mt-2 font-serif text-[42px] leading-[1.02] text-slate-900 sm:text-[48px] font-bold">
                Sign in to your<br /><span className="italic">workplace</span>.
              </h2>
              <p className="mt-2.5 text-sm text-slate-500 leading-relaxed">
                Continue with your work email to access your isolated workspace.
              </p>
            </div>

            {error && (
              <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200 animate-shake shrink-0">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-6 pt-2">
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Work email</label>
                <div className="flex items-center gap-2.5 border-b border-slate-300 py-2.5 focus-within:border-[#4f1a60] transition-colors">
                  <Mail className="h-4.5 w-4.5 text-slate-400" />
                  <input 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400" 
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">Password</label>
                <div className="relative flex items-center gap-2.5 border-b border-slate-300 py-2.5 focus-within:border-[#4f1a60] transition-colors">
                  <Lock className="h-4.5 w-4.5 text-slate-400" />
                  <input 
                    type={showPassword ? "text" : "password"} 
                    value={password} 
                    onChange={(e) => setPassword(e.target.value)} 
                    className="w-full bg-transparent text-[15px] outline-none pr-8" 
                    required
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword(!showPassword)}
                    className="absolute right-1 text-slate-400 hover:text-[#4f1a60] transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 text-slate-600 cursor-pointer">
                  <input type="checkbox" className="h-3.5 w-3.5 rounded border-slate-300 text-[#4f1a60] focus:ring-[#4f1a60]" defaultChecked />
                  Remember me 
                </label>
                <Link className="font-semibold text-[#4f1a60] hover:underline" to="/forgot-password">Forgot password?</Link>
              </div>

              <motion.button
                whileHover={{ y: -1 }} 
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-between rounded-full bg-[#4f1a60] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-[#3d1248] disabled:opacity-75"
              >
                <span>{submitting ? "Signing in..." : "Sign in to dash"}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
            </form>
          </motion.div>

          <div className="text-center text-[9px] uppercase tracking-[0.24em] text-slate-400 shrink-0 mt-8">
            MFA · ISO 27001 · SOC 2
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;