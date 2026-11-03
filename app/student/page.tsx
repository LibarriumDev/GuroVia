import type { Metadata } from "next";
import { StudentPortal } from "@/components/student-portal";
import { getDefaultSchool, toPublicSchool } from "@/lib/server/tenant";
import { getRenderDateSnapshot } from "@/lib/render-date";

export const metadata: Metadata = { title: "Student portal", description: "Secure student grade lookup and class registration.", robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";
export default async function StudentPage() { const [school, snapshot] = await Promise.all([getDefaultSchool(), Promise.resolve(getRenderDateSnapshot())]); return <StudentPortal school={school ? toPublicSchool(school) : undefined} today={snapshot.today} currentYear={snapshot.year} />; }
