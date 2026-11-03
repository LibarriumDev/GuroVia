import fs from "node:fs";
const read = (file) => fs.readFileSync(file, "utf8");
const api = read("app/api/teacher/sections/route.ts");
const teacher = read("components/teacher-portal.tsx");
const session = read("app/api/students/session/route.ts");
const student = read("components/student-portal.tsx");
const patternFiles = ["components/school-registration-form.tsx", "components/school-manager.tsx", "components/school-finder-form.tsx"];
const checks = [
  ["Section APIs require an authenticated Supabase user", /getBearerUser\(request\)/.test(api)],
  ["Section APIs resolve the requested tenant on the server", /getRequestSchool\(request\)/.test(api) && /\.eq\("school_id", context\.school\.id\)/.test(api)],
  ["Section APIs require active membership", /getActiveMembership/.test(api) && /membership\.status !== "active"/.test(api)],
  ["Teacher reads are limited to their own sections", /membership\.role === "teacher"\) query = query\.eq\("teacher_id", context\.auth\.user\.id\)/.test(api)],
  ["Section creation checks same-origin mutation and body size", /validMutationOrigin\(request\)/.test(api) && /readBodyLimited\(request, 8 \* 1024\)/.test(api)],
  ["Section creation validates grade and section name server-side", /gradeLevel < 7 \|\| gradeLevel > 12/.test(api) && /sectionName\.length > 40/.test(api)],
  ["Teacher dashboard no longer queries teacher_sections directly from browser", !/supabase\.from\("teacher_sections"\)/.test(teacher) && /\/api\/teacher\/sections/.test(teacher)],
  ["Section creation uses the authenticated server API", /method: "POST"/.test(teacher) && /\/api\/teacher\/sections/.test(teacher)],
  ["Student login session probe handles unauthenticated 200 safely", /privateResponse\(\{ authenticated: false \}, 200\)/.test(session) && /payload\.authenticated === true/.test(student)],
  ["School ID patterns avoid invalid hyphen character-class syntax", patternFiles.every((file) => !/pattern="\[A-Za-z0-9\]\[A-Za-z0-9-\]/.test(read(file)) && /pattern="\[A-Za-z0-9\]\(\?:\[A-Za-z0-9\]\|-\)/.test(read(file)))],
  ["API does not add permissive CORS headers", !/Access-Control-Allow-Origin/.test(api)],
];
let failed = 0;
for (const [label, passed] of checks) { console.log(`${passed ? "PASS" : "FAIL"} ${label}`); if (!passed) failed++; }
console.log(`\nResult: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
