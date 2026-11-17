import Link from "next/link";

export default function NotFound() {
  return (
    <main className="not-found">
      <div>
        <p className="not-found__code">404</p>
        <h1 className="not-found__title">这片星域还没有被观测到</h1>
        <p className="not-found__desc">
          你要找的页面不存在，或者已经随着星轨移动到了别处。
          回到首页继续观星，或去技术记录里翻翻已有的星历。
        </p>
        <div className="not-found__actions">
          <Link className="primary" href="/">返回首页</Link>
          <Link href="/moments/tech/">技术学习记录</Link>
          <Link href="/moments/life/">日常生活记录</Link>
        </div>
      </div>
    </main>
  );
}