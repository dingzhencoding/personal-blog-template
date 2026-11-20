import type { Metadata, Viewport } from "next";
// Loaded first on every route; page themes and globals.css follow per page.
import "@/styles/theme.shared.generated.css";
import CatPet from "@/components/sites/yihanglizi-cn-bc4c2f76/shared/CatPet";
import { bootstrapOptionalFont } from "@/lib/optional-font";
import { site } from "@/lib/site";

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: { default: site.name, template: `%s · ${site.name}` },
  description: site.description,
  icons: {
    icon: [{ url: "/favicon.ico", sizes: "48x48" }, { url: "/favicon.svg", type: "image/svg+xml" }],
    apple: "/apple-touch-icon.png",
  },
  alternates: { canonical: "/" },
  openGraph: {
    type: "website",
    siteName: site.name,
    title: site.name,
    description: site.description,
    url: "/",
    locale: "zh_CN",
    images: [{ url: site.shareImage, width: 1280, height: 933, alt: `星空极光下的${site.name}` }],
  },
  twitter: { card: "summary_large_image", title: site.name, description: site.description, images: [site.shareImage] },
};

export const viewport: Viewport = { themeColor: site.themeColor };

// Static Pages keeps an HTML copy for ten minutes and drops old hashed assets
// after each deploy, so a cached document can lose its CSS or show a cached 404.
const staleBuildGuard = `(()=>{try{
if(location.search.indexOf('clone-fresh=')>-1)try{var clean=new URL(location.href);clean.searchParams.delete('clone-fresh');history.replaceState(null,'',clean.pathname+(clean.search||'')+clean.hash)}catch(e){}
if(location.pathname.indexOf('/write')===0)return;
var loaded=Date.parse(document.lastModified)||0,last=0,KEY='clone-stale-reload';
function seen(token){try{var list=JSON.parse(sessionStorage.getItem(KEY)||'[]');if(list.indexOf(token)>-1)return true;list.push(token);sessionStorage.setItem(KEY,JSON.stringify(list.slice(-20)));return false}catch(e){return false}}
function refresh(){var next=new URL(location.href);next.searchParams.set('clone-fresh',String(Date.now()));location.replace(next.pathname+next.search+next.hash)}
function check(force){if(document.visibilityState!=='visible')return;var now=Date.now();if(!force&&now-last<60000)return;last=now;
fetch(location.href,{method:'HEAD',cache:'no-store',redirect:'follow'}).then(function(res){if(!res.ok)return;var fresh=Date.parse(res.headers.get('last-modified')||'')||0;var missing=!!document.querySelector('main.not-found');var token=(fresh||'200')+'|'+location.pathname;if((missing||(loaded&&fresh&&fresh>loaded+1000))&&!seen(token))refresh()}).catch(function(){})}
addEventListener('focus',function(){check(false)});addEventListener('pageshow',function(e){check(!!e.persisted)});document.addEventListener('visibilitychange',function(){check(false)});addEventListener('load',function(){setTimeout(function(){check(true)},1500)});setInterval(function(){check(false)},300000);
}catch(e){}})();`;

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontBootstrap = `(${bootstrapOptionalFont.toString()})("/sites/yihanglizi-cn-bc4c2f76/root-8a5edab2/assets/inter.woff2");`;
  return <html lang="zh-CN" className="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var version='starry-default-v2';var savedVersion=localStorage.getItem('clone-site-theme-default');var choice=localStorage.getItem('clone-site-theme');if(savedVersion!==version){choice='星空极光';localStorage.setItem('clone-site-theme',choice);localStorage.setItem('clone-site-theme-default',version)}choice=choice||'星空极光';document.documentElement.dataset.docTheme=choice==='星空极光'?'starry':'cyber'}catch(e){document.documentElement.dataset.docTheme='starry'}" }} /><style dangerouslySetInnerHTML={{ __html: "html[data-doc-theme=starry] .wasteland,html:not([data-doc-theme=starry]) .slh{display:none!important}" }} /><script dangerouslySetInnerHTML={{ __html: "try{if(!matchMedia('(prefers-reduced-motion: reduce)').matches)document.documentElement.dataset.pageEnter='on'}catch(e){}" }} /><script dangerouslySetInnerHTML={{ __html: fontBootstrap }} />{process.env.NODE_ENV === "production" ? <script dangerouslySetInnerHTML={{ __html: staleBuildGuard }} /> : null}</head><body>{children}<CatPet /></body></html>;
}
