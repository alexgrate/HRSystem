import { useGSAP } from "@gsap/react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";
import Lenis from "lenis";
import { setLenis } from "../lib/smoothScroll";

gsap.registerPlugin(useGSAP, ScrollTrigger);

const onScreen = (trigger, start = "top 85%") => ({ trigger, start });

export default function useLandingMotion(rootRef) {
  useGSAP(
    () => {
      const mm = gsap.matchMedia();

      mm.add("(prefers-reduced-motion: no-preference)", () => {
        const lenis = new Lenis({ anchors: true });
        setLenis(lenis);
        lenis.on("scroll", ScrollTrigger.update);
        const tick = (time) => lenis.raf(time * 1000);
        gsap.ticker.add(tick);
        gsap.ticker.lagSmoothing(0);

        gsap.from("[data-deal]", {
          y: 60,
          opacity: 0,
          rotation: (i) => (i % 2 ? 6 : -6),
          duration: 0.7,
          ease: "back.out(1.4)",
          stagger: 0.09,
          delay: 0.15,
        });

        gsap.utils.toArray("main h2").forEach((heading) => {
          gsap.from(heading, {
            y: 32,
            opacity: 0,
            duration: 0.8,
            ease: "power3.out",
            scrollTrigger: onScreen(heading),
          });
        });

        gsap.from("[data-pile] > *", {
          y: 90,
          opacity: 0,
          rotation: () => gsap.utils.random(-14, 14),
          duration: 0.8,
          ease: "back.out(1.2)",
          stagger: 0.12,
          scrollTrigger: onScreen("[data-pile]", "top 75%"),
        });

        gsap.utils.toArray("[data-snip]").forEach((snip) => {
          gsap.from(snip, {
            y: -18,
            scale: 1.04,
            opacity: 0,
            duration: 0.55,
            ease: "power2.out",
            scrollTrigger: onScreen(snip, "top 88%"),
          });
        });

        gsap.from("[data-binder] > li", {
          y: 80,
          opacity: 0,
          duration: 0.7,
          ease: "power3.out",
          stagger: 0.08,
          scrollTrigger: onScreen("[data-binder]", "top 80%"),
        });

        gsap.from("[data-wall] > figure", {
          y: -50,
          opacity: 0,
          duration: 0.7,
          ease: "back.out(1.6)",
          stagger: 0.15,
          scrollTrigger: onScreen("[data-wall]", "top 80%"),
        });

        gsap.fromTo(
          "[data-receipt]",
          { clipPath: "inset(0 0 100% 0)" },
          {
            clipPath: "inset(0 0 0% 0)",
            duration: 1.4,
            ease: "steps(14)",
            clearProps: "clipPath",
            scrollTrigger: onScreen("[data-receipt]", "top 80%"),
          }
        );

        document.fonts?.ready.then(() => ScrollTrigger.refresh());

        return () => {
          gsap.ticker.remove(tick);
          gsap.ticker.lagSmoothing(500, 33);
          lenis.destroy();
          setLenis(null);
        };
      });
    },
    { scope: rootRef }
  );
}
