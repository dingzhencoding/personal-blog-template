import { readFileSync } from "node:fs";
import { join } from "node:path";

const navSource = join(process.cwd(), "src/components/sites/yihanglizi-cn-bc4c2f76/shared/nav.html");

/** Shared site header with the menu entry for `path` marked active. */
export function navMarkupFor(path: string): string {
  const markup = readFileSync(navSource, "utf8")
    .replace(/class="VPFlyout VPNavBarMenuGroup[^"]*"/, `class="VPFlyout VPNavBarMenuGroup${path.startsWith("/moments/") ? " active" : ""}"`)
    .replace(/class="VPLink link( VPNavBarMenuLink)?(?: active)*"( href="([^"]*)")/g, (_match, menu = "", hrefAttr: string, href: string) => {
      const active = href === "/" ? path === "/" : path.startsWith(href);
      return `class="VPLink link${menu}${active ? " active" : ""}"${hrefAttr}`;
    });
  if (!markup.includes("VPNavBar")) throw new Error("Could not find the shared site navigation.");
  return markup;
}
