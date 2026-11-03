import fs from "node:fs";
const read = (f) => fs.readFileSync(f, "utf8");
const home = read("app/page.tsx");
const finder = read("components/school-finder-form.tsx");
const findApi = read("app/api/schools/find/route.ts");
const register = read("app/api/schools/register/route.ts");
const profileApi = read("app/api/schools/profile/route.ts");
const manager = read("components/school-manager.tsx");
const schema = read("supabase/schema.sql");
const migration = read("supabase/migrations/20261018_school_official_id.sql");
const sitemap = read("app/sitemap.ts");
const schoolHome = read("app/s/[slug]/page.tsx");
const checks = [
  ["Home page does not query or render a public school directory", !/listActiveSchoolDirectory|schools\.map\(/.test(home)],
  ["Home page links to exact-ID find-school flow", /SchoolFinderForm compact/.test(home) && /href=\"\/schools\/find\"/.test(home)],
  ["School lookup accepts only a bounded exact ID and POST body", /officialSchoolId/.test(findApi) && /readBodyLimited/.test(findApi) && /\.ilike\(\"official_school_id\", officialSchoolId\)/.test(findApi)],
  ["School lookup is rate-limited and doesn't return a school list", /allowRequest/.test(findApi) && !/\.select\(\".*\"\)\s*\.eq\(\"status\", \"active\"\)\s*\.order/.test(findApi)],
  ["Registration requires and stores an official School ID", /officialSchoolId/.test(register) && /official_school_id: officialSchoolId/.test(register)],
  ["Existing tenant owners can set the official School ID with role checks", /getActiveMembership/.test(profileApi) && /owner.*admin/.test(profileApi) && /official_school_id:/.test(profileApi) && /saveOfficialSchoolId/.test(manager)],
  ["Official School ID has a unique normalized index", /schools_official_school_id_uq/.test(schema) && /upper\(btrim\(official_school_id\)\)/.test(schema) && /schools_official_school_id_uq/.test(migration)],
  ["Default SNHS ID is safely backfilled", /official_school_id = '301734'/.test(migration)],
  ["School landing page is not indexed", /index: false, follow: false/.test(schoolHome)],
  ["Sitemap does not publish school portal URLs", !/listActiveSchoolDirectory|encodeURIComponent\(school\.slug\)/.test(sitemap)],
  ["Search posts School ID instead of putting it in URL", /method: \"POST\"/.test(finder) && /JSON\.stringify\(\{ officialSchoolId: normalized \}\)/.test(finder)],
];
let failed = 0;
for (const [label, passed] of checks) { console.log(`${passed ? "PASS" : "FAIL"} ${label}`); if (!passed) failed++; }
console.log(`\nResult: ${checks.length - failed} passed, ${failed} failed`);
if (failed) process.exit(1);
