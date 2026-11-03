import { randomBytes } from "node:crypto";

console.log("Generate three independent local-only secrets. Do not reuse production values.\n");
console.log(`SUPABASE_LRN_HMAC_SECRET=${randomBytes(32).toString("base64")}`);
console.log(`SUPABASE_DATA_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`);
console.log(`SUPABASE_CONTACT_ENCRYPTION_KEY=${randomBytes(32).toString("base64")}`);
console.log("\nCopy these lines into .env.local. Keep them stable while testing data encrypted with these keys, and never commit .env.local.");
