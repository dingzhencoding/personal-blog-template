import { chromium } from "playwright";
import { join } from "node:path";

const SHOTS = join(process.cwd(), "docs/design-references/yihanglizi-cn-bc4c2f76/root-8a5edab2");
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1440, height: 900 } });
await page.goto("http://localhost:3000/", { waitUntil: "networkidle", timeout: 60000 });
await page.waitForSelector(".VPNavBarTitle .ba");
const header = page.locator("header.VPNav").first();

const phrase = () => page.evaluate(() => {
  const ba = document.querySelector(".VPNavBarTitle .ba");
  if (!ba) return "";
  return [...ba.querySelectorAll(".ba-slot")].filter(slot => !slot.classList.contains("ba-slot--hidden")).map(slot => slot.classList.contains("ba-split") || slot.querySelector(".ba-split") ? "SPLIT" : (slot.textContent || "")).join("");
});

async function waitPhrase(target, timeout = 20000) {
  const start = Date.now();
  while (Date.now() - start < timeout) {
    if ((await phrase()) === target) return true;
    await page.waitForTimeout(100);
  }
  return false;
}

const seen = {};
for (const [name, target] of [["base", "丁真珍珠"], ["mid", "理塘丁真"], ["short", "理塘王"]]) {
  seen[name] = await waitPhrase(target);
  await header.screenshot({ path: join(SHOTS, `clone-header-1440-${name}.png`) });
}
await page.setViewportSize({ width: 390, height: 844 });
await page.waitForTimeout(400);
seen.mobileBase = await waitPhrase("丁真珍珠");
await header.screenshot({ path: join(SHOTS, "clone-header-390-base.png") });
seen.mobileShort = await waitPhrase("理塘王");
await header.screenshot({ path: join(SHOTS, "clone-header-390-short.png") });

const metrics = await page.evaluate(() => {
  const get = selector => {
    const el = document.querySelector(selector);
    if (!el) return null;
    const cs = getComputedStyle(el);
    const rect = el.getBoundingClientRect();
    return { w: rect.width, h: rect.height, fontSize: cs.fontSize };
  };
  return { slot: get(".VPNavBarTitle .ba-slot"), normal: get(".VPNavBarTitle .ba-char--normal"), morph: get(".VPNavBarTitle .ba-char--morph"), header: get("header.VPNav") };
});
console.log(JSON.stringify({ seen, metrics }, null, 2));
await browser.close();