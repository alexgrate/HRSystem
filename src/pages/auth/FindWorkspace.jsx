import { useState } from "react";
import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { AlertCircle, ArrowRight, Link2 } from "lucide-react";
import logoImg from "../../assets/dashIcon.jpg";
import {
  WORKSPACE_DOMAIN,
  checkWorkspace,
  isValidWorkspace,
  normalizeWorkspace,
  workspaceUrl,
} from "../../utils/workspace";

const LAST_KEY = "dash_last_workspace";

const readLast = () => {
  try {
    return localStorage.getItem(LAST_KEY) || "";
  } catch {
    return "";
  }
};

const saveLast = (slug) => {
  try {
    localStorage.setItem(LAST_KEY, slug);
  } catch {
    return;
  }
};

export default function FindWorkspace({ next = "/login" }) {
  const [value, setValue] = useState(readLast);
  const [error, setError] = useState("");
  const [busy, setBusy] = useState(false);
  const resetting = next === "/forgot-password";

  const submit = async (e) => {
    e.preventDefault();
    const slug = normalizeWorkspace(value);
    if (!isValidWorkspace(slug)) {
      setError("Enter your workspace name, using only letters, numbers and hyphens. For example: acme.");
      return;
    }
    setBusy(true);
    setError("");
    try {
      const result = await checkWorkspace(slug);
      if (result === "missing") {
        setError(`There's no workspace called “${slug}”. Check the spelling, or ask your HR team for your workspace address.`);
        setBusy(false);
        return;
      }
      if (result === "inactive") {
        setError("This workspace has been deactivated. Contact your HR team.");
        setBusy(false);
        return;
      }
      saveLast(slug);
      window.location.assign(workspaceUrl(slug, next));
    } catch {
      setError("We couldn't check that workspace just now. Try again in a moment.");
      setBusy(false);
    }
  };

  return (
    <div className="relative h-screen w-screen overflow-hidden bg-[#faf8f3] text-ink" style={{ height: "100dvh" }}>
      <div className="pointer-events-none absolute inset-0 opacity-[0.5] grain" />

      <div className="relative grid h-full w-full grid-cols-1 lg:grid-cols-[1.15fr_1fr]">
        <div className="relative hidden h-full flex-col justify-between overflow-hidden bg-gradient-to-br from-brand-darkest via-brand-dark to-brand p-12 text-white lg:flex xl:p-16 2xl:p-20">
          <div className="pointer-events-none absolute inset-0">
            <div className="absolute -right-32 -top-32 h-[420px] w-[420px] rounded-full bg-accent/10 blur-3xl" />
            <div className="absolute -bottom-40 -left-20 h-[360px] w-[360px] rounded-full bg-brand-2/30 blur-3xl" />
            <div className="absolute inset-0 opacity-[0.06]" style={{ backgroundImage: "radial-gradient(circle at 1px 1px, white 1px, transparent 0)", backgroundSize: "22px 22px" }} />
          </div>

          <Link to="/" className="relative flex items-center gap-3.5">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-white/10 p-1.5 shadow-inner ring-1 ring-inset ring-white/15 backdrop-blur">
              <img src={logoImg} className="h-full w-full object-contain" alt="" onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <div className="font-serif text-2xl tracking-tight"><span className="font-bold italic">dash</span>.</div>
            <div className="ml-2 text-[9px] uppercase tracking-[0.35em] text-white/40">HR Suite</div>
          </Link>

          <div className="relative my-auto max-w-xl py-16 pr-6">
            <div className="anim anim-fade text-[11px] uppercase tracking-[0.34em] text-white/55">Workspaces</div>
            <h1 className="mt-5 font-serif text-[60px] font-bold leading-[0.95] tracking-tight xl:text-[76px]">
              <span className="anim anim-reveal block">Every team has</span>
              <span className="anim anim-reveal block italic text-accent" style={{ animationDelay: "0.16s" }}>its own address.</span>
            </h1>
            <p className="anim anim-fade mt-6 max-w-md text-sm leading-relaxed text-white/60" style={{ animationDelay: "0.5s" }}>
              Each organisation signs in at its own address, like acme.{WORKSPACE_DOMAIN}. Tell us yours and we'll take you there.
            </p>
          </div>

          <div className="relative text-[10px] uppercase tracking-[0.25em] text-white/40">
            Powered by Dash Microfinance Bank Ltd © {new Date().getFullYear()}
          </div>
        </div>

        <div className="relative flex h-full flex-col justify-between overflow-y-auto px-6 py-10 sm:px-16 lg:px-20 2xl:px-28">
          <Link to="/" className="flex shrink-0 items-center gap-3.5 lg:hidden">
            <div className="flex h-11 w-11 items-center justify-center overflow-hidden rounded-xl bg-brand p-1.5 shadow-md">
              <img src={logoImg} className="h-full w-full object-contain" alt="" onError={(e) => { e.target.style.display = "none"; }} />
            </div>
            <div className="font-serif text-xl text-ink"><span className="font-bold italic">dash</span>.</div>
          </Link>

          <div className="anim anim-fade mx-auto my-auto w-full max-w-md space-y-6">
            <div>
              <div className="text-[11px] uppercase tracking-[0.3em] text-brand/70">
                {resetting ? "Reset your password" : "Welcome back"}
              </div>
              <h2 className="mt-2 font-serif text-[42px] font-bold leading-[1.02] text-ink sm:text-[48px]">
                Find your<br /><span className="italic">workspace</span>.
              </h2>
              <p className="mt-2.5 text-sm leading-relaxed text-ink-muted">
                Enter your organisation's workspace name. It's the first part of the address you sign in at.
              </p>
            </div>

            {error && (
              <div role="alert" className="flex items-center gap-2.5 rounded-xl border border-red-200 bg-red-50 p-3.5 text-xs text-red-800">
                <AlertCircle className="h-4 w-4 shrink-0 text-red-600" />
                <span>{error}</span>
              </div>
            )}

            <form onSubmit={submit} className="space-y-5 pt-2" noValidate>
              <div className="space-y-1.5">
                <label htmlFor="workspace" className="text-[10px] font-semibold uppercase tracking-[0.18em] text-ink-muted">
                  Workspace
                </label>
                <div className="flex items-center gap-2.5 border-b border-line py-2.5 transition-colors focus-within:border-brand">
                  <Link2 className="h-4.5 w-4.5 shrink-0 text-ink-faint" aria-hidden="true" />
                  <input
                    id="workspace"
                    value={value}
                    onChange={(e) => { setValue(e.target.value); setError(""); }}
                    className="w-full bg-transparent text-[15px] outline-none placeholder:text-ink-faint"
                    placeholder="acme"
                    autoComplete="organization"
                    autoCapitalize="none"
                    spellCheck={false}
                    autoFocus
                    required
                  />
                  <span className="shrink-0 text-xs text-ink-faint">.{WORKSPACE_DOMAIN}</span>
                </div>
              </div>

              <motion.button
                whileHover={{ y: -1 }}
                whileTap={{ scale: 0.99 }}
                type="submit"
                disabled={busy || !value.trim()}
                className="group flex w-full items-center justify-between rounded-full bg-brand px-6 py-4 text-xs font-semibold uppercase tracking-[0.18em] text-white shadow-md hover:bg-brand-dark disabled:opacity-60"
              >
                <span>{busy ? "Finding your workspace..." : "Continue"}</span>
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-white/15 transition-transform group-hover:translate-x-0.5">
                  <ArrowRight className="h-4 w-4" />
                </span>
              </motion.button>
            </form>

            <p className="text-center text-xs text-ink-muted">
              Don't know it? Ask your HR team, or check the address in your onboarding email.
            </p>
            <p className="text-center text-xs text-ink-muted">
              New to dash?{" "}
              <Link to="/signup" className="font-semibold text-brand hover:underline">
                Create your organization's workspace
              </Link>
            </p>
          </div>

          <nav aria-label="Help and legal" className="mt-8 flex shrink-0 justify-center gap-5 text-[11px] font-semibold uppercase tracking-[0.18em] text-ink-faint">
            <Link to="/docs" className="hover:text-brand">Help</Link>
            <Link to="/terms" className="hover:text-brand">Terms</Link>
            <Link to="/privacy" className="hover:text-brand">Privacy</Link>
          </nav>
        </div>
      </div>
    </div>
  );
}
