import type { ReactNode } from "react";
import PageEnhancements from "@/components/sites/yihanglizi-cn-bc4c2f76/shared/PageEnhancements";
import RawHtml from "@/components/content/RawHtml";
import { navMarkupFor } from "@/lib/site-nav";

export default function ContentSiteShell({ path, children }: { path: string; children: ReactNode }) {
  return <>
    <div id="app">
      <div className="Layout content-site-shell" data-v-5d98c3a5="">
        <div data-v-5dc8c522="" className="doc-bg starry-theme bg-ready" aria-hidden="true">
          <canvas data-v-5dc8c522="" className="bg-canvas active" />
          <div data-v-5dc8c522="" className="bg-overlay" />
          <div data-v-5dc8c522="" className="scanlines" />
          <div data-v-5dc8c522="" className="nebula active" />
        </div>
        <a href="#VPContent" className="VPSkipLink visually-hidden">Skip to content</a>
        <RawHtml id={`nav${path.replace(/\W+/g, "-")}`} className="content-site-shell__nav" html={navMarkupFor(path)} />
        <div className="VPContent" id="VPContent">{children}</div>
      </div>
    </div>
    <PageEnhancements path={path} managed />
  </>;
}
