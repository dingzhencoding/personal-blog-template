type Star = {
  x: number;
  y: number;
  radius: number;
  alpha: number;
  phase: number;
  speed: number;
  halo: boolean;
  sparkle: boolean;
};

type Meteor = {
  x: number;
  y: number;
  vx: number;
  vy: number;
  length: number;
  life: number;
};

const glyphs = "01ABCDEF{}[]<>/;:+-*=XYZ";
const cellWidth = 18;
const cellHeight = 20;
const maxRainColumns = 110;

/**
 * Animate the document backdrop. The cyber code rain is a set of CSS
 * transform animations, so the compositor keeps it falling while the main
 * thread scrolls; only the starry sky is still painted frame by frame.
 */
export function enhanceBackground(root: HTMLElement): () => void {
  const docBg = root.querySelector<HTMLElement>(".doc-bg");
  const canvas = docBg?.querySelector<HTMLCanvasElement>(".bg-canvas.active") ?? null;
  const context = canvas?.getContext("2d") ?? null;
  const reducedMotion = window.matchMedia("(prefers-reduced-motion: reduce)");
  let stars: Star[] = [];
  let meteors: Meteor[] = [];
  let width = 0;
  let height = 0;
  let frame = 0;
  let lastDraw = 0;
  let lastMeteorFrame = 0;
  let rain: HTMLElement | null = null;
  let rainWidth = 0;

  const makeStars = () => {
    let seed = (0x65a51e7 ^ Math.round(width * 17 + height * 31)) >>> 0;
    const random = () => {
      seed = (Math.imul(seed, 1664525) + 1013904223) >>> 0;
      return seed / 4294967296;
    };
    const count = Math.min(720, Math.max(width < 768 ? 140 : 320, Math.round(width * height / 3200)));
    return Array.from({ length: count }, () => ({
      x: random() * width,
      y: random() * height,
      radius: .45 + Math.pow(random(), 2.1) * 1.9,
      alpha: .42 + random() * .56,
      phase: random() * Math.PI * 2,
      speed: 3.2 + random() * 6.2,
      halo: random() < .18,
      sparkle: random() < .035,
    }));
  };

  const buildRain = () => {
    if (!docBg) return;
    rain?.remove();
    const layer = document.createElement("div");
    layer.className = "cyber-rain";
    layer.setAttribute("aria-hidden", "true");
    const count = Math.min(maxRainColumns, Math.ceil(width / cellWidth));
    const step = width / count;
    for (let index = 0; index < count; index++) {
      const column = document.createElement("span");
      column.className = "rain-col";
      const length = 22 + Math.floor(Math.random() * 30);
      const speed = 70 + Math.random() * 50;
      const duration = height / speed;
      let text = "";
      for (let i = 0; i < length - 1; i++) text += glyphs[Math.floor(Math.random() * glyphs.length)];
      column.textContent = text;
      const head = document.createElement("span");
      head.className = "rain-head";
      head.textContent = glyphs[Math.floor(Math.random() * glyphs.length)];
      column.append(head);
      column.style.left = `${((index + .5) * step - 5).toFixed(1)}px`;
      column.style.setProperty("--dur", `${duration.toFixed(2)}s`);
      column.style.setProperty("--delay", `${(-Math.random() * duration).toFixed(2)}s`);
      column.style.setProperty("--fade", `${length * cellHeight}px`);
      column.style.opacity = (.38 + Math.random() * .3).toFixed(2);
      layer.append(column);
    }
    const overlay = docBg.querySelector(".bg-overlay");
    if (overlay) docBg.insertBefore(layer, overlay);
    else docBg.append(layer);
    rain = layer;
    rainWidth = width;
  };

  const drawStarry = (time: number) => {
    if (!context) return;
    const sky = context.createRadialGradient(width * .5, height * .3, 0, width * .5, height * .3, Math.max(width, height) * .88);
    sky.addColorStop(0, "#0b0a2e");
    sky.addColorStop(.4, "#0a0e1e");
    sky.addColorStop(1, "#050508");
    context.fillStyle = sky;
    context.fillRect(0, 0, width, height);

    const bands = [
      { y: .24, amplitude: .055, phase: .4, color: "rgba(82, 100, 190, .04)" },
      { y: .47, amplitude: .07, phase: 2.1, color: "rgba(85, 70, 155, .035)" },
      { y: .71, amplitude: .045, phase: 4.2, color: "rgba(35, 125, 150, .03)" },
    ];
    for (const band of bands) {
      context.beginPath();
      context.moveTo(0, height);
      for (let x = 0; x <= width + 40; x += 40) {
        const y = height * (band.y + Math.sin((x / Math.max(width, 1)) * Math.PI * 2 + band.phase) * band.amplitude);
        context.lineTo(x, y);
      }
      context.lineTo(width, height);
      context.closePath();
      context.fillStyle = band.color;
      context.fill();
    }

    const seconds = reducedMotion.matches ? 0 : time / 1000;
    for (const star of stars) {
      const pulse = (1 + Math.sin(seconds * star.speed + star.phase)) / 2;
      const shimmer = reducedMotion.matches ? .82 : .4 + .6 * pulse * pulse;
      const alpha = star.alpha * shimmer;
      if (star.halo) {
        const glowRadius = Math.max(6, star.radius * 6);
        const halo = context.createRadialGradient(star.x, star.y, 0, star.x, star.y, glowRadius);
        halo.addColorStop(0, `rgba(175, 211, 255, ${alpha * .52})`);
        halo.addColorStop(1, "rgba(174, 207, 255, 0)");
        context.fillStyle = halo;
        context.beginPath();
        context.arc(star.x, star.y, glowRadius, 0, Math.PI * 2);
        context.fill();
      }
      if (star.sparkle && alpha > .48) {
        context.strokeStyle = `rgba(205, 231, 255, ${alpha * .38})`;
        context.lineWidth = .7;
        context.beginPath();
        context.moveTo(star.x - 4, star.y);
        context.lineTo(star.x + 4, star.y);
        context.moveTo(star.x, star.y - 4);
        context.lineTo(star.x, star.y + 4);
        context.stroke();
      }
      context.fillStyle = `rgba(241, 247, 255, ${alpha})`;
      context.beginPath();
      context.arc(star.x, star.y, star.radius, 0, Math.PI * 2);
      context.fill();
    }

    if (reducedMotion.matches) return;
    const step = Math.min(3, Math.max(0, (time - lastMeteorFrame) / (1000 / 60)));
    lastMeteorFrame = time;
    if (Math.random() < .012 * step && meteors.length < 2) {
      meteors.push({
        x: Math.random() * width * .78,
        y: Math.random() * height * .42,
        vx: 8 + Math.random() * 6,
        vy: 4 + Math.random() * 4,
        length: 70 + Math.random() * 55,
        life: 1,
      });
    }
    meteors = meteors.filter(meteor => {
      meteor.x += meteor.vx * step;
      meteor.y += meteor.vy * step;
      meteor.life -= .021 * step;
      if (meteor.life <= 0) return false;
      const norm = Math.hypot(meteor.vx, meteor.vy);
      const tailX = meteor.x - meteor.vx / norm * meteor.length;
      const tailY = meteor.y - meteor.vy / norm * meteor.length;
      const trail = context.createLinearGradient(tailX, tailY, meteor.x, meteor.y);
      trail.addColorStop(0, "rgba(192, 218, 255, 0)");
      trail.addColorStop(1, `rgba(239, 249, 255, ${meteor.life})`);
      context.strokeStyle = trail;
      context.lineWidth = 2.1;
      context.beginPath();
      context.moveTo(tailX, tailY);
      context.lineTo(meteor.x, meteor.y);
      context.stroke();
      context.fillStyle = `rgba(255, 255, 255, ${meteor.life})`;
      context.beginPath();
      context.arc(meteor.x, meteor.y, 2.4, 0, Math.PI * 2);
      context.fill();
      return true;
    });
  };

  const renderStarry = (time: number) => {
    if (!context) return;
    context.clearRect(0, 0, width, height);
    drawStarry(time);
  };

  const tick = (time: number) => {
    if (time - lastDraw >= 33) {
      renderStarry(time);
      lastDraw = time;
    }
    frame = window.requestAnimationFrame(tick);
  };

  // The home hides its doc-bg under the starry theme, so nothing needs painting there.
  const docBgHidden = () => !docBg || getComputedStyle(docBg).display === "none";
  const starryActive = () => document.documentElement.dataset.docTheme === "starry" && !docBgHidden();

  const sync = () => {
    window.cancelAnimationFrame(frame);
    frame = 0;
    lastDraw = 0;
    lastMeteorFrame = performance.now();
    meteors = [];
    if (!context) return;
    if (starryActive()) renderStarry(lastMeteorFrame);
    else context.clearRect(0, 0, width, height);
    if (starryActive() && !reducedMotion.matches && !document.hidden) frame = window.requestAnimationFrame(tick);
  };

  const resize = () => {
    width = window.innerWidth;
    height = window.innerHeight;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    if (canvas && context) {
      canvas.width = Math.round(width * ratio);
      canvas.height = Math.round(height * ratio);
      context.setTransform(ratio, 0, 0, ratio, 0, 0);
    }
    stars = makeStars();
    meteors = [];
    if (width !== rainWidth) buildRain();
    sync();
  };

  const resizeObserver = new ResizeObserver(resize);
  if (canvas) resizeObserver.observe(canvas);
  const themeObserver = new MutationObserver(sync);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ["data-doc-theme"] });
  reducedMotion.addEventListener("change", sync);
  document.addEventListener("visibilitychange", sync);
  resize();

  return () => {
    window.cancelAnimationFrame(frame);
    resizeObserver.disconnect();
    themeObserver.disconnect();
    reducedMotion.removeEventListener("change", sync);
    document.removeEventListener("visibilitychange", sync);
    rain?.remove();
    rain = null;
    context?.clearRect(0, 0, width, height);
  };
}