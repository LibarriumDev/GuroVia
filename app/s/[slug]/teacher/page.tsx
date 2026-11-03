import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { TeacherPortal } from "@/components/teacher-portal";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
import { getRenderDateSnapshot } from "@/lib/render-date";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  return {
    title: school ? `${school.short_name} — Teacher portal` : "School not found",
    description: school ? `Teacher workspace for ${school.name}.` : "Teacher workspace",
    robots: { index: false, follow: false, nocache: true }
  };
}
export const dynamic = "force-dynamic";
export default async function TenantTeacherPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const [school, snapshot] = await Promise.all([getSchoolBySlug(slug), Promise.resolve(getRenderDateSnapshot())]); if (!school) notFound();
  return <TeacherPortal school={toPublicSchool(school)} initialDate={snapshot.localToday} currentYear={snapshot.year} currentAcademicYear={snapshot.academicYear} />;
}
