import { Link } from "react-router-dom";

const LINKS = [
  { to: "/", label: "Home" },
  { to: "/docs", label: "Handbook" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
  { to: "/login", label: "Log in" },
];

export default function SiteFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t-[1.5px] border-lp-ink pb-9 pt-11">
      <div className="mx-auto max-w-[1280px] px-4 sm:px-10">
        <div className="flex flex-wrap items-center justify-between gap-6">
          <Link to="/" aria-label="DashHR home" className="font-news text-[30px] font-semibold italic tracking-tight text-lp-ink">
            Dash<span className="not-italic text-lp-plum">HR</span>
          </Link>
          <nav aria-label="Footer" className="flex flex-wrap gap-x-6 gap-y-1">
            {LINKS.map((link) => (
              <Link key={link.to} to={link.to} className="py-1 text-[15px] underline-offset-4 hover:underline">
                {link.label}
              </Link>
            ))}
          </nav>
        </div>
        <div className="mt-7 flex flex-wrap justify-between gap-4 border-t-[1.5px] border-lp-ink pt-5 font-plex text-xs uppercase tracking-[0.12em] text-lp-muted">
          <span>dashhr.app · Powered by Dash Microfinance Bank Ltd</span>
          <span>© {year}</span>
        </div>
      </div>
    </footer>
  );
}
