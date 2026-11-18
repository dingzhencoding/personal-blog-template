"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type * as PdfJs from "pdfjs-dist";

type Status = "idle" | "loading" | "ready" | "error";

const vendor = "/vendor/pdfjs";
export const openPdfEvent = "resume:open-pdf";

let pdfjsPromise: Promise<typeof PdfJs> | null = null;
function loadPdfJs(): Promise<typeof PdfJs> {
  // Served from public/ (see scripts/prepare-resume.mjs) and imported natively,
  // so the ~1.8 MB viewer is only downloaded when someone opens the PDF.
  const url = `${vendor}/pdf.min.js`;
  pdfjsPromise ??= (import(/* webpackIgnore: true */ url) as Promise<typeof PdfJs>).then(pdfjs => {
    pdfjs.GlobalWorkerOptions.workerSrc = `${vendor}/pdf.worker.min.js`;
    return pdfjs;
  }).catch(error => { pdfjsPromise = null; throw error; });
  return pdfjsPromise;
}

/** Renders every page of a PDF to canvas, fit to the container width. */
export default function PdfViewer({ src, autoLoad }: { src: string; autoLoad: boolean }) {
  const rootRef = useRef<HTMLDivElement>(null);
  const pagesRef = useRef<HTMLDivElement>(null);
  const docRef = useRef<PdfJs.PDFDocumentProxy | null>(null);
  const taskRef = useRef<PdfJs.PDFDocumentLoadingTask | null>(null);
  const renderId = useRef(0);
  const [status, setStatus] = useState<Status>("idle");
  const [pageCount, setPageCount] = useState(0);
  const [error, setError] = useState("");

  const render = useCallback(async () => {
    const doc = docRef.current;
    const host = pagesRef.current;
    if (!doc || !host) return;
    const id = ++renderId.current;
    const width = host.clientWidth;
    const ratio = Math.min(window.devicePixelRatio || 1, 2);
    const reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    host.replaceChildren();
    for (let number = 1; number <= doc.numPages; number++) {
      const page = await doc.getPage(number);
      if (id !== renderId.current) return;
      const base = page.getViewport({ scale: 1 });
      const viewport = page.getViewport({ scale: width / base.width });
      const frame = document.createElement("div");
      frame.className = "rs-pdf-page";
      frame.style.aspectRatio = `${base.width} / ${base.height}`;
      frame.style.setProperty("--i", String(number - 1));
      const canvas = document.createElement("canvas");
      canvas.width = Math.floor(viewport.width * ratio);
      canvas.height = Math.floor(viewport.height * ratio);
      canvas.setAttribute("aria-label", `简历第 ${number} 页`);
      canvas.setAttribute("role", "img");
      frame.append(canvas);
      host.append(frame);
      await page.render({ canvas, viewport, transform: ratio === 1 ? undefined : [ratio, 0, 0, ratio, 0, 0] }).promise;
      if (id !== renderId.current) return;
      // Keep links in the PDF (email, GitHub, ...) clickable.
      for (const annotation of await page.getAnnotations()) {
        const url = (annotation as { url?: string }).url;
        if (annotation.subtype !== "Link" || !url || !/^(https?:|mailto:|tel:)/i.test(url)) continue;
        const [ax1, ay1, ax2, ay2] = annotation.rect as number[];
        const [x1, y1] = viewport.convertToViewportPoint(ax1, ay1) as number[];
        const [x2, y2] = viewport.convertToViewportPoint(ax2, ay2) as number[];
        const link = document.createElement("a");
        link.className = "rs-pdf-link";
        link.href = url;
        link.target = "_blank";
        link.rel = "noopener noreferrer";
        link.setAttribute("aria-label", url.replace(/^mailto:/, ""));
        Object.assign(link.style, {
          left: `${(Math.min(x1, x2) / viewport.width) * 100}%`,
          top: `${(Math.min(y1, y2) / viewport.height) * 100}%`,
          width: `${(Math.abs(x2 - x1) / viewport.width) * 100}%`,
          height: `${(Math.abs(y2 - y1) / viewport.height) * 100}%`,
        });
        frame.append(link);
      }
      if (reduceMotion) frame.classList.add("is-rendered");
      else requestAnimationFrame(() => frame.classList.add("is-rendered"));
    }
  }, []);

  const load = useCallback(async () => {
    if (docRef.current || status === "loading") return;
    setStatus("loading");
    try {
      const pdfjs = await loadPdfJs();
      taskRef.current = pdfjs.getDocument({
        url: src,
        cMapUrl: `${vendor}/cmaps/`,
        cMapPacked: true,
        standardFontDataUrl: `${vendor}/standard_fonts/`,
        wasmUrl: `${vendor}/wasm/`,
      });
      const doc = await taskRef.current.promise;
      docRef.current = doc;
      setPageCount(doc.numPages);
      setStatus("ready");
    } catch (cause) {
      setError(cause instanceof Error ? cause.message : String(cause));
      setStatus("error");
    }
  }, [src, status]);

  // Draw once the page container is mounted, and again when its width changes.
  useEffect(() => {
    if (status !== "ready" || !pagesRef.current) return;
    void render();
    let lastWidth = pagesRef.current.clientWidth;
    let timer = 0;
    const observer = new ResizeObserver(([entry]) => {
      const width = entry.contentRect.width;
      if (Math.abs(width - lastWidth) < 24) return;
      lastWidth = width;
      window.clearTimeout(timer);
      timer = window.setTimeout(() => void render(), 220);
    });
    observer.observe(pagesRef.current);
    return () => { observer.disconnect(); window.clearTimeout(timer); renderId.current++; };
  }, [status, render]);

  // Auto-load when scrolled near (PDF-only resumes), or when asked to open.
  useEffect(() => {
    const open = () => {
      void load();
      rootRef.current?.scrollIntoView({ behavior: window.matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth", block: "start" });
    };
    window.addEventListener(openPdfEvent, open);
    let observer: IntersectionObserver | undefined;
    if (autoLoad && rootRef.current) {
      observer = new IntersectionObserver(entries => { if (entries.some(entry => entry.isIntersecting)) { observer?.disconnect(); void load(); } }, { rootMargin: "400px 0px" });
      observer.observe(rootRef.current);
    }
    return () => { window.removeEventListener(openPdfEvent, open); observer?.disconnect(); };
  }, [autoLoad, load]);

  useEffect(() => () => { void taskRef.current?.destroy(); }, []);

  return (
    <div className="rs-pdf" ref={rootRef} id="resume-pdf" data-status={status}>
      <div className="rs-pdf-bar">
        <span className="rs-pdf-title"><i aria-hidden="true">▤</i> PDF 简历{pageCount ? ` · 共 ${pageCount} 页` : ""}</span>
        <span className="rs-pdf-actions">
          <a href={src} download>下载</a>
          <a href={src} target="_blank" rel="noopener">新窗口打开</a>
        </span>
      </div>
      {status === "idle" && (
        <button type="button" className="rs-pdf-open" onClick={() => void load()}>
          <span className="rs-pdf-open-icon" aria-hidden="true">✦</span>
          <span>在页面中查看 PDF</span>
        </button>
      )}
      {status === "loading" && <div className="rs-pdf-loading" role="status"><span aria-hidden="true" />正在展开简历…</div>}
      {status === "error" && (
        <div className="rs-pdf-error" role="alert">
          <strong>PDF 预览加载失败</strong>
          <span>{error || "浏览器暂不支持在线预览"}，可以直接 <a href={src} download>下载 PDF</a> 查看。</span>
        </div>
      )}
      {status === "ready" && <div className="rs-pdf-pages" ref={pagesRef} />}
    </div>
  );
}
