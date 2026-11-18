import { existsSync, unlinkSync, rmdirSync, readdirSync, readFileSync, statSync, writeFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

// Inject fragments that src/components/content/RawHtml.tsx kept out of the RSC
// payload. Every placeholder must resolve, or the page would ship empty.
const rawHtmlDir = resolve(".next-raw-html");
const rawHtml = id => {
  const file = join(rawHtmlDir, `${id}.html`);
  if (!existsSync(file)) throw new Error(`Missing raw HTML fragment "${id}" (${file})`);
  return readFileSync(file, "utf8");
};
let injected = 0;
const injectRawHtml = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) injectRawHtml(full);
    else if (entry.name.endsWith(".html")) {
      const html = readFileSync(full, "utf8");
      if (!html.includes("<!--raw-html:")) continue;
      writeFileSync(full, html.replace(/<!--raw-html:([\w-]+)-->/g, (_, id) => { injected++; return rawHtml(id); }));
    }
  }
};
injectRawHtml(resolve("out"));
console.log(`finalize-export: injected ${injected} raw HTML fragments`);

// Next.js requires a parameter to export an otherwise empty dynamic route.
// Its reserved 404 placeholder is a build detail and must not be published.
const placeholder = resolve("out/moments/tech/__empty");
if (existsSync(placeholder)) {
  for (const filename of ["index.html", "index.txt"]) {
    const file = join(placeholder, filename);
    if (existsSync(file)) unlinkSync(file);
  }
  rmdirSync(placeholder);
}

const origin = "https://blog.noova.cloud";
const outDir = resolve("out");
const urls = [];
const walk = dir => {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const full = join(dir, entry.name);
    if (entry.isDirectory()) walk(full);
    else if (entry.name === "index.html") {
      const route = relative(outDir, dir).split("\\").join("/");
      if (route === "404" || route === "write") continue;
      urls.push({ loc: `${origin}/${route ? `${route}/` : ""}`, lastmod: statSync(full).mtime.toISOString().slice(0, 10) });
    }
  }
};
walk(outDir);
urls.sort((a, b) => a.loc.localeCompare(b.loc));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, lastmod }) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`;
writeFileSync(join(outDir, "sitemap.xml"), sitemap);
