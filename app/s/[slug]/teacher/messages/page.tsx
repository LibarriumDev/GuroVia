import { redirect } from "next/navigation";
import { getSchoolBySlug } from "@/lib/server/tenant";
export const dynamic = "force-dynamic";
export default async function TenantMessagesPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const school = await getSchoolBySlug(slug);
  if (!school) redirect("/not-found");
  // Platform support inbox is not a school inbox. Use the tenant's adviser feedback inbox instead.
  redirect(`/s/${encodeURIComponent(school.slug)}/teacher/feedback`);
}
