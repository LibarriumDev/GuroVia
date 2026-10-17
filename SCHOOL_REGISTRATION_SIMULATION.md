# GuroVia School Registration Simulation

## What it does

A new interactive, client-side walkthrough is available at `/demo/school-registration`. It shows the school-owner journey from entering a sample school profile through reviewing the generated slug, seeing example school/teacher/student routes, approving a fictional teacher, creating a fictional section, and viewing a sample grade table.

## Safety boundary

- The simulator is explicitly labelled as a simulation.
- It does not call application APIs or create Supabase records.
- It does not use the Supabase browser client or browser storage.
- Optional logo selection creates a temporary object URL in the current browser tab only. It is never uploaded; the object URL is revoked when replaced, reset, or unmounted.
- Example portal URLs use the reserved example domain `gurovia.example` and are not represented as live links.
- The route is marked `noindex`.
- Use example names and contact addresses, not actual student or sensitive personal data.

## Walkthrough stages

1. Enter fictional school name, short name, contact email, location and optional local logo preview. In real registration, an authorized representative must sign in with a verified teacher account and upload a valid WebP logo under 1 MB.
2. Review the sample details and learn what the real registration endpoint validates.
3. See simulated personalized school, teacher and student routes.
4. Approve a fictional teacher request and create a sample section.
5. Explore a fictional class roster and sample assessment scores for a term.

## Real registration

The real workflow remains at `/schools/register`. It still requires a signed-in, verified teacher account, current legal acknowledgements, official school information and a valid WebP logo. The simulator has no effect on that route or on existing school data.

## Verification

Run `npm run demo:check` to verify the demo is linked from the homepage and real registration page, is noindex, includes all main stages, and contains no API/Supabase/browser-storage calls. Run the normal `npm run typecheck` and `npm run build` before deploying.
