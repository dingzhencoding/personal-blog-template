// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/styles/theme.about.generated.css";
import "@/app/globals.css";
import CapturedPage, { capturedPageMetadata } from "@/components/content/CapturedPage";

const path = "/about/";
const captureKey = "about-4f10f17b";

export const metadata = capturedPageMetadata(captureKey, path, "关于 · 站点主人的自我介绍、技能栈与联系方式。");

export default function AboutPage() {
  return <CapturedPage captureKey={captureKey} path={path} />;
}
