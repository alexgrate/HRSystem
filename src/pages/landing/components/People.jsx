import { POLAROIDS } from "../data/content"
import { tape } from "../styles"

export default function People() {
    return (
        <section className="overflow-hidden border-y-[1.5px] border-lp-ink bg-lp-lilac py-[72px] md:pb-28 md:pt-26">
            <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-4 sm:px-10 lg:grid-cols-[1fr_1.1fr]">
                <div>
                    <h2 className="font-news text-[clamp(38px,5.2vw,72px)] font-medium leading-none tracking-[-0.025em]">
                        Your people are <i className="font-medium">the whole point.</i>
                    </h2>
                    <p className="mt-6 max-w-[470px] text-[19px] leading-relaxed text-[#2a1f2e]">
                        Software can't make a team great. What it can do is take the paperwork off your desk, so there's more of you left for the people.
                    </p>
                </div>

                <div data-wall className="flex justify-center py-4 sm:py-6">
                    {POLAROIDS.map((photo) => (
                        <figure key={photo.caption} className={`relative w-[34%] bg-lp-white p-2 pb-2.5 shadow-[0_20px_30px_-20px_rgba(42,13,53,0.6)] transition-[rotate,scale] duration-300 hover:z-[3] hover:scale-105 hover:rotate-0 motion-reduce:transition-none sm:p-3 sm:pb-3.5 ${photo.tilt}`}>
                            <span aria-hidden="true" className={tape} />
                            {photo.src ? (
                                <img src={photo.src} alt="" className="aspect-square w-full object-cover" />
                            ) : (
                                <div className="lp-photo grid aspect-square place-items-center font-plex text-[11px] tracking-[0.12em] text-lp-muted">
                                    PHOTO
                                </div>
                            )}
                            <figcaption className="mt-2.5 font-hand text-[17px] font-semibold leading-[1.05] sm:text-[22px]">
                                {photo.caption}
                            </figcaption>
                        </figure>
                    ))}
                </div>
            </div>
        </section>
    )
}