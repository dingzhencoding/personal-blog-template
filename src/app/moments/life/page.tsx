// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/app/globals.css";
import { pageMetadata } from "@/lib/site";
import ContentSiteShell from "@/components/content/ContentSiteShell";
import { LifeTimeline } from "@/components/content/LifeTimeline";
import { LifeMarkdown } from "@/components/content/Markdown";
import { listEntries } from "@/lib/content/static";

export const metadata = pageMetadata({
  title: "日常生活记录",
  description: "日常生活记录 · 把日子里值得留住的片刻慢慢记下来。",
  path: "/moments/life/",
});

export default function LifePage() {
  const entries = listEntries("moment");
  return <ContentSiteShell path="/moments/life/">
    <LifeTimeline entries={entries} bodies={Object.fromEntries(entries.map(entry => [entry.id, <LifeMarkdown key={entry.id} source={entry.bodyMd} />]))} />
  </ContentSiteShell>;
}
