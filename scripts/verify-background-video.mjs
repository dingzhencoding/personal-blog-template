import assert from "node:assert/strict";
import { mkdirSync } from "node:fs";
import { chromium } from "playwright";

const base = process.env.STATIC_TEST_URL || "http://127.0.0.1:4183";
const browser = await chromium.launch({ executablePath: process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const android = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/131.0.0.0 Mobile Safari/537.36";
const momentRoutes = [
  ["/moments/tech/", ".tech-archive__hero", "img.tech-archive__hero-video"],
  ["/moments/life/", ".life-timeline__hero", "img.life-timeline__hero-video"],
];
const errors = [];
mkdirSync("artifacts/background-video", { recursive: true });

try {
  for (const [name, options] of [
    ["baidu-android", { userAgent: android + " baiduboxapp/13.80.0.10", isMobile: true, hasTouch: true }],
    ["baidu-ios", { userAgent: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_0 like Mac OS X) AppleWebKit/605.1.15 Mobile/15E148 baiduboxapp/13.80.0.10", isMobile: true, hasTouch: true }],
    ["baidu-browser", { userAgent: android + " BIDUBrowser/8.7", isMobile: true, hasTouch: true }],
    ["reduced-motion", { userAgent: android, isMobile: true, hasTouch: true, reducedMotion: "reduce" }],
  ]) {
    const context = await browser.newContext({ viewport: { width: 390, height: 844 }, ...options });
    const page = await context.newPage();
    const requests = [];
    page.on("request", request => { if (/\.mp4(?:\?|$)/.test(request.url())) requests.push(request.url()); });
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    for (const [route, container, poster] of momentRoutes) {
      const response = await page.goto(base + route);
      assert.equal(response.status(), 200);
      assert.equal(/<video\b/.test(await response.text()), false, "Static HTML must not autoplay before browser detection");
      await page.locator(".clone-nav-panel-title").waitFor({ state: "attached" });
      await page.locator(poster).waitFor({ state: "visible" });
      assert.equal(await page.locator(`${container} video`).count(), 0, `${name} must not mount a native decorative video`);
      const loaded = await page.locator(poster).evaluate(image => image.complete && image.naturalWidth > 0);
      assert.equal(loaded, true, "The replacement poster must load");
    }
    const response = await page.goto(base + "/");
    assert.equal(response.status(), 200);
    await page.locator(".clone-nav-panel-title").waitFor({ state: "attached" });
    await page.locator("canvas.slh-video-canvas").waitFor({ state: "attached" });
    assert.equal(await page.locator(".slh-video-layer video").count(), 0, `${name} must render the canvas sky instead of a video`);
    const painted = await page.locator("canvas.slh-video-canvas").evaluate(canvas => canvas.width > 8 && canvas.height > 8);
    assert.equal(painted, true, "The canvas sky must be backed by a real drawing surface");
    if (name === "reduced-motion") {
      const first = await page.locator("canvas.slh-video-canvas").evaluate(canvas => canvas.toDataURL());
      await page.waitForTimeout(600);
      const second = await page.locator("canvas.slh-video-canvas").evaluate(canvas => canvas.toDataURL());
      assert.equal(first, second, "Reduced-motion visitors get a still star map");
    }
    await page.locator(".ns-btn").click();
    await page.locator(".ns-opt").filter({ hasText: "赛博编程" }).click();
    assert.equal(await page.locator("html").getAttribute("data-doc-theme"), "cyber");
    await page.locator(".ns-btn").click();
    await page.locator(".ns-opt").filter({ hasText: "星空极光" }).click();
    await page.locator("canvas.slh-video-canvas").waitFor({ state: "visible" });
    await page.evaluate(() => document.dispatchEvent(new Event("visibilitychange")));
    await page.locator(".VPNavBarHamburger").click();
    await page.locator('.clone-mobile-menu a[href="/about/"]').waitFor({ state: "visible" });
    await page.locator(".VPNavBarHamburger").click();
    await page.locator(".DocSearch-Button").click();
    await page.locator(".clone-search-box").waitFor({ state: "visible" });
    await page.keyboard.press("Escape");
    if (name === "baidu-android") await page.screenshot({ path: "artifacts/background-video/home.png" });
    assert.deepEqual(requests, [], "Fallback browsers must not download any background MP4");
    await context.close();
  }

  for (const [name, options] of [
    ["desktop", { viewport: { width: 1600, height: 1000 } }],
    ["mobile-chrome", { viewport: { width: 390, height: 844 }, userAgent: android, isMobile: true, hasTouch: true }],
  ]) {
    const context = await browser.newContext(options);
    const page = await context.newPage();
    page.on("pageerror", error => errors.push(`${name}: ${error.message}`));
    await page.goto(base + "/");
    const sky = page.locator("canvas.slh-video-canvas");
    await sky.waitFor({ state: "visible" });
    const backing = await sky.evaluate(canvas => ({ width: canvas.width, css: canvas.clientWidth }));
    assert.ok(backing.width >= backing.css, "The sky must render at or above CSS resolution");
    const first = await sky.evaluate(canvas => canvas.toDataURL());
    await page.waitForTimeout(700);
    const second = await sky.evaluate(canvas => canvas.toDataURL());
    assert.notEqual(first, second, "The starry sky must keep drifting and twinkling");
    assert.equal(await page.locator(".slh-video-layer video").count(), 0, "The home backdrop is canvas-only");
    await page.locator(".ns-btn").click();
    await page.locator(".ns-opt").filter({ hasText: "赛博编程" }).click();
    assert.equal(await page.locator(".slh").evaluate(node => getComputedStyle(node).display), "none");
    await page.reload();
    await page.locator(".clone-nav-panel-title").waitFor({ state: "attached" });
    assert.equal(await page.locator("canvas.slh-video-canvas").count(), 0, "A saved cyber theme must not start the hidden starry sky");
    await page.locator(".ns-btn").click();
    await page.locator(".ns-opt").filter({ hasText: "星空极光" }).click();
    await page.locator("canvas.slh-video-canvas").waitFor({ state: "visible" });
    const resumedFirst = await page.locator("canvas.slh-video-canvas").evaluate(canvas => canvas.toDataURL());
    await page.waitForTimeout(700);
    const resumedSecond = await page.locator("canvas.slh-video-canvas").evaluate(canvas => canvas.toDataURL());
    assert.notEqual(resumedFirst, resumedSecond, "Switching back to the starry theme must resume the sky");
    for (const [route, container] of momentRoutes) {
      await page.goto(base + route);
      const video = page.locator(`${container} video`);
      await video.waitFor({ state: "visible" });
      await page.waitForFunction(selector => document.querySelector(selector)?.readyState >= 2, `${container} video`);
      assert.equal(await video.evaluate(video => video.muted && video.playsInline && !video.controls), true, "Compatible browsers must keep muted inline backgrounds");
      assert.equal(await video.getAttribute("webkit-playsinline"), "");
      assert.equal(await video.getAttribute("x5-playsinline"), "");
      await page.waitForFunction(selector => document.querySelector(selector)?.currentTime > 0, `${container} video`);
    }
    await context.close();
  }

  assert.deepEqual(errors, []);
  console.log("Backgrounds passed: home renders only the live canvas sky (no MP4); fallback browsers and reduced motion stay static; theme switching stops/restores the sky; moment pages keep their guarded inline videos.");
} finally { await browser.close(); }
