import type { Metadata } from "next";
import Link from "next/link";
import { Brand } from "@/components/brand";
import { SchoolFinderForm } from "@/components/school-finder-form";

export const metadata: Metadata = {
  title: "Find your school",
  description: "Open your GuroVia school portal by entering its official School ID.",
  alternates: { canonical: "/schools/find" }
};

export default function FindSchoolPage() {
  return <main className="school-find-page">
    <header className="school-find-header"><Brand /><Link className="button button-outline" href="/">Back to GuroVia</Link></header>
    <section className="school-find-main" aria-labelledby="school-find-heading">
      <span className="section-kicker">SCHOOL PORTAL ACCESS</span>
      <h1 id="school-find-heading">Find your school.</h1>
      <p>Enter the official School ID provided by your school. GuroVia will look up the exact school portal without displaying a public list of schools.</p>
      <SchoolFinderForm />
    </section>
    <footer className="school-find-footer"><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/contact">Support</Link></footer>
  </main>;
}
