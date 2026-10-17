import assert from "node:assert/strict";
import fs from "node:fs";
import path from "node:path";

const read = (name) => fs.readFileSync(path.join(process.cwd(), name), "utf8");
const migration = read("supabase/migrations/20261017_multi_tenant_schools.sql");
const hardening = read("supabase/migrations/20261018_multitenant_integrity_hardening.sql");
const schema = read("supabase/schema.sql");
const tenant = read("lib/server/tenant.ts");
const requestHelper = read("lib/request-id.ts");
const registerRoute = read("app/api/schools/register/route.ts");
const managerRoute = read("app/api/schools/members/route.ts");
const teacherPortal = read("components/teacher-portal.tsx");
const homePage = read("app/page.tsx");
const publicTenant = read("app/s/[slug]/page.tsx");
const publicDirectory = tenant.slice(tenant.indexOf("export async function listActiveSchoolDirectory"));

const checks = [
  ["Tenant migration creates separate school records and memberships", /create table if not exists public\.schools/.test(migration) && /create table if not exists public\.school_memberships/.test(migration)],
  ["Legacy SNHS rows are backfilled instead of discarded", /salvacion-national-high-school/.test(migration) && /set school_id = sec\.school_id/.test(migration)],
  ["Database checks student and section tenant agreement", /students_school_section_tenant_fk/.test(migration)],
  ["Database checks parent feedback belongs to the same student and section", /student_parent_feedback_school_student_section_fk/.test(migration)],
  ["Class sections cannot be moved between schools", /prevent_teacher_section_school_change/.test(migration) && /before update of school_id on public\.teacher_sections/.test(migration)],
  ["New class sections must target an active teacher in the same school", /is_active_school_member\(school_id, teacher_id/.test(migration)],
  ["School registration requires authenticated and email-confirmed owner", /getBearerUser\(request\)/.test(registerRoute) && /email_confirmed_at/.test(registerRoute)],
  ["Membership changes require owner/admin authorization", /Only a school owner or administrator can manage access/.test(managerRoute)],
  ["Client API calls carry tenant slug as non-secret context", /school_slug/.test(requestHelper) && /school_slug/.test(tenant)],
  ["Public directory explicitly selects only public school fields", /select\("name, short_name, slug, city, province, logo_path"\)/.test(publicDirectory) && !/select\("id, name, short_name, slug, contact_email/.test(publicDirectory)],
  ["Each school has a dedicated public portal route", /SchoolLandingPage/.test(publicTenant) && /getSchoolBySlug\(slug\)/.test(publicTenant)],
  ["Platform homepage lists multiple active schools", /listActiveSchoolDirectory/.test(homePage) && /schools\.map\(/.test(homePage)],
  ["Owner/admin can review school sections without reopening inactive classes", /membership\.role === "teacher"/.test(teacherPortal) && /Preserve inactive section state/i.test(teacherPortal) && !/update\(\{ is_active: true \}\)/.test(teacherPortal)],
  ["Hardening migration is an additive upgrade for prior tenant deployments", /drop policy if exists \"school members create own sections\"/.test(hardening) && /student_parent_feedback_school_student_section_fk/.test(hardening)],
  ["Fresh schema includes the tenant controls and follow-up hardening", schema.includes("BEGIN MULTI-TENANT SCHOOL SUPPORT") && schema.includes("BEGIN MULTI-TENANT INTEGRITY HARDENING") && schema.includes("student_parent_feedback_school_student_section_fk") && schema.includes("is_active_school_member")],
];
let failed = 0;
for (const [label, ok] of checks) {
  console.log(`${ok ? "PASS" : "FAIL"} ${label}`);
  if (!ok) failed++;
}
console.log(`\nResult: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
