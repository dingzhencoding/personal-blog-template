/**
 * Shared page entrance: the gradient backdrop lands first, then [data-reveal]
 * content floats in with a stagger. The layout sets data-page-enter="on" before
 * first paint so nothing flashes; the resume (.rs) runs its own effects and is
 * left untouched.
 */
export function enhancePageEnter(root: HTMLElement): () => void {
  const nodes = Array.from(root.querySelectorAll<HTMLElement>("[data-reveal]"))
    .filter(node => !node.closest(".rs"));
  if (!nodes.length) return () => {};

  const heroes = Array.from(root.querySelectorAll<HTMLElement>("[data-enter-hero]"));
  const counters = new Map<HTMLElement, number>();
  for (const node of nodes) {
    // The captured themes transition [data-reveal] on their own; in-view keeps
    // their transform at rest so only the shared entrance moves the element.
    node.classList.add("in-view");
    const hero = heroes.find(candidate => candidate.contains(node));
    const group = hero ?? node.parentElement ?? node;
    const index = counters.get(group) ?? 0;
    node.style.setProperty("--enter-i", String(hero ? index : Math.min(index, 8)));
    counters.set(group, index + 1);
  }

  if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
    nodes.forEach(node => node.classList.add("is-in"));
    return () => {};
  }

  const observer = new IntersectionObserver(entries => {
    for (const entry of entries) {
      if (!entry.isIntersecting) continue;
      entry.target.classList.add("is-in");
      observer.unobserve(entry.target);
    }
  }, { rootMargin: "0px 0px -8% 0px", threshold: .08 });
  nodes.forEach(node => observer.observe(node));
  return () => observer.disconnect();
}