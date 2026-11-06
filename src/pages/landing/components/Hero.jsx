import { Link } from "react-router-dom"
import { ArrowRight } from "lucide-react"
import { btnPlum, textLink } from "../styles"
import Folder from "./Folder"


export default function Hero() {
    return (
        <section id="top" className="pb-20 pt-12 lg:pb-24 lg:pt-16">
            <div className="mx-auto grid max-w-[1280px] items-center gap-14 px-4 sm:px-10 lg:grid-cols-[1fr_1.05fr]">
                <div>
                    <p className="mb-4 inline-block -rotate-2 font-hand text-[27px] font-semibold leading-none text-lp-plum">
                        for the HR person doing five jobs ↓
                    </p>

                    <h1 className="font-news text-[clamp(54px,7.6vw,112px)] font-medium leading-[0.92] tracking-[-0.035em]">
                        The paper chase{" "}
                        <span className="relative mx-[0.15em] inline-block italic">
                            stops
                            <svg
                                aria-hidden="true"
                                viewBox="0 0 200 100"
                                preserveAspectRatio="none"
                                fill="none"
                                className="pointer-events-none absolute -left-[14%] -top-[12%] h-[132%] w-[128%] overflow-visible"
                            >
                                <path
                                d="M112 9 C 162 7, 196 28, 193 52 C 190 82, 128 95, 76 91 C 26 87, 5 64, 9 42 C 13 19, 58 5, 126 12"
                                stroke="var(--color-lp-plum-2)"
                                strokeWidth="3"
                                strokeLinecap="round"
                                vectorEffect="non-scaling-stroke"
                                />
                            </svg>
                        </span>{" "}
                        here.
                    </h1>

                    <p className="mt-7 max-w-[500px] text-[17px] leading-relaxed text-lp-muted lg:text-[19px]">
                        <strong className="font-semibold text-lp-ink">
                            dashhr is HR software for growing African businesses.
                        </strong>{" "}
                        Payroll with PAYE worked out under the Nigeria Tax Act 2025, plus leave, loans, appraisals and approvals, in one workspace your whole team can use.
                    </p>

                    <div className="mt-8 flex flex-col gap-5 sm:flex-row sm:items-center">
                        <Link to="/signup" className={`${btnPlum} h-12 px-6 text-[15px]`}>
                            Start your workspace
                            <ArrowRight size={18} aria-hidden="true" />
                        </Link>
                        <Link to="/login" className={`${textLink} text-center sm:text-left`}>
                            or log in
                        </Link>
                    </div>
                </div>

                <Folder />
            </div>
        </section>
    )
}