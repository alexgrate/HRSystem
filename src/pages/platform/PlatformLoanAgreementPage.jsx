import { useEffect, useRef, useState } from "react";
import { FileSignature, Upload, History, RotateCcw, Info } from "lucide-react";
import { platformLoanAgreementService } from "../../services/platformLoanAgreementService";
import { useToast, useConfirm } from "../../components/ui/Notifications";

// Every {{token}} the renderer understands (loan-agreement.template.ts on
// the backend) — shown as a cheat-sheet next to the editor so the admin
// never has to guess a placeholder name.
const TOKENS = [
  { token: "employee_name", desc: "Borrower's full name" },
  { token: "organization_name", desc: "Borrower's employer" },
  { token: "loan_type_name", desc: "Loan product name" },
  { token: "amount", desc: "Principal amount" },
  { token: "interest_rate", desc: "Interest rate, % per annum" },
  { token: "interest_method", desc: "Interest method, e.g. reducing balance" },
  { token: "tenure_months", desc: "Tenure, e.g. \"6 months\"" },
  { token: "monthly_installment", desc: "Monthly installment amount" },
  { token: "total_interest", desc: "Total interest payable" },
  { token: "total_repayable", desc: "Total repayable amount" },
  { token: "start_date", desc: "Repayment start date" },
  { token: "end_date", desc: "Repayment end date" },
  { token: "repayment_method", desc: "Org's default repayment method" },
];

const fmtDateTime = (v) => (v ? new Date(v).toLocaleString(undefined, { dateStyle: "medium", timeStyle: "short" }) : "—");

const UPLOAD_MAX_BYTES = 200 * 1024; // 200KB — an agreement is plain text, generous ceiling

