// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/app/globals.css";
import ContentSiteShell from "@/components/content/ContentSiteShell";
import ResumePage from "@/components/resume/ResumePage";
import { loadResume } from "@/lib/content/resume";
import { pageMetadata } from "@/lib/site";

export function generateMetadata() {
  const { resume } = loadResume();
  const description = resume
    ? [resume.name, resume.roles.join(" / "), resume.summary].filter(Boolean).join(" · ")
    : "简历 · 求职历程、教育背景与项目经历。";
  return pageMetadata({ title: resume ? `${resume.name} · 简历` : "简历", description, path: "/resume/", type: "profile" });
}

export default function Resume() {
  return <ContentSiteShell path="/resume/"><ResumePage source={loadResume()} /></ContentSiteShell>;
}
