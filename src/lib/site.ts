/** Site-wide identity. Change the name here to rename the whole site. */
export const site = {
  name: "个人博客",
  description: "记录技术学习与日常生活的个人博客",
  url: "https://blog.noova.cloud",
  shareImage: "/media/starlight-orbit-poster.jpg",
  themeColor: "#05060e",
} as const;

/**
 * Metadata for a page. Next.js replaces (does not merge) the layout's
 * openGraph object, so the shared image and site name are repeated here.
 */
export function pageMetadata({ title, description, path, type = "website" }: {
  title: string;
  description: string;
  path: string;
  type?: "website" | "article" | "profile";
}) {
  return {
    title,
    description,
    alternates: { canonical: path },
    openGraph: {
      type,
      siteName: site.name,
      title: `${title} · ${site.name}`,
      description,
      url: path,
      locale: "zh_CN",
      images: [{ url: site.shareImage, width: 1280, height: 933, alt: site.name }],
    },
  };
}
