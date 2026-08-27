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

Open `http://localhost:3000`. Supabase configuration is required for authentication and real submissions. Run all checks with `npm run check`.

### Required environment variables

- `NEXT_PUBLIC_SUPABASE_URL` — browser-safe project URL
- `NEXT_PUBLIC_SUPABASE_ANON_KEY` — browser-safe anonymous/publishable key
- `NEXT_PUBLIC_SITE_URL` — exact application origin, without a trailing slash

Do not expose a database password, service-role key, access token, or authenticated connection string. For Vercel, scope these browser-safe values to Preview until authentication, booking, and RLS checks have completed. Configure the Supabase Site URL for the deployed origin and allow `https://<deployment-origin>/auth/callback` plus `http://localhost:3000/auth/callback` during development.

## Supabase operations

1. Create separate development, preview, and production projects.
2. Review migrations in order; customer access is ownership-scoped and direct private-table writes remain denied.
3. Add provider/dispatcher/admin policies only when those roles are implemented.
4. Create a private `job-media` bucket with MIME/10 MB restrictions and signed access.
5. Set the two `NEXT_PUBLIC_` variables. Keep `SUPABASE_SERVICE_ROLE_KEY` server-only.
6. Abandoned upload objects live under `<user>/<job>/...`; schedule a server-side cleanup task for objects without `job_media` rows after 24 hours.
7. Test every new role against RLS before granting it access.

## Vercel next steps

1. Import this repository with the Next.js preset.
2. Add environment variables per Preview/Production environment.
3. Deploy a Preview and run mobile, keyboard, and browser accessibility checks before promotion.
4. Replace `https://muber.example` in metadata with the production domain.

Stripe/Connect, maps, SMS, tracking, matching/pricing, background checks, production legal agreements, and native apps are intentionally not live or simulated.

## Security

Browser drafts may contain contact/address data, so shared-device users should clear site data. Production uploads must be revalidated server-side, metadata/filenames sanitized, and stored privately. Dashboard mocks live only in `src/fixtures/customer.ts`.
