import { BINDER } from "../data/content"

export default function Binder() {
    return (
        <section id="inside" className="border-y-[1.5px] border-lp-ink bg-lp-paper-2 py-[72px] md:pb-28 md:pt-26">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-10">
                <div className="flex flex-wrap items-end justify-between gap-6">
                    <h2 className="font-news text-[clamp(38px,5.2vw,72px)] font-medium leading-none tracking-[-0.025em]">
                        Everything that used to live
                        <br />
                        <i className="font-medium">in the filing cabinet.</i>
                    </h2>
                    <p className="-rotate-2 font-hand text-[27px] font-semibold text-lp-plum">
                        (minus the filing cabinet)
                    </p>
                </div>

                <ul data-binder className="mt-[84px] max-w-[1060px]">
                    {BINDER.map((item, i) => (
                        <li key={item.tab} className={`relative mt-[22px] rounded-[3px_10px_4px_4px] border-[1.5px] border-lp-ink ${item.color} px-[18px] pb-6 pt-[22px] shadow-[0_-10px_18px_-14px_rgba(31,26,23,0.45)] transition-[translate] duration-300 first:mt-0 motion-reduce:transition-none sm:px-8 sm:pb-[30px] sm:pt-7 md:grid md:grid-cols-[0.9fr_1.3fr] md:items-baseline md:gap-8 md:hover:translate-x-3.5`}>
                            <span aria-hidden="true" className={`absolute -top-[35px] ${item.x} flex h-[34px] items-center whitespace-nowrap rounded-t-lg border-[1.5px] border-b-0 border-lp-ink ${item.color} px-2.5 font-plex text-[10.5px] font-semibold tracking-[0.1em] sm:px-4 sm:text-xs`}>
                                0{i + 1}
                                <span className="hidden sm:inline">&nbsp;· {item.tab}</span>
                            </span>
                            <h3 className="font-news text-[clamp(26px,2.8vw,36px)] font-medium leading-[1.05] tracking-[-0.015em]">
                                {item.title}
                            </h3>
                            <p className="mt-2.5 leading-relaxed md:mt-0">{item.body}</p>
                        </li>
                    ))}
                </ul>
            </div>
        </section>
    )
}