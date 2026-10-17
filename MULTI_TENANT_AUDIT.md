# Multi-tenant implementation audit

## Summary

This release converts the public home page from a single-school portal to a school directory. Schools are represented by tenant rows and get personalized URLs under `/s/{slug}`. Existing Salvacion National High School data is retained and assigned to the default tenant, so existing `/student` and `/teacher` links remain aliases for that tenant.

## Implemented

- School profile registration with unique slug, logo and optional contact/location fields.
- Server-side school registration requiring a valid Supabase bearer session and confirmed account email, size/type checks for logos, request limits and cleanup if a multi-step school creation fails.
- Public directory that returns only school name, short name, slug, city/province and a same-origin public logo route; it does not expose contact email or database ID in the directory payload.
- Tenant-scoped page routes for school home, student, teacher, administration, legal pages and feedback inbox.
- Tenant context is attached to first-party API requests via the non-secret `school_slug` query parameter. APIs still validate memberships, student session ownership, and tenant IDs; the slug is not an authorization credential.
- Per-school teacher memberships with pending/active/suspended states and owner/admin approval.
- Default-tenant backfill for existing teacher sections, students, feedback and teacher accounts.
- RLS helpers and policies scope teacher/student/gradebook data to tenant membership and section ownership.
- Additional database constraints require student records to reference a section in the same school and parent feedback to reference the same school/section/student tuple.
- Sections cannot be moved between schools by changing `school_id`; section insert/update policies require the assigned teacher to be an active member of the same tenant.
- Owner/admin dashboard section listing covers that school. Teachers see only their own sections. Loading the portal no longer silently reactivates inactive sections.
- School-specific privacy/terms templates and metadata; root privacy/terms are platform-level templates.

## Local static checks

- `npm run security:check`: 10 checks passed.
- `npm run tenant:check`: 15 checks passed, 0 failed.
- TypeScript/TSX syntax transpilation with the available global TypeScript compiler: 72 files, 0 syntax diagnostics.
- `app/globals.css` parses successfully with PostCSS.
- Verified that the multi-tenant and integrity-hardening SQL blocks embedded in `supabase/schema.sql` match their standalone migration files.
- No `.env`, `.env.local`, or production secret files are included in the source tree; only `.env.example` is intended for distribution.

## Build and live verification limits

- Full `npm run typecheck` and `npm run build` were not verified. Dependency installation timed out while accessing the npm registry, leaving an incomplete local `node_modules` directory; the release ZIP excludes that directory so the recipient can install clean dependencies.
- The SQL migrations were statically reviewed and consistency-checked, but have not been executed against a live Supabase database in this environment.
- Production readiness still requires a clean dependency install/build and two-school staging tests described in `MULTI_TENANT_GUIDE.md`.

## Not verified in this environment

- Complete Next.js typecheck and production build: dependency installation timed out while trying to reach the npm registry. Syntax transpilation is not a replacement for type checking.
- SQL migration execution against a real Supabase database.
- Live tenant-isolation, auth and RLS tests with at least two school tenants.
- End-to-end school creation, logo upload, teacher approval, grade entry and student lookup in a deployed preview.
- Fresh ZAP scan against the updated preview.

## Data safety before migration

Back up the database, then examine legacy associations before applying the migration. If an existing deployment already applied `20261017_multi_tenant_schools.sql`, apply the new `20261018_multitenant_integrity_hardening.sql` after a backup. The hardening migration replaces section-assignment policies and adds stricter constraints.

### Check that student records follow their existing section

Run against the pre-tenant schema:

```sql
select st.id, st.section_id, st.full_name, sec.teacher_id, sec.grade_level, sec.section_name
from public.students st
left join public.teacher_sections sec on sec.id = st.section_id
where sec.id is null;
```

### Check parent feedback is linked to the student's current section

```sql
select fb.id, fb.student_id, fb.section_id, st.section_id as student_section_id, fb.teacher_id
from public.student_parent_feedback fb
join public.students st on st.id = fb.student_id
where fb.section_id is distinct from st.section_id;
```

### Check section names that would collide under case/space normalization

```sql
select grade_level, lower(btrim(section_name)) as normalized_section, academic_year, count(*) as rows, array_agg(id) as section_ids
from public.teacher_sections
group by grade_level, lower(btrim(section_name)), academic_year
having count(*) > 1;
```

The first/second queries should return zero rows before migration. The third should return zero rows before the normalized unique index is created. If not, review and reconcile the records manually before proceeding.

## Remaining product/admin decisions

- Confirm whether schools are allowed to register themselves immediately or should require platform approval before appearing publicly.
- Configure a real, monitored contact email for the default school and every school that registers.
- Review each tenant's legal policy template before students use the portal.
- Define a process for data export, account/school closure, and backups for schools that leave the platform.
