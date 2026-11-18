// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/app/globals.css";
import ContentSiteShell from "@/components/content/ContentSiteShell";
import ResumePage from "@/components/resume/ResumePage";
import { loadResume } from "@/lib/content/resume";
import { pageMetadata } from "@/lib/site";

export function generateMetadata() {
  return pageMetadata({ title: "简历", description: "简历 · PDF 在线预览与下载。", path: "/resume/", type: "profile" });
}

export default function Resume() {
  return <ContentSiteShell path="/resume/"><ResumePage source={loadResume()} /></ContentSiteShell>;
}
