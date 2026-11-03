import { readFileSync, existsSync } from "node:fs";
import { resolve } from "node:path";

const file = resolve(process.cwd(), ".env.local");
if (!existsSync(file)) {
  console.error("Missing .env.local. Run: Copy-Item .env.example .env.local");
  process.exit(1);
}
const values = Object.create(null);
for (const rawLine of readFileSync(file, "utf8").split(/\r?\n/)) {
  const line = rawLine.trim();
  if (!line || line.startsWith("#")) continue;
  const match = line.match(/^(?:export\s+)?([A-Za-z_][A-Za-z0-9_]*)\s*=\s*(.*)$/);
  if (!match) continue;
  let value = match[2].trim();
  if ((value.startsWith('"') && value.endsWith('"')) || (value.startsWith("'") && value.endsWith("'"))) value = value.slice(1, -1);
  values[match[1]] = value;
}
const failures = [];
const warnings = [];
const isPlaceholder = (value) => !value || /your-project-ref|replace-with|generate_(?:a|an|another)|<.*>/i.test(value);
function required(name, alternatives = []) {
  const foundName = [name, ...alternatives].find((candidate) => !isPlaceholder(values[candidate]));
  if (!foundName) failures.push(`${name}${alternatives.length ? ` (or ${alternatives.join(" / ")})` : ""} is missing or still a placeholder.`);
  return foundName ? values[foundName] : "";
}
const appUrl = required("NEXT_PUBLIC_APP_URL");
if (appUrl) {
  try {
    const parsed = new URL(appUrl);
    if (!["http:", "https:"].includes(parsed.protocol)) failures.push("NEXT_PUBLIC_APP_URL must use http:// or https://.");
    if (parsed.protocol === "http:" && !["localhost", "127.0.0.1"].includes(parsed.hostname)) warnings.push("NEXT_PUBLIC_APP_URL uses HTTP outside localhost; use HTTPS for shared/staging environments.");
  } catch { failures.push("NEXT_PUBLIC_APP_URL is not a valid URL."); }
}
const supabaseUrl = required("NEXT_PUBLIC_SUPABASE_URL");
if (supabaseUrl) {
  try {
    const parsed = new URL(supabaseUrl);
    const isLocal = ["localhost", "127.0.0.1"].includes(parsed.hostname);
    if (!isLocal && parsed.protocol !== "https:") failures.push("NEXT_PUBLIC_SUPABASE_URL must use HTTPS unless using local Supabase.");
    if (!isLocal && !parsed.hostname.endsWith(".supabase.co")) warnings.push("Supabase URL host is not a standard *.supabase.co hostname; verify it is intended.");
  } catch { failures.push("NEXT_PUBLIC_SUPABASE_URL is not a valid URL."); }
}
required("NEXT_PUBLIC_SUPABASE_PUBLISHABLE_KEY", ["NEXT_PUBLIC_SUPABASE_ANON_KEY"]);
required("SUPABASE_SECRET_KEY", ["SUPABASE_SERVICE_ROLE_KEY"]);
const hmac = required("SUPABASE_LRN_HMAC_SECRET");
if (hmac && Buffer.byteLength(hmac, "utf8") < 32) failures.push("SUPABASE_LRN_HMAC_SECRET must contain at least 32 UTF-8 bytes.");
for (const name of ["SUPABASE_DATA_ENCRYPTION_KEY", "SUPABASE_CONTACT_ENCRYPTION_KEY"]) {
  const value = required(name);
  if (value && Buffer.from(value, "base64").length !== 32) failures.push(`${name} must be a base64-encoded 32-byte key.`);
}
if (!values.NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL) warnings.push("NEXT_PUBLIC_PRIVACY_CONTACT_EMAIL is blank; public legal pages may lack the platform privacy contact.");
if (!values.SUPABASE_CONTACT_ADMIN_EMAILS) warnings.push("SUPABASE_CONTACT_ADMIN_EMAILS is blank; the protected contact inbox will not have an allowlisted reader.");
if (values.NEXT_PUBLIC_GA_MEASUREMENT_ID && !/^G-[A-Z0-9]+$/i.test(values.NEXT_PUBLIC_GA_MEASUREMENT_ID)) failures.push("NEXT_PUBLIC_GA_MEASUREMENT_ID must be a GA4 measurement ID like G-XXXXXXXXXX, or blank.");
if (failures.length) {
  console.error("Local environment check FAILED. Secret values are intentionally not printed.\n");
  for (const item of failures) console.error(`- ${item}`);
  if (warnings.length) { console.error("\nWarnings:"); for (const item of warnings) console.warn(`- ${item}`); }
  process.exit(1);
}
console.log("Local environment check PASSED. Required variable names and key formats look valid; credentials were not tested against Supabase.");
for (const item of warnings) console.warn(`Warning: ${item}`);
