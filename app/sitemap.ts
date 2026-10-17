import type { MetadataRoute } from "next";
import { getSiteUrl } from "@/lib/site-url";
import { listActiveSchoolDirectory } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";
const appUrl = getSiteUrl().replace(/\/$/, "");

export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const basePages: MetadataRoute.Sitemap = [
    { url: `${appUrl}/`, changeFrequency: "weekly", priority: 1 },
    { url: `${appUrl}/contact`, changeFrequency: "yearly", priority: 0.4 },
    { url: `${appUrl}/privacy`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/terms`, changeFrequency: "yearly", priority: 0.3 },
    { url: `${appUrl}/agreement`, changeFrequency: "yearly", priority: 0.25 },
    { url: `${appUrl}/cookies`, changeFrequency: "yearly", priority: 0.25 }
  ];
  const schools = await listActiveSchoolDirectory();
  const schoolPages: MetadataRoute.Sitemap = schools.flatMap((school) => [
    { url: `${appUrl}/s/${encodeURIComponent(school.slug)}`, changeFrequency: "weekly", priority: 0.8 },
    { url: `${appUrl}/s/${encodeURIComponent(school.slug)}/privacy`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/s/${encodeURIComponent(school.slug)}/terms`, changeFrequency: "yearly", priority: 0.2 },
    { url: `${appUrl}/s/${encodeURIComponent(school.slug)}/agreement`, changeFrequency: "yearly", priority: 0.15 },
    { url: `${appUrl}/s/${encodeURIComponent(school.slug)}/cookies`, changeFrequency: "yearly", priority: 0.15 }
  ]);
  return [...basePages, ...schoolPages];
}
