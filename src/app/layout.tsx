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

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const fontBootstrap = `(${bootstrapOptionalFont.toString()})("/sites/yihanglizi-cn-bc4c2f76/root-8a5edab2/assets/inter.woff2");`;
  return <html lang="zh-CN" className="dark" suppressHydrationWarning><head><script dangerouslySetInnerHTML={{ __html: "try{var version='starry-default-v2';var savedVersion=localStorage.getItem('clone-site-theme-default');var choice=localStorage.getItem('clone-site-theme');if(savedVersion!==version){choice='星空极光';localStorage.setItem('clone-site-theme',choice);localStorage.setItem('clone-site-theme-default',version)}choice=choice||'星空极光';document.documentElement.dataset.docTheme=choice==='星空极光'?'starry':'cyber'}catch(e){document.documentElement.dataset.docTheme='starry'}" }} /><script dangerouslySetInnerHTML={{ __html: fontBootstrap }} /></head><body>{children}<CatPet /></body></html>;
}
