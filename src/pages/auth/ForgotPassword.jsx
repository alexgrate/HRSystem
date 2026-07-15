import { useState, useRef, useEffect } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import {
  Mail, Lock, KeyRound, ArrowRight, ArrowLeft, AlertCircle,
  CheckCircle2, Eye, EyeOff,
} from "lucide-react";
import { authService } from "../../services/authService";

const emailValid = (e) => /^\S+@\S+\.\S+$/.test(e);

// Mirrors the backend's 2-minute resend window (resendPasswordResetOTP).
const RESEND_WINDOW_S = 120;

const Field = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2.5 border-b border-line py-2.5 focus-within:border-brand transition-colors">
    <Icon className="h-4.5 w-4.5 text-ink-faint" />
    {children}
  </div>
);

const ForgotPassword = () => {
  const [params] = useSearchParams();
  const navigate = useNavigate();

  const isActivate = params.get("mode") === "activate";
  const [phase, setPhase] = useState("request"); 
  const [email, setEmail] = useState(params.get("email") || "");
  const [otp, setOtp] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [showPw, setShowPw] = useState(false);

  const [error, setError] = useState("");
  const [info, setInfo] = useState("");
  const [busy, setBusy] = useState(false);
  // Seconds until Resend is allowed again — client-side mirror of the
  // backend's resend rate limit.
  const [cooldown, setCooldown] = useState(0);

  useEffect(() => {
    if (cooldown <= 0) return;
    const t = setTimeout(() => setCooldown((s) => s - 1), 1000);
    return () => clearTimeout(t);
  }, [cooldown]);

  // Cursor glow on the brand panel — CSS variables via ref, no re-renders.
  const brandRef = useRef(null);
  const moveSpot = (e) => {
    const el = brandRef.current;
    if (!el) return;
    const r = el.getBoundingClientRect();
    el.style.setProperty("--spot-x", `${e.clientX - r.left}px`);
    el.style.setProperty("--spot-y", `${e.clientY - r.top}px`);
  };

  const copy = isActivate
    ? {
        title: "Set your password",
        subtitle: "Welcome aboard. Create a password to activate your account.",
        cta: "Activate account",
      }
    : {
        title: "Reset your password",
        subtitle: "Enter your work email and we’ll send you a verification code.",
        cta: "Reset password",
      };

  const sendCode = async (e) => {
    e?.preventDefault();
    setError("");
    setInfo("");
    if (!emailValid(email)) return setError("Enter a valid email address.");
    setBusy(true);
    try {
      await authService.requestPasswordReset(email.trim());
    } catch (err) {
      // Don't surface the backend's message here — a distinct "no such
      // account" would let anyone enumerate registered emails. Always advance
      // to the code-entry step with the same neutral wording. (A genuinely
      // unknown email simply never receives a code.)
      console.warn("[ForgotPassword] reset request failed:", err);
    } finally {
      // Always show the same outcome regardless of whether the email exists.
      setInfo(`If an account exists for ${email.trim()}, we've sent it a code.`);
      setPhase("reset");
      // The backend's resend window starts at the first send too.
      setCooldown(RESEND_WINDOW_S);
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      const res = await authService.resendOtp(email.trim());
      // Rate limits arrive inside the success envelope ({ canResend: false,
      // waitTime? in seconds }) — no code was sent, so don't claim one was.
      if (res?.canResend === false) {
        setInfo("Please wait a moment before requesting another code.");
        setCooldown(res.waitTime > 0 ? Math.ceil(res.waitTime) : RESEND_WINDOW_S);
        return;
      }
      setInfo("If an account exists for that email, a new code is on its way.");
      setCooldown(RESEND_WINDOW_S);
    } catch (err) {
      // Same enumeration guard as the initial send — neutral wording, no
      // backend "no such account" leakage.
      console.warn("[ForgotPassword] resend failed:", err);
      setInfo("If an account exists for that email, a new code is on its way.");
      setCooldown(RESEND_WINDOW_S);
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("Enter the code from your email.");
    // Stricter than the backend's minimum of 6 — don't normalize weak
    // passwords for an HR system (backend ask: raise it server-side too).
    if (password.length < 8)
      return setError("Password must be at least 8 characters.");
    if (password !== confirm) return setError("Passwords don’t match.");
    setBusy(true);
    try {
      const res = await authService.resetPassword(email.trim(), otp.trim(), password);
      // A bad/expired code resolves inside the success envelope with
      // { success: false } instead of throwing — don't advance on it.
      if (res && res.success === false) {
        setError(res.message || "Couldn’t set your password. Check the code and try again.");
        return;
      }
      setPhase("done");
    } catch (err) {
      setError(err?.message || "Couldn’t set your password. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#faf8f3] text-ink" style={{ height: "100dvh" }}>
      <div className="relative mx-auto h-full w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        {/* Brand panel */}
        <div
          ref={brandRef}
          onMouseMove={moveSpot}
          className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-darkest via-brand-dark to-brand p-12 text-white lg:flex xl:p-16"
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
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur font-bold">
              D
            </div>
            <div className="font-serif text-2xl tracking-tight">
              <span className="italic font-bold">dash</span>.
            </div>
          </div>
          <div className="relative max-w-xl my-auto py-16">
            <div className="anim anim-fade text-[11px] uppercase tracking-[0.34em] text-white/55" style={{ animationDelay: "0.1s" }}>
              Account Security
            </div>
            <h1 className="mt-5 font-serif text-[56px] leading-[0.95] tracking-tight xl:text-[68px] font-bold">
              <span className="anim anim-reveal block" style={{ animationDelay: "0.2s" }}>
                {isActivate ? "A workspace," : "Back in,"}
              </span>
              <span className="anim anim-reveal block" style={{ animationDelay: "0.36s" }}>
                <span className="italic text-accent">{isActivate ? "made yours" : "securely"}</span>.
              </span>
            </h1>
            <p className="anim anim-fade mt-6 max-w-md text-sm leading-relaxed text-white/60" style={{ animationDelay: "0.7s" }}>
              We verify it’s really you with a one-time code before any password
              is set. Codes expire quickly and can only be used once.
            </p>
          </div>
          <div className="relative text-[10px] uppercase tracking-[0.25em] text-white/40">
            Powered by Dash © 2026
          </div>
        </div>

        {/* Form panel */}
        <div className="relative flex h-full flex-col justify-center px-6 py-12 sm:px-16 lg:px-20">
          <div className="anim anim-fade mx-auto w-full max-w-md space-y-6" style={{ animationDelay: "0.25s" }}>
            {phase === "done" ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-serif text-3xl font-bold text-ink">
                    {isActivate ? "Account activated" : "Password updated"}
                  </h2>
                  <p className="mt-2 text-sm text-ink-muted">
                    You can now sign in with your new password.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark"
                >
                  <span>Continue to sign in</span>
                  <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                    <ArrowRight className="h-4 w-4" />
                  </span>
                </button>
              </div>
            ) : (
              <>
                <div>
                  <div className="text-[11px] uppercase tracking-[0.3em] text-brand/70">
                    {isActivate ? "Welcome" : "Account recovery"}
                  </div>
                  <h2 className="mt-2 font-serif text-[38px] leading-[1.02] text-ink sm:text-[44px] font-bold">
                    {copy.title}
                  </h2>
                  <p className="mt-2.5 text-sm text-ink-muted leading-relaxed">
                    {copy.subtitle}
                  </p>
                </div>

                {error && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-red-50 p-3.5 text-xs text-red-800 border border-red-200">
                    <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                    <span>{error}</span>
                  </div>
                )}
                {info && !error && (
                  <div className="flex items-center gap-2.5 rounded-xl bg-emerald-50 p-3.5 text-xs text-emerald-800 border border-emerald-200">
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-emerald-600" />
                    <span>{info}</span>
                  </div>
                )}

                {phase === "request" ? (
                  <form onSubmit={sendCode} className="space-y-6 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                        Work email
                      </label>
                      <Field icon={Mail}>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
                          placeholder="name@company.com"
                          required
                        />
                      </Field>
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark disabled:opacity-70"
                    >
                      <span>{busy ? "Sending…" : "Send verification code"}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  </form>
                ) : (
                  <form onSubmit={submitReset} className="space-y-5 pt-2">
                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                        Verification code
                      </label>
                      <Field icon={KeyRound}>
                        <input
                          inputMode="numeric"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full bg-transparent text-[15px] tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-ink-faint"
                          placeholder="Enter the code"
                          required
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={resend}
                        disabled={busy || cooldown > 0}
                        className="text-[11px] font-semibold text-brand hover:underline disabled:opacity-60"
                      >
                        {cooldown > 0
                          ? `Resend available in ${cooldown}s`
                          : "Didn’t get it? Resend code"}
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                        New password
                      </label>
                      <div className="relative">
                        <Field icon={Lock}>
                          <input
                            type={showPw ? "text" : "password"}
                            value={password}
                            onChange={(e) => setPassword(e.target.value)}
                            className="w-full bg-transparent text-[15px] outline-none pr-8"
                            placeholder="At least 6 characters"
                            required
                          />
                          <button
                            type="button"
                            onClick={() => setShowPw((s) => !s)}
                            className="absolute right-0 text-ink-faint hover:text-brand"
                            aria-label={showPw ? "Hide password" : "Show password"}
                          >
                            {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </Field>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                        Confirm password
                      </label>
                      <Field icon={Lock}>
                        <input
                          type={showPw ? "text" : "password"}
                          value={confirm}
                          onChange={(e) => setConfirm(e.target.value)}
                          className="w-full bg-transparent text-[15px] outline-none"
                          placeholder="Re-enter password"
                          required
                        />
                      </Field>
                    </div>

                    <button
                      type="submit"
                      disabled={busy}
                      className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark disabled:opacity-70"
                    >
                      <span>{busy ? "Saving…" : copy.cta}</span>
                      <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                        <ArrowRight className="h-4 w-4" />
                      </span>
                    </button>
                  </form>
                )}

                <Link
                  to="/login"
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-ink-muted hover:text-brand"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
