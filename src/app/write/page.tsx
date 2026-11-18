// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/app/globals.css";
import ContentSiteShell from "@/components/content/ContentSiteShell";
import ContentEditor from "@/components/content/ContentEditor";

export const metadata = {
  title: "内容管理",
  robots: { index: false, follow: false },
};

export default function WritePage() {
  return <ContentSiteShell path="/write/"><ContentEditor /></ContentSiteShell>;
}