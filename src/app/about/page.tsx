// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/styles/theme.about.generated.css";
import "@/app/globals.css";
import "@/styles/about-page.css";
import CapturedPage, { capturedPageMetadata } from "@/components/content/CapturedPage";

const path = "/about/";
const captureKey = "about-4f10f17b";

export const metadata = capturedPageMetadata(captureKey, path, "健康注意力表达，代码修身论。");

export default function AboutPage() {
  return <CapturedPage captureKey={captureKey} path={path} />;
}
