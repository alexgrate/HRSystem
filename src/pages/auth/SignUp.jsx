import { useState, useRef } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Building2, Mail, Lock, User, Link2, ArrowRight, ArrowLeft, AlertCircle,
  CheckCircle2, Eye, EyeOff,
} from "lucide-react";
import { authService } from "../../services/authService";
import logoImg from "../../assets/dashIcon.jpg";

const emailValid = (e) => /^\S+@\S+\.\S+$/.test(e);
const SLUG_RE = /^[a-z0-9]([a-z0-9-]{0,61}[a-z0-9])?$/;

const slugify = (name) =>
  String(name || "")
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9\s-]/g, "")
    .replace(/\s+/g, "-")
    .replace(/-+/g, "-")
    .slice(0, 63);

const Field = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2.5 border-b border-line py-2.5 focus-within:border-brand transition-colors">
    <Icon className="h-4.5 w-4.5 text-ink-faint shrink-0" />
    {children}
  </div>
);

const SignUp = () => {
  const [form, setForm] = useState({
    organizationName: "", slug: "", firstName: "", lastName: "", email: "", password: "",
  });
  const [confirm, setConfirm] = useState("");
  const [slugTouched, setSlugTouched] = useState(false);
  const [showPw, setShowPw] = useState(false);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  const brandRef = useRef(null);
  const moveSpot = (e) => {
    const el = brandRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  };

  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));
  const setOrgName = (v) => {
    set("organizationName", v);
    if (!slugTouched) set("slug", slugify(v));
  };

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    if (!form.organizationName.trim()) return setError("Enter your organization's name.");
    if (!SLUG_RE.test(form.slug)) {
      return setError("Workspace URL must be lowercase letters, numbers and hyphens only.");
    }
    if (!form.firstName.trim() || !form.lastName.trim()) return setError("Enter your first and last name.");
    if (!emailValid(form.email)) return setError("Enter a valid email address.");
    if (form.password.length < 6) return setError("Password must be at least 6 characters.");
    if (form.password !== confirm) return setError("Passwords don't match.");

    setBusy(true);
    try {
      await authService.signup(form);
      setDone(true);
    } catch (err) {
      setError(err?.error?.message || err?.message || "Couldn't create your workspace. Please try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#faf8f3] text-ink" style={{ height: "100dvh" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] grain" />
      <div className="relative h-full w-full grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        <div
          ref={brandRef}
          onMouseMove={moveSpot}
          className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-darkest via-brand-dark to-brand p-12 text-white lg:flex xl:p-16 2xl:p-20"
        >
          <div className="pointer-events-none absolute inset-0 anim-zoom">
            <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-brand-2/30 blur-3xl" />
          </div>
          <div
            className="pointer-events-none absolute inset-0"
            style={{ background: "radial-gradient(340px circle at var(--spot-x, 65%) var(--spot-y, 30%), color-mix(in srgb, var(--brand-accent) 16%, transparent), transparent 70%)" }}
          />
          <div className="relative flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur overflow-hidden p-1.5 shadow-inner">
              <img src={logoImg} className="h-full w-full object-contain" alt="Dash Logo" onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <div className="font-serif text-2xl tracking-tight"><span className="italic font-bold">dash</span>.</div>
            <div className="ml-2 text-[9px] uppercase tracking-[0.35em] text-white/40">HR Suite</div>
          </div>
          <div className="relative max-w-xl pr-6 my-auto py-16">
            <div className="anim anim-fade text-[11px] uppercase tracking-[0.34em] text-white/55" style={{ animationDelay: "0.1s" }}>
              New workspace
            </div>
            <h1 className="mt-5 font-serif text-[56px] leading-[0.95] tracking-tight xl:text-[68px] font-bold">
              <span className="anim anim-reveal block" style={{ animationDelay: "0.2s" }}>Bring your team</span>
              <span className="anim anim-reveal block italic text-accent" style={{ animationDelay: "0.36s" }}>onto dash.</span>
            </h1>
            <p className="anim anim-fade mt-6 max-w-md text-sm leading-relaxed text-white/60" style={{ animationDelay: "0.8s" }}>
              Create your organization's own isolated workspace in a couple of minutes.
              You'll be its first administrator.
            </p>
          </div>
          <div className="anim anim-fade relative text-[10px] uppercase tracking-[0.25em] text-white/40" style={{ animationDelay: "1s" }}>
            Powered by Dash Microfinance Bank Ltd © 2026
          </div>
        </div>

        <div className="relative flex h-full flex-col justify-between overflow-y-auto px-6 py-10 sm:px-16 lg:px-20 2xl:px-28">
          <div className="flex items-center gap-3.5 lg:hidden shrink-0">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-brand p-1.5 shadow-md overflow-hidden">
              <img src={logoImg} className="h-full w-full object-contain" alt="Dash Logo" onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <div className="font-serif text-xl text-ink"><span className="italic font-bold">dash</span>.</div>
          </div>

          <div className="anim anim-fade mx-auto w-full max-w-md space-y-6 my-auto" style={{ animationDelay: "0.25s" }}>
            {done ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-serif text-3xl font-bold text-ink">Check your email</h2>
                  <p className="mt-2 text-sm text-ink-muted leading-relaxed">
                    We sent a verification link to <strong>{form.email}</strong>. Click it to activate{" "}
                    <strong>{form.organizationName}</strong>'s workspace and sign in.
                  </p>
                </div>
                <Link
                  to="/login"
                  className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark"
                >
                  <span>Back to sign in</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </Link>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-brand/70">Get started</div>
                  <h2 className="mt-2 font-serif text-[38px] leading-[1.02] text-ink sm:text-[44px] font-bold">
                    Create your<br /><span className="italic">workspace</span>.
                  </h2>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200 animate-shake shrink-0">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}

                <form onSubmit={submit} className="space-y-5 pt-2">
                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Organization name</label>
                    <Field icon={Building2}>
                      <input value={form.organizationName} onChange={(e) => setOrgName(e.target.value)} className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint" placeholder="Acme Corp" required />
                    </Field>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Workspace URL</label>
                    <Field icon={Link2}>
                      <input
                        value={form.slug}
                        onChange={(e) => { setSlugTouched(true); set("slug", slugify(e.target.value)); }}
                        className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
                        placeholder="acme"
                        required
                      />
                      <span className="shrink-0 text-xs text-ink-faint">.dash-mfb.com</span>
                    </Field>
                  </div>

                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">First name</label>
                      <Field icon={User}>
                        <input value={form.firstName} onChange={(e) => set("firstName", e.target.value)} className="w-full bg-transparent text-[15px] outline-none" required />
                      </Field>
                    </div>
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Last name</label>
                      <Field icon={User}>
                        <input value={form.lastName} onChange={(e) => set("lastName", e.target.value)} className="w-full bg-transparent text-[15px] outline-none" required />
                      </Field>
                    </div>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Your email</label>
                    <Field icon={Mail}>
                      <input type="email" value={form.email} onChange={(e) => set("email", e.target.value)} className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint" placeholder="you@company.com" required />
                    </Field>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Password</label>
                    <Field icon={Lock}>
                      <input type={showPw ? "text" : "password"} value={form.password} onChange={(e) => set("password", e.target.value)} className="w-full bg-transparent text-[15px] outline-none pr-8" placeholder="At least 6 characters" required />
                      <button type="button" onClick={() => setShowPw((s) => !s)} className="text-ink-faint hover:text-brand" aria-label={showPw ? "Hide password" : "Show password"}>
                        {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                      </button>
                    </Field>
                  </div>

                  <div className="space-y-1.5">
                    <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">Confirm password</label>
                    <Field icon={Lock}>
                      <input type={showPw ? "text" : "password"} value={confirm} onChange={(e) => setConfirm(e.target.value)} className="w-full bg-transparent text-[15px] outline-none" required />
                    </Field>
                  </div>

                  <motion.button
                    whileHover={{ y: -1 }}
                    whileTap={{ scale: 0.99 }}
                    type="submit"
                    disabled={busy}
                    className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark disabled:opacity-75"
                  >
                    <span>{busy ? "Creating workspace..." : "Create workspace"}</span>
                    <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                      <ArrowRight className="h-4 w-4" />
                    </span>
                  </motion.button>
                </form>

                <Link to="/login" className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand">
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </>
            )}
          </div>

          <div className="text-center text-[9px] uppercase tracking-[0.24em] text-ink-faint shrink-0 mt-8">
            MFA · ISO 27001 · SOC 2
          </div>
        </div>
      </div>
    </div>
  );
};

export default SignUp;
