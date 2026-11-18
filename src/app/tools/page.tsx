// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/styles/theme.tools.generated.css";
import "@/app/globals.css";
import CapturedPage, { capturedPageMetadata } from "@/components/content/CapturedPage";

const path = "/tools/";
const captureKey = "tools-cc6427ba";

export const metadata = capturedPageMetadata(captureKey, path, "工具 · 正在使用的 AI 编程与效率工具合集，附真实使用体验。");

export default function ToolsPage() {
  return <CapturedPage captureKey={captureKey} path={path} />;
}
