import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SchoolLegalPage } from "@/components/school-legal-page";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const school = await getSchoolBySlug(slug);
  if (!school) return { title: "School not found" };
  return { title: `${school.name} Cookie Policy`, description: `Cookie and browser storage policy for ${school.name} grade portal.`, alternates: { canonical: `/s/${school.slug}/cookies` } };
}
export default async function TenantCookiesPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const school = await getSchoolBySlug(slug); if (!school) notFound(); return <SchoolLegalPage school={toPublicSchool(school)} kind="cookies" />; }
