import type { Metadata } from "next";
import { StudentPortal } from "@/components/student-portal";
import { getDefaultSchool, toPublicSchool } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Student portal", description: "Secure student grade lookup and class registration.", robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";
export default async function StudentPage() { const school = await getDefaultSchool(); return <StudentPortal school={school ? toPublicSchool(school) : undefined} />; }
