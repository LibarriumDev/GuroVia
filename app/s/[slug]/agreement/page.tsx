import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SchoolLegalPage } from "@/components/school-legal-page";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params; const school = await getSchoolBySlug(slug);
  if (!school) return { title: "School not found" };
  return { title: `${school.name} Agreement of Use`, description: `User responsibilities and data-protection agreement for ${school.name}.`, alternates: { canonical: `/s/${school.slug}/agreement` } };
}
export default async function TenantAgreementPage({ params }: { params: Promise<{ slug: string }> }) { const { slug } = await params; const school = await getSchoolBySlug(slug); if (!school) notFound(); return <SchoolLegalPage school={toPublicSchool(school)} kind="agreement" />; }
