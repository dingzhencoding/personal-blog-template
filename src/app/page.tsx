// Cascade order matters: the layout loads the shared theme, then the page
// theme and the site overrides load here.
import "@/styles/theme.home.generated.css";
import "@/app/globals.css";
import { readFileSync } from "node:fs";
import { join } from "node:path";
import RawHtml from "@/components/content/RawHtml";
import ClientEnhancements from "@/components/sites/yihanglizi-cn-bc4c2f76/root-8a5edab2/ClientEnhancements";
import { starPoster, startStarBackdrop } from "@/lib/star-backdrop";

export default function Home() {
  const markup = readFileSync(
    join(process.cwd(), "src/components/sites/yihanglizi-cn-bc4c2f76/root-8a5edab2/markup.html"),
    "utf8",
  );
  const starMarkup = readFileSync(
    join(process.cwd(), "src/components/sites/yihanglizi-cn-bc4c2f76/root-8a5edab2/starry.html"),
    "utf8",
  );
  const orbitBackground = `<div class="slh-video-layer" aria-hidden="true"><img class="slh-video slh-video-poster" src="${starPoster}" alt="" decoding="async" fetchpriority="high"></div>`;
  const starHome = starMarkup.replace(/(<div[^>]*class="slh"[^>]*>)/, `$1${orbitBackground}`);
  const insertionPoint = "</footer></div><!----><!----><!----></div></div></div><!--[--><!--]--></div></div><footer";
  if (!markup.includes(insertionPoint)) throw new Error("Home theme insertion point is missing");
  const homeMarkup = markup.replace(insertionPoint, `</footer></div><!----><!----><!----></div>${starHome}</div></div><!--[--><!--]--></div></div><footer`);
  const bootstrap = `if(document.documentElement.dataset.docTheme==="starry")(${startStarBackdrop.toString()})(document.querySelector(".slh-video-layer"));`;
  return <><RawHtml id="home" domId="app" html={homeMarkup} /><script dangerouslySetInnerHTML={{ __html: bootstrap }} /><ClientEnhancements /></>;
}
