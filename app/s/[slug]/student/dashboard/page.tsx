import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { StudentGradeDashboard } from "@/components/student-grade-dashboard";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  return {
    title: school ? `${school.short_name} — My grades` : "School not found",
    description: school ? `Private student grade dashboard for ${school.name}.` : "Private student grade dashboard",
    robots: { index: false, follow: false, nocache: true }
  };
}
export const dynamic = "force-dynamic";
export default async function TenantStudentDashboard({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const school = await getSchoolBySlug(slug); if (!school) notFound();
  return <StudentGradeDashboard school={toPublicSchool(school)} />;
}
