import { useEffect, useState } from "react";
import { Navigate, useParams } from "react-router-dom";
import "../site/fonts";
import SiteHeader from "../site/SiteHeader";
import SiteFooter from "../site/SiteFooter";
import DocsSearch from "./components/DocsSearch";
import SectionTabs from "./components/SectionTabs";
import Article from "./components/Article";
import DocsHome from "./components/DocsHome";
import { ROLES, guideBySlug } from "./data/guides";
import usePageMeta from "../site/usePageMeta";

const ROLE_KEY = "dashhr_docs_role";

const readRole = () => {
  try {
    const saved = localStorage.getItem(ROLE_KEY);
    return ROLES.some((r) => r.id === saved) ? saved : "all";
  } catch {
    return "all";
  }
};

export default function Docs() {
  const { slug } = useParams();
  const guide = slug ? guideBySlug(slug) : null;
  const [role, setRole] = useState(readRole);

  useEffect(() => {
    try {
      localStorage.setItem(ROLE_KEY, role);
    } catch {
      return;
    }
  }, [role]);

  usePageMeta({
    title: guide ? `${guide.title} · DashHR handbook` : "The DashHR handbook · How to use DashHR",
    description: guide
      ? guide.summary
      : "Step-by-step guides for DashHR: setting up your workspace, payroll, leave, loans, appraisals, approvals and the self-service portal.",
    path: guide ? `/docs/${guide.slug}` : "/docs",
  });

  useEffect(() => {
    window.scrollTo(0, 0);
  }, [guide]);

  if (slug && !guide) return <Navigate to="/docs" replace />;

  const Heading = guide ? "p" : "h1";

  return (
    <div className="min-h-screen overflow-x-clip bg-lp-paper font-grotesk text-lp-ink antialiased">
      <SiteHeader />

      <div className={`border-b-[1.5px] border-lp-ink bg-lp-deep text-white ${guide ? "py-8 sm:py-10" : "pb-16 pt-14"}`}>
        <div className="mx-auto max-w-[1280px] px-4 sm:px-10">
          <p className="font-plex text-xs uppercase tracking-[0.12em] text-lp-lilac">dashhr.app/docs</p>
          <Heading
            className={`font-news font-medium tracking-[-0.03em] ${
              guide ? "mt-2 text-[30px] leading-none" : "mt-3 text-[clamp(44px,6.4vw,92px)] leading-[0.95]"
            }`}
          >
            The DashHR <i className="font-medium text-lp-lilac">handbook.</i>
          </Heading>
          {!guide && (
            <p className="mt-4 inline-block -rotate-[1.5deg] font-hand text-[26px] font-semibold text-lp-lilac">
              how to do the thing, in the order you'll need it
            </p>
          )}

          <div className={guide ? "mt-5" : "mt-8"}>
            <DocsSearch />
          </div>

          <div role="group" aria-label="Show guides for" className="mt-5 flex flex-wrap gap-2.5">
            {ROLES.map((r) => (
              <button
                key={r.id}
                type="button"
                aria-pressed={role === r.id}
                onClick={() => setRole(r.id)}
                className={`rounded-full border-[1.5px] px-4 py-2 text-sm ${
                  role === r.id ? "border-lp-lilac bg-lp-lilac font-semibold text-lp-deep" : "border-white/40 hover:border-white"
                }`}
              >
                {r.label}
              </button>
            ))}
          </div>
        </div>
      </div>

      <main className="mx-auto grid max-w-[1280px] grid-cols-[minmax(0,1fr)] items-start gap-7 px-4 pb-24 pt-8 sm:px-10 lg:grid-cols-[260px_minmax(0,1fr)] lg:gap-12 lg:pb-28 lg:pt-14">
        <SectionTabs current={guide} role={role} />
        {guide ? <Article key={guide.slug} guide={guide} /> : <DocsHome role={role} />}
      </main>

      <SiteFooter />
    </div>
  );
}
