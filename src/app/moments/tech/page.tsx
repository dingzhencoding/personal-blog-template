// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/app/globals.css";
import ContentSiteShell from "@/components/content/ContentSiteShell";
import TechArchive from "@/components/content/TechArchive";
import { listEntries } from "@/lib/content/static";

export const metadata = {
  title: "技术学习记录 · 个人博客",
  description: "技术学习记录 · 后端、Agent 与工程实践的学习笔记归档。",
  alternates: { canonical: "/moments/tech/" },
  openGraph: { title: "技术学习记录 · 个人博客", description: "技术学习记录 · 后端、Agent 与工程实践的学习笔记归档。", url: "/moments/tech/" },
};

export default function TechPage() {
  const entries = listEntries("article");
  return <ContentSiteShell path="/moments/tech/">
    <TechArchive entries={entries} />
  </ContentSiteShell>;
}
