import ContentSiteShell from "@/components/content/ContentSiteShell";
import { LifeTimeline } from "@/components/content/LifeTimeline";
import { listEntries } from "@/lib/content/static";

export const metadata = {
  title: "日常生活记录 · 个人博客",
  description: "日常生活记录 · 把日子里值得留住的片刻慢慢记下来。",
  alternates: { canonical: "/moments/life/" },
};

export default function LifePage() {
  const entries = listEntries("moment");
  return <ContentSiteShell path="/moments/life/">
    <LifeTimeline entries={entries} />
  </ContentSiteShell>;
}
