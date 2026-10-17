# GuroVia — Multi-Tenant School Platform

A multi-tenant school gradebook platform. Each registered school has its own branded portal, teacher memberships, school-specific student/grade records, and a shareable URL at `/s/{school-slug}`. The existing Salvacion National High School data is retained under the default `salvacion-national-high-school` tenant slug for backward compatibility. Students register into an open teacher section and look up their report with their full name, LRN, and 4-digit PIN. Teachers use Supabase Auth to manage their class roster, three-term marks, assessment scores, student comments, and a class-wide E-Class-Record-style scorebook.

## Stack

- Next.js App Router 16 and React 19 for server-rendered pages, metadata, and server endpoints.
- Supabase Postgres for records, Supabase Auth for teacher accounts, row-level security for teacher access, and private Storage for profile photos.
- Vercel deployment.
- WebP profile photos. LRNs/access proofs and PINs use keyed HMAC digests; birthdays and contact-form fields are encrypted using separate AES-256-GCM keys before storage.

## Local setup

1. Create a Supabase project.
2. For a fresh project, run [`supabase/schema.sql`](supabase/schema.sql) in the Supabase SQL Editor and do not replay upgrade migrations. For an existing installation, back up the database and inspect which migrations have already been applied; run only pending migrations in dependency order: `20261012_trisemester_storage_auth.sql`, `20261012_student_pin_assessments_comments.sql`, `20261015_privacy_contact.sql`, `20261015_class_scorebook.sql`, `20261015_subject_roster_parent_feedback.sql`, `20261015_terms_mobile_ux.sql`, `20261017_multi_tenant_schools.sql`, `20261018_multitenant_integrity_hardening.sql`, and `20261019_gurovia_legal_acceptance.sql`. Do not re-run a migration that has already been applied successfully.
3. Copy [`.env.example`](.env.example) to `.env.local` and configure Supabase URL, browser publishable key, server secret key, stable HMAC, birthday-encryption and contact-encryption keys, canonical URL and the official school privacy contact. Optional Google integrations stay disabled until their values are set.
4. Install and start the app with `npm ci` and `npm run dev`.
5. In Supabase Auth, enable email confirmation for teacher accounts and allow the deployed `/auth/callback` URL. In Vercel, explicitly set `NEXT_PUBLIC_APP_URL` to the real canonical production origin and redeploy.

Never put the Supabase server secret, HMAC secret, or AES key in a `NEXT_PUBLIC_` variable. Keep existing HMAC/AES keys stable; rotation requires a migration plan. Do not commit `.env.local`.

## Routes

- `/` — public multi-school platform homepage and directory.
- `/schools/register` — authenticated school-owner registration and branding setup.
- `/s/{school-slug}` — public home for one school tenant; use its tenant-scoped student, teacher, manage, Privacy Policy, Terms of Service, Agreement of Use, and Cookie Policy routes.
- `/student` — student grade lookup and class registration (noindex).
- `/teacher` — teacher sign-in and teacher dashboard, including the class-wide scorebook under **Open class scorebook** (noindex).
- `/teacher/messages` — encrypted contact inbox for explicitly allowlisted, authenticated school accounts (noindex).
- `/teacher/feedback` — encrypted parent/guardian feedback assigned to the registered class adviser (noindex).
- `/contact` — public contact form.
- `/privacy` — platform Privacy Policy template for school review.
- `/agreement` — Agreement of Use and data-protection responsibilities.
- `/cookies` — Cookie Policy and analytics preference information.
- `/terms` — Terms of Service draft for school review.
- `/auth/callback` — teacher email confirmation callback (noindex).
- `/api/sections` — active class sections only.
- `/api/students/register` — server-side student registration.
- `/api/students/lookup` — server-side grade lookup, class-adviser attribution, and a short-lived feedback ticket.
- `/api/students/feedback` — privacy-consented parent/guardian feedback routed to the section owner.
- `/api/parent-feedback` — authenticated teacher inbox API, including new-message count and status workflow.
- `/api/contact` — contact submit API and protected inbox GET/PATCH API.

## SEO and privacy

The project includes canonical and Open Graph metadata, a generated social-share image, Organization JSON-LD, Search Console verification support, consent-gated GA4 on public pages, `robots.txt`, a public-only sitemap, breadcrumbs, and a custom 404 page. Student and teacher routes are marked noindex and disallowed in robots.txt; this is SEO behavior, not an access control boundary.

The contact form encrypts personal fields before database storage, enforces consent and request limits, and supports an allowlisted contact inbox. Contact retention is not automated; authorized inbox administrators can delete messages, but the school must approve a recurring deletion review or scheduled cleanup before launch. The existing direct Supabase teacher portal still uses database row-level security for names and academic records; those fields are not application-field encrypted. Review [`AUDIT_REPORT.md`](AUDIT_REPORT.md) and [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md) for exact configuration steps, residual risks, and production verification requirements.

## Production compliance reminder

