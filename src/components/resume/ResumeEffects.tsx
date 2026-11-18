"use client";

import { useEffect } from "react";
import { openPdfEvent } from "./PdfViewer";

/**
 * Progressive effects for the server-rendered resume: scroll reveal, a
 * typewriter role line, count-up stats, timelines that draw as you scroll,
 * spotlight cards, section dots, and the hero action buttons.
 */
export default function ResumeEffects() {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(".rs");
    if (!root) return;
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const cleanup: Array<() => void> = [];
    // Set before printing so animations jump to their final state.
    let finished = false;

    // Scroll reveal. Elements are only hidden when data-effects="on", which an
    // inline script sets before first paint, so content never depends on JS.
    const reveals = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"));
    if (reduceMotion) reveals.forEach(node => node.classList.add("is-in"));
    else {
      const observer = new IntersectionObserver(entries => {
        for (const entry of entries) if (entry.isIntersecting) { entry.target.classList.add("is-in"); observer.unobserve(entry.target); }
      }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
      reveals.forEach(node => observer.observe(node));
      cleanup.push(() => observer.disconnect());
    }

    // Typewriter cycling through the roles from the frontmatter title.
    const typed = root.querySelector<HTMLElement>(".rs-typed");
    const roles: string[] = typed?.dataset.roles ? JSON.parse(typed.dataset.roles) : [];
    if (typed && roles.length && !reduceMotion) {
      let role = 0, length = roles[0].length, deleting = false, timer = 0;
      const tick = () => {
        if (finished) return;
        const current = Array.from(roles[role]);
        if (!deleting) {
          length++;
          typed.textContent = current.slice(0, length).join("");
          if (length >= current.length) {
            if (roles.length === 1) return;
            deleting = true;
            timer = window.setTimeout(tick, 2200);
            return;
          }
          timer = window.setTimeout(tick, 70 + Math.random() * 60);
        } else {
          length--;
          typed.textContent = current.slice(0, Math.max(0, length)).join("");
          if (length <= 0) { deleting = false; role = (role + 1) % roles.length; length = 0; timer = window.setTimeout(tick, 380); return; }
          timer = window.setTimeout(tick, 32);
        }
      };
      length = 0;
      typed.textContent = "";
      timer = window.setTimeout(tick, 650);
      cleanup.push(() => window.clearTimeout(timer));
    }

    // Count-up for numeric stats such as "3+" or "98%".
    const counters = Array.from(root.querySelectorAll<HTMLElement>("[data-count]"));
    const counterObserver = new IntersectionObserver(entries => {
      for (const entry of entries) {
        if (!entry.isIntersecting) continue;
        counterObserver.unobserve(entry.target);
        const node = entry.target as HTMLElement;
        const match = /^(\D*)(\d+(?:\.\d+)?)(.*)$/.exec(node.dataset.count ?? "");
        if (!match || reduceMotion) continue;
        const [, prefix, number, suffix] = match;
        const target = Number(number), decimals = number.includes(".") ? number.split(".")[1].length : 0;
        const start = performance.now(), duration = 1300;
        const step = (now: number) => {
          if (finished) return;
          const t = Math.min(1, (now - start) / duration), eased = 1 - Math.pow(1 - t, 3);
          node.textContent = `${prefix}${(target * eased).toFixed(decimals)}${suffix}`;
          if (t < 1) requestAnimationFrame(step);
        };
        requestAnimationFrame(step);
      }
    }, { threshold: .6 });
    counters.forEach(node => counterObserver.observe(node));
    cleanup.push(() => counterObserver.disconnect());

    // Timelines draw down as the reader scrolls; nodes light up once passed.
    const timelines = Array.from(root.querySelectorAll<HTMLElement>(".rs-timeline"));
    let frame = 0;
    const update = () => {
      frame = 0;
      const anchor = window.innerHeight * .62;
      for (const line of timelines) {
        const rect = line.getBoundingClientRect();
        line.style.setProperty("--progress", String(Math.min(1, Math.max(0, (anchor - rect.top) / rect.height))));
        line.querySelectorAll<HTMLElement>(".rs-tl-item").forEach(item => {
          item.classList.toggle("is-passed", item.getBoundingClientRect().top + 22 < anchor);
        });
      }
    };
    const schedule = () => { if (!frame) frame = requestAnimationFrame(update); };
    if (timelines.length) {
      update();
      window.addEventListener("scroll", schedule, { passive: true });
      window.addEventListener("resize", schedule);
      cleanup.push(() => { window.removeEventListener("scroll", schedule); window.removeEventListener("resize", schedule); cancelAnimationFrame(frame); });
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

    // Section dots highlight the section in view.
    const dots = new Map(Array.from(root.querySelectorAll<HTMLAnchorElement>(".rs-dots a")).map(link => [link.hash.slice(1), link]));
    if (dots.size) {
      const sectionObserver = new IntersectionObserver(entries => {
        for (const entry of entries) {
          if (!entry.isIntersecting) continue;
          dots.forEach(link => link.removeAttribute("aria-current"));
          dots.get(entry.target.id)?.setAttribute("aria-current", "true");
        }
      }, { rootMargin: "-45% 0px -50% 0px" });
      dots.forEach((_, id) => { const section = document.getElementById(id); if (section) sectionObserver.observe(section); });
      cleanup.push(() => sectionObserver.disconnect());
    }

    // Printing captures the current frame: finish every animation first.
    const finishForPrint = () => {
      finished = true;
      reveals.forEach(node => node.classList.add("is-in"));
      counters.forEach(node => { node.textContent = node.dataset.count ?? node.textContent; });
      if (typed && roles.length) typed.textContent = roles[0];
    };
    window.addEventListener("beforeprint", finishForPrint);

    // Hero actions.
    const onClick = (event: MouseEvent) => {
      const action = (event.target as HTMLElement).closest<HTMLElement>("[data-resume-action]")?.dataset.resumeAction;
      if (action === "print") window.print();
      if (action === "view-pdf") { event.preventDefault(); window.dispatchEvent(new Event(openPdfEvent)); }
    };
    root.addEventListener("click", onClick);
    cleanup.push(() => root.removeEventListener("click", onClick));

    return () => { window.removeEventListener("beforeprint", finishForPrint); cleanup.forEach(fn => fn()); };
  }, []);
  return null;
}
