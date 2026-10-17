import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

const appUrl = getSiteUrl();

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/"],
      disallow: ["/api/"]
    },
    sitemap: `${appUrl.replace(/\/$/, "")}/sitemap.xml`
  };
}
