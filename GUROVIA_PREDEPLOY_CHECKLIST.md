# GuroVia pre-deployment checklist

## Database

- [ ] Confirm this is an existing tenant deployment or a fresh database.
- [ ] Existing tenant database: backup first; confirm 20261017 tenant migration and 20261018 hardening are recorded; apply 20261019 legal acknowledgement migration once.
- [ ] Fresh database: use `supabase/schema.sql` only; do not replay the upgrade migrations afterwards.
- [ ] Register a test school in staging and verify the terms/agreement/privacy/cookie version fields, authenticated owner ID, and server-generated timestamps are saved.

## UI and navigation

- [ ] Landing page brand reads GuroVia and does not show sample-school/workspace-container cards.
- [ ] Gradebook preview clearly labels its data illustrative.
- [ ] Developer support displays LibarriumX and DarrenBardelas.Dev@Gmail.Com.
- [ ] Platform legal links resolve: `/privacy`, `/terms`, `/agreement`, `/cookies`.
- [ ] Tenant-specific legal links resolve under `/s/{slug}/...` and use the correct school context.
- [ ] Verify mobile layout at 320px, 375px, 390px, and tablet widths.

## Cookie/analytics

- [ ] With no `NEXT_PUBLIC_GA_MEASUREMENT_ID`, banner offers only essential storage and does not load Google Analytics.
- [ ] With a valid measurement ID, no analytics script/network request occurs before acceptance.
- [ ] Essential-only choice persists; optional analytics remains disabled.
- [ ] Accepting analytics enables it only on public page views.
- [ ] Student, teacher, school management, authentication, grade and feedback inbox routes do not send Google Analytics page-view events.
- [ ] Query parameters, LRNs, PINs, student IDs, and credentials are not added to analytics locations.
- [ ] Cookie settings can be reopened and changed.

## Security, build and legal

- [ ] Run `npm ci` from the committed lockfile.
- [ ] Run `npm run security:check`.
- [ ] Run `npm run tenant:check`.
- [ ] Run `npm run typecheck`.
- [ ] Run `npm run build`.
- [ ] Deploy to Vercel preview; confirm the CSP permits legitimate navigation, auth, image uploads and analytics after consent.
- [ ] Re-run ZAP against the deployed HTTPS preview and review its Alerts report, not just the URL crawl export.
- [ ] Have the platform operator and each participating school review the policy templates with qualified Philippine privacy/legal counsel before production use.

Do not describe this release as fully tested until the build, staging registration, tenant-isolation tests, cookie behavior, and deployed ZAP retest have passed.
