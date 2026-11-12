import { useEffect, useMemo, useRef, useState } from "react";
import { Link, useNavigate } from "react-router-dom";
import { Search } from "lucide-react";
import { GUIDES, sectionById } from "../data/guides";

const textOf = (g) =>
  [
    g.title,
    g.summary,
    ...(g.before || []),
    ...(g.steps || []).flatMap((s) => [s.title, s.body, s.tip, ...(s.actions || []), ...(s.where || [])]),
    ...(g.glossary || []).flatMap((x) => [x.term, x.text]),
    ...(g.notes || []),
  ]
    .filter(Boolean)
    .join(" ")
    .replace(/\*\*/g, "")
    .toLowerCase();

const INDEX = GUIDES.map((g) => ({ guide: g, title: g.title.toLowerCase(), text: textOf(g) }));

function search(query) {
  const words = query.toLowerCase().split(/\s+/).filter(Boolean);
  if (!words.length) return [];
  return INDEX.filter((entry) => words.every((w) => entry.text.includes(w)))
    .map((entry) => ({ ...entry, score: words.filter((w) => entry.title.includes(w)).length }))
    .sort((a, b) => b.score - a.score)
    .slice(0, 6)
    .map((entry) => entry.guide);
}

export default function DocsSearch() {
  const [query, setQuery] = useState("");
  const inputRef = useRef(null);
  const navigate = useNavigate();
  const results = useMemo(() => search(query), [query]);

  useEffect(() => {
    const onKey = (e) => {
      const tag = document.activeElement?.tagName;
      if (e.key === "/" && tag !== "INPUT" && tag !== "TEXTAREA") {
        e.preventDefault();
        inputRef.current?.focus();
      }
    };
    document.addEventListener("keydown", onKey);
    return () => document.removeEventListener("keydown", onKey);
  }, []);

  const go = (slug) => {
    setQuery("");
    navigate(`/docs/${slug}`);
  };

  return (
    <div className="relative max-w-[620px]">
      <form
        role="search"
        onSubmit={(e) => {
          e.preventDefault();
          if (results[0]) go(results[0].slug);
        }}
        className="flex h-[54px] items-center gap-3 rounded-md border-[1.5px] border-lp-ink bg-lp-white px-4 text-lp-ink shadow-[4px_4px_0_var(--color-lp-lilac)] focus-within:shadow-[4px_4px_0_var(--color-lp-sun)]"
      >
        <Search size={20} aria-hidden="true" />
        <label htmlFor="docs-search" className="sr-only">
          Search the handbook
        </label>
        <input
          ref={inputRef}
          id="docs-search"
          type="search"
          autoComplete="off"
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          onKeyDown={(e) => e.key === "Escape" && setQuery("")}
          placeholder="Search: payslips, leave balance, SSO…"
          className="h-full min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-lp-muted"
        />
        <kbd className="hidden rounded border-[1.5px] border-lp-soft px-1.5 font-plex text-[11px] text-lp-muted sm:block">/</kbd>
      </form>

      {query.trim() && (
        <div className="absolute inset-x-0 top-[62px] z-20 rounded-md border-[1.5px] border-lp-ink bg-lp-white text-lp-ink shadow-[0_24px_40px_-24px_rgba(31,26,23,0.6)]">
          <p aria-live="polite" className="border-b border-dotted border-[#b9ad9c] px-4 py-2.5 font-plex text-[11px] uppercase tracking-[0.12em] text-lp-muted">
            {results.length ? `${results.length} guide${results.length === 1 ? "" : "s"}` : "Nothing found. Try another word."}
          </p>
          <ul>
            {results.map((g) => (
              <li key={g.slug}>
                <Link
                  to={`/docs/${g.slug}`}
                  onClick={() => setQuery("")}
                  className="block px-4 py-3 hover:bg-lp-paper focus-visible:bg-lp-paper focus-visible:outline-none"
                >
                  <span className="block font-semibold">{g.title}</span>
                  <span className="font-plex text-[11px] uppercase tracking-[0.1em] text-lp-muted">{sectionById(g.section).title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
