import { ArrowRight, Check, Clock } from "lucide-react";
import { btnPlum, paper } from "../styles";

const card = `${paper} relative min-h-[380px] border-[1.5px] border-lp-ink p-5 sm:p-[34px]`;
const label = "font-plex text-xs uppercase tracking-[0.12em] text-lp-muted";

function CardHead({ title, tag }) {
  return (
    <div className="flex flex-wrap items-baseline justify-between gap-3 border-b-[1.5px] border-lp-ink pb-4">
      <h3 className="font-news text-[30px] font-medium tracking-[-0.01em]">{title}</h3>
      <span className={label}>{tag}</span>
    </div>
  );
}

function Row({ label: name, value, total }) {
  return (
    <div
      className={`flex justify-between gap-3 py-[11px] ${
        total ? "text-lg" : "border-b border-dotted border-[#9b8f80] text-[15px]"
      }`}
    >
      <span className="text-lp-muted">{name}</span>
      <b className={`font-plex ${total ? "font-semibold" : "font-medium"}`}>{value}</b>
    </div>
  );
}

export function PayslipAnswer() {
  return (
    <div className={card}>
      <CardHead title="November payslip" tag="Self-service · Payslips" />
      <Row label="Gross pay" value="620,000.00" />
      <Row label="Pension" value="(49,600.00)" />
      <Row label="NHF" value="(10,250.00)" />
      <Row label="PAYE" value="(83,327.00)" />
      <Row label="Net pay" value="₦476,823.00" total />
      <p className="mt-4 text-sm text-lp-muted">
        Kemi also got a “Payslip available” email when payroll went out.
      </p>
    </div>
  );
}

const BALANCES = [
  { type: "Annual", left: 14, total: 20 },
  { type: "Sick", left: 8, total: 10 },
  { type: "Casual", left: 2, total: 3 },
];

export function LeaveAnswer() {
  return (
    <div className={card}>
      <CardHead title="Your leave" tag="This period" />
      {BALANCES.map((b) => (
        <div key={b.type} className="mt-5">
          <div className="flex justify-between gap-3 text-[15px]">
            <b>{b.type}</b>
            <span className="text-lp-muted">
              {b.left} of {b.total} days left
            </span>
          </div>
          <div className="mt-2 h-2.5 overflow-hidden rounded-[2px] border-[1.5px] border-lp-ink bg-lp-white">
            <span className="block h-full bg-lp-lilac" style={{ width: `${(b.left / b.total) * 100}%` }} />
          </div>
        </div>
      ))}
      <span aria-hidden="true" className={`${btnPlum} pointer-events-none mt-6 h-12 px-5 text-[15px]`}>
        Request leave
      </span>
    </div>
  );
}

const STEPS = [
  { who: "Line manager", by: "Kemi Bello · approved", comment: "Fine by me.", done: true },
  { who: "HR", by: "Ngozi Eze · approved", comment: "Within policy, passing to Finance.", done: true },
  { who: "Finance", by: "Waiting for review", done: false },
];

export function AdvanceAnswer() {
  return (
    <div className={card}>
      <CardHead title="Salary advance" tag="2 of 3 steps" />
      <ol className="mt-6">
        {STEPS.map((s) => (
          <li key={s.who} className="grid grid-cols-[30px_1fr] gap-3.5 pb-[18px]">
            <span
              className={`grid size-[30px] place-items-center rounded-full ${
                s.done ? "bg-lp-plum text-white" : "border-[1.5px] border-dashed border-lp-plum text-lp-plum"
              }`}
            >
              {s.done ? <Check size={15} strokeWidth={3} /> : <Clock size={14} strokeWidth={2.5} />}
            </span>
            <span>
              <b className="block text-[15px]">{s.who}</b>
              <small className="text-[13px] text-lp-muted">{s.by}</small>
              {s.comment && (
                <q className="mt-0.5 block font-hand text-[21px] text-lp-plum">{s.comment}</q>
              )}
            </span>
          </li>
        ))}
      </ol>
    </div>
  );
}

export function ProfileAnswer() {
  return (
    <div className={card}>
      <CardHead title="Profile update" tag="Sent to HR" />
      <p className="mt-[18px] leading-relaxed text-lp-muted">
        Musa updates his details in self-service. HR reviews the change before it goes on his record.
      </p>
      <div className="mt-[22px] grid items-center gap-2.5 sm:grid-cols-[1fr_28px_1fr]">
        <div className="border-[1.5px] border-lp-ink p-3 text-sm">
          <span className={`${label} mb-1 block text-[11px]`}>Bank · before</span>
          <span className="text-lp-muted line-through">First Bank ••• 4471</span>
        </div>
        <ArrowRight size={24} aria-hidden="true" className="rotate-90 justify-self-center sm:rotate-0" />
        <div className="border-[1.5px] border-lp-ink p-3 text-sm">
          <span className={`${label} mb-1 block text-[11px]`}>Bank · after</span>
          GTBank ••• 0932
        </div>
      </div>
      <p className="mt-4 text-sm text-lp-muted">Status: awaiting HR approval</p>
    </div>
  );
}
