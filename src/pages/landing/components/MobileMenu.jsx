import { useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { AnimatePresence, motion } from "framer-motion";
import { ArrowUpRight, X } from "lucide-react";
import { NAV_LINKS } from "../data/content";
import { btnLilac } from "../styles";
import { getLenis, scrollToHash } from "../lib/smoothScroll";

const COLORS = ["bg-lp-lilac", "bg-lp-sun", "bg-lp-mint", "bg-lp-white"];
const TABS = ["left-[4%]", "left-[28%]", "left-[52%]", "left-[76%]"];

const overlay = {
  hidden: { opacity: 0 },
  show: { opacity: 1 },
  exit: { opacity: 0, transition: { duration: 0.2 } },
};

const list = {
  show: { transition: { staggerChildren: 0.07, delayChildren: 0.1 } },
};

const divider = {
  hidden: { y: 90, rotate: -6, opacity: 0 },
  show: (i) => ({
    y: 0,
    rotate: i % 2 ? 1.5 : -1.5,
    opacity: 1,
    transition: { type: "spring", stiffness: 260, damping: 22 },
  }),
  exit: { y: 40, opacity: 0, transition: { duration: 0.15 } },
};

export default function MobileMenu({ open, setOpen, triggerRef }) {
  const closeRef = useRef(null);
  const pendingHash = useRef(null);


  useEffect(() => {
    if (!open) return;

    const trigger = triggerRef?.current;
    const lenis = getLenis();
    const onKey = (e) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    document.body.style.overflow = "hidden";
    lenis?.stop();
    closeRef.current?.focus();

    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = "";
      lenis?.start();
      trigger?.focus({ preventScroll: true });
      if (pendingHash.current) {
        scrollToHash(pendingHash.current);
        pendingHash.current = null;
      }
    };
  }, [open, setOpen, triggerRef]);

  const close = () => setOpen(false);

  return (
    <AnimatePresence>
      {open && (
        <motion.div
          id="mobile-menu"
          role="dialog"
          data-lenis-prevent
          aria-modal="true"
          aria-label="Menu"
          variants={overlay}
          initial="hidden"
          animate="show"
          exit="exit"
          className="fixed inset-0 z-40 flex flex-col overflow-y-auto bg-lp-deep px-4 pb-8 text-white sm:px-10 lg:hidden"
        >
          <div className="flex h-[68px] shrink-0 items-center justify-between">
            <span className="font-news text-[30px] font-semibold italic tracking-tight">
              Dash<span className="not-italic text-lp-lilac">HR</span>
            </span>
            <button
              ref={closeRef}
              type="button"
              onClick={close}
              aria-label="Close menu"
              className="grid size-11 place-items-center rounded-md border-[1.5px] border-white/70"
            >
              <X size={20} />
            </button>
          </div>

          <p className="mt-6 inline-block -rotate-3 self-start font-hand text-[32px] font-semibold text-lp-lilac">
            where to?
          </p>

          <motion.ul variants={list} className="mt-2 pt-[30px]">
            {NAV_LINKS.map((link, i) => (
              <motion.li
                key={link.href}
                custom={i}
                variants={divider}
                className="relative mt-[18px] first:mt-0"
              >
                <a
                  href={link.href}
                  onClick={(e) => {
                    e.preventDefault();
                    pendingHash.current = link.href;
                    close();
                  }}
                  className={`relative block rounded-[3px_10px_4px_4px] border-[1.5px] border-lp-ink ${COLORS[i]} px-5 pb-7 pt-5 text-lp-ink shadow-[0_-10px_18px_-14px_rgba(0,0,0,0.7)]`}
                >
                  <span
                    aria-hidden="true"
                    className={`absolute -top-[30px] ${TABS[i]} flex h-[30px] items-center rounded-t-lg border-[1.5px] border-b-0 border-lp-ink ${COLORS[i]} px-3 font-plex text-[11px] font-semibold tracking-[0.1em]`}
                  >
                    0{i + 1}
                  </span>
                  <span className="flex items-center justify-between gap-4 font-news text-[32px] leading-none tracking-tight">
                    {link.label}
                    <ArrowUpRight size={24} aria-hidden="true" className="shrink-0" />
                  </span>
                </a>
              </motion.li>
            ))}
          </motion.ul>

          <div className="mt-auto flex flex-col gap-5 pt-10">
            <Link to="/signup" className={`${btnLilac} h-12 px-6 text-[15px]`}>
              Start your workspace
            </Link>
            <Link
              to="/login"
              className="text-center font-semibold text-white underline decoration-[1.5px] underline-offset-4"
            >
              Log in
            </Link>
          </div>
        </motion.div>
      )}
    </AnimatePresence>
  );
}
