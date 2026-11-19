export const starPoster = "/media/starlight-orbit-poster-v2.webp";

/**
 * Starry-home backdrop drawn live on a canvas instead of a background video.
 * Rings, spiral dust and the glowing nucleus stay sharp on any display size
 * and the first frame appears without downloading any media.
 *
 * The homepage serializes this function into its inline bootstrap, so the
 * body must stay self-contained: no imports, no references to module scope,
 * and no syntax newer than the browsers we already support (no `?.`/`??`).
 */
export function startStarBackdrop(layer: HTMLElement | null): () => void {
  if (!layer) return function () {};
  const stale = layer.querySelectorAll("canvas.slh-video-canvas, video.slh-video");
  for (let i = 0; i < stale.length; i++) stale[i].remove();
  if (!window.Path2D) return function () {};

  const canvas = document.createElement("canvas");
  canvas.className = "slh-video slh-video-canvas";
  canvas.setAttribute("aria-hidden", "true");
  const context = canvas.getContext("2d");
  if (!context) return function () {};

  // Deterministic art: every visit renders the same sky.
  let seed = 20261008;
  const random = function () {
    seed = (seed * 1664525 + 1013904223) >>> 0;
    return seed / 4294967296;
  };
  const between = function (min: number, max: number) {
    return min + random() * (max - min);
  };

  const FLAT = 0.82;
  const light = window.innerWidth < 720;
  const density = light ? 0.55 : 1;

  const tierStyles = [
    "rgba(222,236,255,.36)",
    "rgba(226,238,255,.66)",
    "rgba(244,249,255,.95)",
    "rgba(146,188,255,.45)",
    "rgba(152,196,255,.76)",
    "rgba(255,216,164,.3)",
    "rgba(184,164,255,.4)",
  ];
  const makeTiers = function () {
    const paths: Path2D[] = [];
    for (let i = 0; i < tierStyles.length; i++) paths.push(new Path2D());
    return paths;
  };
  const ringTiers = makeTiers();
  const dustTiers = makeTiers();
  const tierFor = function () {
    const roll = random();
    if (roll < 0.35) return 0;
    if (roll < 0.63) return 1;
    if (roll < 0.75) return 2;
    if (roll < 0.89) return 3;
    if (roll < 0.96) return 4;
    return roll < 0.985 ? 5 : 6;
  };
  const addDot = function (path: Path2D, x: number, y: number, size: number) {
    path.moveTo(x + size, y);
    path.arc(x, y, size, 0, Math.PI * 2);
  };
  const addGlint = function (path: Path2D, x: number, y: number, size: number) {
    const waist = size * 0.2;
    path.moveTo(x, y - size);
    path.lineTo(x + waist, y - waist);
    path.lineTo(x + size, y);
    path.lineTo(x + waist, y + waist);
    path.lineTo(x, y + size);
    path.lineTo(x - waist, y + waist);
    path.lineTo(x - size, y);
    path.lineTo(x - waist, y - waist);
    path.closePath();
  };

  // Concentric rings of dots with occasional sparkle glyphs.
  for (let ring = 0; ring < 9; ring++) {
    const radius = 0.108 + ring * 0.037;
    const count = Math.max(8, Math.round((66 + ring * 24) * density));
    const phase = random() * Math.PI * 2;
    const strong = ring === 2 || ring === 5;
    for (let i = 0; i < count; i++) {
      const angle = phase + (i / count) * Math.PI * 2 + between(-0.02, 0.02);
      if ((ring === 3 || ring === 6) && Math.sin(angle * 2 + ring) > 0.72) continue;
      const jitter = 1 + between(-0.007, 0.007);
      const x = Math.cos(angle) * radius * jitter;
      const y = Math.sin(angle) * radius * jitter * FLAT;
      const tier = strong && random() < 0.3 ? 2 : tierFor();
      if (i % 9 === 4) addGlint(ringTiers[tier], x, y, between(0.0022, 0.0044));
      else addDot(ringTiers[tier], x, y, between(0.0007, 0.0018));
    }
  }

  // Spiral dust arms, the densest trailing toward the lower right.
  for (let arm = 0; arm < 3; arm++) {
    const mouth = 0.32 + arm * (Math.PI * 2 / 3);
    const count = Math.round(980 * density);
    const reach = arm === 0 ? 0.92 : 0.66;
    for (let i = 0; i < count; i++) {
      const t = Math.pow(random(), 1.2);
      const radius = 0.05 + t * reach;
      const angle = mouth + t * (arm === 0 ? 1.7 : 2.3);
      const spread = between(0.004, 0.012 + t * (arm === 0 ? 0.09 : 0.055));
      const x = Math.cos(angle) * radius + Math.cos(angle + Math.PI / 2) * spread;
      const y = (Math.sin(angle) * radius + Math.sin(angle + Math.PI / 2) * spread) * FLAT;
      const tier = random() < 0.78 ? (random() < 0.55 ? 0 : 4) : tierFor();
      if (random() < 0.03) addDot(dustTiers[2], x, y, between(0.0009, 0.0014));
      else addDot(dustTiers[tier], x, y, between(0.00045, 0.0013));
    }
  }

  // Bright pulses scattered over the rings.
  const glints: Array<{ x: number; y: number; size: number; phase: number; speed: number; warm: boolean }> = [];
  for (let i = 0; i < (light ? 26 : 46); i++) {
    const radius = between(0.1, 0.43);
    const angle = between(0, Math.PI * 2);
    glints.push({
      x: Math.cos(angle) * radius,
      y: Math.sin(angle) * radius * FLAT,
      size: between(0.0008, 0.0024),
      phase: between(0, Math.PI * 2),
      speed: between(0.35, 1.1),
      warm: random() < 0.16,
    });
  }

  // Sparse sky stars, some of them twinkling.
  const sky: Array<{ x: number; y: number; size: number; alpha: number; phase: number; speed: number; twinkle: boolean }> = [];
  for (let i = 0; i < (light ? 140 : 230); i++) {
    sky.push({
      x: random(),
      y: random(),
      size: between(0.5, 1.5),
      alpha: between(0.1, 0.42),
      phase: between(0, Math.PI * 2),
      speed: between(0.4, 1.5),
      twinkle: random() < 0.34,
    });
  }

  let width = 2;
  let height = 2;
  let unit = 2;
  let scale = 1;
  const resize = function () {
    const rect = layer.getBoundingClientRect();
    width = Math.max(2, Math.round(rect.width));
    height = Math.max(2, Math.round(rect.height));
    unit = Math.min(width, height);
    scale = Math.max(0.6, Math.min(window.devicePixelRatio || 1, 1.75, Math.sqrt(4500000 / (width * height))));
    canvas.width = Math.round(width * scale);
    canvas.height = Math.round(height * scale);
  };

  const paintSky = function (time: number) {
    const buckets = [new Path2D(), new Path2D(), new Path2D()];
    for (let i = 0; i < sky.length; i++) {
      const star = sky[i];
      if (star.twinkle) continue;
      const bucket = star.alpha < 0.2 ? 0 : star.alpha < 0.32 ? 1 : 2;
      addDot(buckets[bucket], star.x * width, star.y * height, star.size);
    }
    const bucketAlpha = ["rgba(206,222,255,.16)", "rgba(216,230,255,.26)", "rgba(228,240,255,.4)"];
    for (let i = 0; i < buckets.length; i++) {
      context.fillStyle = bucketAlpha[i];
      context.fill(buckets[i]);
    }
    for (let i = 0; i < sky.length; i++) {
      const star = sky[i];
      if (!star.twinkle) continue;
      const pulse = 0.45 + 0.55 * Math.sin(time * star.speed + star.phase);
      context.fillStyle = "rgba(224,238,255," + (star.alpha * (0.5 + pulse * 0.5)).toFixed(3) + ")";
      context.beginPath();
      context.arc(star.x * width, star.y * height, star.size * (0.7 + pulse * 0.6), 0, Math.PI * 2);
      context.fill();
    }
  };

  const draw = function (time: number) {
    context.setTransform(scale, 0, 0, scale, 0, 0);
    context.clearRect(0, 0, width, height);
    paintSky(time);

    const cx = width * (light ? 0.5 : 0.485);
    const cy = height * (light ? 0.46 : 0.545);
    context.globalCompositeOperation = "lighter";

    context.save();
    context.translate(cx + Math.sin(time * 0.06) * unit * 0.01, cy + Math.cos(time * 0.05) * unit * 0.008);
    context.scale(unit, unit);

    const wash = context.createRadialGradient(0, 0, 0.02, 0, 0, 0.62);
    wash.addColorStop(0, "rgba(96,132,235,.16)");
    wash.addColorStop(0.55, "rgba(64,92,190,.07)");
    wash.addColorStop(1, "rgba(30,44,120,0)");
    context.save();
    context.scale(1.3, 0.95);
    context.fillStyle = wash;
    context.beginPath();
    context.arc(0, 0, 0.62, 0, Math.PI * 2);
    context.fill();
    context.restore();

    // Dust drifts slower than the rings for a touch of parallax.
    context.save();
    context.rotate(time * 0.02);
    for (let i = 0; i < dustTiers.length; i++) {
      context.fillStyle = tierStyles[i];
      context.fill(dustTiers[i]);
    }
    context.restore();

    context.save();
    context.rotate(time * 0.048);
    context.globalAlpha = 0.9 + Math.sin(time * 0.55) * 0.1;
    for (let i = 0; i < ringTiers.length; i++) {
      context.fillStyle = tierStyles[i];
      context.fill(ringTiers[i]);
    }
    for (let i = 0; i < glints.length; i++) {
      const glint = glints[i];
      const pulse = 0.3 + 0.7 * Math.abs(Math.sin(time * glint.speed + glint.phase));
      context.globalAlpha = pulse;
      context.fillStyle = glint.warm ? "rgba(255,228,180,.92)" : "rgba(235,246,255,.92)";
      context.beginPath();
      context.arc(glint.x, glint.y, glint.size * (1.2 + pulse * 1.6), 0, Math.PI * 2);
      context.fill();
    }
    context.restore();

    context.save();
    context.rotate(time * 0.013);
    const beamLengths = [0.6, 0.52];
    const beamAngles = [-0.3, 0.44];
    for (let i = 0; i < beamAngles.length; i++) {
      const reach = beamLengths[i];
      const dx = Math.cos(beamAngles[i]) * reach;
      const dy = Math.sin(beamAngles[i]) * reach * FLAT;
      const beam = context.createLinearGradient(-dx, -dy, dx, dy);
      beam.addColorStop(0, "rgba(180,215,255,0)");
      beam.addColorStop(0.47, "rgba(220,236,255,.32)");
      beam.addColorStop(0.5, "rgba(255,255,255,.6)");
      beam.addColorStop(0.53, "rgba(220,236,255,.32)");
      beam.addColorStop(1, "rgba(180,215,255,0)");
      context.strokeStyle = beam;
      context.lineWidth = 0.0022;
      context.beginPath();
      context.moveTo(-dx, -dy);
      context.lineTo(dx, dy);
      context.stroke();
    }
    context.restore();

    const core = context.createRadialGradient(0, 0, 0, 0, 0, 0.1);
    core.addColorStop(0, "rgba(255,255,255,.98)");
    core.addColorStop(0.22, "rgba(220,238,255,.72)");
    core.addColorStop(0.55, "rgba(150,192,255,.3)");
    core.addColorStop(1, "rgba(90,130,255,0)");
    context.fillStyle = core;
    context.beginPath();
    context.arc(0, 0, 0.1, 0, Math.PI * 2);
    context.fill();
    context.fillStyle = "rgba(255,255,255,.95)";
    context.beginPath();
    context.arc(0, 0, 0.008, 0, Math.PI * 2);
    context.fill();
    context.strokeStyle = "rgba(190,220,255,.22)";
    context.lineWidth = 0.0012;
    context.beginPath();
    context.ellipse(0, 0, 0.052, 0.052 * FLAT, 0, 0, Math.PI * 2);
    context.stroke();

    context.restore();
    context.globalCompositeOperation = "source-over";
  };

  let frame = 0;
  let lastPaint = 0;
  const motion = window.matchMedia("(prefers-reduced-motion: reduce)");
  const tick = function (now: number) {
    frame = requestAnimationFrame(tick);
    if (document.hidden || document.documentElement.dataset.docTheme !== "starry") return;
    if (now - lastPaint < 1000 / 30) return;
    lastPaint = now;
    draw(now / 1000);
  };
  const onResize = function () {
    resize();
    draw(performance.now() / 1000);
  };
  const syncMotion = function () {
    cancelAnimationFrame(frame);
    frame = 0;
    if (motion.matches) draw(performance.now() / 1000);
    else {
      lastPaint = 0;
      frame = requestAnimationFrame(tick);
    }
  };

  resize();
  draw(performance.now() / 1000);
  layer.classList.add("is-live");
  layer.append(canvas);
  window.addEventListener("resize", onResize);
  if (motion.addEventListener) motion.addEventListener("change", syncMotion);
  else if (motion.addListener) motion.addListener(syncMotion);
  if (!motion.matches) frame = requestAnimationFrame(tick);

  return function () {
    cancelAnimationFrame(frame);
    window.removeEventListener("resize", onResize);
    if (motion.removeEventListener) motion.removeEventListener("change", syncMotion);
    else if (motion.removeListener) motion.removeListener(syncMotion);
    canvas.remove();
    layer.classList.remove("is-live");
  };
}
