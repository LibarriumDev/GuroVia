# GuroVia Cloudflare deploy fix

## Root cause

The Next.js build and TypeScript checks succeeded. Deployment failed because two worker names differed:

- Cloudflare configured Worker name: `gurovia-web`
- `WORKER_SELF_REFERENCE` service target: `gurovia-school-platform`

The service binding must point to the deployed Worker name. This repository now uses `gurovia-web` as its package name as well, so Cloudflare's non-interactive OpenNext migration has one consistent name to derive from.

## Steps

1. Commit and push the updated `package.json` and `package-lock.json` from this archive.
2. In Cloudflare Workers Builds, keep the configured Worker name as `gurovia-web`.
3. Keep the current commands for this auto-migration setup: build `npm run build`, deploy `npx wrangler deploy`. Let the migration step run again with the corrected package metadata.
4. Verify the next log shows `WORKER_SELF_REFERENCE` targeting `gurovia-web`, not `gurovia-school-platform`.
5. Confirm deployment completes and test the homepage, school registration, student lookup/dashboard, teacher sign-in, image upload and feedback routes.

## Alternative

If you intentionally want the Cloudflare Worker to be named `gurovia-school-platform`, change the Worker name in Cloudflare's project/build settings to exactly that name instead. Do not mix these names.

## Verification boundary

The original log shows the Next.js and OpenNext build completed; only Cloudflare's final deployment failed. This patch aligns project package metadata with the configured Worker name. The fix still needs confirmation from a new Cloudflare deployment log; it was not possible to call the Cloudflare account API from this environment.
