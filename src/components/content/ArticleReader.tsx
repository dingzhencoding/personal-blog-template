import type { ContentEntry } from "@/lib/content/types";
import ArticleToc, { type HeadingLink } from "./ArticleToc";
import { ArticleMarkdown, slugForHeading } from "./Markdown";
import "./ArticleReader.css";

function stripInlineMarkdown(value: string): string {
  return value
    .replace(/!\[([^\]]*)\]\([^)]*\)/g, "$1")
    .replace(/\[([^\]]+)\]\([^)]*\)/g, "$1")
    .replace(/<[^>]*>/g, "")
    .replace(/[`*_~]/g, "")
    .replace(/\\([\\`*_{}\[\]()#+.!>-])/g, "$1")
    .trim();
}

function extractHeadings(markdown: string): HeadingLink[] {
  const headings: HeadingLink[] = [];
  const used = new Map<string, number>();
  const lines = markdown.split(/\r?\n/);
  let fence: string | null = null;

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const fenceMatch = line.match(/^\s{0,3}(`{3,}|~{3,})/);
    if (fenceMatch) {
      if (!fence) fence = fenceMatch[1];
      else if (fenceMatch[1][0] === fence[0] && fenceMatch[1].length >= fence.length) fence = null;
      continue;
    }
    if (fence) continue;

    const atx = line.match(/^\s{0,3}(#{1,6})\s+(.+?)\s*#*\s*$/);
    const setext = !atx && line.trim() && lines[index + 1]?.match(/^\s{0,3}(=+|-+)\s*$/);
    const depth = atx ? atx[1].length : setext ? (setext[1][0] === "=" ? 1 : 2) : 0;
    const title = stripInlineMarkdown(atx ? atx[2] : setext ? line : "");
    if (depth && title) headings.push({ depth, title, id: slugForHeading(title, used) });
    if (setext) index += 1;
  }
  return headings;
}

function publishedDate(entry: ContentEntry): string {
  const raw = entry.publishedAt ?? entry.createdAt;
  const date = new Date(raw);
  if (Number.isNaN(date.getTime())) return raw;
  const parts = new Intl.DateTimeFormat("en-CA", {
    year: "numeric", month: "2-digit", day: "2-digit", timeZone: "Asia/Shanghai",
  }).formatToParts(date);
  const pick = (type: Intl.DateTimeFormatPartTypes) => parts.find((part) => part.type === type)?.value ?? "";
  return `${pick("year")}-${pick("month")}-${pick("day")}`;
}

export default function ArticleReader({ entry }: { entry: ContentEntry }) {
  const headings = extractHeadings(entry.bodyMd);
  return (
    <main className="article-reader">
      <div className="article-reader__container">
        <div className="article-reader__main">
          <nav className="article-reader__breadcrumb" aria-label="当前位置">
            <a href="/moments/tech/">技术学习记录</a><span aria-hidden="true">/</span><span>{entry.title}</span>
          </nav>

          <article>
            <header className="article-reader__hero">
              <p className="article-reader__eyebrow">TECH JOURNAL · 技术学习</p>
              <h1>{entry.title}</h1>
              {entry.summary && <p className="article-reader__summary">{entry.summary}</p>}
              <div className="article-reader__meta">
                <time dateTime={entry.publishedAt ?? entry.createdAt}>发布于 {publishedDate(entry)}</time>
                {entry.tags.length > 0 && <ul aria-label="文章标签">{entry.tags.map((tag) => <li key={tag}>{tag}</li>)}</ul>}
              </div>
            </header>

            <div className="article-reader__prose">
              <ArticleMarkdown source={entry.bodyMd} />
              <div className="article-reader__endmark" aria-hidden="true">✦</div>
            </div>
          </article>

          <a className="article-reader__back" href="/moments/tech/"><span aria-hidden="true">←</span> 返回文章列表</a>
        </div>

        <ArticleToc title={entry.title} headings={headings} />
      </div>
    </main>
  );
}
