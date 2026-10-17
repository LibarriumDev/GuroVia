import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
import { SchoolLandingPage } from "@/components/school-landing-page";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) return { title: "School not found" };
  return { title: `${school.name} Gradebook`, description: `Student and teacher grade portal for ${school.name}.`, alternates: { canonical: `/s/${school.slug}` }, robots: { index: true, follow: true }, openGraph: { type: "website", siteName: `${school.name} Gradebook`, title: `${school.name} Gradebook`, description: `Student and teacher grade portal for ${school.name}.`, images: school.logo_path ? [{ url: `/api/schools/${encodeURIComponent(school.slug)}/logo`, alt: `${school.name} logo` }] : undefined }, twitter: { card: "summary", title: `${school.name} Gradebook`, description: `Student and teacher grade portal for ${school.name}.` } };
}
export default async function SchoolHome({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) notFound();
  return <SchoolLandingPage school={toPublicSchool(school)} />;
}
