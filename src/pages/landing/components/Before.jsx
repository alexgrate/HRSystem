import { paper } from "../styles";

const CHAT = [
  ["Tunde", "Pls who approved my leave??"],
  ["Grace", "Is salary coming Friday or Monday"],
  ["Musa", "Sending my leave form now"],
];

const FORM_FIELDS = ["Name:", "Dates:", "Signed:", "Approved by:"];

export default function Before() {
  return (
    <section className="border-t-[1.5px] border-lp-ink py-20 lg:py-28">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-10">
        <div className="grid items-end gap-6 lg:grid-cols-[1.3fr_1fr] lg:gap-10">
          <h2 className="font-news text-[clamp(38px,5.2vw,72px)] font-medium leading-none tracking-[-0.025em]">
            Be honest. Does HR at your place <i className="font-medium">look like this?</i>
          </h2>
          <p className="-rotate-2 font-hand text-[28px] font-semibold leading-tight text-lp-plum">
            no judgement. we’ve all been there.
          </p>
        </div>

        <div data-pile className="mt-14 flex flex-col sm:grid sm:grid-cols-2 sm:items-start sm:gap-7 lg:mt-16 lg:grid-cols-4">
          <div className={`${paper} relative w-[88%] self-start -rotate-2 p-5 sm:w-auto sm:self-auto`}>
            <div aria-hidden="true" className="lp-sheet h-[52px] w-11 rounded border-[1.5px] border-[#2f7a4a]" />
            <p className="mt-4 break-all font-plex text-[13px] font-medium">
              payroll_FINAL_v7_
              <br />
              ACTUAL_final.xlsx
            </p>
            <p className="mt-2 text-[13px] text-lp-muted">Last edited Sunday, 11:48 pm</p>
          </div>

          <div className={`${paper} relative -mt-4 w-[88%] self-end rotate-[1.5deg] p-4 sm:mt-0 sm:w-auto sm:self-auto lg:mt-[30px]`}>
            <div className="flex items-center justify-between border-b border-lp-soft pb-2.5 text-[13px] font-semibold">
              HR &amp; Admin
              <span className="rounded-full bg-[#2f7a4a] px-2 py-px text-[11px] text-white">63 unread</span>
            </div>
            {CHAT.map(([name, message]) => (
              <p
                key={name}
                className="mt-2.5 rounded-[4px_12px_12px_12px] bg-[#eef3ea] px-2.5 py-2 text-[13px] leading-snug"
              >
                <b className="block text-[11px] text-lp-plum-2">{name}</b>
                {message}
              </p>
            ))}
          </div>

          <div className={`${paper} relative -mt-4 w-[88%] self-start -rotate-1 overflow-hidden p-5 sm:mt-0 sm:w-auto sm:self-auto lg:mt-2`}>
            <p className="font-plex text-[11px] font-semibold leading-normal tracking-[0.12em]">
              LEAVE APPLICATION FORM
              <br />
              (PHOTOCOPY OF A PHOTOCOPY)
            </p>
            {FORM_FIELDS.map((field) => (
              <p key={field} className="flex h-[26px] items-end border-b border-[#9b8f80] text-xs text-lp-muted">
                {field}
              </p>
            ))}
            <span
              aria-hidden="true"
              className="absolute -bottom-3.5 -right-[18px] size-24 rounded-full border-[7px] border-[rgba(120,75,35,0.14)]"
            />
          </div>

          <p className="relative -mt-4 w-[78%] self-end rotate-3 bg-lp-lilac p-5 font-hand text-2xl font-semibold leading-[1.15] shadow-[0_18px_26px_-18px_rgba(70,45,20,0.6)] sm:mt-0 sm:w-auto sm:self-auto lg:mt-[46px]">
            ask Finance about loan deductions. AGAIN.
          </p>
        </div>

        <p className="mt-20 max-w-[900px] font-news text-[clamp(30px,3.6vw,50px)] leading-[1.15] tracking-[-0.015em] lg:mt-24">
          dashhr puts all of it in{" "}
          <span className="relative whitespace-nowrap italic">
            one place
            <svg
              aria-hidden="true"
              viewBox="0 0 300 20"
              preserveAspectRatio="none"
              fill="none"
              className="absolute -bottom-[0.24em] -left-[2%] h-[0.4em] w-[104%] overflow-visible"
            >
              <path
                d="M3 13 C 60 5, 130 3, 190 9 S 272 16, 297 6"
                stroke="var(--color-lp-plum-2)"
                strokeWidth="3.5"
                strokeLinecap="round"
                vectorEffect="non-scaling-stroke"
              />
            </svg>
          </span>
          .
        </p>

        <div className="mt-6 flex items-center gap-3">
          <svg
            aria-hidden="true"
            width="40"
            height="56"
            viewBox="0 0 40 56"
            fill="none"
            stroke="var(--color-lp-plum)"
            strokeWidth="2.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M8 4 C 30 14, 30 34, 18 50" />
            <path d="M10 40 L 18 51 L 28 43" />
          </svg>
          <a
            href="#week"
            className="inline-block -rotate-2 font-hand text-[26px] font-semibold text-lp-plum underline-offset-4 hover:underline"
          >
            here's what a week looks like
          </a>
        </div>
      </div>
    </section>
  );
}
