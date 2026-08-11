import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { AlertCircle, Lock, Mail, ShieldCheck } from "lucide-react";
import { usePlatformAuth } from "../../context/PlatformAuthContext";

// Deliberately a distinct, simpler shell from the org-employee /login page —
// signals "you're in a different area" at a glance rather than reusing the
// full brand split-screen treatment.
export default function PlatformLoginPage() {
  const { login } = usePlatformAuth();
  const navigate = useNavigate();
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [remember, setRemember] = useState(true);
  const [error, setError] = useState("");
  const [submitting, setSubmitting] = useState(false);

  const submit = async (e) => {
    e.preventDefault();
    setError("");
    setSubmitting(true);
    try {
      await login(email, password, remember);
      navigate("/platform/dashboard");
    } catch (err) {
      setError(err?.error?.message || err?.message || "Invalid email or password.");
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950 px-4">
      <div className="w-full max-w-sm rounded-2xl border border-white/10 bg-slate-900 p-8 shadow-2xl">
        <div className="flex items-center gap-3">
          <div className="flex h-10 w-10 items-center justify-center rounded-xl bg-violet-600 text-white">
            <ShieldCheck className="h-5 w-5" />
          </div>
          <div>
            <div className="font-serif text-lg font-bold text-white"><span className="italic">dash</span>.</div>
            <div className="text-[10px] uppercase tracking-[0.25em] text-slate-400">Platform Admin</div>
          </div>
        </div>

        <h1 className="mt-6 text-xl font-bold text-white">Sign in</h1>
        <p className="mt-1 text-sm text-slate-400">Restricted to platform administrators.</p>

        {error && (
          <div className="mt-4 flex items-center gap-2.5 rounded-xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-300">
            <AlertCircle className="h-4 w-4 shrink-0" /> <span>{error}</span>
          </div>
        )}

        <form onSubmit={submit} className="mt-6 space-y-4">
          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Email</label>
            <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5">
              <Mail className="h-4 w-4 text-slate-500" />
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none placeholder:text-slate-500"
                placeholder="admin@dash-mfb.com"
                required
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-semibold uppercase tracking-wider text-slate-400">Password</label>
            <div className="mt-1 flex items-center gap-2.5 rounded-xl border border-white/10 bg-slate-800 px-3 py-2.5">
              <Lock className="h-4 w-4 text-slate-500" />
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full bg-transparent text-sm text-white outline-none"
                required
              />
            </div>
          </div>

          <label className="flex items-center gap-2 text-xs text-slate-400">
            <input
              type="checkbox"
              checked={remember}
              onChange={(e) => setRemember(e.target.checked)}
              className="h-3.5 w-3.5 rounded border-white/20 bg-slate-800 text-violet-600"
            />
            Remember me on this device
          </label>

          <button
            type="submit"
            disabled={submitting}
            className="w-full rounded-xl bg-violet-600 py-3 text-sm font-semibold text-white shadow-md hover:bg-violet-500 disabled:opacity-60"
          >
            {submitting ? "Signing in..." : "Sign in"}
          </button>
        </form>
      </div>
    </div>
  );
}
