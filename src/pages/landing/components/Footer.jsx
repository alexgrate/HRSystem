import { Link } from "react-router-dom"
import { NAV_LINKS } from "../data/content"

export default function Footer() {
    const year = new Date().getFullYear();

    return (
        <footer className="pb-9 pt-11">
            <div className="mx-auto max-w-[1280px] px-4 sm:px-10">
                <div className="flex flex-wrap items-center justify-between gap-6">
                    <a href="#top" aria-label="dashhr, back to top" className="font-news text-[30px] font-semibold tracking-tight italic text-lp-ink">dash<span className="not-italic text-lp-plum">hr</span></a>

                    <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
                        {NAV_LINKS.map((link) => (
                            <a key={link.href} href={link.href} className="py-1 text-[15px] underline-offset-4 hover:underline">
                                {link.label}
                            </a>
                        ))}
                        <Link to="/docs" className="py-1 text-[15px] underline-offset-4 hover:underline">
                        Handbook</Link>
                        <Link to="/login" className="py-1 text-[15px] underline-offset-4 hover:underline">
                        Log in</Link>
                    </nav>
                </div>

                <p className="mt-8 inline-block -rotate-1 font-hand text-2xl font-semibold text-lp-plum">
                    thanks for scrolling all the way down :)
                </p>

                <div className="mt-7 flex flex-wrap justify-between gap-4 border-t-[1.5px] border-lp-ink pt-5 font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">
                    <span>dashhr.app · Powered by Dash Microfinance Bank Ltd</span>
                    <span className="flex flex-wrap gap-x-5 gap-y-1">
                        <Link to="/terms" className="py-1 hover:text-lp-ink hover:underline underline-offset-4">Terms</Link>
                        <Link to="/privacy" className="py-1 hover:text-lp-ink hover:underline underline-offset-4">Privacy</Link>
                        <span className="py-1">© {year}</span>
                    </span>
                </div>
            </div>
        </footer>
    )
}