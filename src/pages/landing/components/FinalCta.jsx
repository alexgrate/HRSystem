import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SETUP_STEPS } from "../data/content";
import { btnLilac } from "../styles";

function Leader({ children, end }) {
  return (
    <li className="flex items-end gap-1.5 py-[5px]">
      {children}
      <span aria-hidden="true" className="mb-1 min-w-3 flex-1 border-b-2 border-dotted border-[#9b8f80]" />
      {end}
    </li>
  );
}

export default function FinalCta() {
  return (
    <section className="overflow-hidden bg-lp-deep py-[88px] text-white md:pb-[120px] md:pt-28">
      <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-4 sm:px-10 lg:grid-cols-[1.25fr_0.75fr]">
        <div>
          <h2 className="font-news text-[clamp(56px,8.4vw,132px)] font-medium leading-[0.92] tracking-[-0.035em]">
            Close the <i className="font-medium text-lp-lilac">spreadsheet.</i>
          </h2>
          <p className="mt-[26px] inline-block -rotate-2 font-hand text-[28px] font-semibold leading-[1.1] text-lp-lilac">
            (you can keep it open for old times’ sake)
          </p>
          <div className="mt-[34px] flex flex-wrap items-center gap-[22px]">
            <Link to="/signup" className={`${btnLilac} h-12 w-full px-[22px] text-[15px] sm:w-auto`}>
              Start your workspace
              <ArrowRight size={18} aria-hidden="true" />
            </Link>
            <Link
              to="/login"
              className="mx-auto font-semibold text-white underline decoration-[1.5px] underline-offset-4 hover:text-lp-lilac sm:mx-0"
            >
              Log in
            </Link>
          </div>
        </div>

        <div data-receipt className="lp-receipt relative mx-auto w-full max-w-[380px] rotate-3 bg-lp-white px-[26px] pb-[30px] pt-7 font-plex text-[13px] text-lp-ink">
          <p className="text-center leading-normal">
            <b className="text-[15px] tracking-[0.2em]">DASHHR.APP</b>
            <br />
            GETTING STARTED
          </p>
          <hr className="my-3.5 border-t-[1.5px] border-dashed border-lp-ink" />
          <ul>
            {SETUP_STEPS.map((step) => (
              <Leader key={step} end="✓">
                {step}
              </Leader>
            ))}
          </ul>
          <hr className="my-3.5 border-t-[1.5px] border-dashed border-lp-ink" />
          <ul>
            <Leader end={<b>✓</b>}>
              <b>READY FOR PAYROLL</b>
            </Leader>
          </ul>
          <p className="mt-4 text-center">SEE YOU AT MONTH-END</p>
        </div>
      </div>
    </section>
  );
}
