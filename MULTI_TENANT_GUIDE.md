# Multi-tenant school setup and deployment guide

## How tenants work

The platform home (`/`) is a directory of active school portals. Each school has a unique database `schools.id`, a globally unique slug, its own name/short name/logo/contact information, and its own teacher memberships. The personalized URL is `/s/{school-slug}`. This is path-based multi-tenancy, not a separate subdomain or custom-domain product.

Each school has these portal routes:

- `/s/{school-slug}` — public school home/branding
- `/s/{school-slug}/student` — student registration and grade lookup
- `/s/{school-slug}/student/dashboard` — private student grade report
- `/s/{school-slug}/teacher` — teacher sign-in and school workspace
- `/s/{school-slug}/teacher/feedback` — authorized parent/guardian feedback inbox
- `/s/{school-slug}/manage` — approve/suspend teacher memberships for an owner/admin
- `/s/{school-slug}/privacy` and `/s/{school-slug}/terms` — school-specific legal templates

The old `/student` and `/teacher` routes remain backward-compatible aliases for the slug in `DEFAULT_SCHOOL_SLUG`. They are not the platform’s primary navigation anymore.

## School registration and onboarding

1. Set up Supabase Auth and verify a teacher account's email.
2. Sign in using a teacher account and open `/schools/register`.
3. Enter the official school name, short name, a unique slug, school contact information, and a WebP logo (maximum 1 MB).
4. The platform creates the school portal and makes the registering account its initial owner. It returns the school home URL and teacher portal URL.
5. Teachers open the school’s teacher URL, sign in, request school membership, and wait for an owner/admin to approve it in `/s/{school-slug}/manage`.
6. Approved teachers create their own class sections. Students register through that school’s student URL and select an active section belonging to the same school.

The slug identifies the tenant; it does not authorize access. The server checks school membership and student session ownership. Supabase RLS also restricts direct browser database access by school, membership and section.

## Supabase setup

### Existing deployment

1. Back up the production database and test against a staging Supabase project first.
2. Confirm the earlier migrations are applied in dependency order:
   - `20261012_student_pin_assessments_comments.sql`
   - `20261012_trisemester_storage_auth.sql`
   - `20261015_class_scorebook.sql`
   - `20261015_privacy_contact.sql`
   - `20261015_subject_roster_parent_feedback.sql`
   - `20261015_terms_mobile_ux.sql`
3. If the first tenant migration has not been applied, run `supabase/migrations/20261017_multi_tenant_schools.sql`.
4. Apply `supabase/migrations/20261018_multitenant_integrity_hardening.sql`. This is an additive follow-up intended for existing deployments that already applied the first tenant migration, and is safe to run after this release’s updated first migration as well.
5. If the migration stops with the student/section, parent-feedback, or duplicate-section preflight error, stop and repair the named records. Do not remove the checks to force migration success. Example preflight queries are in `MULTI_TENANT_AUDIT.md`.
6. Update the placeholder contact information for the existing default tenant to the correct monitored address. Example:

   ```sql
   update public.schools
   set contact_email = 'official-school-email@example.edu.ph', updated_at = now()
   where slug = 'salvacion-national-high-school';
   ```

   Replace the example with the real, approved school address.

### Fresh deployment

Use the complete `supabase/schema.sql` once, which now includes the tenant table definitions, backfill, integrity constraints and policies. Do not then replay every upgrade migration against a database created from the full schema; that can duplicate historical transformations.

## Environment and deployment

Preserve the existing environment values and configure the correct values in Vercel:

- `NEXT_PUBLIC_APP_URL` — canonical production origin used for auth callback URLs.
- `NEXT_PUBLIC_SUPABASE_URL` and `NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY` — client configuration.
- `SUPABASE_SECRET_KEY` or the existing `SUPABASE_SERVICE_ROLE_KEY` — server-only database access.
- Existing student HMAC/encryption keys — keep stable; changing them can prevent existing records from being verified/decrypted.
- `DEFAULT_SCHOOL_SLUG=salvacion-national-high-school` — backward-compatible route alias only.

Never place the Supabase server key or encryption keys in `NEXT_PUBLIC_*` variables. The new tenant routes do not need a separate Supabase project per tenant.

## Recommended staging acceptance tests

1. Register School A and School B with different logos and slugs. Check each public URL and the platform directory.
2. Sign into School A as owner; confirm the membership list and sections show only School A data. Repeat for School B.
3. Create a teacher in School A, request membership, and verify pending access cannot read class/student data until approved.
4. Approve the teacher and confirm they can only list/edit sections assigned to them; school owner/admin can review sections inside that school.
5. Try calling School A API endpoints with School B's slug, and try School B endpoints with School A's student cookie. These must return 401/403/404 and never return records from the other school.
6. Test invalid section IDs, cross-school student/section updates, and direct Supabase table calls. Composite foreign keys and RLS should reject them.
7. Verify school logos are displayed through the same-origin public logo endpoint; profile photos and grade-report responses must remain private and non-cacheable.
8. Test student registration, grade lookup, Term 1–3 score entry, subject roster seeding, parent feedback and owner/admin staff management within each tenant.
9. Run a fresh production build and re-run ZAP against a deployed preview after the database migration.

## Known scope and limitations

- Personalized links use `/s/{slug}`. Separate subdomains/custom domains are not implemented in this release.
- Tenant creation is available to a signed-in, email-confirmed teacher account. A formal school identity verification or platform-wide moderation workflow is not currently included.
- Subscription/billing, platform support roles, school self-service branding edits after initial registration, automated tenant deletion/export, and cross-school account dashboards are not included.
- Legal pages are templates. Each school must validate its Personal Information Controller, privacy contact, lawful basis, retention schedule, and guardian authorization process before launch.
