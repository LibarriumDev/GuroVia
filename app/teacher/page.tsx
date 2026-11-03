import type { Metadata } from "next";
import { TeacherPortal } from "@/components/teacher-portal";
import { getDefaultSchool, toPublicSchool } from "@/lib/server/tenant";
import { getRenderDateSnapshot } from "@/lib/render-date";

export const metadata: Metadata = { title: "Teacher portal", description: "Teacher sign-in and classroom grade management.", robots: { index: false, follow: false, nocache: true } };
export const dynamic = "force-dynamic";
export default async function TeacherPage() { const [school, snapshot] = await Promise.all([getDefaultSchool(), Promise.resolve(getRenderDateSnapshot())]); return <TeacherPortal school={school ? toPublicSchool(school) : undefined} initialDate={snapshot.localToday} currentYear={snapshot.year} currentAcademicYear={snapshot.academicYear} />; }
