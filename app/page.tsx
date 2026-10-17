import Link from "next/link";
import type { Metadata } from "next";
import { Brand } from "@/components/brand";
import { DEVELOPER_EMAIL, DEVELOPER_NAME, PRODUCT_NAME } from "@/lib/constants";
import { schoolPath } from "@/lib/school-path";
import { listActiveSchoolDirectory } from "@/lib/server/tenant";

export const dynamic = "force-dynamic";

export const metadata: Metadata = {
  title: { absolute: "GuroVia — School Gradebook Platform" },
  description: "A clear school gradebook platform for school administrators, teachers, students, and families.",
  alternates: { canonical: "/" },
  openGraph: {
    title: "GuroVia — Clear records for every school",
    description: "Manage class assessments and access private student grade reports through dedicated school portals.",
    url: "/",
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GuroVia school gradebook platform" }]
  }
};

const platformSteps = [
  {
    number: "01",
    title: "Each school gets its own portal",
    description: "School administrators register the school, add official details and a logo, and receive a dedicated school link."
  },
  {
    number: "02",
    title: "Teachers manage class records",
    description: "Approved teachers manage class sections, assessment scores, and grades across Term 1, Term 2, and Term 3."
  },
  {
    number: "03",
    title: "Students view their own grades",
    description: "Students sign in through their school's portal to review their private grade report and available assessment results."
  }
];

export default async function HomePage() {
  const schools = await listActiveSchoolDirectory();
  return (
    <main className="platform-home gurovia-home">
      <header className="platform-header">
        <div className="platform-header-inner">
          <Brand />
          <nav aria-label="Main navigation" className="platform-nav">
            <a href="#schools">Find a school</a>
            <Link className="button button-primary" href="/schools/register">Register a school <span aria-hidden="true">→</span></Link>
          </nav>
        </div>
      </header>

      <section className="platform-hero gurovia-hero" aria-labelledby="home-heading">
        <div className="platform-hero-copy">
          <span className="section-kicker">SCHOOL RECORDS, MADE CLEAR</span>
          <h1 id="home-heading">One clear place<br /><em>for school records.</em></h1>
          <p>GuroVia helps schools manage class assessments, teacher workflows, and private student grade reports through a dedicated school portal.</p>
          <div className="platform-hero-actions">
            <Link href="/schools/register" className="button button-primary">Register your school <span aria-hidden="true">→</span></Link>
            <a href="#schools" className="button button-outline">Find your school</a>
          </div>
          <p className="gurovia-hero-note">For school administrators, teachers, students, and families.</p>
        </div>
      </section>

      <section className="gurovia-information" aria-labelledby="how-heading">
        <div className="gurovia-information-heading">
          <span className="section-kicker">HOW IT WORKS</span>
          <h2 id="how-heading">Simple by design.</h2>
          <p>Each role gets a clear path to the information and tools it needs.</p>
        </div>
        <div className="gurovia-steps">
          {platformSteps.map((step) => (
            <article className="gurovia-step" key={step.number}>
              <span className="gurovia-step-number">{step.number}</span>
              <h3>{step.title}</h3>
              <p>{step.description}</p>
            </article>
          ))}
        </div>
      </section>

      <section id="schools" className="platform-school-directory">
        <div className="platform-section-heading">
          <div>
            <span className="section-kicker">SCHOOL DIRECTORY</span>
            <h2>Find your school.</h2>
            <p>Choose your school's official portal to continue.</p>
          </div>
          <span className="platform-school-count">{schools.length} {schools.length === 1 ? "school" : "schools"}</span>
        </div>
        {schools.length ? (
          <div className="platform-school-grid">
            {schools.map((school) => (
              <article className="platform-school-card" key={school.slug}>
                <Link className="platform-school-card-main" href={schoolPath(school.slug)}>
                  <span className="platform-school-logo">
                    {school.logoUrl ? <img src={school.logoUrl} alt={`${school.name} logo`} loading="lazy" decoding="async" /> : <span>{school.short_name.slice(0, 2).toUpperCase()}</span>}
                  </span>
                  <span className="platform-school-copy">
                    <strong>{school.name}</strong>
                    <small>{[school.city, school.province].filter(Boolean).join(", ") || "School portal"}</small>
                  </span>
                  <span className="platform-school-arrow" aria-hidden="true">→</span>
                </Link>
                <div className="platform-school-card-actions">
                  <Link href={schoolPath(school.slug, "/student")}>Student portal</Link>
                  <Link href={schoolPath(school.slug, "/teacher")}>Teacher sign in</Link>
                </div>
              </article>
            ))}
          </div>
        ) : (
          <div className="platform-directory-empty">
            <strong>No schools listed yet.</strong>
            <p>Register a school to create its dedicated portal.</p>
            <Link className="button button-primary" href="/schools/register">Register a school <span aria-hidden="true">→</span></Link>
          </div>
        )}
      </section>

      <section className="platform-owner-cta gurovia-owner-cta">
        <div>
          <span className="section-kicker">FOR SCHOOL ADMINISTRATORS</span>
          <h2>Bring your school onto GuroVia.</h2>
          <p>Register the school, add its logo and details, and create a dedicated portal for your teachers and students.</p>
        </div>
        <Link href="/schools/register" className="button button-primary">Create school portal <span aria-hidden="true">→</span></Link>
      </section>

      <footer className="platform-footer gurovia-footer">
        <div className="gurovia-footer-brand"><Brand /><span>School records, made clear.</span></div>
        <div className="gurovia-footer-support"><span>Developer <strong>{DEVELOPER_NAME}</strong></span><a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a></div>
        <nav aria-label="Legal and support links">
          <Link href="/contact">Contact</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/agreement">Agreement of Use</Link><Link href="/cookies">Cookie Policy</Link>
        </nav>
        <small className="gurovia-footer-note">{PRODUCT_NAME} provides school software. Each school must review its privacy notice, lawful bases, retention rules, and official privacy contact before inviting students.</small>
      </footer>
    </main>
  );
}
