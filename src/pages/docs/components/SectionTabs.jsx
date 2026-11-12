import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { SECTIONS, guidesInSection } from "../data/guides";

const forRole = (guide, role) => role === "all" || guide.roles.includes(role);

export default function SectionTabs({ current, role }) {
  const activeSection = current?.section;
  const listRef = useRef(null);

  useEffect(() => {
    const list = listRef.current;
    const active = list?.querySelector('a[aria-current="true"]');
    if (!list || !active || list.scrollWidth <= list.clientWidth) return;
    list.scrollLeft = active.offsetLeft - list.clientWidth / 2 + active.offsetWidth / 2;
  }, [activeSection]);

  return (
    <nav aria-label="Handbook sections" className="min-w-0 lg:sticky lg:top-[92px]">
      <ol ref={listRef} className="relative -mx-4 flex gap-2 overflow-x-auto px-4 pb-3 [scrollbar-width:none] sm:-mx-10 sm:px-10 lg:mx-0 lg:flex-col lg:gap-0 lg:overflow-visible lg:p-0">
        {SECTIONS.map((section, i) => {
          const guides = guidesInSection(section.id);
          const matches = guides.some((g) => forRole(g, role));
          const isActive = section.id === activeSection;
          const first = guides.find((g) => forRole(g, role)) || guides[0];

          return (
            <li key={section.id} className={`flex-none lg:-mt-1.5 lg:first:mt-0 ${matches ? "" : "opacity-40"}`}>
              <Link
                to={`/docs/${first.slug}`}
                aria-current={isActive ? "true" : undefined}
                className={`relative flex items-center justify-between gap-3 whitespace-nowrap rounded-[3px_10px_4px_4px] border-[1.5px] border-lp-ink ${section.color} px-4 pb-3.5 pt-3 text-[15px] transition-[translate] duration-200 lg:hover:translate-x-2 ${
                  isActive ? "font-semibold shadow-[3px_3px_0_var(--color-lp-ink)] lg:translate-x-3.5 lg:shadow-[-4px_4px_0_var(--color-lp-ink)]" : ""
                }`}
              >
                {section.title}
                <span className="font-plex text-[11px] tracking-[0.08em]">{String(i + 1).padStart(2, "0")}</span>
              </Link>

              {isActive && guides.length > 1 && (
                <ul className="hidden border-x-[1.5px] border-lp-ink bg-lp-white py-2 lg:ml-3.5 lg:block">
                  {guides.map((g) => (
                    <li key={g.slug}>
                      <Link
                        to={`/docs/${g.slug}`}
                        aria-current={g.slug === current.slug ? "page" : undefined}
                        className={`block px-4 py-1.5 text-sm leading-snug hover:text-lp-plum ${
                          g.slug === current.slug ? "font-semibold text-lp-plum" : ""
                        } ${forRole(g, role) ? "" : "opacity-50"}`}
                      >
                        {g.title}
                      </Link>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ol>
    </nav>
  );
}
