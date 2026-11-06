import { paper } from "../styles";

const PAYSLIP_LINES = [
    ["Gross pay", "620,000.00"],
    ["Pension (8%)", "(49,600.00)"],
    ["NHF", "(10,250.00)"],
    ["PAYE", "(83,327.00)"],
]

const LEAVE_FIELDS = [
  ["Name", "Chidi Obi"],
  ["Type", "Annual"],
  ["Dates", "3 – 5 Nov"],
  ["Handover", "attached"],
];

const lift = "transition-[translate,rotate] duration-300 hover:-translate-y-1.5";

export default function Folder() {
    return (
        <div
            role="img"
            aria-label="A staff folder holding a payslip, an approved leave request, a payslip email and a to-do note"
            className="relative mx-auto h-[700px] w-full max-w-[600px] sm:h-[600px] lg:h-[640px] lg:max-w-none"
        >
            <div className="absolute left-[7%] top-0.5 z-[1] flex h-11 items-center rounded-t-[10px] border-[1.5px] border-b-0 border-lp-ink/35 bg-lp-kraft px-3 font-plex text-[10px] font-semibold tracking-[0.14em] sm:px-5 sm:text-xs">
                PEOPLE FILE · NOV 2026
                <span className="absolute inset-x-0 -bottom-[3px] h-1.5 bg-lp-kraft" />
            </div>

            <div className="absolute inset-x-0 bottom-0 top-11 rounded-[4px_12px_8px_8px] border-[1.5px] border-lp-ink/35 bg-lp-kraft shadow-[0_30px_50px_-30px_rgba(70,45,20,0.6)]" />

            <div data-deal className="absolute -right-[1%] -top-1.5 z-[6] w-[56%] text-right sm:w-[44%]">
                <p className="rotate-3 font-hand text-xl font-semibold leading-[1.1] text-lp-plum sm:text-2xl">
                    no more chasing
                    <br />
                    signatures
                </p>
                <svg
                    aria-hidden="true"
                    viewBox="0 0 70 70"
                    fill="none"
                    stroke="var(--color-lp-plum)"
                    strokeWidth="2.5"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    className="ml-auto mr-[22%] mt-0.5 size-[50px] sm:size-[70px]"
                >
                    <path d="M58 4 C 54 26, 40 44, 14 60" />
                    <path d="M14 46 L 12 61 L 27 62" />
                </svg>
            </div>

            <div data-deal className={`${paper} ${lift} lp-perforated absolute left-[2%] top-[12%] sm:top-[15%] z-[2] w-[74%] -rotate-5 px-3.5 pb-3.5 pt-[22px] font-plex text-[10px] hover:-rotate-3 sm:left-[3%] sm:w-[50%] sm:px-5 sm:pb-5 sm:pt-[26px] sm:text-xs`}>
                <span aria-hidden="true" className="lp-clip" />
                <div className="flex justify-between text-[9px] font-semibold tracking-[0.08em] sm:text-[10.5px]">
                    <span>DASHHR · PAYSLIP</span>
                    <span>NOV 2026</span>
                </div>
                <p className="mb-2.5 mt-3 leading-snug">
                    Amaka Okafor
                    <br />
                    <span className="text-lp-muted">Operations</span>
                </p>
                <hr className="my-1.5 border-t-[1.5px] border-dashed border-lp-ink" />
                {PAYSLIP_LINES.map(([label, amount]) => (
                    <div key={label} className="flex justify-between gap-2 py-[3px]">
                        <span>{label}</span>
                        <span>{amount}</span>
                    </div>
                ))}
                <hr className="my-1.5 border-t-[1.5px] border-dashed border-lp-ink" />
                <div className="flex justify-between gap-2 py-[3px] text-[11.5px] font-semibold sm:text-sm">
                    <span>NET PAY</span>
                    <span>₦476,823.00</span>
                </div>
            </div>

            <div data-deal className={`${paper} ${lift} absolute right-[1%] top-[44%] z-[3] w-[62%] rotate-4 p-3.5 hover:rotate-2 sm:right-[2%] sm:top-[23%] sm:w-[45%] sm:p-[22px]`}>
                <p className="font-plex text-[11px] font-semibold tracking-[0.14em]">LEAVE REQUEST</p>
                {LEAVE_FIELDS.map(([label, value]) => (
                    <div key={label} className="flex justify-between gap-2.5 border-b border-dotted border-[#9b8f80] pb-[5px] pt-[9px] text-xs sm:text-sm">
                        <span className="text-xs text-lp-muted">{label}</span>
                        {value}
                    </div>
                ))}
                <div className="lp-stamp absolute -bottom-[16%] right-[8%] -rotate-12 rounded border-[3px] border-lp-plum px-2 pb-1 pt-[5px] text-center font-plex text-[15px] font-semibold leading-none tracking-[0.18em] text-lp-plum opacity-90 sm:px-3 sm:text-[22px]">
                    APPROVED
                    <small className="mt-1 block text-[9px] tracking-[0.14em]">3 OF 3 STEPS</small>
                </div>
            </div>

            <div
                data-deal
                className={`${paper} ${lift} lp-envelope absolute bottom-[7%] left-[4%] z-[4] w-[68%] rotate-2 overflow-hidden p-3.5 hover:rotate-0 sm:left-[12%] sm:w-[54%] sm:p-5`}
            >
                <div className="absolute right-2 top-2 grid size-12 rotate-14 place-items-center rounded-full border-2 border-dashed border-lp-plum text-center font-plex text-[6.5px] font-semibold leading-[1.3] tracking-[0.1em] text-lp-plum sm:right-3 sm:top-2.5 sm:size-16 sm:text-[8.5px]">
                    DASHHR
                    <br />·<br />
                    SENT
                </div>
                <p className="relative py-1 font-plex text-[9.5px] sm:text-[11.5px]">
                    <span className="text-lp-muted">To:</span> amaka@yourcompany.com
                </p>
                <p className="relative py-1 font-plex text-[9.5px] sm:text-[11.5px]">
                    <span className="text-lp-muted">From:</span> dashhr
                </p>
                <p className="relative mt-2.5 text-xs font-semibold sm:text-sm">Payslip available</p>
            </div>

            <div
                data-deal
                className={`${lift} absolute bottom-[4%] right-[3%] z-[5] w-[42%] -rotate-4 bg-lp-sun px-3 pb-4 pt-3 font-hand text-base font-semibold leading-[1.15] shadow-[0_18px_26px_-18px_rgba(70,45,20,0.7)] hover:-rotate-1 sm:w-[34%] sm:px-4 sm:pb-5 sm:pt-4 sm:text-[23px] lg:w-[38%] lg:text-lg xl:w-[34%] xl:text-[23px] [&_s]:decoration-2`}
            >
                friday:
                <br />
                <s>payroll</s> ✓
                <br />
                <s>Chidi's leave</s> ✓
                <br />
                <s>Grace's advance</s> ✓
                <br />→ go home!!
            </div>

        </div>
    )
}