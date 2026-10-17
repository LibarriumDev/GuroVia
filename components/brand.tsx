import Link from "next/link";
import { Breadcrumbs, type BreadcrumbItem } from "@/components/breadcrumbs";
import type { SchoolBranding } from "@/lib/school-types";
import { schoolPath } from "@/lib/school-path";
import { PRODUCT_NAME } from "@/lib/constants";

export function Brand({ light = false, school, href }: { light?: boolean; school?: Pick<SchoolBranding, "name" | "short_name" | "slug" | "logoUrl">; href?: string }) {
  const shortName = school?.short_name || "GuroVia";
  return (
    <Link href={href ?? schoolPath(school?.slug)} className={`brand${light ? " brand-light" : ""}`} aria-label={`${school?.name || PRODUCT_NAME} home`}>
      <span className={`brand-mark${!school ? " brand-mark-platform" : ""}`}>{school?.logoUrl ? <img src={school.logoUrl} alt="" /> : school ? <span className="brand-school-fallback" aria-hidden="true">{shortName.slice(0, 2).toUpperCase()}</span> : <img className="brand-platform-logo" src="/gurovia-mark.svg" alt="" />}</span>
      <span className="brand-copy">
        <strong>{shortName}</strong>
        <small>{school ? "POWERED BY GUROVIA" : "GUROVIA SCHOOL PLATFORM"}</small>
      </span>
    </Link>
  );
}

export function PortalHeader({
  backHref,
  backLabel = "Back to home",
  breadcrumbs,
  school
}: {
  backHref?: string;
  backLabel?: string;
  breadcrumbs?: BreadcrumbItem[];
  school?: SchoolBranding;
}) {
  return (
    <>
      <header className="portal-header">
        <Brand school={school} />
        <Link href={backHref ?? schoolPath(school?.slug)} className="back-link"><span aria-hidden="true">←</span> {backLabel}</Link>
      </header>
      {breadcrumbs?.length ? <Breadcrumbs items={breadcrumbs} /> : null}
    </>
  );
}
