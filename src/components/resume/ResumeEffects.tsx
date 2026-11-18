"use client";

import { useEffect } from "react";

/** Scroll reveal and pointer spotlight for the server-rendered resume page. */
export default function ResumeEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".rs");
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanup: Array<() => void> = [];

    // Elements are only hidden when data-effects="on", which an inline script
    // sets before first paint, so content never depends on JS.
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    const show = (node: Element) => node.classList.add("is-in");
    if (reduceMotion) reveals.forEach(show);
    else {
      // Reveal what is already in view right away: IntersectionObserver never
      // fires in hidden tabs, which would leave the hero invisible forever.
      const pending: HTMLElement[] = [];
      for (const node of reveals) {
        const rect = node.getBoundingClientRect();
        if (rect.top < window.innerHeight && rect.bottom > 0) show(node);
        else pending.push(node);
      }
      if (pending.length) {
        const observer = new IntersectionObserver(entries => {
          for (const entry of entries) if (entry.isIntersecting) { show(entry.target); observer.unobserve(entry.target); }
        }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
        pending.forEach(node => observer.observe(node));
        cleanup.push(() => observer.disconnect());
      }
    }

    // Spotlight that follows the pointer across cards.
    const onPointerMove = (event: PointerEvent) => {
      const card = (event.target as HTMLElement).closest<HTMLElement>(".rs-card");
      if (!card) return;
      const rect = card.getBoundingClientRect();
      card.style.setProperty("--mx", `${event.clientX - rect.left}px`);
      card.style.setProperty("--my", `${event.clientY - rect.top}px`);
    };
    if (window.matchMedia("(hover: hover)").matches) {
      root.addEventListener("pointermove", onPointerMove);
      cleanup.push(() => root.removeEventListener("pointermove", onPointerMove));
    }

    return () => cleanup.forEach(fn => fn());
  }, []);
  return null;
}