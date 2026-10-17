import type { Metadata } from "next";
import Link from "next/link";
import { Breadcrumbs } from "@/components/breadcrumbs";
import { Brand } from "@/components/brand";
import { ContactForm } from "@/components/contact-form";
import { DEVELOPER_EMAIL, DEVELOPER_NAME, PRODUCT_NAME } from "@/lib/constants";

export const metadata: Metadata = {
  title: "Contact GuroVia",
  description: "Contact GuroVia platform support.",
  alternates: { canonical: "/contact" },
  openGraph: { title: "Contact GuroVia", description: "Contact the GuroVia platform team.", url: "/contact", images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GuroVia school gradebook platform" }] }
};
const privacyEmail = process.env.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL?.trim() || "";
export default function ContactPage() {
  return <main className="public-page"><div className="public-page-shell"><header className="public-page-header"><Brand /><Link href="/" className="back-link">← Back to GuroVia</Link></header><Breadcrumbs items={[{ label: "Home", href: "/" }, { label: "Contact" }]} />
    <section className="public-page-hero"><span className="section-kicker">PLATFORM SUPPORT</span><h1>How can we <em>help?</em></h1><p>Contact {PRODUCT_NAME} about the platform, account access, or technical issues. Do not send grades, passwords, PINs, LRNs, or other sensitive student information through the general contact form.</p></section>
    {!privacyEmail && <p className="configuration-notice">The platform operator must set <code>NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL</code> to a monitored platform privacy contact. This is separate from a school's own privacy contact.</p>}
    <section className="public-card contact-card"><div><span className="section-kicker">CONTACT FORM</span><h2>Send a message</h2><p>Your message is encrypted before storage and can only be retrieved through the authenticated, email-allowlisted support inbox.</p></div><ContactForm privacyEmail={privacyEmail} /></section>
    <section className="public-card gurovia-developer-card"><span className="section-kicker">PRODUCT DEVELOPER</span><h2>{DEVELOPER_NAME}</h2><p>Technical support for the GuroVia platform.</p><a className="gurovia-developer-email" href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a><p className="configuration-notice">This is the developer's technical contact, not a school Data Protection Officer or official school privacy contact unless formally appointed.</p></section>
    <PublicFooter /></div></main>;
}
function PublicFooter() { return <footer className="public-page-footer gurovia-legal-footer"><Brand /><nav aria-label="Footer links"><Link href="/contact">Contact</Link><Link href="/privacy">Privacy Policy</Link><Link href="/terms">Terms of Service</Link><Link href="/agreement">Agreement of Use</Link><Link href="/cookies">Cookie Policy</Link></nav><p>Developer: {DEVELOPER_NAME} · <a href={`mailto:${DEVELOPER_EMAIL}`}>{DEVELOPER_EMAIL}</a></p></footer>; }
