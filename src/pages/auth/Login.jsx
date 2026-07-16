import { useState, useRef } from "react";
import { useNavigate, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, AlertCircle, Eye, EyeOff } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../components/ui/Notifications";
import { isSessionConflict } from "../../services/authService";
import logoImg from "../../assets/dashIcon.jpg"

const Login = () => {
  const { login, logoutAllSessionsFromConflict } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // Cursor glow on the brand panel — CSS variables via ref, no re-renders.
  const brandRef = useRef(null);
  const moveSpot = (e) => {
    const el = brandRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  };

  const messageOf = (err) =>
    err?.error?.message || err?.message || "Invalid email credentials or password.";

  // If the backend reports an active session elsewhere, let the user either
  // invalidate all sessions and sign in again, or cancel and keep the active
  // session untouched.
  const handleSessionConflict = async (conflict) => {
    const ok = await confirm({
      title: "Already signed in elsewhere",
      message:
        "This account already has an active session. Do you want to log out all sessions and sign in again here, or cancel and return to the active session?",
      confirmLabel: "Log out all sessions",
      cancelLabel: "Cancel",
      danger: true,
    });
    if (!ok) {
      setError("Sign-in cancelled. Continue in your active session.");
      return;
    }
    try {
      await logoutAllSessionsFromConflict(conflict);
      setPassword("");
      setError("All sessions were signed out. Please sign in again.");
    } catch (err) {
      setError(
        isSessionConflict(err)
          ? "Sessions could not be cleared. Please try again."
          : messageOf(err)
      );
    }
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password, remember);
      navigate("/app");
    } catch (err) {
      if (isSessionConflict(err)) {
        await handleSessionConflict(err);
      } else {
        setError(messageOf(err));
      }
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#faf8f3] text-ink" style={{ height: "100dvh" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] grain" />

      <div className="relative mx-auto h-full w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">

        <div
          ref={brandRef}
          onMouseMove={moveSpot}
          className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-darkest via-brand-dark to-brand p-12 text-white lg:flex xl:p-16"
        >
          {/* Slow settle-zoom on the decorative field, plus a soft glow that trails the cursor. */}
          <div className="pointer-events-none absolute inset-0 anim-zoom">
            <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-brand-2/30 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(340px circle at var(--spot-x, 65%) var(--spot-y, 30%), color-mix(in srgb, var(--brand-accent) 16%, transparent), transparent 70%)" }}
          />

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

          <div className="relative max-w-xl pr-6 my-auto py-16">
            <div className="anim anim-fade text-[11px] uppercase tracking-[0.34em] text-white/55" style={{ animationDelay: "0.1s" }}>
              Workforce Setup
            </div>
            <h1 className="mt-5 font-serif text-[60px] leading-[0.95] tracking-tight xl:text-[76px] font-bold">
              <span className="anim anim-reveal block" style={{ animationDelay: "0.2s" }}>The quiet</span>
              <span className="anim anim-reveal block italic text-accent" style={{ animationDelay: "0.36s" }}>architecture</span>
              <span className="anim anim-reveal block" style={{ animationDelay: "0.52s" }}>of <span className="italic">people</span>.</span>
            </h1>
            <p className="anim anim-fade mt-6 max-w-md text-sm leading-relaxed text-white/60" style={{ animationDelay: "0.8s" }}>
              A dynamic, multi-tenant HRIS for modern African enterprises. Onboarding,
              payroll setups, leaving schedules, and PITA local tax structured cleanly.
            </p>
          </div>

          <div className="anim anim-fade relative text-[10px] uppercase tracking-[0.25em] text-white/40" style={{ animationDelay: "1s" }}>
            Powered by Dash Microfinance Bank Ltd © 2026
          </div>
        </div>

        <div className="relative flex h-full flex-col justify-between px-6 py-12 sm:px-16 lg:px-20">
          
          <div className="flex items-center gap-3.5 lg:hidden shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand p-1.5 shadow-md overflow-hidden">
              <img
                src={logoImg}
                className="h-full w-full object-contain"
                alt="Dash Logo"
                onError={(e) => {
                  e.target.style.display = 'none';
                }}
              />
            </div>
            <div className="font-serif text-xl text-ink"><span className="italic font-bold">dash</span>.</div>
          </div>

          <div className="anim anim-fade mx-auto w-full max-w-md space-y-6 my-auto" style={{ animationDelay: "0.25s" }}>
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-brand/70">Welcome back</div>
              <h2 className="mt-2 font-serif text-[42px] leading-[1.02] text-ink sm:text-[48px] font-bold">
                Sign in to your<br /><span className="italic">workplace</span>.
              </h2>
              <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
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
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Work email</label>
                <div className="flex items-center gap-2.5 border-b border-line py-2.5 focus-within:border-brand transition-colors">
                  <Mail className="h-4.5 w-4.5 text-ink-faint" />
                  <input 
                    type="email"
                    value={email} 
                    onChange={(e) => setEmail(e.target.value)} 
                    className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint" 
                    placeholder="name@company.com"
                    required
                  />
                </div>
              </div>
              
              <div className="space-y-1.5">
                <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Password</label>
                <div className="relative flex items-center gap-2.5 border-b border-line py-2.5 focus-within:border-brand transition-colors">
                  <Lock className="h-4.5 w-4.5 text-ink-faint" />
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
                    className="absolute right-1 text-ink-faint hover:text-brand transition-colors focus:outline-none"
                    aria-label={showPassword ? "Hide password" : "Show password"}
                  >
                    {showPassword ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between pt-1 text-xs">
                <label className="flex items-center gap-2 text-ink-muted cursor-pointer" title="Unchecked: you'll be signed out when the browser closes">
                  <input
                    type="checkbox"
                    checked={remember}
                    onChange={(e) => setRemember(e.target.checked)}
                    className="h-3.5 w-3.5 rounded border-line text-brand focus:ring-brand"
                  />
                  Remember me
                </label>
                <Link className="font-semibold text-brand hover:underline" to="/forgot-password">Forgot password?</Link>
              </div>

              <motion.button
                whileHover={{ y: -1 }} 
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={submitting}
                className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark disabled:opacity-75"
              >
                <span>{submitting ? "Signing in..." : "Sign in to dash"}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
            </form>
          </div>

          <div className="text-center text-[9px] uppercase tracking-[0.24em] text-ink-faint shrink-0 mt-8">
            MFA · ISO 27001 · SOC 2
          </div>
        </div>
      </div>
    </div>
  );
}

export default Login;