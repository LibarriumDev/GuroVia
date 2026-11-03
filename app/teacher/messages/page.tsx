import type { Metadata } from "next";
import { ContactInbox } from "@/components/contact-inbox";
import { getRenderDateSnapshot } from "@/lib/render-date";

export const metadata: Metadata = {
  title: "School contact inbox",
  description: "Restricted platform contact inbox for explicitly authorized administrators.",
  robots: { index: false, follow: false, nocache: true }
};

export default function ContactInboxPage() {
  return <ContactInbox currentYear={getRenderDateSnapshot().year} />;
}
