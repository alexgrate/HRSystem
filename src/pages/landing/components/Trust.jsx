import { TRUST } from "../data/content"

export default function Trust() {
    return (
        <section id="trust" className="py-[72px] md:py-28">
            <div className="mx-auto grid max-w-[1280px] items-start gap-12 px-4 sm:px-10 lg:grid-cols-[0.8fr_1.2fr] lg:gap-16">
                <div className="lg:sticky lg:top-28">
                    <h2 className="font-news text-[clamp(38px,5.2vw,72px)] font-medium leading-none tracking-[-0.025em]">
                        The boring, <i className="font-medium">important</i> part.
                    </h2>
                    <p className="mt-5 inline-block -rotate-2 font-hand text-[26px] font-semibold text-lp-plum">
                        (the bit your IT person will ask about)
                    </p>
                </div>

                <dl className="border-b-[1.5px] border-lp-ink">
                    {TRUST.map((row, i) => (
                        <div
                            key={row.label}
                            className="grid gap-1.5 border-t-[1.5px] border-lp-ink py-[22px] sm:grid-cols-[210px_1fr] sm:gap-6"
                        >
                            <dt className="flex gap-3 font-plex text-xs uppercase tracking-[0.12em] text-lp-muted sm:pt-1">
                                <span className="text-lp-plum">0{i + 1}</span>
                                {row.label}
                            </dt>
                            <dd className="text-[17px] leading-relaxed">{row.text}</dd>
                        </div>
                    ))}
                </dl>

            </div>
        </section>
    )
}