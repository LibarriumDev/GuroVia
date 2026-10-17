import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { SchoolManager } from "@/components/school-manager";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  return {
    title: school ? `${school.short_name} — School access management` : "School not found",
    description: school ? `School staff access management for ${school.name}.` : "School access management",
    robots: { index: false, follow: false, nocache: true }
  };
}
export const dynamic = "force-dynamic";
export default async function TenantManagePage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const school = await getSchoolBySlug(slug); if (!school) notFound();
  return <SchoolManager school={toPublicSchool(school)} />;
}