The Privacy Policy and Terms are drafts that need approval from the responsible school/DepEd privacy officer. Before launch, confirm the Personal Information Controller identity, monitored privacy contact, lawful bases, retention schedule for official school records, minor/guardian authorization process, processor agreements and incident-response obligations. Adding web pages and checkboxes alone does not establish legal compliance.

## Class scorebook

The teacher dashboard now includes an Excel-style whole-class assessment table. Teachers select a section, subject, and term; add Written Works, Performance Tasks, and Summative Test/Exam columns; enter scores for each student; and save changed cells. Empty cells are missing scores, while `0` is a real score. Row-level security restricts records by teacher-owned class section, and a database trigger enforces student/section matching and score maximums.

Before use, existing Supabase installations must apply `supabase/migrations/20261015_class_scorebook.sql` and then `supabase/migrations/20261015_subject_roster_parent_feedback.sql`. Teachers can save subjects to a section-specific catalog and choose them from a dropdown on later visits. The **Add subject to grade roster** action adds blank three-term rows for existing students without overwriting existing marks; an insert trigger seeds already-saved subjects for students registered later. Entered scorebook assessment scores are also included in the private student/parent report. The page can calculate a weighted initial score from one of the suggested weight profiles, but the school must confirm the exact subject weights and official transmutation table before treating that value as the final term grade. See [`IMPLEMENTATION_GUIDE.md`](IMPLEMENTATION_GUIDE.md).

## Parent/guardian feedback and class adviser

A verified private grade lookup enables a privacy-consented feedback form. Feedback message content and guardian name are encrypted before storage in `student_parent_feedback`, and the responsible teacher is taken from the student's registered `teacher_sections.teacher_id` rather than supplied by the sender. That teacher can review and update messages at `/teacher/feedback`; the dashboard shows the count of new messages and refreshes it every minute while open. Student registration and grade lookup display the assigned adviser name from the same section owner. This release routes feedback into the dashboard inbox; it does not send email notifications.
## Latest build fix

The Open Graph image prerender error caused by a headline `div` containing `<br />` without an explicit display layout has been corrected in `app/opengraph-image.tsx`. See `BUILD_FIX_NOTES.md` for the cause and verification status.


## Three-term grading and mobile improvements

The current UI and active API/database keys use **Term 1**, **Term 2**, and **Term 3** only (`term_1`, `term_2`, `term_3`, and `term_number`). The historical migration files still mention old semester/quarter names only so the upgrade can safely recognize and migrate existing database columns; these are not labels exposed by the current interface.

For an existing installation, first back up the database and apply any pending original scorebook and subject/feedback migrations in dependency order. Then apply `supabase/migrations/20261015_terms_mobile_ux.sql` exactly once. It renames old grade columns to term keys, converts scorebook period 4 into Term 3 without deleting assessment scores, and safely renames colliding assessment labels before adding the three-term constraint. Because former periods 3 and 4 are consolidated into Term 3, review the Term 3 assessment list after migration. For a fresh installation, use the complete `supabase/schema.sql`, which includes the tenant schema and policies; do not replay upgrade migrations after the full fresh-install schema.

The GuroVia platform homepage lists active school portals and provides a clear **Register your school** entry point. Each school portal then provides student registration/grade lookup and teacher sign-in. Legacy root `/student` and `/teacher` paths remain aliases for the configured default tenant so old bookmarks continue to work. On a phone, student registration/grade lookup appears as two stacked choices, the class scorebook switches to touch-friendly student cards, and grade reports show one subject/assessment card at a time rather than forcing wide horizontal scrolling.

## Private student dashboard update

After a successful student grade lookup with name, LRN, and PIN, the app redirects to `/student/dashboard`. The dashboard uses an HttpOnly signed session cookie so the student can refresh or reopen their report without putting their LRN, PIN, or student ID into a URL. Use **Log out** to clear the session. Grade tables use expandable sections and switch to labeled cards on mobile.

See `STUDENT_DASHBOARD_SESSION_UPDATE.md` for route behavior, security notes, and deployment checks.


## Request IDs / UUID query parameters

The Student and Teacher portal entry links carry a fresh non-secret `request_id` UUID. Each first-party `/api/*` request also receives its own `request_id` query parameter and `X-Request-ID` header; `proxy.ts` forwards and logs the ID with method/path only, then echoes it in the response header. Server-side student lookup, registration, session, and parent-feedback logs can be correlated by this value. Teacher authentication is performed directly by Supabase Auth, so the portal attempt has a UUID reference but the Supabase request URL is deliberately left unchanged to avoid altering the provider's authentication API. These IDs are for diagnostics only and never grant access.

See `REQUEST_ID_QUERY_PARAMETERS.md` for troubleshooting steps.


## Student profile photos

New student registrations require a profile photo. The browser converts the selected image to WebP before upload; the server independently validates the WebP signature and enforces a 2 MB limit. Students with existing accounts can upload or change their photo from the profile avatar on `/student/dashboard`. Profile uploads require the signed-in student session and are stored in the private `profile-photos` bucket.


## Multi-tenant schools

