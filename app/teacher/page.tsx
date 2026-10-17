import type { Metadata } from "next";
import { TeacherPortal } from "@/components/teacher-portal";
import { getDefaultSchool, toPublicSchool } from "@/lib/server/tenant";

export const metadata: Metadata = { title: "Teacher portal", description: "Teacher sign-in and classroom grade management.", robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";
export default async function TeacherPage() { const school = await getDefaultSchool(); return <TeacherPortal school={school ? toPublicSchool(school) : undefined} />; }
