import type { Metadata } from "next";
import { SchoolRegistrationSimulator } from "@/components/school-registration-simulator";

export const metadata: Metadata = {
  title: "School Registration Demo | GuroVia",
  description: "Try a guided simulation of creating a school portal and setting up staff, sections, students, and grades in GuroVia.",
  robots: { index: false, follow: false, nocache: true },
};

export default function SchoolRegistrationDemoPage() {
  return <SchoolRegistrationSimulator />;
}
