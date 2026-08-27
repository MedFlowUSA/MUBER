# MUBER — Phase 1

Mobile-first marketplace foundation for moving and junk removal in Redlands and the Inland Empire.

## Included

- Responsive homepage using the approved original assets in `public/brand`
- `/book/move` and `/book/remove` flows with validation and browser-local draft recovery
- Explicitly local-only demo submission; no remote persistence is implied
- Customer dashboard fixture, provider recruitment, and role-route foundations
- PWA identity and a default-deny Supabase schema/RLS draft
- Unit, component, route, environment, upload, and demo-label checks

## Local setup

Requires Node.js 20.9+ and npm.

```bash
npm install
copy .env.example .env.local
npm run dev
```

Open `http://localhost:3000`. Supabase variables can remain blank for the local demo. Run all checks with `npm run check`.

## Supabase next steps

1. Create separate development, preview, and production projects.
2. Resolve the authorization questions at the bottom of `supabase/migrations/0001_initial_schema.sql`.
3. Add narrow customer, organization, assignment, dispatcher, and admin policies. Do not deploy the draft with missing ownership policies.
4. Create a private `job-media` bucket with MIME/10 MB restrictions and signed access.
5. Set the two `NEXT_PUBLIC_` variables. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
6. Replace `getServerUser()` and `bookingRepository.submitLocal()` with validated server-side implementations.
7. Test the reviewed migration and every role in development with RLS enabled.

## Vercel next steps

1. Import this repository with the Next.js preset.
2. Add environment variables per Preview/Production environment.
3. Deploy a Preview and run mobile, keyboard, and browser accessibility checks before promotion.
4. Replace `https://muber.example` in metadata with the production domain.

Stripe/Connect, maps, SMS, tracking, matching/pricing, background checks, production legal agreements, and native apps are intentionally not live or simulated.

## Security

Browser drafts may contain contact/address data, so shared-device users should clear site data. Production uploads must be revalidated server-side, metadata/filenames sanitized, and stored privately. Dashboard mocks live only in `src/fixtures/customer.ts`.
