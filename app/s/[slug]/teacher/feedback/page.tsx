import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { ParentFeedbackInbox } from "@/components/parent-feedback-inbox";
import { getSchoolBySlug, toPublicSchool } from "@/lib/server/tenant";
export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  return {
    title: school ? `${school.short_name} — Parent feedback` : "School not found",
    description: school ? `Parent-feedback inbox for authorized staff at ${school.name}.` : "Parent feedback inbox",
    robots: { index: false, follow: false, nocache: true }
  };
}
export const dynamic = "force-dynamic";
export default async function TenantFeedbackPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params; const school = await getSchoolBySlug(slug); if (!school) notFound();
  return <ParentFeedbackInbox school={toPublicSchool(school)} />;
}
