"use client";

import { useEffect } from "react";
import { enhanceNav } from "../root-8a5edab2/nav";
import { enhanceFriends } from "./friends";
import { enhanceAssets } from "./assets";
import { enhanceBackground } from "./background";
import { enhanceTools } from "./tools";

export default function PageEnhancements({ path }: { path: string; managed?: boolean }) {
  useEffect(() => {
    const root = document.querySelector<HTMLElement>("#app .Layout");
    if (!root) return;
    const cleanup = [enhanceNav(root, ""), enhanceAssets(root), enhanceBackground(root)];
    if (path === "/friends/") cleanup.push(enhanceFriends(root));
    if (path === "/tools/") cleanup.push(enhanceTools(root));
    return () => cleanup.forEach(fn => fn());
  }, [path]);
  return null;
}
