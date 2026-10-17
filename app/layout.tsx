import type { Metadata } from "next";
import { headers } from "next/headers";
import { AnalyticsConsent } from "@/components/analytics-consent";
import { getSiteUrl } from "@/lib/site-url";
import { PRODUCT_NAME } from "@/lib/constants";
import "./globals.css";

const appUrl = getSiteUrl();
const siteDescription = "A clear, secure gradebook platform for schools, teachers, students, and families.";

export const metadata: Metadata = {
  metadataBase: new URL(appUrl),
  title: { default: "GuroVia | School Gradebook Platform", template: "%s | GuroVia" },
  description: siteDescription,
  applicationName: PRODUCT_NAME,
  referrer: "strict-origin-when-cross-origin",
  icons: { icon: "/gradebook-icon.svg" },
  openGraph: {
    type: "website", siteName: PRODUCT_NAME, locale: "en_PH",
    title: "GuroVia | School Gradebook Platform", description: siteDescription,
    images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GuroVia school gradebook platform" }]
  },
  twitter: { card: "summary_large_image", title: "GuroVia | School Gradebook Platform", description: siteDescription, images: [{ url: "/opengraph-image", width: 1200, height: 630, alt: "GuroVia school gradebook platform" }] },
  ...(process.env.GOOGLE_SITE_VERIFICATION ? { verification: { google: process.env.GOOGLE_SITE_VERIFICATION } } : {})
};

const websiteJsonLd = { "@context": "https://schema.org", "@type": "WebSite", name: PRODUCT_NAME, description: siteDescription, url: appUrl, inLanguage: "en-PH" };

export default async function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  const requestHeaders = await headers();
  const nonce = requestHeaders.get("x-nonce") ?? undefined;
  return (
    <html lang="en-PH">
      <body>
        <script nonce={nonce} type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(websiteJsonLd).replace(/</g, "\\u003c") }} />
        {children}
        <AnalyticsConsent />
      </body>
    </html>
  );
}
