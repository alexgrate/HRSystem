import { useEffect, useState } from "react";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { QUESTIONS } from "../data/content";
import { AdvanceAnswer, LeaveAnswer, PayslipAnswer, ProfileAnswer } from "./AnswerCards";

const ANSWERS = [PayslipAnswer, LeaveAnswer, AdvanceAnswer, ProfileAnswer];
const ROTATE_MS = 6000;

export default function Questions() {
  const [active, setActive] = useState(0);
  const [auto, setAuto] = useState(true);
  const reduce = useReducedMotion();
  const playing = auto && !reduce;

  useEffect(() => {
    if (!playing) return;
    const id = setTimeout(() => setActive((a) => (a + 1) % QUESTIONS.length), ROTATE_MS);
    return () => clearTimeout(id);
  }, [active, playing]);

  const pick = (i) => {
    setActive(i);
    setAuto(false);
  };

  const Answer = ANSWERS[active];

  return (
    <section id="team" className="py-[72px] md:py-28">
      <div className="mx-auto grid max-w-[1280px] items-start gap-14 px-4 sm:px-10 lg:grid-cols-[1fr_1.05fr] lg:gap-16">
        <div>
          <h2 className="font-news text-[clamp(38px,5.2vw,72px)] font-medium leading-none tracking-[-0.025em]">
            The questions HR hears <i className="font-medium">every single week.</i>
          </h2>

          <ul className="mt-11 flex flex-col gap-[18px]">
            {QUESTIONS.map((q, i) => {
              const on = i === active;
              return (
                <li key={q.name}>
                  <button
                    type="button"
                    onClick={() => pick(i)}
                    aria-pressed={on}
                    className={`lp-torn relative grid w-full grid-cols-[44px_1fr] items-start gap-3.5 px-[18px] pb-[26px] pt-[18px] text-left transition-colors duration-200 focus-visible:outline-2 focus-visible:-outline-offset-4 focus-visible:outline-lp-plum ${
                      on ? "bg-lp-lilac" : "bg-lp-white hover:bg-white"
                    } ${i % 2 ? "rotate-[0.7deg] sm:ml-[18px] sm:w-[calc(100%-18px)]" : "-rotate-[0.8deg]"}`}
                  >
                    <span className="grid size-11 place-items-center rounded-full border-[1.5px] border-lp-ink bg-lp-paper text-sm font-semibold">
                      {q.initials}
                    </span>
                    <span>
                      <span className={`block text-[13px] ${on ? "text-[#3b2346]" : "text-lp-muted"}`}>
                        {q.name} · {q.time}
                      </span>
                      <span className="mt-0.5 block font-hand text-[23px] font-semibold leading-[1.1] sm:text-[27px]">
                        {q.question}
                      </span>
                    </span>

                    {on && playing && (
                      <span key={active} aria-hidden="true" className="lp-grow absolute inset-x-0 top-0 h-[3px] bg-lp-plum" />
                    )}
                  </button>
                </li>
              );
            })}
          </ul>
        </div>

        <div>
          <p className="mb-4 ml-2 inline-block -rotate-2 font-hand text-[24px] font-semibold text-lp-plum sm:text-[28px]">
            now they check dashhr themselves{"\u00A0"}
            <span className="lg:hidden">↓</span>
            <span className="hidden lg:inline">→</span>
          </p>

          <AnimatePresence mode="wait" initial={false}>
            <motion.div
              key={active}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -6 }}
              transition={{ duration: 0.25 }}
            >
              <Answer />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}