export default function PlatformLoanAgreementPage() {
  const toast = useToast();
  const confirm = useConfirm();
  const fileInputRef = useRef(null);

  const [loading, setLoading] = useState(true);
  const [active, setActive] = useState(null); // { template, sample_preview }
  const [versions, setVersions] = useState([]);
  const [title, setTitle] = useState("");
  const [content, setContent] = useState("");
  const [preview, setPreview] = useState("");
  const [previewing, setPreviewing] = useState(false);
  const [publishing, setPublishing] = useState(false);
  const [restoringVersion, setRestoringVersion] = useState(null);
  const [showHistory, setShowHistory] = useState(false);

  const load = async () => {
    setLoading(true);
    try {
      const [activeRes, versionsRes] = await Promise.all([
        platformLoanAgreementService.getActive(),
        platformLoanAgreementService.listVersions(),
      ]);
      setActive(activeRes);
      setVersions(Array.isArray(versionsRes) ? versionsRes : []);
      setTitle(activeRes?.template?.title || "Loan Agreement");
      setContent(activeRes?.template?.content || "");
      setPreview(activeRes?.sample_preview || "");
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Couldn't load the loan agreement.");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => { load(); }, []); // eslint-disable-line react-hooks/exhaustive-deps

  // Debounced live preview as the admin types.
  useEffect(() => {
    if (!content.trim()) { setPreview(""); return; }
    const timer = setTimeout(() => {
      setPreviewing(true);
      platformLoanAgreementService
        .preview(content)
        .then((res) => setPreview(res?.sample_preview || ""))
        .catch(() => { /* keep last good preview on transient errors */ })
        .finally(() => setPreviewing(false));
    }, 400);
    return () => clearTimeout(timer);
  }, [content]);

  const dirty = active && (content !== (active.template?.content || "") || title !== (active.template?.title || "Loan Agreement"));

  const handleUploadClick = () => fileInputRef.current?.click();

  const handleFileChange = (e) => {
    const file = e.target.files?.[0];
    e.target.value = ""; // allow re-selecting the same file later
    if (!file) return;
    if (file.size > UPLOAD_MAX_BYTES) {
      toast.error("That file is too large — keep the agreement under 200KB of plain text.");
      return;
    }
    const reader = new FileReader();
    reader.onload = () => {
      setContent(String(reader.result || ""));
      toast.success(`Loaded "${file.name}" into the editor. Review and publish when ready.`);
    };
    reader.onerror = () => toast.error("Couldn't read that file.");
    reader.readAsText(file);
  };

  const publish = async () => {
    if (publishing || !content.trim()) return;
    const ok = await confirm({
      title: "Publish this loan agreement?",
      message: "This becomes the live agreement for every new Dash loan starting now. Already-signed loans keep their original text.",
      confirmLabel: "Publish",
    });
    if (!ok) return;
    setPublishing(true);
    try {
      await platformLoanAgreementService.publish({ title, content });
      toast.success("Loan agreement published.");
      await load();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to publish the loan agreement.");
    } finally {
      setPublishing(false);
    }
  };

  const restore = async (version) => {
    if (restoringVersion) return;
    const ok = await confirm({
      title: `Restore version ${version}?`,
      message: "Publishes a new version with that version's content — becomes the live agreement for every new Dash loan starting now.",
      confirmLabel: "Restore",
    });
    if (!ok) return;
    setRestoringVersion(version);
    try {
      await platformLoanAgreementService.restoreVersion(version);
      toast.success(`Version ${version} restored as the new live agreement.`);
      await load();
    } catch (err) {
      toast.error(err?.error?.message || err?.message || "Failed to restore that version.");
    } finally {
      setRestoringVersion(null);
    }
  };

  if (loading) {
    return <div className="rounded-2xl border border-line-soft bg-card p-12 text-center text-sm text-ink-muted">Loading loan agreement…</div>;
  }

  return (
    <div className="space-y-6">
      <div className="flex flex-wrap items-start justify-between gap-3">
        <div>
          <h1 className="text-xl font-bold text-ink">Loan Agreement</h1>
          <p className="text-sm text-ink-muted">
            The single, platform-wide agreement every employee signs when applying for a loan against Dash. Currently live: version {active?.template?.version}.
          </p>
        </div>
        <button
          onClick={() => setShowHistory((s) => !s)}
          className="inline-flex items-center gap-1.5 rounded-xl border border-line bg-card px-3.5 py-2 text-xs font-semibold text-ink-2 hover:bg-sunken"
        >
          <History className="h-3.5 w-3.5" /> {showHistory ? "Hide" : "Show"} version history
        </button>
      </div>

      <div className="grid gap-5 lg:grid-cols-2">
        {/* Editor */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
            <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Title</label>
            <input
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className="mt-1.5 h-10 w-full rounded-xl border border-line bg-transparent px-3 text-sm outline-none focus:border-brand"
            />

            <div className="mt-4 flex items-center justify-between">
              <label className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Content</label>
              <div>
                <input ref={fileInputRef} type="file" accept=".txt,.md,text/plain,text/markdown" onChange={handleFileChange} className="hidden" />
                <button
                  type="button"
                  onClick={handleUploadClick}
                  className="inline-flex items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-ink-2 hover:bg-sunken"
                >
                  <Upload className="h-3.5 w-3.5" /> Upload .txt/.md
                </button>
              </div>
            </div>
            <textarea
              value={content}
              onChange={(e) => setContent(e.target.value)}
              rows={16}
              spellCheck={false}
              className="mt-1.5 w-full rounded-xl border border-line bg-sunken/30 p-3 font-mono text-xs leading-relaxed text-ink-2 outline-none focus:border-brand"
            />

            <div className="mt-4 flex items-center justify-between gap-2">
              <span className="text-[11px] text-ink-faint">{dirty ? "Unsaved changes" : "No changes"}</span>
              <button
                onClick={publish}
                disabled={publishing || !content.trim() || !dirty}
                className="h-10 rounded-xl bg-brand px-5 text-sm font-semibold text-white disabled:opacity-50"
              >
                {publishing ? "Publishing…" : "Publish new version"}
              </button>
            </div>
          </div>

          <div className="rounded-2xl border border-line-soft bg-sunken/30 p-4">
            <div className="flex items-center gap-1.5 text-[11px] font-semibold uppercase tracking-wider text-ink-faint">
              <Info className="h-3.5 w-3.5" /> Placeholders
            </div>
            <div className="mt-2 grid grid-cols-1 gap-1.5 sm:grid-cols-2">
              {TOKENS.map((t) => (
                <div key={t.token} className="text-[11px] text-ink-muted">
                  <code className="rounded bg-card px-1 py-0.5 font-mono text-brand">{`{{${t.token}}}`}</code> — {t.desc}
                </div>
              ))}
            </div>
          </div>
        </div>

        {/* Live preview */}
        <div className="space-y-4">
          <div className="rounded-2xl border border-line/80 bg-card p-4 shadow-sm">
            <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-ink-faint">
              <FileSignature className="h-3.5 w-3.5" /> Live preview {previewing && <span className="text-ink-ghost normal-case">(rendering…)</span>}
            </div>
            <p className="mt-1 text-[11px] text-ink-faint">Rendered with sample figures — this is exactly what an employee would see, just with real numbers.</p>
            <div className="mt-3 max-h-[28rem] overflow-y-auto whitespace-pre-wrap rounded-xl border border-line bg-sunken/40 p-4 text-xs leading-relaxed text-ink-2">
              {preview || "Nothing to preview yet."}
            </div>
          </div>

          {showHistory && (
            <div className="rounded-2xl border border-line/80 bg-card shadow-sm">
              <div className="border-b border-line-soft p-4">
                <h3 className="text-sm font-semibold text-ink">Version history</h3>
              </div>
              <ul className="divide-y divide-line-soft">
                {versions.length === 0 ? (
                  <li className="p-4 text-center text-xs text-ink-faint">No versions yet.</li>
                ) : (
                  versions.map((v) => (
                    <li key={v.version} className="flex items-center justify-between gap-3 p-4">
                      <div className="min-w-0">
                        <div className="flex items-center gap-2">
                          <span className="text-sm font-semibold text-ink">Version {v.version}</span>
                          {v.is_active && <span className="rounded-full bg-emerald-50 px-2 py-0.5 text-[10px] font-bold uppercase tracking-wider text-emerald-700">Live</span>}
                        </div>
                        <div className="truncate text-xs text-ink-muted">{v.title}</div>
                        <div className="text-[11px] text-ink-faint">{fmtDateTime(v.created_at)} · {v.created_by_name || "System"}</div>
                      </div>
                      {!v.is_active && (
                        <button
                          onClick={() => restore(v.version)}
                          disabled={restoringVersion === v.version}
                          className="inline-flex shrink-0 items-center gap-1.5 rounded-lg border border-line px-2.5 py-1.5 text-[11px] font-bold text-ink-2 hover:bg-sunken disabled:opacity-60"
                        >
                          <RotateCcw className="h-3.5 w-3.5" /> {restoringVersion === v.version ? "Restoring…" : "Restore"}
                        </button>
                      )}
                    </li>
                  ))
                )}
              </ul>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
