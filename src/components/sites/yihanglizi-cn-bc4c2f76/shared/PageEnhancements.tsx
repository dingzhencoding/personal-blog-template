"use client";

import { useEffect } from "react";
import { enhancePageEnter } from "@/lib/page-enter";
import { enhanceNav } from "../root-8a5edab2/nav";
import { enhanceBrandWord } from "../root-8a5edab2/brand";
import { enhanceFriends } from "./friends";
import { enhanceAssets } from "./assets";
import { enhanceBackground } from "./background";
import { enhanceTools } from "./tools";

export default function PageEnhancements({ path }: { path: string; managed?: boolean }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("#app .Layout");
    if (!root) return;
    const cleanup = [enhanceBrandWord(root), enhanceNav(root, ""), enhanceAssets(root), enhanceBackground(root)];
    if (path === "/friends/") cleanup.push(enhanceFriends(root));
    // Tools re-renders its own markup on every navigation, so it owns its reveal.
    if (path === "/tools/") cleanup.push(enhanceTools(root));
    else cleanup.push(enhancePageEnter(root));
    return () => cleanup.forEach(fn => fn());
  }, [path]);
  return null;
}
