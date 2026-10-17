import type { Metadata } from "next";
import { SchoolRegistrationForm } from "@/components/school-registration-form";

export const metadata: Metadata = { title: "Register a school", robots: { index: false, follow: false, nocache: true } };
export default function RegisterSchoolPage() { return <SchoolRegistrationForm />; }
