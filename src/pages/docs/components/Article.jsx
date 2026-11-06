import { Link } from "react-router-dom";
import { ArrowLeft, ArrowRight, ChevronRight } from "lucide-react";
import { paper } from "../../landing/styles";
import { GUIDES, ROLE_NAMES, guideBySlug, guidesInSection, sectionById } from "../data/guides";

function Where({ path }) {
  return (
    <p className="mt-3 inline-flex flex-wrap items-center gap-x-1.5 gap-y-1 rounded border-[1.5px] border-dashed border-lp-muted bg-lp-paper px-2.5 py-1.5 font-plex text-xs">
      <span className="sr-only">Where: </span>
      {path.map((part, i) => (
        <span key={part} className="inline-flex items-center gap-1.5">
          {i > 0 && <ChevronRight size={12} aria-hidden="true" className="text-lp-muted" />}
          <span className={i === 0 ? "font-semibold" : ""}>{part}</span>
        </span>
      ))}
    </p>
  );
}

function Step({ step, n }) {
  return (
    <li className={`${paper} grid gap-2.5 px-[18px] pb-[22px] pt-5 sm:grid-cols-[64px_1fr] sm:gap-5 sm:px-[26px] sm:pb-[26px] sm:pt-6 sm:odd:-rotate-[0.3deg] sm:even:rotate-[0.3deg]`}>
      <span
        aria-hidden="true"
        className="grid size-11 place-items-center rounded-full border-2 border-lp-plum font-hand text-[26px] font-bold text-lp-plum sm:size-[52px] sm:text-[30px]"
      >
        {n}
      </span>
      <div className="min-w-0">
        <h3 className="mt-1.5 text-[19px] font-semibold leading-snug">
          <span className="sr-only">Step {n}: </span>
          {step.title}
        </h3>
        <p className="mt-1 max-w-[62ch] leading-relaxed">{step.body}</p>
        {step.where && <Where path={step.where} />}
        {step.link && (
          <p className="mt-3">
            <Link to={`/docs/${step.link.slug}`} className="font-semibold text-lp-plum underline decoration-[1.5px] underline-offset-4">
              {step.link.label} →
            </Link>
          </p>
        )}
        {step.tip && <p className="mt-2.5 font-hand text-[21px] leading-tight text-lp-plum-2">{step.tip}</p>}
      </div>
    </li>
  );
}

export default function Article({ guide }) {
  const section = sectionById(guide.section);
  const order = GUIDES.indexOf(guide);
  const prev = GUIDES[order - 1];
  const next = GUIDES[order + 1];
  const siblings = guidesInSection(guide.section).filter((g) => g.slug !== guide.slug);
  const related = (guide.related || []).map(guideBySlug).filter(Boolean);

  return (
    <article className="min-w-0">
      <p className="flex flex-wrap items-center gap-2 font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">
        <Link to="/docs" className="hover:text-lp-ink">Handbook</Link>
        <span aria-hidden="true">/</span>
        <span>{section.title}</span>
      </p>
      <h1 className="mt-3.5 font-news text-[clamp(34px,4.4vw,56px)] font-medium leading-none tracking-[-0.025em]">
        {guide.title}
      </h1>
      <p className="mt-[18px] max-w-[60ch] text-lg leading-relaxed text-lp-muted">{guide.summary}</p>

      <div className="mt-5 flex flex-wrap gap-2 font-plex text-[11.5px]">
        <span className="rounded-[3px] border-[1.5px] border-lp-ink bg-lp-mint px-2.5 py-1">
          For: {guide.roles.map((r) => ROLE_NAMES[r]).join(", ")}
        </span>
        {guide.steps && (
          <span className="rounded-[3px] border-[1.5px] border-lp-ink bg-lp-white px-2.5 py-1">{guide.steps.length} steps</span>
        )}
        <span className="rounded-[3px] border-[1.5px] border-lp-ink bg-lp-white px-2.5 py-1">Opens from: {guide.opensFrom}</span>
      </div>

      {guide.steps && (
        <ol className="mt-9 flex flex-col gap-5">
          {guide.steps.map((step, i) => (
            <Step key={step.title} step={step} n={i + 1} />
          ))}
        </ol>
      )}

      {guide.glossary && (
        <dl className={`${paper} mt-9 px-[18px] py-2 sm:px-[26px]`}>
          {guide.glossary.map((item) => (
            <div key={item.term} className="grid gap-1 border-b border-dotted border-[#b9ad9c] py-4 last:border-b-0 sm:grid-cols-[180px_1fr] sm:gap-6">
              <dt className="font-semibold">{item.term}</dt>
              <dd className="max-w-[62ch] leading-relaxed">{item.text}</dd>
            </div>
          ))}
        </dl>
      )}

      {guide.notes && (
        <aside className="mt-9 -rotate-[0.5deg] bg-lp-sun px-6 pb-6 pt-5 shadow-[0_18px_26px_-18px_rgba(70,45,20,0.6)]">
          <h2 className="font-hand text-[28px] font-bold">good to know</h2>
          <ul className="mt-1.5 list-disc space-y-1.5 pl-5">
            {guide.notes.map((note) => (
              <li key={note} className="max-w-[62ch]">{note}</li>
            ))}
          </ul>
        </aside>
      )}

      {(siblings.length > 0 || related.length > 0) && (
        <div className="mt-11 grid gap-8 sm:grid-cols-2">
          {siblings.length > 0 && (
            <div>
              <h2 className="font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">Also in {section.title}</h2>
              <ul className="mt-2.5 space-y-1.5">
                {siblings.map((g) => (
                  <li key={g.slug}>
                    <Link to={`/docs/${g.slug}`} className="font-semibold underline-offset-4 hover:text-lp-plum hover:underline">{g.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
          {related.length > 0 && (
            <div>
              <h2 className="font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">Related guides</h2>
              <ul className="mt-2.5 space-y-1.5">
                {related.map((g) => (
                  <li key={g.slug}>
                    <Link to={`/docs/${g.slug}`} className="font-semibold underline-offset-4 hover:text-lp-plum hover:underline">{g.title}</Link>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      <nav aria-label="Previous and next guide" className="mt-11 grid gap-4 border-t-[1.5px] border-lp-ink pt-6 sm:grid-cols-2">
        {prev ? (
          <Link to={`/docs/${prev.slug}`} className="rounded border-[1.5px] border-lp-ink px-5 py-4 hover:bg-lp-white">
            <span className="flex items-center gap-1.5 font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">
              <ArrowLeft size={14} aria-hidden="true" /> Previous
            </span>
            <span className="mt-1 block font-news text-[22px] leading-tight">{prev.title}</span>
          </Link>
        ) : (
          <span className="hidden sm:block" />
        )}
        {next && (
          <Link to={`/docs/${next.slug}`} className="rounded border-[1.5px] border-lp-ink px-5 py-4 text-right hover:bg-lp-white">
            <span className="flex items-center justify-end gap-1.5 font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">
              Next <ArrowRight size={14} aria-hidden="true" />
            </span>
            <span className="mt-1 block font-news text-[22px] leading-tight">{next.title}</span>
          </Link>
        )}
      </nav>
    </article>
  );
}
