import { readFile } from "node:fs/promises";

const sql = await readFile("supabase/migrations/20261020_school_registration_prerequisites.sql", "utf8");
const route = await readFile("app/api/schools/register/route.ts", "utf8");
const form = await readFile("components/school-registration-form.tsx", "utf8");
const teacher = await readFile("components/teacher-portal.tsx", "utf8");
const checks = [
  ["Rate-limit table is created", /create table if not exists public\.request_limits/i.test(sql)],
  ["Rate-limit RPC is created and granted only to service role", /create or replace function public\.consume_request_limit/i.test(sql) && /grant execute on function public\.consume_request_limit[\s\S]*?to service_role/i.test(sql)],
  ["Legal acknowledgement columns are ensured", /add column if not exists platform_terms_version/i.test(sql) && /add column if not exists legal_accepted_by/i.test(sql)],
  ["Private logo bucket is ensured", /values \('school-logos', 'school-logos', false/i.test(sql)],
  ["Registration requires a confirmed teacher and rate-limits attempts", /getBearerUser\(request\)/.test(route) && /email_confirmed_at/.test(route) && /allowRequest\(request, "school-register-/.test(route)],
  ["Registration requires current legal policy versions", /platformTermsVersion/.test(route) && /cookieNoticeVersion/.test(route) && /legalAcceptance/.test(form)],
  ["Registration failures log a request ID and return a generic error", /console\.error\("\[api\/schools\/register\] failed", \{ requestId, name:/.test(route) && /The school could not be registered/.test(route)],
  ["Registration form displays the server error message", /payload\.error/.test(form) && /setError\(caught instanceof Error/.test(form)],
  ["Teacher inbox count uses the protected parent-feedback endpoint", /fetchWithRequestId\("\/api\/parent-feedback\?summary=1"/.test(teacher)],
];
let failed = 0;
for (const [name, passed] of checks) { console.log(`${passed ? "PASS" : "FAIL"} ${name}`); if (!passed) failed++; }
console.log(`\nResult: ${checks.length - failed} passed, ${failed} failed.`);
if (failed) process.exitCode = 1;
