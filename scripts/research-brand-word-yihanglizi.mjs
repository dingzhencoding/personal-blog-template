import { chromium } from "playwright";
import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

const OUT = join(process.cwd(), "docs/research/yihanglizi-cn-bc4c2f76/root-8a5edab2");
const SHOTS = join(process.cwd(), "docs/design-references/yihanglizi-cn-bc4c2f76/root-8a5edab2");
mkdirSync(OUT, { recursive: true });
mkdirSync(SHOTS, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 1 });
await page.goto("https://yihanglizi.cn/", { waitUntil: "domcontentloaded", timeout: 60000 });
await page.waitForTimeout(2500);

await page.screenshot({ path: join(SHOTS, "live-home-1440.png") });
const header = page.locator("header.VPNav").first();
await header.screenshot({ path: join(SHOTS, "live-header-1440.png") });

const meta = await page.evaluate(() => {
  const ba = document.querySelector(".ba");
  const title = document.querySelector(".VPNavBarTitle");
  const pick = (el) => {
    if (!el) return null;
    const cs = getComputedStyle(el);
    const props = ["display","position","alignItems","gap","height","width","fontSize","fontWeight","lineHeight","letterSpacing","color","background","backgroundImage","backgroundColor","padding","margin","border","borderRadius","overflow","boxShadow","transform","transition","opacity","whiteSpace","fontFamily","textTransform","filter","textShadow"];
    const styles = {};
    for (const p of props) styles[p] = cs[p];
    const r = el.getBoundingClientRect();
    return { tag: el.tagName, cls: el.className?.toString(), rect: { x: r.x, y: r.y, w: r.width, h: r.height }, styles, html: el.outerHTML.slice(0, 4000) };
  };
  return {
    title: document.title,
    titleChain: title ? [title, ...title.querySelectorAll("*")].slice(0, 40).map(pick) : [],
    ba: pick(ba),
    row: pick(document.querySelector(".ba-row")),
    slots: [...document.querySelectorAll(".ba-slot")].map(pick),
    chars: [...document.querySelectorAll(".ba-char")].map(pick),
    surroundings: ba ? { parent: pick(ba.parentElement), grand: pick(ba.parentElement?.parentElement) } : null,
    scripts: [...document.scripts].map((s) => s.src).filter(Boolean),
    stylesheets: [...document.styleSheets].map((s) => s.href).filter(Boolean),
  };
});
writeFileSync(join(OUT, "brand-live-meta.json"), JSON.stringify(meta, null, 2));

const cssRules = await page.evaluate(() => {
  const out = [];
  const seen = new Set();
  const scan = (rules, sheetHref) => {
    for (const r of rules) {
      try {
        if (r.cssRules) scan(r.cssRules, sheetHref);
        const text = r.cssText || "";
        if (/\.ba(\b|--|-row|-slot|-char)|@keyframes\s+(ba|scramble|lz)/i.test(text) && !seen.has(text)) {
          seen.add(text);
          out.push(`/* ${sheetHref || "inline"} */\n${text}`);
        }
      } catch {}
    }
  };
  for (const sheet of document.styleSheets) {
    try { scan(sheet.cssRules, sheet.href); } catch {}
  }
  return out.join("\n\n");
});
writeFileSync(join(OUT, "brand-live-css.txt"), cssRules);

const samples = [];
for (let i = 0; i < 140; i++) {
  const s = await page.evaluate(() => {
    const ba = document.querySelector(".ba");
    if (!ba) return null;
    return {
      t: Math.round(performance.now()),
      text: ba.textContent,
      html: ba.outerHTML,
      titleHTML: document.querySelector(".VPNavBarTitle a")?.outerHTML,
    };
  });
  samples.push(s);
  await page.waitForTimeout(70);
}
writeFileSync(join(OUT, "brand-live-samples.json"), JSON.stringify(samples, null, 2));

const texts = [];
let last = null;
for (const s of samples) {
  if (!s) continue;
  const key = s.text + "|" + (s.html?.match(/ba-char--\w+/g)?.join(",") || "");
  if (key !== last) {
    texts.push({ t: s.t, text: s.text, classes: s.html?.match(/ba-char--\w+/g) });
    last = key;
  }
}
writeFileSync(join(OUT, "brand-live-timeline.json"), JSON.stringify(texts, null, 2));

await page.setViewportSize({ width: 768, height: 900 });
await page.waitForTimeout(600);
await header.screenshot({ path: join(SHOTS, "live-header-768.png") });
const tablet = await page.evaluate(() => document.querySelector(".VPNavBarTitle")?.outerHTML);
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(600);
await header.screenshot({ path: join(SHOTS, "live-header-390.png") });
const mobile = await page.evaluate(() => document.querySelector(".VPNavBarTitle")?.outerHTML);
writeFileSync(join(OUT, "brand-live-responsive.json"), JSON.stringify({ tablet, mobile }, null, 2));

await browser.close();
console.log("done", { meta: !!meta, cssRules: cssRules.length, samples: samples.length, timeline: texts.length });