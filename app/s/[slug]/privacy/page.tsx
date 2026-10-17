import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SchoolLegalPage } from "@/components/school-legal-page";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const school = await getSchoolBySlug(slug);
  if (!school) return { title: "School not found | GuroVia" };
  return { title: `${school.name} Privacy Policy`, description: `School-specific privacy notice for ${school.name} grade portal.`, alternates: { canonical: `/s/${school.slug}/privacy` }, robots: { index: true, follow: true } };
}
export default async function TenantPrivacyPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const school = await getSchoolBySlug(slug); if (!school) notFound();
  return <SchoolLegalPage school={toPublicSchool(school)} kind="privacy" />;
}
