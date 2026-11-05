import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { resolveSiteUrl, toAbsoluteUrl } from "@/lib/seo/site-url";

export const dynamic = "force-dynamic";

export default function robots(): MetadataRoute.Robots {
  const siteUrl = resolveSiteUrl();

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      disallow: [`${siteConfig.adminPath}/`, siteConfig.adminPath, "/api/"],
    },
    sitemap: toAbsoluteUrl("/sitemap.xml", siteUrl),
    host: siteUrl.origin,
  };
}
