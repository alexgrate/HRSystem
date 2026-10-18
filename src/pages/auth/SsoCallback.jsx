import { useEffect, useRef, useState } from "react";
import { useNavigate, useSearchParams, Link } from "react-router-dom";
import { AlertCircle } from "lucide-react";
import { useAuth } from "../../context/AuthContext";

// Landed on after the organization's identity provider redirects back
// through the backend's /api/auth/sso/callback — the backend has already
// exchanged the authorization code and minted a normal session token by the
// time the browser gets here, so this page's only job is to pick that token
// up off the URL and finish signing in the same way a password login would.
// Every SSO error case redirects to /login?sso_error=... instead of here, so
// the only unhappy path this page itself handles is a missing/invalid token.
const SsoCallback = () => {
  const { loginWithToken } = useAuth();
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const [error, setError] = useState("");
  const ran = useRef(false);

  useEffect(() => {
    if (ran.current) return;
    ran.current = true;

    const token = searchParams.get("token");
    (async () => {
      try {
        await loginWithToken(token);
        navigate("/app", { replace: true });
      } catch (err) {
        setError(err?.message || "Single sign-on failed. Please try again.");
      }
    })();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  return (
    <div className="flex h-screen w-screen items-center justify-center bg-[#faf8f3]" style={{ height: "100dvh" }}>
      {error ? (
        <div className="max-w-sm space-y-4 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-red-50">
            <AlertCircle className="h-6 w-6 text-red-600" />
          </div>
          <p className="text-sm text-ink-muted">{error}</p>
          <Link to="/login" className="inline-block text-sm font-semibold text-brand hover:underline">
            Back to sign in
          </Link>
        </div>
      ) : (
        <div className="space-y-4 text-center">
          <div className="mx-auto h-8 w-8 animate-spin rounded-full border-4 border-brand border-t-transparent" />
          <p className="text-sm text-ink-muted">Finishing sign-in…</p>
        </div>
      )}
    </div>
  );
};

export default SsoCallback;
