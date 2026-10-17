import type { Metadata } from "next";
import { StudentGradeDashboard } from "@/components/student-grade-dashboard";

export const metadata: Metadata = {
  title: "My grades",
  description: "Private student grade dashboard for your school.",
  robots: { index: false, follow: false, nocache: true }
};

export default function StudentDashboardPage() {
  return <StudentGradeDashboard />;
}
