# GuroVia

GuroVia is a multi-school gradebook platform. Each school gets a branded portal where administrators manage staff access, teachers organize sections and record grades, and students review their reports. Families can send feedback to the student's assigned adviser.

## Technology

- Next.js App Router 16, React 19, and TypeScript
- Supabase Postgres, Auth, row-level security, and private Storage
- Vercel deployment

Requires Node.js 20.9 or later and a Supabase project.

## Install and configure

```powershell
npm ci
Copy-Item .env.example .env.local
```

Set the Supabase URL, publishable key, and server secret key in `.env.local`. Set `NEXT_PUBLIC_APP_URL` to the production origin before deployment. Generate independent values for the HMAC and encryption keys with:

```powershell
npm run secrets:generate
```

Copy the generated values into `SUPABASE_LRN_HMAC_SECRET`, `SUPABASE_DATA_ENCRYPTION_KEY`, and `SUPABASE_CONTACT_ENCRYPTION_KEY`. Keep these values private and stable for existing data. Never expose server keys through a `NEXT_PUBLIC_` variable or commit `.env.local`.

Optional settings include the public privacy contact, contact inbox email allowlist, Google Search Console verification token, and GA4 measurement ID. Leave the analytics ID blank to disable analytics. Check local settings with `npm run env:check`; the check validates names and formats, not provider credentials.

For a new database, run `supabase/schema.sql`. For an existing database, back it up and apply only migrations that are not already recorded, in order, from `supabase/migrations/`. Do not run the fresh-install schema over an existing installation.

## Development and verification

```powershell
npm run dev
npm run typecheck
npm run security:check
npm run tenant:check
npm run registration:check
npm run demo:check
npm run school-id:check
npm run sections:check
npm run build
npm start
```

There is no separate lint command configured in `package.json`.

## Production deployment

Configure the required environment variables in Vercel, set `NEXT_PUBLIC_APP_URL` to the canonical HTTPS origin, and build with `npm run build`. In Supabase Auth, enable teacher email confirmation and allow the deployed `/auth/callback` URL.

Before inviting students, each school should review its privacy notice, official privacy contact, lawful bases, and education-record retention practices. The included legal pages are templates and do not establish legal compliance on their own.
