# GuroVia release notes

## Included

- Renamed the platform's visible brand to **GuroVia** (GV mark, metadata, social preview image, icon, page footers and platform copy).
- Removed the sample-school/workspace-container example section from the platform landing UI. The hero uses a clearly labeled illustrative gradebook preview with fictional/demo figures and a no-real-student-data note.
- Refreshed the public landing page, directory cards, school-registration call to action, legal page layout, footer hierarchy and mobile behavior using a restrained green education-focused style.
- Added platform contact for developer **LibarriumX** at `DarrenBardelas.Dev@Gmail.Com`. This is a technical support contact and is not automatically a school's privacy contact or Data Protection Officer.
- Added platform Privacy Policy (`/privacy`), Terms of Service (`/terms`), Agreement of Use (`/agreement`) and Cookie Policy (`/cookies`). Added parallel school-specific templates at `/s/{slug}/privacy`, `/terms`, `/agreement` and `/cookies`.
- Added a cookie/privacy-choice banner with an essential-only choice, optional analytics acceptance when Google Analytics is configured, a persistent settings control, versioned preference in local storage, and no analytics page views on private student/teacher/management/auth routes.
- Added school-registration acknowledgements for current Terms, Agreement, Privacy Policy and Cookie Policy versions. The registration API checks these versions server-side and records authenticated owner + server timestamp.
- Added a database migration and matching columns in the fresh-install schema for legal-acknowledgement versions and timestamps.
- Linked the legal routes in the platform and school portal footers, sitemap, student/teacher context, and contact pages.

## Migration for an existing tenant database

1. Take a Supabase backup.
2. Confirm `20261017_multi_tenant_schools.sql` and `20261018_multitenant_integrity_hardening.sql` have been applied.
3. Apply `supabase/migrations/20261019_gurovia_legal_acceptance.sql` once.
4. Deploy the source so the registration route and schema change become active together.

For a fresh install, `supabase/schema.sql` includes the legal-acknowledgement columns. Do not run the upgrade migration after running the complete fresh schema.

## Configuration

- Set `NEXT_PUBLIC_APP_URL` to the real canonical HTTPS origin.
- Set `NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL` to a monitored platform privacy contact. Each school must separately confirm and publish its own contact.
- Keep `NEXT_PUBLIC_GA_MEASUREMENT_ID` blank until optional analytics has been reviewed and is intended to be offered. If set, use a valid GA4 `G-...` measurement ID; analytics remains disabled until a visitor accepts.
- Preserve all current server-only Supabase, HMAC and AES encryption keys. Do not replace existing stable cryptographic keys as part of a branding release.

## Legal and privacy qualification

The policies are implementation templates, not legal certification or a substitute for qualified Philippine legal/privacy review. The Data Privacy Act of 2012, its IRR, and NPC guidance should be evaluated against the actual processing and service arrangement. Each school should confirm its role, lawful bases, privacy contact, retention schedule, guardian handling, incident response, and any required separate data-processing agreement. A cookie banner or acknowledgement checkbox alone does not create lawful authority for all processing.
