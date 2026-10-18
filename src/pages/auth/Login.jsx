import { useState, useRef, useEffect } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { motion } from "framer-motion";
import { ArrowRight, Mail, Lock, AlertCircle, Eye, EyeOff, ShieldCheck } from "lucide-react";
import { useAuth } from "../../context/AuthContext";
import { useConfirm } from "../../components/ui/Notifications";
import { isSessionConflict, authService } from "../../services/authService";
import api from "../../services/api";
import logoImg from "../../assets/dashIcon.jpg"

const Login = () => {
  const { login, forceLogin } = useAuth();
  const confirm = useConfirm();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  // This organization's own choice of sign-in method (see
  // OrganizationSettingsPage → Authentication): password by default, or
  // redirect to whatever OpenID Connect provider the org's admin configured.
  const [loginMethod, setLoginMethod] = useState(null); // { auth_type, auth_url? }
  const [resolvingMethod, setResolvingMethod] = useState(true);
  const [ssoRedirecting, setSsoRedirecting] = useState(false);
  const revokeToken = searchParams.get("revoke_token");

  useEffect(() => {
    const ssoError = searchParams.get("sso_error");
    if (ssoError) setError(ssoError);

    let mounted = true;
    (async () => {
      try {
        const method = await authService.getLoginMethod();
        if (mounted) setLoginMethod(method);
      } catch (err) {
        console.error("[Login] Failed to resolve sign-in method:", err);
        if (mounted) setLoginMethod({ auth_type: "password" });
      } finally {
        if (mounted) setResolvingMethod(false);
      }
    })();
    return () => { mounted = false; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const continueWithSso = async () => {
    setError("");
    setSsoRedirecting(true);
    try {
      const method = await authService.getLoginMethod();
      if (method?.auth_type === "oidc" && method?.auth_url) {
        window.location.href = method.auth_url;
      } else {
        setError("Single sign-on is not available right now. Please try again shortly.");
        setSsoRedirecting(false);
      }
    } catch (err) {
      setError(err?.message || "Could not start single sign-on.");
      setSsoRedirecting(false);
    }
  };

  // The identity provider sign-in succeeded, but this account already has an
  // active session elsewhere — the callback hands back a short-lived revoke
  // token (same mechanism as the password-login conflict) instead of a
  // regular session token. Spend it, then retry the SSO redirect.
  const retrySsoAfterRevoke = async () => {
    try {
      await api.post("/api/auth/logout-all", { token: revokeToken });
    } catch (err) {
      console.warn("[Login] Session revoke failed:", err?.message || err);
    }
    navigate("/login", { replace: true });
    continueWithSso();
  };

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

  // The account already has a live session in another browser. Ask before
  // evicting it; on consent, sign that session out server-side and retry.
  const takeOverSession = async (conflict) => {
    const ok = await confirm({
      title: "Already signed in elsewhere",
      message:
        "This account has an active session in another browser or device. Sign out that session and continue here?",
      confirmLabel: "Sign out & continue",
    });
    if (!ok) return;
    try {
      await forceLogin(email, password, remember, conflict);
      navigate("/app");
    } catch (err) {
      setError(
        isSessionConflict(err)
          ? "The other session could not be signed out. Please try again."
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
        await takeOverSession(err);
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

      {/* Full-bleed split layout — both panels stretch edge to edge on every screen width. */}
      <div className="relative h-full w-full grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">

        <div
          ref={brandRef}
          onMouseMove={moveSpot}
          className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-darkest via-brand-dark to-brand p-12 text-white lg:flex xl:p-16 2xl:p-20"
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
              <span className="anim anim-reveal block" style={{ animationDelay: "0.2s" }}>The smarter way</span>
              <span className="anim anim-reveal block italic text-accent" style={{ animationDelay: "0.36s" }}>to manage people.</span>
            </h1>
            <p className="anim anim-fade mt-6 max-w-md text-sm leading-relaxed text-white/60" style={{ animationDelay: "0.8s" }}>
              A simple, modern HR platform built for growing African businesses.
              Hire. Onboard. Pay. Manage. Everything your team needs, without the complexity.
            </p>
          </div>

          <div className="anim anim-fade relative text-[10px] uppercase tracking-[0.25em] text-white/40" style={{ animationDelay: "1s" }}>
            Powered by Dash Microfinance Bank Ltd © 2026
          </div>
        </div>

        {/* overflow-y-auto keeps the form reachable on short viewports since the page root clips overflow. */}
        <div className="relative flex h-full flex-col justify-between overflow-y-auto px-6 py-10 sm:px-16 lg:px-20 2xl:px-28">
          
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

            {resolvingMethod ? (
              <div className="flex items-center justify-center py-10">
                <div className="h-6 w-6 animate-spin rounded-full border-2 border-brand border-t-transparent" />
              </div>
            ) : loginMethod?.auth_type === "oidc" ? (
              <div className="space-y-4 pt-2">
                <motion.button
                  whileHover={{ y: -1 }}
                  whileTap={{ scale: 0.99 }}
                  type="button"
                  disabled={ssoRedirecting}
                  onClick={revokeToken ? retrySsoAfterRevoke : continueWithSso}
                  className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark disabled:opacity-75"
                >
                  <span className="flex items-center gap-2">
                    <ShieldCheck className="h-4 w-4" />
                    {ssoRedirecting
                      ? "Redirecting…"
                      : revokeToken
                        ? "Sign out other session & continue"
                        : "Continue with single sign-on"}
                  </span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </motion.button>
                <p className="text-center text-[11px] text-ink-faint">
                  You'll be redirected to your organization's identity provider to sign in.
                </p>
              </div>
            ) : (
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
            )}

            {!resolvingMethod && loginMethod?.auth_type !== "oidc" && (
              <p className="text-center text-xs text-ink-muted">
                New to dash?{" "}
                <Link to="/signup" className="font-semibold text-brand hover:underline">
                  Create your organization's workspace
                </Link>
              </p>
            )}
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