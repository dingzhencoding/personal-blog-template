// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/styles/theme.friends.generated.css";
import "@/app/globals.css";
import CapturedPage, { capturedPageMetadata } from "@/components/content/CapturedPage";

const path = "/friends/";
const captureKey = "friends-74954218";

export const metadata = capturedPageMetadata(captureKey, path, "友链 · 与同好站点在同一片星光下连接，互换访问与灵感。");

export default function FriendsPage() {
  return <CapturedPage captureKey={captureKey} path={path} />;
}
