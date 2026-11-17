import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import { notFound } from "next/navigation";
import PageEnhancements from "@/components/sites/yihanglizi-cn-bc4c2f76/shared/PageEnhancements";

const site = "src/components/sites/yihanglizi-cn-bc4c2f76";
const pages: Record<string, string> = {
  "/friends/": "friends-74954218",
  "/tools/": "tools-cc6427ba",
  "/about/": "about-4f10f17b",
  "/resume/": "resume-d4be9fa6",
};
const descriptions: Record<string, string> = {
  "/friends/": "友链 · 与同好站点在同一片星光下连接，互换访问与灵感。",
  "/tools/": "工具 · 正在使用的 AI 编程与效率工具合集，附真实使用体验。",
  "/about/": "关于 · 站点主人的自我介绍、技能栈与联系方式。",
  "/resume/": "简历 · 求职历程、教育背景与项目经历。",
};

function routeFor(slug: string[]) {
  const path = `/${slug.join("/")}`;
  return path.endsWith(".html") ? path : `${path}/`;
}

export function generateStaticParams() {
  return Object.keys(pages).map(path => ({ slug: path.replace(/^\/+|\/+$/g, "").split("/") }));
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string[] }> }): Promise<Metadata> {
  const path = routeFor((await params).slug);
  const key = pages[path];
  if (!key) return {};
  const meta = JSON.parse(readFileSync(join(process.cwd(), site, key, "meta.json"), "utf8")) as { title: string };
  const description = descriptions[path];
  return {
    title: meta.title,
    description,
    alternates: { canonical: path },
    openGraph: { title: meta.title, description, url: path },
  };
}

export default async function SitePage({ params }: { params: Promise<{ slug: string[] }> }) {
  const path = routeFor((await params).slug);
  const key = pages[path];
  if (!key) notFound();
  const markup = readFileSync(join(process.cwd(), site, key, "markup.html"), "utf8")
    .replace(/<img\b(?![^>]*\bloading\s*=)/g, '<img loading="lazy" decoding="async"');
  return <><div id="app" dangerouslySetInnerHTML={{ __html: markup }} /><PageEnhancements path={path} /></>;
}
