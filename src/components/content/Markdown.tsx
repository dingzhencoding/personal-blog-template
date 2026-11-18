import type { ComponentPropsWithoutRef, ReactNode } from "react";
import { isValidElement } from "react";
import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import CodeBlock from "./CodeBlock";
import MermaidDiagram from "./MermaidDiagram";

// Markdown is rendered on the server so react-markdown never ships to the
// browser; only the interactive pieces (code copy, Mermaid) are client code.

export function slugForHeading(title: string, used: Map<string, number>): string {
  const stem = title.toLocaleLowerCase()
    .replace(/[\p{P}\p{S}]/gu, " ")
    .trim()
    .replace(/\s+/g, "-") || "section";
  const count = used.get(stem) ?? 0;
  used.set(stem, count + 1);
  return count ? `${stem}-${count + 1}` : stem;
}

export function nodeText(node: ReactNode): string {
  if (typeof node === "string" || typeof node === "number") return String(node);
  if (Array.isArray(node)) return node.map(nodeText).join("");
  if (isValidElement<{ children?: ReactNode }>(node)) return nodeText(node.props.children);
  return "";
}

type MarkdownElementProps<T extends keyof React.JSX.IntrinsicElements> = ComponentPropsWithoutRef<T> & { node?: unknown };

export function MarkdownPre({ children, node: _node, ...props }: MarkdownElementProps<"pre">) {
  const child = Array.isArray(children) ? children[0] : children;
  if (isValidElement<{ className?: string; children?: ReactNode }>(child)
    && /language-(?:mermaid|mer)(?:\s|$)/.test(child.props.className ?? "")) {
    return <MermaidDiagram chart={nodeText(child.props.children).replace(/\n$/, "")} />;
  }
  return <CodeBlock {...props}>{children}</CodeBlock>;
}

/** Article body: anchored headings, copyable code blocks and Mermaid diagrams. */
export function ArticleMarkdown({ source }: { source: string }) {
  const used = new Map<string, number>();
  const heading = (depth: number, children: ReactNode) => {
    const Tag = `h${depth}` as "h1" | "h2" | "h3" | "h4" | "h5" | "h6";
    return <Tag id={slugForHeading(nodeText(children).trim(), used)}>{children}</Tag>;
  };
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      skipHtml
      components={{
        pre: MarkdownPre,
        h1: ({ children }) => heading(1, children),
        h2: ({ children }) => heading(2, children),
        h3: ({ children }) => heading(3, children),
        h4: ({ children }) => heading(4, children),
        h5: ({ children }) => heading(5, children),
        h6: ({ children }) => heading(6, children),
      }}
    >{source}</ReactMarkdown>
  );
}

/** Life record body. Images open in the timeline lightbox via data-lightbox-src. */
export function LifeMarkdown({ source }: { source: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        img: ({ src, alt }) => {
          if (typeof src !== "string" || !src) return null;
          const label = alt || "记录图片";
          return (
            <button className="life-timeline__inline-image" type="button" aria-label={`查看图片：${label}`} data-lightbox-src={src} data-lightbox-alt={label}>
              <img src={src} alt={label} loading="lazy" />
            </button>
          );
        },
      }}
    >{source}</ReactMarkdown>
  );
}
