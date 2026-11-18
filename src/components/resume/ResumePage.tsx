import type { CSSProperties } from "react";
import type { ResumeSource } from "@/lib/content/resume";
import PdfViewer from "./PdfViewer";
import ResumeEffects from "./ResumeEffects";
import "./Resume.css";

// Hide reveal targets only when JS runs and motion is allowed, before paint.
const effectsBootstrap = "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.currentScript.parentElement.dataset.effects='on'}catch(e){}";

const delay = (index: number) => ({ "--i": index }) as CSSProperties;

function Hero({ pdf, updated }: { pdf: string | null; updated: string }) {
  return (
    <header className="rs-hero rs-hero--compact">
      <div className="rs-aurora" aria-hidden="true"><i /><i /><i /></div>
      <div className="rs-hero-orbit" aria-hidden="true"><i /><i /></div>
      <div className="rs-hero-copy rs-hero-copy--center">
        <p className="rs-eyebrow" data-reveal style={delay(0)}><span aria-hidden="true">✦</span> RESUME · 个人简历</p>
        <h1 className="rs-name" data-reveal style={delay(1)}>{pdf ? "个人简历" : "简历整理中"}</h1>
        <p className="rs-summary" data-reveal style={delay(2)}>
          {pdf ? "完整履历见下方 PDF，支持在线预览、下载与新窗口查看。" : "新的履历正在星图上标注，稍后再来看看。"}
        </p>
        {pdf && (
          <div className="rs-actions" data-reveal style={delay(3)}>
            <a className="rs-btn rs-btn--primary" href={pdf} download><span aria-hidden="true">↓</span> 下载 PDF</a>
            {updated && <span className="rs-updated"><i aria-hidden="true" />更新于 {updated}</span>}
          </div>
        )}
      </div>
      {pdf && (
        <a className="rs-scroll-hint" href="#resume-pdf" data-reveal style={delay(4)}>
          <span>在线预览</span><i aria-hidden="true">↓</i>
        </a>
      )}
    </header>
  );
}

export default function ResumePage({ source }: { source: ResumeSource }) {
  const { pdf, pdfUpdated } = source;
  return (
    <main className="rs" suppressHydrationWarning>
      <script dangerouslySetInnerHTML={{ __html: effectsBootstrap }} />
      <Hero pdf={pdf} updated={pdfUpdated} />
      {pdf && (
        <section className="rs-section" id="pdf" aria-label="PDF 简历">
          <PdfViewer src={pdf} autoLoad />
        </section>
      )}
      {pdf && pdfUpdated && <footer className="rs-foot"><i aria-hidden="true" />最后更新 · {pdfUpdated}</footer>}
      <ResumeEffects />
    </main>
  );
}