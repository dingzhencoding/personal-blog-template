import { existsSync, unlinkSync, rmdirSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { resolve, join, relative } from "node:path";

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
      if (route === "404") continue;
      urls.push({ loc: `${origin}/${route ? `${route}/` : ""}`, lastmod: statSync(full).mtime.toISOString().slice(0, 10) });
    }
  }
};
walk(outDir);
urls.sort((a, b) => a.loc.localeCompare(b.loc));
const sitemap = `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.map(({ loc, lastmod }) => `  <url><loc>${loc}</loc><lastmod>${lastmod}</lastmod></url>`).join("\n")}\n</urlset>\n`;
writeFileSync(join(outDir, "sitemap.xml"), sitemap);
