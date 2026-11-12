import { useEffect, useMemo, useRef, useState } from "react";
import { Link } from "react-router-dom";
import "../site/fonts";
import "../landing/landing.css";
import SiteHeader from "../site/SiteHeader";
import SiteFooter from "../site/SiteFooter";
import { paper } from "../landing/styles";
import { LEGAL_STATUS } from "./data/legal";
import usePageMeta from "../site/usePageMeta";

const num = (i) => String(i + 1).padStart(2, "0");

function Rich({ parts }) {
  return parts.map((part, i) => {
    if (typeof part === "string") return part;
    if (part.todo)
      return (
        <mark key={i} className="bg-[linear-gradient(transparent_12%,rgb(242_193_78/0.6)_12%_88%,transparent_88%)] px-1 font-plex text-[0.86em] text-lp-ink">
          <span className="sr-only">To be confirmed: </span>
          {part.todo}
        </mark>
      );
    if (part.to)
      return (
        <Link key={i} to={part.to} className="font-semibold text-lp-plum underline decoration-[1.5px] underline-offset-4">
          {part.label}
        </Link>
      );
    if (part.b) return <b key={i}>{part.b}</b>;
    return null;
  });
}

function Block({ block }) {
  if (Array.isArray(block)) {
    return (
      <p className="mb-3 max-w-[62ch] leading-relaxed">
        <Rich parts={block} />
      </p>
    );
  }
  if (block.list) {
    return (
      <ul className="mb-3 max-w-[62ch] list-disc space-y-2 pl-5 leading-relaxed">
        {block.list.map((item, i) => (
          <li key={i}>
            <Rich parts={item} />
          </li>
        ))}
      </ul>
    );
  }
  if (block.table) {
    return (
      <table className="mb-2 w-full text-[14.5px]">
        <thead className="max-sm:sr-only">
          <tr>
            {block.table.head.map((h) => (
              <th key={h} scope="col" className="border-b-[1.5px] border-lp-ink py-2.5 pr-3 text-left font-plex text-[11px] font-medium uppercase tracking-[0.12em] text-lp-muted">
                {h}
              </th>
            ))}
          </tr>
        </thead>
        <tbody>
          {block.table.rows.map(([what, example, why]) => (
            <tr key={what} className="border-b border-dotted border-[#b9ad9c] max-sm:block max-sm:py-3">
              <th scope="row" className="py-3 pr-3 text-left align-top font-semibold max-sm:block max-sm:p-0 sm:whitespace-nowrap">{what}</th>
              <td className="py-3 pr-3 align-top leading-snug max-sm:block max-sm:p-0">{example}</td>
              <td className="py-3 align-top leading-snug text-lp-muted max-sm:block max-sm:p-0">{why}</td>
            </tr>
          ))}
        </tbody>
      </table>
    );
  }
  return null;
}

