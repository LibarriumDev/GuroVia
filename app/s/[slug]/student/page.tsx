import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StudentPortal } from "@/components/student-portal";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
import { getRenderDateSnapshot } from "@/lib/render-date";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  return {
    title: school ? `${school.short_name} — Student portal` : "School not found",
    description: school ? `Student grade lookup and registration for ${school.name}.` : "School portal",
    robots: { index: false, follow: false, nocache: true }
  };
}
export const dynamic = "force-dynamic";
export default async function TenantStudentPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const [school, snapshot] = await Promise.all([getSchoolBySlug(slug), Promise.resolve(getRenderDateSnapshot())]); if (!school) notFound();
  return <StudentPortal school={toPublicSchool(school)} today={snapshot.today} currentYear={snapshot.year} />;
}
