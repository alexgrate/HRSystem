import { Link } from "react-router-dom";
import { ArrowRight } from "lucide-react";
import { SECTIONS, guideBySlug, guidesInSection } from "../data/guides";

const START = [
  { role: "admin", who: "If you run HR", slug: "set-up-your-workspace", color: "bg-lp-lilac" },
  { role: "approver", who: "If you approve requests", slug: "approve-or-reject-a-request", color: "bg-lp-sun" },
  { role: "employee", who: "If you're an employee", slug: "your-self-service-portal", color: "bg-lp-mint" },
];

export default function DocsHome({ role }) {
  const starts = role === "all" ? START : START.filter((s) => s.role === role);

  return (
    <div className="min-w-0">
      <h2 className="font-news text-[clamp(34px,4.4vw,56px)] font-medium leading-none tracking-[-0.025em]">Start here</h2>
      <ul className={`mt-7 grid gap-5 ${starts.length > 1 ? "md:grid-cols-3" : "max-w-md"}`}>
        {starts.map((s, i) => {
          const g = guideBySlug(s.slug);
          return (
            <li key={s.slug}>
              <Link
                to={`/docs/${g.slug}`}
                className={`flex h-full flex-col border-[1.5px] border-lp-ink ${s.color} p-5 shadow-[3px_3px_0_var(--color-lp-ink)] transition-[translate,box-shadow] hover:translate-x-0.5 hover:translate-y-0.5 hover:shadow-[1px_1px_0_var(--color-lp-ink)] ${
                  i % 2 ? "rotate-[0.6deg]" : "-rotate-[0.6deg]"
                }`}
              >
                <span className="font-hand text-[22px] font-semibold text-lp-plum">{s.who}</span>
                <span className="mt-1 font-news text-[26px] leading-tight">{g.title}</span>
                <span className="mt-auto flex items-center gap-1.5 pt-4 text-sm font-semibold">
                  Read the guide <ArrowRight size={16} aria-hidden="true" />
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <h2 className="mt-14 font-news text-[32px] font-medium tracking-[-0.015em]">Every guide</h2>
      <div className="mt-5 grid gap-x-10 gap-y-7 sm:grid-cols-2">
        {SECTIONS.map((section, i) => (
          <section key={section.id} aria-labelledby={`sec-${section.id}`}>
            <h3 id={`sec-${section.id}`} className="flex items-baseline gap-2.5 border-b-[1.5px] border-lp-ink pb-2">
              <span className="font-plex text-xs text-lp-plum">{String(i + 1).padStart(2, "0")}</span>
              <span className="font-semibold">{section.title}</span>
            </h3>
            <ul className="mt-2.5 space-y-1.5">
              {guidesInSection(section.id).map((g) => (
                <li key={g.slug} className={role === "all" || g.roles.includes(role) ? "" : "opacity-40"}>
                  <Link to={`/docs/${g.slug}`} className="underline-offset-4 hover:text-lp-plum hover:underline">
                    {g.title}
                  </Link>
                </li>
              ))}
            </ul>
          </section>
        ))}
      </div>
    </div>
  );
}
