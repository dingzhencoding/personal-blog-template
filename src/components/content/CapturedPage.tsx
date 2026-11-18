import { readFileSync } from "node:fs";
import { join } from "node:path";
import type { Metadata } from "next";
import PageEnhancements from "@/components/sites/yihanglizi-cn-bc4c2f76/shared/PageEnhancements";
import RawHtml from "@/components/content/RawHtml";
import { pageMetadata } from "@/lib/site";

const siteDir = join(process.cwd(), "src/components/sites/yihanglizi-cn-bc4c2f76");

export function capturedPageMetadata(key: string, path: string, description: string): Metadata {
  // Captured titles look like "关于 | 个人博客"; the layout template adds the site name.
  const title = (JSON.parse(readFileSync(join(siteDir, key, "meta.json"), "utf8")) as { title: string }).title.split(" | ")[0];
  return pageMetadata({ title, description, path });
}

/** A page whose markup was captured from the original theme, enhanced on the client. */
export default function CapturedPage({ captureKey, path }: { captureKey: string; path: string }) {
  const markup = readFileSync(join(siteDir, captureKey, "markup.html"), "utf8")
    .replace(/<img\b(?![^>]*\bloading\s*=)/g, '<img loading="lazy" decoding="async"');
  return <>
    <RawHtml id={captureKey} domId="app" html={markup} />
    <PageEnhancements path={path} />
  </>;
}
