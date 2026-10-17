import Link from "next/link";
import type { SchoolBranding } from "@/lib/school-types";
import { schoolPath } from "@/lib/school-path";
import { DEVELOPER_EMAIL, DEVELOPER_NAME, PRODUCT_NAME } from "@/lib/constants";

export function SchoolLandingPage({ school }: { school: SchoolBranding }) {
  const location = [school.city, school.province].filter(Boolean).join(", ");
  return (
    <main className="school-landing page-wrap">
      <header className="school-landing-nav">
        <Link href={schoolPath(school.slug)} className="school-brand-lockup">
          {school.logoUrl ? <img src={school.logoUrl} alt={`${school.name} logo`} /> : <span className="school-brand-placeholder">{school.short_name.slice(0, 2).toUpperCase()}</span>}
          <span><strong>{school.name}</strong><small>STUDENT & TEACHER PORTAL</small></span>
        </Link>
        <Link className="button button-outline" href="/">GuroVia</Link>
      </header>
      <section className="school-landing-hero">
        <span className="section-kicker">POWERED BY GUROVIA</span>
        <h1>{school.name}<br /><em>Grades, clearly organized.</em></h1>
        <p>Secure access to student records, class assessments, and teacher-managed grades for {school.short_name}.</p>
        {location && <p className="school-landing-location">{location}{school.address ? ` · ${school.address}` : ""}</p>}
        <div className="school-landing-actions">
          <Link className="button button-primary" href={schoolPath(school.slug, "/student")}>Student portal <span aria-hidden="true">→</span></Link>
          <Link className="button button-outline" href={schoolPath(school.slug, "/teacher")}>Teacher sign in</Link>
        </div>
      </section>
      <section className="school-landing-tiles" aria-label="Portal options">
        <Link href={schoolPath(school.slug, "/student?mode=register")} className="school-landing-tile"><span>01</span><h2>Student registration</h2><p>Join your assigned class section and set up your secure student profile.</p></Link>
        <Link href={schoolPath(school.slug, "/student")} className="school-landing-tile"><span>02</span><h2>View grades</h2><p>Sign in with your school record and PIN to view your three-term grades.</p></Link>
        <Link href={schoolPath(school.slug, "/teacher")} className="school-landing-tile"><span>03</span><h2>Teacher workspace</h2><p>Manage class sections, assessment scores, and student progress.</p></Link>
      </section>
      <footer className="school-landing-footer gurovia-tenant-footer"><span>{school.name}</span><span>{school.contact_email.endsWith(".invalid") ? "School contact to be configured" : school.contact_email}</span><nav><Link href={schoolPath(school.slug, "/privacy")}>Privacy Policy</Link><Link href={schoolPath(school.slug, "/terms")}>Terms of Service</Link><Link href={schoolPath(school.slug, "/agreement")}>Agreement of Use</Link><Link href={schoolPath(school.slug, "/cookies")}>Cookie Policy</Link></nav><small>Powered by {PRODUCT_NAME} · Developer {DEVELOPER_NAME} · <a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a></small></footer>
    </main>
  );
}
