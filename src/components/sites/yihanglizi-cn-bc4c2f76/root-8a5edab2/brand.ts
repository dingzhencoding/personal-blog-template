// Recreates the live site's header BrandName loop (Vue component scoped by
// data-v-cf82e59d): scramble, split/fly accent character, bounce, return.

const SCOPE = "data-v-cf82e59d";
const CHAR_POOL = "的一是不了在有人我他这为之来以个们到说时要出会可也对生能子得下大自还后没然看起天开面理心头所经气如样水用十两";

type Slot = {
  text: string;
  morph: boolean;
  opacity: number;
  scrambling: boolean;
  scrambleChar: string;
};

type BrandState =
  | "initial" | "shuffle" | "showSf" | "split" | "merge"
  | "showLi" | "bounce" | "unmerge" | "return" | "unshuffle";

const slot = (text: string, morph = false, opacity = 1): Slot => ({ text, morph, opacity, scrambling: false, scrambleChar: "" });

const BASE = [slot("丁", true), slot("真"), slot("珍"), slot("珠")];
const MID = [slot("理"), slot("塘"), slot("丁", true), slot("真")];
const SHORT = [slot("理"), slot("塘"), slot("王", true), slot("", false, 0)];

const reveal = (phrase: Slot[]) => phrase.map(item => ({ ...item }));

export function enhanceBrandWord(scope: ParentNode): () => void {
  const ba = scope.querySelector<HTMLElement>(".VPNavBarTitle .ba");
  const row = ba?.querySelector<HTMLElement>(".ba-row");
  if (!ba || !row) return () => {};
  const slotEls = [...row.children].filter((el): el is HTMLElement => el instanceof HTMLElement).slice(0, 4);
  if (slotEls.length < 4) return () => {};

  const slots = reveal(BASE);
  const timers = new Set<number>();
  let state: BrandState = "initial";
  let split = false;
  let fly = false;
  let flyBack = false;
  let stopped = false;
  let particlesHost: HTMLElement | null = null;

  const wait = (ms: number) => new Promise<void>(resolve => {
    const id = window.setTimeout(() => { timers.delete(id); resolve(); }, ms);
    timers.add(id);
  });
  const randomChar = () => CHAR_POOL[Math.floor(Math.random() * CHAR_POOL.length)];

  function renderChar(host: HTMLElement, item: Slot) {
    let char = host.firstElementChild as HTMLElement | null;
    if (!char?.classList.contains("ba-char")) {
      host.innerHTML = `<span class="ba-char" ${SCOPE}></span>`;
      char = host.firstElementChild as HTMLElement;
    }
    const value = item.scrambling ? item.scrambleChar : item.text;
    if (char.textContent !== value) char.textContent = value;
    char.className = `ba-char${item.morph ? " ba-char--morph" : " ba-char--normal"}${item.scrambling ? " ba-char--scramble" : ""}`;
  }

  function renderSplit(host: HTMLElement, item: Slot) {
    const topClass = `ba-split-half ba-split--top${fly ? " ba-split--fly" : ""}${flyBack ? " ba-split--fly-back" : ""}`;
    host.innerHTML = `<span class="ba-split" ${SCOPE}><span class="${topClass}" ${SCOPE}><span class="ba-char ba-char--morph" ${SCOPE}>${item.text}</span></span><span class="ba-split-half ba-split--btm" ${SCOPE}><span class="ba-char ba-char--morph ba-char--shift" ${SCOPE}>${item.text}</span></span></span>`;
  }

  function render() {
    ba!.setAttribute("aria-label", slots.filter(item => item.opacity > 0).map(item => item.text).join(""));
    slotEls.forEach((el, index) => {
      const item = slots[index];
      el.style.setProperty("--sx", String(index));
      el.style.opacity = String(item.opacity);
      el.classList.toggle("ba-slot--hidden", item.opacity === 0);
      el.classList.toggle("ba-slot--bounce", state === "bounce");
      if (item.morph && split) renderSplit(el, item);
      else renderChar(el, item);
    });
  }

  function apply(phrase: Slot[]) {
    phrase.forEach((source, index) => {
      const item = slots[index];
      item.text = source.text;
      item.morph = source.morph;
      item.opacity = source.opacity;
      item.scrambling = false;
    });
  }

  function burstParticles() {
    particlesHost?.remove();
    const host = document.createElement("span");
    host.className = "ba-particles";
    host.setAttribute(SCOPE, "");
    for (let index = 0; index < 6; index++) {
      const particle = document.createElement("span");
      particle.className = "ba-particle";
      particle.setAttribute(SCOPE, "");
      particle.style.left = `${((20 + Math.random() * 160) * 0.25).toFixed(1)}px`;
      particle.style.animationDelay = `${(Math.random() * 0.3).toFixed(2)}s`;
      particle.style.animationDuration = `${(0.4 + Math.random() * 0.5).toFixed(2)}s`;
      host.append(particle);
    }
    ba!.append(host);
    particlesHost = host;
    const id = window.setTimeout(() => {
      timers.delete(id);
      if (particlesHost === host) {
        host.remove();
        particlesHost = null;
      }
    }, 1200);
    timers.add(id);
  }

  async function scramble(indices: number[], duration: number) {
    const steps = Math.floor(duration / 50);
    for (let step = 0; step < steps && !stopped; step++) {
      for (const index of indices) {
        slots[index].scrambleChar = randomChar();
        slots[index].scrambling = true;
      }
      render();
      await wait(50);
    }
    for (const index of indices) slots[index].scrambling = false;
    render();
  }

  async function loop() {
    while (!stopped) {
      apply(BASE);
      state = "initial";
      split = false;
      fly = false;
      flyBack = false;
      render();
      await wait(2600);
      if (stopped) return;

      state = "shuffle";
      await scramble([0, 1, 2, 3], 400);
      apply(MID);
      render();
      await wait(150);
      state = "showSf";
      render();
      await wait(2000);
      if (stopped) return;

      state = "split";
      split = true;
      render();
      await wait(80);
      fly = true;
      render();
      burstParticles();
      await wait(700);
      if (stopped) return;

      state = "merge";
      split = false;
      fly = false;
      apply(SHORT);
      render();
      await wait(500);
      state = "showLi";
      render();
      await wait(1800);
      state = "bounce";
      render();
      await wait(1000);
      state = "showLi";
      render();
      await wait(500);
      if (stopped) return;

      state = "unmerge";
      split = true;
      flyBack = true;
      render();
      burstParticles();
      await wait(700);
      if (stopped) return;

      state = "return";
      split = false;
      flyBack = false;
      apply(MID);
      render();
      await wait(500);
      await wait(1000);
      if (stopped) return;

      state = "unshuffle";
      await scramble([0, 1, 2, 3], 400);
      apply(BASE);
      render();
      await wait(150);
    }
  }

  if (window.matchMedia?.("(prefers-reduced-motion: reduce)").matches) {
    apply(BASE);
    split = false;
    render();
    return () => {};
  }

  void loop();
  return () => {
    stopped = true;
    for (const id of timers) window.clearTimeout(id);
    timers.clear();
    particlesHost?.remove();
    particlesHost = null;
  };
}