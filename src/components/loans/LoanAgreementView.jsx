import { FileText } from "lucide-react";
import SignaturePad from "./SignaturePad";
import { fmtMoney } from "../../utils/payroll";

// Renders a Dash loan agreement: header, a figures summary card, the terms
// text (plain paragraphs, no markup), and either an interactive SignaturePad
// (mode="sign") or a previously-stored signature image (mode="view").
export default function LoanAgreementView({
  mode = "sign",
  termsText,
  figures = {},
  signatureDataUrl = null,
  onSignatureChange,
  currency = "NGN",
}) {
  const {
    loanTypeName,
    amount,
    interestRate,
    tenureMonths,
    monthlyInstallment,
    totalRepayable,
    totalInterest,
    startDate,
    endDate,
  } = figures;

  const paragraphs = String(termsText || "").split("\n");

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2.5 rounded-xl bg-gradient-to-r from-brand/10 to-brand-2/5 p-3">
        <FileText className="h-4 w-4 shrink-0 text-brand" />
        <div>
          <p className="text-sm font-bold text-ink">Loan Agreement — Dash</p>
          <p className="text-xs text-ink-muted">This is a contract with Dash, the platform — not your employer.</p>
        </div>
      </div>

      <div className="rounded-xl border border-line p-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">{loanTypeName || "Loan"}</p>
        <div className="mt-2 grid grid-cols-2 gap-x-4 gap-y-1.5 text-xs text-ink-2">
          <div className="flex justify-between"><span className="text-ink-faint">Amount</span><span className="font-semibold">{fmtMoney(amount, currency)}</span></div>
          <div className="flex justify-between"><span className="text-ink-faint">Rate</span><span className="font-semibold">{interestRate}%/yr</span></div>
          <div className="flex justify-between"><span className="text-ink-faint">Tenure</span><span className="font-semibold">{tenureMonths} month{tenureMonths === 1 ? "" : "s"}</span></div>
          <div className="flex justify-between"><span className="text-ink-faint">Monthly installment</span><span className="font-semibold">{fmtMoney(monthlyInstallment, currency)}</span></div>
          <div className="flex justify-between"><span className="text-ink-faint">Total interest</span><span className="font-semibold">{fmtMoney(totalInterest, currency)}</span></div>
          <div className="flex justify-between"><span className="text-ink-faint">Total repayable</span><span className="font-semibold">{fmtMoney(totalRepayable, currency)}</span></div>
        </div>
        {startDate && endDate && (
          <p className="mt-2 text-xs text-ink-faint">Repayments run from {startDate} to {endDate}.</p>
        )}
      </div>

      <div className="max-h-56 overflow-y-auto rounded-xl border border-line bg-sunken/40 p-4 text-xs leading-relaxed text-ink-2 whitespace-pre-wrap">
        {paragraphs.length ? paragraphs.join("\n") : "Agreement terms are being prepared…"}
      </div>

      {mode === "sign" ? (
        <div>
          <p className="text-xs font-semibold text-ink-muted">By signing below, you agree to the terms above.</p>
          <SignaturePad onChange={onSignatureChange} className="mt-2" />
        </div>
      ) : (
        <div>
          <p className="text-xs font-semibold uppercase tracking-wider text-ink-muted">Signature on file</p>
          {signatureDataUrl ? (
            <img
              src={signatureDataUrl}
              alt="Employee signature"
              className="mt-2 h-24 w-full max-w-xs rounded-xl border border-line bg-white object-contain p-2"
            />
          ) : (
            <p className="mt-1 text-xs text-ink-faint">No signature on record.</p>
          )}
        </div>
      )}
    </div>
  );
}
