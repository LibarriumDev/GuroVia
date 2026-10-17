import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Brand } from "@/components/brand";
import { DEVELOPER_EMAIL, DEVELOPER_NAME, PRODUCT_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Privacy Policy",
  description: "How GuroVia handles account, school-record, cookie preference, and support information across the multi-school gradebook platform.",
  alternates: { canonical: "/privacy" },
  openGraph: { title: "GuroVia Privacy Policy", description: "Platform-level information about data processing and privacy safeguards.", url: "/privacy", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GuroVia school gradebook platform" }] }
};
const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || "";

export default function PrivacyPage() {
  return <main className="public-page"><div className="public-page-shell legal-shell">
    <header className="public-page-header"><Brand /><Link href="/" className="back-link">← Back to GuroVia</Link></header>
    <Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Privacy Policy" }]} />
    <section className="public-page-hero"><span className="section-kicker">DATA PROTECTION</span><h1>Privacy <em>Policy</em></h1><p>Last updated: 17 October 2026</p></section>
    {!privacyEmail && <p className="configuration-notice">Before launch, the platform operator must configure <code>NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL</code> to a monitored privacy contact. Each school must publish its own verified privacy contact and confirm its role under applicable law.</p>}
    <article className="public-card legal-content">
      <p>This platform-level notice explains how {PRODUCT_NAME} processes information for the public directory, school registration, teacher sign-in, student registration and grade viewing, class assessment management, support inquiries, parent/guardian feedback, security, and optional public-page analytics. It is a template for platform operations, not legal advice or a declaration of certified compliance. Each participating school must approve and publish its own school-specific notice and determine its legal responsibilities before inviting students.</p>
      <h2>1. Who is responsible?</h2>
      <p>The school generally determines why and how its student and academic records are processed and must confirm who acts as the Personal Information Controller for those activities. The {PRODUCT_NAME} operator supplies software and hosting services; whether it acts as a Personal Information Processor, an independent controller for certain platform data, or another role depends on the actual arrangements and must be documented in the appropriate agreements. The developer contact below is technical support and is not represented as a school Data Protection Officer.</p>
      <p>{privacyEmail ? <>For platform privacy queries, contact <a href={`mailto:${privacyEmail}`}>{privacyEmail}</a>. </> : <>For school-record requests, contact the relevant school's official privacy channel. </>}The platform's technical developer is {DEVELOPER_NAME} at <a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a>; this address is not a substitute for each school's official privacy contact.</p>
      <h2>2. Information that may be processed</h2>
      <ul><li><strong>Student information:</strong> name, LRN or other school identifier, date of birth, optional demographic fields, profile photograph, section, PIN credential digest, grades, assessment marks, and teacher comments.</li><li><strong>Teacher and school account information:</strong> name, account email, authentication/session data, school membership, roles, sections, and school contact/branding details.</li><li><strong>Support and feedback:</strong> sender name, email, subject and message; parent/guardian name and feedback; consent or acknowledgment version and timestamp; status and handling metadata.</li><li><strong>Technical/security information:</strong> request IDs, rate-limit keys, security events, and necessary operational logs. Request IDs are for troubleshooting and should not be treated as authentication credentials.</li><li><strong>Preferences:</strong> the browser's cookie/analytics preference. Optional analytics is limited to eligible public pages and runs only if configured and accepted.</li></ul>
      <h2>3. Purposes and lawful basis</h2>
      <p>Information may be used to register and administer a school portal, authenticate approved teachers, verify private student access, display grade records, support class record entry, route school-related feedback to the assigned teacher, respond to platform inquiries, protect the service, and meet applicable educational or legal obligations. Each responsible entity must identify and document the lawful basis for each purpose. A consent checkbox does not automatically make every processing activity lawful.</p>
      <h2>4. Safeguards and access</h2>
      <p>The application is designed to use role checks, school/tenant boundaries, database Row Level Security, protected credentials, keyed digests, encryption for selected stored fields, private file storage, session controls, rate limiting, restrictive security headers, and non-cacheable responses for private content. These controls reduce risk but do not guarantee absolute security. A school must apply least privilege, restrict staff access, train users, maintain backups and incident procedures, and keep software and credentials secure.</p>
      <h2>5. Providers and disclosure</h2>
      <p>GuroVia uses Supabase for database, authentication and storage services and Vercel for application hosting. If configured and accepted, Google Analytics may process public-page visit data. Each operator/school must review provider terms, subprocessors, data locations, access controls, cross-border processing, and required service-provider agreements before production use. Information must not be disclosed beyond the declared purpose except as authorized or permitted by applicable law with appropriate safeguards.</p>
      <h2>6. Retention and deletion</h2>
      <p>Each school must establish an approved schedule for official academic records, student profile data, support inquiries, feedback, and backups, consistent with applicable education-record requirements and legal obligations. Data should not be retained longer than necessary for its declared purpose, subject to legal retention and claims requirements. Some operational records may require controlled manual deletion until automated retention tooling is implemented. Schools must document a practical process for handling authorized access, correction, objection, and deletion requests where applicable.</p>
      <h2>7. Data-subject rights</h2>
      <p>Subject to statutory conditions and exceptions, a data subject may have rights to be informed, access and correct personal information, object to or withdraw consent from processing where consent is the applicable basis, request blocking/erasure or portability where applicable, and lodge a complaint with the National Privacy Commission. Requests concerning school records should normally be directed to the school's verified privacy contact, which may need to confirm identity and authority, especially for minors.</p>
      <h2>8. Children and guardian authority</h2>
      <p>The service may process information about students who are minors. Each school must decide the appropriate notice, lawful basis, parental/guardian authorization, and identity-verification procedure for its setting. Do not submit another person's data unless authorized or otherwise legally permitted.</p>
      <h2>9. Cookies and optional analytics</h2>
      <p>Necessary session/security mechanisms are used to maintain sign-in and protect private access. The interface stores the user's preference in browser local storage under <code>gurovia-cookie-consent-v1</code>; that preference record is not itself a tracking cookie. Google Analytics is not loaded unless a valid measurement ID is configured and the visitor accepts analytics. When enabled, analytics is limited to public directory, contact, and legal pages; page-view requests omit query parameters and student/teacher grade pages are excluded from page-view tracking. Advertising personalization and advertising storage are disabled. See the <Link href="/cookies">Cookie Policy</Link> and use the Cookie settings control to change preferences.</p>
      <h2>10. Data Privacy Act of 2012</h2>
      <p>GuroVia and participating schools should implement the transparency, legitimate-purpose, proportionality, security, retention and data-subject-rights obligations that apply to their actual roles under Republic Act No. 10173 and its Implementing Rules and Regulations. The school must fill in its identity, contact details, purposes, lawful bases, recipients, retention schedule, and procedures instead of relying solely on this general platform notice.</p>
      <p>Official references: <a href="https://privacy.gov.ph/data-privacy-act/" target="_blank" rel="noreferrer">Republic Act No. 10173 — Data Privacy Act of 2012</a> and <a href="https://privacy.gov.ph/implementing-rules%20regulations-data-privacy-act-2012/" target="_blank" rel="noreferrer">Implementing Rules and Regulations</a>.</p>
      <h2>11. Updates</h2><p>This notice may change as features, providers or legal requirements change. Material changes should be made available before changed processing starts, and the appropriate party should retain the relevant notice version and any required evidence of acknowledgment.</p>
    </article>
    <PublicFooter />
  </div></main>;
}
function PublicFooter() {
  return <footer className="public-page-footer gurovia-legal-footer"><Brand /><nav aria-label="Footer links"><Link href="/contact">Contact</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/agreement">Agreement of Use</Link><Link href="/cookies">Cookie Policy</Link></nav><p>Developer: {DEVELOPER_NAME} · <a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a></p></footer>;
}
