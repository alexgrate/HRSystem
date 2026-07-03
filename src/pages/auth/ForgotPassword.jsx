import React, { useState } from "react";
import { Link, useNavigate, useSearchParams } from "react-router-dom";
import { motion } from "framer-motion";
import {
  Mail, Lock, KeyRound, ArrowRight, ArrowLeft, AlertCircle,
  CheckCircle2, Eye, EyeOff,
} from "lucide-react";
import { authService } from "../../services/authService";

const emailValid = (e) => /^\S+@\S+\.\S+$/.test(e);

const Field = ({ icon: Icon, children }) => (
  <div className="flex items-center gap-2.5 border-b border-slate-300 py-2.5 focus-within:border-[#4f1a60] transition-colors">
    <Icon className="h-4.5 w-4.5 text-slate-400" />
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
      setInfo(`We sent a code to ${email.trim()}.`);
      setPhase("reset");
    } catch (err) {
      setError(err?.message || "Couldn’t send a code to that email.");
    } finally {
      setBusy(false);
    }
  };

  const resend = async () => {
    setError("");
    setInfo("");
    setBusy(true);
    try {
      await authService.resendOtp(email.trim());
      setInfo("A new code is on its way.");
    } catch (err) {
      setError(err?.message || "Couldn’t resend the code.");
    } finally {
      setBusy(false);
    }
  };

  const submitReset = async (e) => {
    e.preventDefault();
    setError("");
    if (!otp.trim()) return setError("Enter the code from your email.");
    if (password.length < 6)
      return setError("Password must be at least 6 characters.");
    if (password !== confirm) return setError("Passwords don’t match.");
    setBusy(true);
    try {
      await authService.resetPassword(email.trim(), otp.trim(), password);
      setPhase("done");
    } catch (err) {
      setError(err?.message || "Couldn’t set your password. Check the code and try again.");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#faf8f3] text-slate-900">
      <div className="relative mx-auto h-full w-full max-w-[1400px] grid grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        {/* Brand panel */}
        <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-[#2a0d35] via-[#3d1248] to-[#4f1a60] p-12 text-white lg:flex xl:p-16">
          <div className="pointer-events-none absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-[#e9a8ff]/10 blur-3xl" />
          <div className="pointer-events-none absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-[#8a2da8]/30 blur-3xl" />
          <div className="relative flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center rounded-xl bg-white/10 ring-1 ring-inset ring-white/15 backdrop-blur font-bold">
              D
            </div>
            <div className="font-serif text-2xl tracking-tight">
              <span className="italic font-bold">dash</span>.
            </div>
          </div>
          <motion.div
            initial={{ opacity: 0, y: 18 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.7, ease: [0.22, 1, 0.36, 1] }}
            className="relative max-w-xl my-auto py-16"
          >
            <div className="text-[11px] uppercase tracking-[0.34em] text-white/55">
              Account Security
            </div>
            <h1 className="mt-5 font-serif text-[56px] leading-[0.95] tracking-tight xl:text-[68px] font-bold">
              {isActivate ? (
                <>A workspace,<br /><span className="italic text-[#e9a8ff]">made yours</span>.</>
              ) : (
                <>Back in,<br /><span className="italic text-[#e9a8ff]">securely</span>.</>
              )}
            </h1>
            <p className="mt-6 max-w-md text-sm leading-relaxed text-white/60">
              We verify it’s really you with a one-time code before any password
              is set. Codes expire quickly and can only be used once.
            </p>
          </motion.div>
          <div className="relative text-[10px] uppercase tracking-[0.25em] text-white/40">
            Powered by Dash © 2026
          </div>
        </div>

        {/* Form panel */}
        <div className="relative flex h-full flex-col justify-center px-6 py-12 sm:px-16 lg:px-20">
          <motion.div
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.5 }}
            className="mx-auto w-full max-w-md space-y-6"
          >
            {phase === "done" ? (
              <div className="space-y-6 text-center">
                <div className="mx-auto flex h-14 w-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-600">
                  <CheckCircle2 className="h-7 w-7" />
                </div>
                <div>
                  <h2 className="font-serif text-3xl font-bold text-slate-900">
                    {isActivate ? "Account activated" : "Password updated"}
                  </h2>
                  <p className="mt-2 text-sm text-slate-500">
                    You can now sign in with your new password.
                  </p>
                </div>
                <button
                  onClick={() => navigate("/login")}
                  className="group flex w-full items-center justify-between rounded-full bg-[#4f1a60] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-[#3d1248]"
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
                  <div className="text-[11px] uppercase tracking-[0.3em] text-[#4f1a60]/70">
                    {isActivate ? "Welcome" : "Account recovery"}
                  </div>
                  <h2 className="mt-2 font-serif text-[38px] leading-[1.02] text-slate-900 sm:text-[44px] font-bold">
                    {copy.title}
                  </h2>
                  <p className="mt-2.5 text-sm text-slate-500 leading-relaxed">
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
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Work email
                      </label>
                      <Field icon={Mail}>
                        <input
                          type="email"
                          value={email}
                          onChange={(e) => setEmail(e.target.value)}
                          className="w-full bg-transparent text-[15px] outline-none placeholder:text-slate-400"
                          placeholder="name@company.com"
                          required
                        />
                      </Field>
                    </div>
                    <button
                      type="submit"
                      disabled={busy}
                      className="group flex w-full items-center justify-between rounded-full bg-[#4f1a60] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-[#3d1248] disabled:opacity-70"
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
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
                        Verification code
                      </label>
                      <Field icon={KeyRound}>
                        <input
                          inputMode="numeric"
                          value={otp}
                          onChange={(e) => setOtp(e.target.value)}
                          className="w-full bg-transparent text-[15px] tracking-[0.3em] outline-none placeholder:tracking-normal placeholder:text-slate-400"
                          placeholder="Enter the code"
                          required
                        />
                      </Field>
                      <button
                        type="button"
                        onClick={resend}
                        disabled={busy}
                        className="text-[11px] font-semibold text-[#4f1a60] hover:underline disabled:opacity-60"
                      >
                        Didn’t get it? Resend code
                      </button>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                            className="absolute right-0 text-slate-400 hover:text-[#4f1a60]"
                            aria-label={showPw ? "Hide password" : "Show password"}
                          >
                            {showPw ? <EyeOff className="h-4.5 w-4.5" /> : <Eye className="h-4.5 w-4.5" />}
                          </button>
                        </Field>
                      </div>
                    </div>

                    <div className="space-y-1.5">
                      <label className="text-[10px] font-semibold uppercase tracking-[0.18em] text-slate-500">
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
                      className="group flex w-full items-center justify-between rounded-full bg-[#4f1a60] px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-[#3d1248] disabled:opacity-70"
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
                  className="inline-flex items-center gap-1.5 text-xs font-semibold text-slate-500 hover:text-[#4f1a60]"
                >
                  <ArrowLeft className="h-3.5 w-3.5" /> Back to sign in
                </Link>
              </>
            )}
          </motion.div>
        </div>
      </div>
    </div>
  );
};

export default ForgotPassword;