function useActiveSection(ids) {
  const [active, setActive] = useState(ids[0]);

  useEffect(() => {
    let frame = 0;
    const update = () => {
      frame = 0;
      const atBottom = window.innerHeight + window.scrollY >= document.documentElement.scrollHeight - 4;
      if (atBottom) {
        setActive(ids[ids.length - 1]);
        return;
      }
      const line = window.innerHeight * 0.3;
      let current = ids[0];
      for (const id of ids) {
        const el = document.getElementById(id);
        if (el && el.getBoundingClientRect().top <= line) current = id;
      }
      setActive(current);
    };
    const onScroll = () => {
      if (!frame) frame = requestAnimationFrame(update);
    };
    update();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      cancelAnimationFrame(frame);
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, [ids]);

  return active;
}

export default function LegalPage({ doc }) {
  const ids = useMemo(() => [...(doc.short ? ["short-version"] : []), ...doc.clauses.map((c) => c.id)], [doc]);
  const active = useActiveSection(ids);
  const stripRef = useRef(null);

  usePageMeta({ title: `${doc.docName} · DashHR`, description: doc.description, path: doc.path });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [doc]);

  useEffect(() => {
    const strip = stripRef.current;
    const link = strip?.querySelector('a[aria-current="true"]');
    if (!strip || !link || strip.scrollWidth <= strip.clientWidth) return;
    strip.scrollLeft = link.offsetLeft - strip.clientWidth / 2 + link.offsetWidth / 2;
  }, [active]);

  const index = [
    ...(doc.short ? [{ id: "short-version", n: "00", title: "The short version" }] : []),
    ...doc.clauses.map((c, i) => ({ id: c.id, n: num(i), title: c.title })),
  ];

  return (
    <div className="min-h-screen overflow-x-clip bg-lp-paper font-grotesk text-lp-ink antialiased">
      <SiteHeader />

      <div className="mx-auto max-w-[1280px] px-4 sm:px-10">
        <header className="grid items-end gap-6 pb-7 pt-11 md:grid-cols-[1fr_auto] md:gap-8 md:pb-10 md:pt-16">
          <div>
            <p className="font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">dashhr.app{doc.path}</p>
            <h1 className="mt-3.5 font-news text-[clamp(44px,6.4vw,92px)] font-medium leading-[0.95] tracking-[-0.03em]">
              {doc.title[0]} <i className="font-medium">{doc.title[1]}</i>
            </h1>
            <p className="mt-4 inline-block -rotate-[1.5deg] font-hand text-[26px] font-semibold text-lp-plum">{doc.hand}</p>
          </div>
          {LEGAL_STATUS.draft && (
            <p className="-rotate-[7deg] justify-self-start rounded border-[3px] border-lp-plum px-3.5 pb-1.5 pt-2 text-center font-plex text-[17px] font-semibold leading-tight tracking-[0.16em] text-lp-plum">
              DRAFT
              <small className="mt-1 block text-[10px] font-medium tracking-[0.12em]">NEEDS LEGAL REVIEW</small>
            </p>
          )}
        </header>
      </div>

      <div className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)] items-start gap-6 px-4 pb-24 sm:px-10 lg:grid-cols-[240px_minmax(0,1fr)] lg:gap-12 lg:pb-28">
        <nav aria-label="On this page" className="sticky top-[68px] z-10 -mx-4 border-b-[1.5px] border-lp-ink bg-lp-paper px-4 py-2.5 sm:-mx-10 sm:px-10 lg:top-24 lg:mx-0 lg:border-0 lg:bg-transparent lg:p-0">
          <p className="mb-3.5 hidden font-plex text-xs uppercase tracking-[0.12em] text-lp-muted lg:block">On this page</p>
          <ol ref={stripRef} className="relative flex gap-2 overflow-x-auto [scrollbar-width:none] lg:flex-col lg:gap-1.5 lg:overflow-visible">
            {index.map((item) => {
              const on = item.id === active;
              return (
                <li key={item.id} className="flex-none">
                  <a
                    href={`#${item.id}`}
                    aria-current={on ? "true" : undefined}
                    className={`flex items-baseline gap-2.5 whitespace-nowrap rounded-[4px_10px_4px_4px] border-[1.5px] px-3 py-1.5 text-[14.5px] leading-snug lg:whitespace-normal ${
                      on ? "border-lp-ink bg-lp-lilac" : "border-lp-ink bg-lp-white lg:border-transparent lg:bg-transparent lg:hover:border-lp-ink lg:hover:bg-lp-white"
                    }`}
                  >
                    <span className="font-plex text-[11px] text-lp-plum">{item.n}</span>
                    {item.title}
                  </a>
                </li>
              );
            })}
          </ol>
        </nav>

        <article className={`${paper} lp-perforated relative max-w-[860px] px-[18px] pb-9 pt-9 sm:px-14 sm:pb-14 sm:pt-12`}>
          <div className="flex flex-wrap gap-x-6 gap-y-2 border-b-[1.5px] border-dashed border-lp-ink pb-5 font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">
            <span>{doc.docName}</span>
            <span>
              Last updated:{" "}
              {LEGAL_STATUS.lastUpdated ?? <Rich parts={[{ todo: "date" }]} />}
            </span>
            <span>Version {LEGAL_STATUS.version}</span>
            {doc.extraMeta && <span>{doc.extraMeta}</span>}
          </div>

          {doc.short && (
            <section id="short-version" aria-labelledby="short-version-title" className="mb-2 mt-7 -rotate-[0.6deg] scroll-mt-[140px] bg-lp-sun px-6 pb-6 pt-5 shadow-[0_18px_26px_-18px_rgba(70,45,20,0.6)] lg:scroll-mt-24">
              <h2 id="short-version-title" className="font-hand text-[30px] font-bold">the short version</h2>
              <ul className="mt-1.5 list-disc space-y-1.5 pl-5">
                {doc.short.map((line) => (
                  <li key={line} className="max-w-[62ch]">{line}</li>
                ))}
              </ul>
            </section>
          )}

          {doc.clauses.map((clause, i) => (
            <section
              key={clause.id}
              id={clause.id}
              aria-labelledby={`${clause.id}-title`}
              className="grid scroll-mt-[140px] gap-x-8 gap-y-3 border-b border-dotted border-[#b9ad9c] py-7 last:border-b-0 lg:scroll-mt-24 xl:grid-cols-[minmax(0,1fr)_190px]"
            >
              <p className="-rotate-[1.5deg] justify-self-start border-l-2 border-lp-lilac pl-3 font-hand text-[22px] font-semibold leading-tight text-lp-plum-2 xl:order-2 xl:mt-11">
                <span className="mb-0.5 block font-plex text-[10px] font-medium tracking-[0.14em] text-lp-muted">IN SHORT</span>
                {clause.inShort}
              </p>
              <div className="min-w-0">
                <h2 id={`${clause.id}-title`} className="mb-2.5 flex items-baseline gap-3.5 font-news text-[24px] font-medium leading-tight tracking-[-0.01em] sm:text-[28px]">
                  <span className="font-plex text-[13px] font-semibold tracking-[0.06em] text-lp-plum">{num(i)}</span>
                  {clause.title}
                </h2>
                {clause.body.map((block, j) => (
                  <Block key={j} block={block} />
                ))}
              </div>
            </section>
          ))}
        </article>
      </div>

      <SiteFooter />
    </div>
  );
}
