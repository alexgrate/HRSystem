import { useRef, useState } from "react";
import { Link } from "react-router-dom";
import { Menu } from "lucide-react";
import { btnPlum, textLink } from "../styles";
import { NAV_LINKS } from "../data/content";
import MobileMenu from "./MobileMenu";

export default function Nav() {
  const [open, setOpen] = useState(false);
  const menuButtonRef = useRef(null);

  return (
    <header className="sticky top-0 z-30 border-b-[1.5px] border-lp-ink bg-lp-paper">
      <div className="mx-auto flex h-[68px] max-w-[1280px] items-center justify-between gap-4 px-4 sm:px-10">
        <a
          href="#top"
          aria-label="DashHR home"
          className="font-news text-[30px] font-semibold italic tracking-tight text-lp-ink"
        >
          Dash<span className="not-italic text-lp-plum">HR</span>
        </a>

        <nav aria-label="Primary" className="hidden items-center gap-7 lg:flex">
          {NAV_LINKS.map((link) => (
            <a
              key={link.href}
              href={link.href}
              className="text-[15px] underline-offset-4 hover:underline"
            >
              {link.label}
            </a>
          ))}
        </nav>

        <div className="flex items-center gap-4">
          <Link
            to="/login"
            className={`${textLink} hidden lg:inline`}
          >
            Log in
          </Link>

          <Link
            to="/signup"
            className={`${btnPlum} h-11 px-4 text-sm sm:h-12 sm:px-5 sm:text-[15px]`}
          >
            <span className="sm:hidden">Get started</span>
            <span className="hidden sm:inline">Start your workspace</span>
          </Link>

          <button
            ref={menuButtonRef}
            type="button"
            onClick={() => setOpen(true)}
            aria-expanded={open}
            aria-controls="mobile-menu"
            aria-label="Open menu"
            className="grid size-11 place-items-center rounded-md border-[1.5px] border-lp-ink lg:hidden"
          >
            <Menu size={20} />
          </button>
        </div>
      </div>

      <MobileMenu open={open} setOpen={setOpen} triggerRef={menuButtonRef} />
    </header>
  );
}
