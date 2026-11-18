"use client";

import { useEffect } from "react";
import { enhancePageEnter } from "@/lib/page-enter";

/** Runs the shared entrance reveal for pages outside the content site shell. */
export default function PageEnter({ selector }: { selector: string }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>(selector);
    if (!root) return;
    return enhancePageEnter(root);
  }, [selector]);
  return null;
}