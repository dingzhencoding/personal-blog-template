// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/app/globals.css";
import PageEnter from "@/components/content/PageEnter";
export default function NotFound() {
  return (
    <main className="not-found">
      <PageEnter selector=".not-found" />
      <div className="page-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div data-enter-hero>
        <p className="not-found__code" data-reveal>404</p>
        <h1 className="not-found__title" data-reveal>这片星域还没有被观测到</h1>
        <p className="not-found__desc" data-reveal>
          你要找的页面不存在，或者已经随着星轨移动到了别处。
          回到首页继续观星，或去技术记录里翻翻已有的星历。
        </p>
        <div className="not-found__actions" data-reveal>
          <a className="primary" href="/">返回首页</a>
          <a href="/moments/tech/">技术学习记录</a>
          <a href="/moments/life/">日常生活记录</a>
        </div>
      </div>
    </main>
  );
}