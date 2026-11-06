import { paper, tape } from "../styles"
import { DIARY } from "../data/content"

const TONE ={
    ok: "font-bold text-[#2f7a4a]",
    wait: "font-semibold text-lp-plum-2",
}

function Star() {
    return (
        <svg aria-hidden="true" width="36" height="36" viewBox="0 0 40 40" fill="none" stroke="var(--color-lp-plum-2)" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
            <path d="M20 4 L24 15 L36 15 L26 22 L30 34 L20 27 L10 34 L14 22 L4 15 L16 15 Z" />
        </svg>
    )
}

function Sun() {
    return (
        <svg aria-hidden="true" width="90" height="60" viewBox="0 0 90 60" fill="none" stroke="var(--color-lp-plum-2)" strokeWidth="2.2" strokeLinecap="round" className="mx-auto">
            <circle cx="45" cy="36" r="12" />
            <path d="M45 12v-8M45 60v-4M21 36h-8M77 36h-8M28 19l-6-6M62 19l6-6" />
        </svg>
    );
}

function Snippet({ snippet, tilt }) {
    return (
        <div data-snip className={`${paper} relative max-w-[420px] p-[18px] ${tilt}`}>
            <span aria-hidden="true" className={tape} />

            <div className="flex flex-wrap items-baseline justify-between gap-2.5">
                <span className="text-[15px] font-semibold">{snippet.title}</span>
                <span className="font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">{snippet.tag}</span>
            </div>

            {snippet.rows.map((row) => (
                <div key={row.label} className="flex justify-between gap-2.5 border-b border-dotted border-[#b9ad9c] py-1.5 text-[13.5px] last:border-b-0">
                    <span className="text-lp-muted">{row.label}</span>
                    <span className={`text-right ${TONE[row.tone] ?? ""}`}>{row.value}</span>
                </div>
            ))}

            {snippet.steps && (
                <div className="mt-3 flex flex-wrap gap-1.5">
                    {snippet.steps.map(([label, done]) => (
                        <span key={label} className={`rounded-[3px] border-[1.5px] border-lp-ink px-2 py-1 font-plex text-[11px] ${done ? "bg-lp-lilac" : "border-dashed text-lp-muted"}`}>
                            {label}
                            {done && " ✓"}
                        </span>
                    ))}
                </div>
            )}
        </div>
    )
}

function Entry({ entry, index}) {
    return (
        <article className="mb-11">
            <h3 className="flex items-center gap-2 font-hand text-[34px] font-bold leading-[32px]">
                {entry.day}
                {entry.star && <Star />}
            </h3>
            <p className="mb-[18px] font-hand text-[21px] font-medium leading-[32px] text-[#24324a] sm:text-[23px]">
                {entry.note}
            </p>
            <Snippet snippet={entry.snippet} tilt={index % 2 ? "rotate-[0.8deg]" : "-rotate-[0.6deg]"} />
        </article>
    )
}

const pageBase =
  "lp-ruled relative min-w-0 pb-12 pl-[58px] pr-4 pt-14 [--margin:44px] sm:pl-24 sm:pr-10 sm:[--margin:70px]";

export default function Diary() {

    const leftPage = DIARY.slice(0, 3);
    const rightPage = DIARY.slice(3);

    return (
        <section id="week" className="scroll-mt-[68px] pb-24 pt-6 lg:pb-28">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-10">
                <div className="mb-12 flex flex-wrap items-end justify-between gap-6">
                    <h2 className="font-news text-[clamp(38px,5.2vw,72px)] font-medium leading-none tracking-[-0.025em]">
                        A week with <i className="font-medium">dashhr.</i>
                    </h2>
                    <p className="font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">
                        From the notebook of an HR manager
                    </p>
                </div>

                <div className="relative grid border-[1.5px] border-lp-ink/25 shadow-[0_40px_60px_-40px_rgba(70,45,20,0.6)] lg:grid-cols-2">
                    <span aria-hidden="true" className="lp-coil absolute inset-x-6 -top-3 z-[2] h-6 lg:inset-x-auto lg:bottom-[18px] lg:left-1/2 lg:top-[18px] lg:h-auto lg:w-7 lg:-translate-x-1/2"  />

                    <div className={`${pageBase} lg:shadow-[inset_-30px_0_30px_-30px_rgba(31,26,23,0.35)]`}>
                        {leftPage.map((entry, i) => (
                            <Entry key={entry.day} entry={entry} index={i} />
                        ))}
                    </div>

                    <div className={`${pageBase} border-t-[1.5px] border-dashed border-lp-ink/30 lg:border-t-0 lg:shadow-[inset_30px_0_30px_-30px_rgba(31,26,23,0.35)]`}>
                        {rightPage.map((entry, i) => (
                            <Entry key={entry.day} entry={entry} index={i + 3} />
                        ))}
                        <div className="mt-4 text-center">
                            <p className="-rotate-4 font-hand text-[44px] font-bold text-lp-plum">weekend!!</p>
                            <Sun />
                        </div>
                    </div>
                </div>
            </div>
        </section>
    )
}