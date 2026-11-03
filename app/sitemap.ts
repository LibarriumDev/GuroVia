import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";

export const dynamic = "force-dynamic";
const appUrl = getSiteUrl().replace(/\/$/, "");

export default function sitemap(): MetadataRoute.Sitemap {
  // School portals are discoverable only through exact School ID search and must not be listed here.
  return [
    { url: `${appUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/schools/find`, changeFrequency: "monthly", priority: 0.7 },
    { url: `${appUrl}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${appUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/agreement`, changeFrequency: "yearly", priority: 0.25 },
    { url: `${appUrl}/cookies`, changeFrequency: "yearly", priority: 0.25 }
  ];
}
