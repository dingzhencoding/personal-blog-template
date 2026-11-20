import { chromium } from "playwright";
import { mkdirSync } from "node:fs";
import { join } from "node:path";

const SHOTS = join(process.cwd(), "docs/design-references/yihanglizi-cn-bc4c2f76/root-8a5edab2");
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector(".VPNavBarTitle .ba");
const header = page.locator("header.VPNav").first();

const styles = await page.evaluate(() => {
  const pick = selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return { rect: { x: rect.x, y: rect.y, w: rect.width, h: rect.height }, fontSize: cs.fontSize, fontWeight: cs.fontWeight, color: cs.color, padding: cs.padding, gap: cs.gap, textShadow: cs.textShadow, display: cs.display };
  };
  return { ba: pick(".VPNavBarTitle .ba"), slot: pick(".VPNavBarTitle .ba-slot"), morph: pick(".VPNavBarTitle .ba-char--morph"), normal: pick(".VPNavBarTitle .ba-char--normal") };
});

await header.screenshot({ path: join(SHOTS, "clone-header-1440-initial.png") });
const events = [];
let last = "";
let particlesSeen = 0;
let splitSeen = 0;
const start = Date.now();
for (let i = 0; i < 320; i++) {
  const snap = await page.evaluate(() => {
    const ba = document.querySelector(".VPNavBarTitle .ba");
    if (!ba) return null;
    return {
      text: [...ba.querySelectorAll(".ba-slot")].map(slot => slot.classList.contains("ba-slot--hidden") ? "" : (slot.textContent || "")).join(""),
      raw: ba.textContent,
      classes: [...ba.querySelectorAll(".ba-char, .ba-split-half")].map(el => el.className).join("|"),
      particles: ba.querySelectorAll(".ba-particle").length,
      bounce: ba.querySelectorAll(".ba-slot--bounce").length,
      slots: ba.querySelectorAll(".ba-slot").length,
    };
  });
  if (!snap) break;
  const t = Date.now() - start;
  if (snap.text !== last) {
    events.push({ t, text: snap.text, raw: snap.raw, particles: snap.particles, bounce: snap.bounce });
    last = snap.text;
  }
  if (snap.particles) particlesSeen++;
  if (snap.classes.includes("ba-split")) splitSeen++;
  if (t > 5200 && t < 5600 && !events.some(e => e.shotMid)) await header.screenshot({ path: join(SHOTS, "clone-header-1440-mid.png") });
  if (t > 9000 && t < 9400 && !events.some(e => e.shotShort)) await header.screenshot({ path: join(SHOTS, "clone-header-1440-short.png") });
  await page.waitForTimeout(60);
}
await header.screenshot({ path: join(SHOTS, "clone-header-1440-late.png") });

await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(500);
await header.screenshot({ path: join(SHOTS, "clone-header-390.png") });

const reduced = await browser.newPage({ viewport: { width: 1440, height: 900 }, reducedMotion: "reduce" });
await reduced.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
await reduced.waitForSelector(".VPNavBarTitle .ba");
const reducedTextA = await reduced.evaluate(() => document.querySelector(".VPNavBarTitle .ba")?.textContent);
await reduced.waitForTimeout(6000);
const reducedTextB = await reduced.evaluate(() => document.querySelector(".VPNavBarTitle .ba")?.textContent);
await reduced.locator("header.VPNav").first().screenshot({ path: join(SHOTS, "clone-header-1440-reduced.png") });

console.log(JSON.stringify({ styles, events, particlesSeen, splitSeen, reduced: { a: reducedTextA, b: reducedTextB } }, null, 2));
await browser.close();