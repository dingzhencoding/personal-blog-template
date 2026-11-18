import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";

export const rawHtmlCacheDir = join(process.cwd(), ".next-raw-html");

/**
 * Server-renders a large static HTML fragment without duplicating it.
 *
 * Markup passed through dangerouslySetInnerHTML is serialized twice by a static
 * export: once in the HTML and again inside the inline RSC payload. In
 * production this renders a placeholder comment instead and stores the markup;
 * scripts/finalize-export.mjs then writes it into the exported HTML files only.
 * React does not compare innerHTML while hydrating, so the injected markup is
 * kept. The site only uses full page loads (no client-side route transitions),
 * so the RSC payload is never used to re-render these fragments.
 */
export default function RawHtml({ id, html, className, domId }: { id: string; html: string; className?: string; domId?: string }) {
  if (!/^[\w-]+$/.test(id)) throw new Error(`Invalid raw HTML id: ${id}`);
  let content = html;
  if (process.env.NODE_ENV === "production") {
    mkdirSync(rawHtmlCacheDir, { recursive: true });
    writeFileSync(join(rawHtmlCacheDir, `${id}.html`), html);
    content = `<!--raw-html:${id}-->`;
  }
  return <div id={domId} className={className} suppressHydrationWarning dangerouslySetInnerHTML={{ __html: content }} />;
}
