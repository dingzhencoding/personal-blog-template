"use client";

import type { ComponentPropsWithoutRef } from "react";
import { useEffect, useRef, useState } from "react";

/** A fenced code block with a copy button. */
export default function CodeBlock({ children, ...props }: ComponentPropsWithoutRef<"pre">) {
  const preRef = useRef<HTMLPreElement>(null);
  const [copyState, setCopyState] = useState<"idle" | "ok" | "fail">("idle");
  const timerRef = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timerRef.current), []);
  const copy = () => {
    const text = preRef.current?.innerText ?? "";
    const settle = (state: "ok" | "fail") => {
      setCopyState(state);
      window.clearTimeout(timerRef.current);
      timerRef.current = window.setTimeout(() => setCopyState("idle"), 1600);
    };
    navigator.clipboard?.writeText(text).then(() => settle("ok")).catch(() => settle("fail"));
  };
  return (
    <div className="code-block">
      <button type="button" className="code-block__copy" onClick={copy} aria-label="复制代码">
        {copyState === "ok" ? "已复制 ✓" : copyState === "fail" ? "复制失败" : "复制"}
      </button>
      <pre ref={preRef} {...props}>{children}</pre>
    </div>
  );
}
