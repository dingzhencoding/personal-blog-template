"use client";

import { useEffect, useState } from "react";

export interface HeadingLink {
  depth: number;
  title: string;
  id: string;
}

/** Table of contents that highlights the heading currently in view. */
export default function ArticleToc({ title, headings }: { title: string; headings: HeadingLink[] }) {
  const headingIds = headings.map(item => item.id).join(",");
  const [activeId, setActiveId] = useState("");
  useEffect(() => {
    const ids = headingIds ? headingIds.split(",") : [];
    const nodes = ids.map(id => document.getElementById(id)).filter((node): node is HTMLElement => node !== null);
    if (!nodes.length) return;
    const observer = new IntersectionObserver(
      entries => {
        for (const item of entries) if (item.isIntersecting) { setActiveId(item.target.id); break; }
      },
      { rootMargin: "-96px 0px -68% 0px" },
    );
    nodes.forEach(node => observer.observe(node));
    return () => observer.disconnect();
  }, [headingIds]);

  return (
    <aside className="article-reader__toc" aria-label="文章目录">
      <div className="article-reader__toc-inner">
        <p className="article-reader__toc-title">{title}</p>
        {headings.length > 0 ? (
          <nav>
            {headings.map((item) => (
              <a
                className={`article-reader__toc-link article-reader__toc-link--depth-${item.depth}${activeId === item.id ? " is-active" : ""}`}
                href={`#${item.id}`}
                aria-current={activeId === item.id ? "location" : undefined}
                key={item.id}
              >{item.title}</a>
            ))}
          </nav>
        ) : <p className="article-reader__toc-empty">这篇文章暂无小标题</p>}
      </div>
    </aside>
  );
}