The public home page is the platform directory, not a single school. School owners sign in with a verified teacher account and create a tenant at `/schools/register`; after registration the platform issues `/s/{school-slug}` as the school home, with tenant-specific student, teacher, management, Privacy Policy, Terms of Service, Agreement of Use, and Cookie Policy routes. Active school listings expose only school name, short name, location, slug, and public logo URL. School emails and internal IDs are not included in the directory response.

Teachers request membership within the school link and owners/admins approve access at `/s/{school-slug}/manage`. Membership, school status, and section ownership are checked server-side; the URL slug only selects the tenant and grants no permission. API clients automatically attach `school_slug` when used from a tenant path, but APIs still enforce tenant membership/session ownership and database policies. Direct browser database access remains protected by Supabase RLS.

Existing deployments: back up the database first, confirm all earlier scorebook and term migrations, then apply `supabase/migrations/20261017_multi_tenant_schools.sql` if it has not been applied, followed by `supabase/migrations/20261018_multitenant_integrity_hardening.sql`. If the `20261017` migration was already recorded/applied, apply the new `20261018` hardening migration only. Back up the database before either operation. Review the default tenant's `contact_email` placeholder and update it to the verified school contact before launch. Fresh deployments should run the full `supabase/schema.sql`, which includes both tenant setup and integrity hardening at the end. The global legal pages describe platform-level use; each tenant also has school-specific template pages at `/s/{school-slug}/privacy`, `/s/{school-slug}/terms`, `/s/{school-slug}/agreement`, and `/s/{school-slug}/cookies`. These pages must be reviewed and adopted by each school before use.


The follow-up `supabase/migrations/20261018_multitenant_integrity_hardening.sql` is additive and can be applied to a deployment that already ran the first tenant migration. For new installs, the full `supabase/schema.sql` contains both sets of controls.

## Multi-tenant data integrity notes

The tenant migration performs a preflight check before enforcing composite foreign keys. Student records must reference a section in the same school, and parent-feedback records must match both the student's school and section. If the migration reports inconsistent associations, stop and review those rows rather than disabling the constraint. Section `school_id` is immutable after creation. New sections can only be assigned to an active member of the same school. School owners/administrators can see the school's full section list; teachers only see sections assigned to their account. Inactive sections remain inactive when the dashboard loads.


## GuroVia branding, legal notices and cookie preferences

The platform brand is **GuroVia**. The public landing page has a redesigned gradebook preview rather than sample school/workspace cards. Platform support lists developer **LibarriumX** at `DarrenBardelas.Dev@Gmail.Com`; this is a technical contact and is not automatically a school's Data Protection Officer or official privacy contact.

New public routes: `/agreement` (Agreement of Use) and `/cookies` (Cookie Policy). Each tenant also has `/s/{slug}/agreement` and `/s/{slug}/cookies`. The public footer links to the Privacy Policy, Terms of Service, Agreement of Use and Cookie Policy. These documents are implementation templates and need review by the platform operator, each school, and qualified Philippine privacy/legal counsel before production reliance. The Agreement of Use web page is not a substitute for a separate negotiated data-processing/service-provider agreement where that is required.

The privacy-choice panel always explains necessary session/security storage. Optional Google Analytics is loaded only if `NEXT_PUBLIC_GA_MEASUREMENT_ID` is a valid `G-...` ID and the visitor accepts analytics. Tracking is limited to public directory, school landing and public contact/legal pages; private grade, teacher, manage and authentication views are excluded from page-view tracking. The preference is saved under `gurovia-cookie-consent-v1` in local storage; this preference itself is not a tracking cookie. The `Cookie settings` control lets visitors change their choice. Do not configure analytics until the operator has reviewed the provider terms, retention, location and any cross-border processing obligations.

For existing multi-tenant databases, back up Supabase and apply `supabase/migrations/20261019_gurovia_legal_acceptance.sql` after `20261017_multi_tenant_schools.sql` and `20261018_multitenant_integrity_hardening.sql`. This additive migration records the policy versions acknowledged by the authenticated school owner during school registration. The API validates versions server-side and does not treat this checkbox as optional analytics consent. For fresh installations, `supabase/schema.sql` now includes the acknowledgement columns.

Before release, test a clean school registration against staging after the migration; verify all five legal acceptance fields are stored with the submitting authenticated user and server timestamp; check consent choices with and without `NEXT_PUBLIC_GA_MEASUREMENT_ID`; confirm analytics receives no student/teacher paths or query parameters; and run the full typecheck and production build.


## School registration simulation

Visit `/demo/school-registration` to walk through school profile setup, generated portal-link previews, teacher approval, section creation, and sample grade entry. The demo is client-only: it makes no API calls, does not use Supabase, and stores no school or grade data. Use fictional details. See `SCHOOL_REGISTRATION_SIMULATION.md`.


### Class scorebook SQL Editor error (grading_period missing)

The current GuroVia scorebook uses `term_number` (Term 1–3). Use the corrected `supabase/migrations/20261015_class_scorebook.sql` and follow `CLASS_SCOREBOOK_SQL_ERROR_FIX.md`. Do not run a stale SNHS-only migration that references `grading_period`.
