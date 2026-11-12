import { Link, NavLink } from "react-router-dom";
import { btnPlum, textLink } from "../landing/styles";

const LINKS = [
  { to: "/docs", label: "Handbook" },
  { to: "/terms", label: "Terms" },
  { to: "/privacy", label: "Privacy" },
];

export default function SiteHeader() {
  return (
    <header className="sticky top-0 z-30 border-b-[1.5px] border-lp-ink bg-lp-paper">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-10">
        <Link to="/" aria-label="DashHR home" className="font-news text-[30px] font-semibold italic tracking-tight text-lp-ink">
          Dash<span className="not-italic text-lp-plum">HR</span>
        </Link>

        <nav aria-label="Site" className="hidden items-center gap-7 md:flex">
          {LINKS.map((link) => (
            <NavLink
              key={link.to}
              to={link.to}
              className={({ isActive }) =>
                `text-[15px] underline-offset-[5px] hover:underline ${isActive ? "underline decoration-[1.5px]" : ""}`
              }
            >
              {link.label}
            </NavLink>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link to="/login" className={`${textLink} hidden sm:inline`}>
            Log in
          </Link>
          <Link to="/signup" className={`${btnPlum} h-11 px-4 text-sm sm:h-12 sm:px-5 sm:text-[15px]`}>
            <span className="sm:hidden">Get started</span>
            <span className="hidden sm:inline">Start your workspace</span>
          </Link>
        </div>
      </div>
    </header>
  );
}
