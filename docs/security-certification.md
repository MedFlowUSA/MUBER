# MUBER security certification

Status values: `automated`, `human-assisted`, `passed`, `failed`, or `blocked`.
Never record passwords, tokens, signed URLs, private addresses, or storage paths.

## Disposable identities

Use inboxes controlled for testing and names in this form:

- `MUBER-CERT-A-YYYYMMDD`
- `MUBER-CERT-B-YYYYMMDD`
- `MUBER-CERT-OWNER-YYYYMMDD`
- `MUBER-CERT-CREW-YYYYMMDD`

Use unique passwords held only in the tester's password manager. Keep email
verification enabled. Do not use real customer information.

## Certification record

| Field                   | Value                         |
| ----------------------- | ----------------------------- |
| Date (UTC)              |                               |
| Commit                  |                               |
| Environment URL         |                               |
| Supabase project        | staging / linked test project |
| Tester                  |                               |
| Callback allowlist      | blocked / failed / passed     |
| Customer A lifecycle    | blocked / failed / passed     |
| Customer B isolation    | blocked / failed / passed     |
| Anonymous isolation     | automated / failed / passed   |
| Provider/crew lifecycle | blocked / failed / passed     |
| Completion lifecycle    | blocked / failed / passed     |
| Overall                 | blocked / failed / passed     |

For every individual check, record: UTC date, environment name, deployment
URL, Git commit, highest migration, role, synthetic identifier, test name,
status, sanitized reason, and cleanup status. Use
`node scripts/create-certification-record.mjs --help` to produce a validated,
secret-free JSONL record. Store working results outside Git.

## Current blocked management checks

Codex has no authorized Supabase Authentication URL Configuration surface in
this workspace. In Supabase Dashboard, open the linked staging project, then
Authentication → URL Configuration:

1. Confirm the production Site URL remains `https://muberapp.vercel.app`.
2. Add the exact production callback and reset routes.
3. Add the exact current Preview callback and reset routes for the deployment
   under certification.
4. Retain only required exact localhost callback/reset routes.
5. Remove obsolete Preview entries and broad wildcards only after confirming
   they are unused.
6. Save, test verification and password reset in both environments, and record
   the inspection time and result without copying tokens or signed links.

## Human-assisted checklist

1. Confirm exact callback and reset URLs in Supabase Authentication URL
   Configuration. Record only pass/fail and the inspection time.
2. Register Customer A, verify email, log in, reload to restore the session,
   submit a synthetic booking and allowed image, view the dashboard/job/image,
   log out, and complete password reset.
3. Register and verify Customer B. Attempt every cross-customer read, update,
   delete, signed-media, ownership-ID, and protected-route operation. Every
   operation must fail without disclosing whether Customer A's record exists.
4. Repeat private route and storage checks anonymously.
5. With a controlled privileged identity, approve a disposable provider owner,
   create a provider and crew, create an invitation, verify the matching crew
   account, and accept. Confirm cross-provider denial.
6. Assign a synthetic job and exercise crew confirmation, ready, en route,
   arrived, in progress, evidence, completion review, dispatcher approval, and
   customer-visible evidence.
7. Exercise dispatcher, compliance, finance, and super-admin identities.
   Confirm finance cannot read dispatch, credential, incident, or audit data;
   confirm every privileged role assignment produces an immutable audit event.

## Database pass/fail checks

Run `scripts/security-certification.sql` only from a controlled administrative
database session. Supply disposable UUIDs as transaction-local settings. The
script reports boolean results only and never selects customer content.

Run `scripts/database-security-audit.sql` from the Supabase SQL Editor or a
controlled administrative `psql` session before release. It reads catalog
metadata only and fails if it finds missing RLS, a public private bucket,
missing private-storage policies, unsafe `SECURITY DEFINER` configuration, or
missing immutable-history triggers. An empty findings result followed by a
successful transaction rollback is a pass.

Required settings:

- `cert.customer_a_profile`
- `cert.customer_b_profile`
- `cert.customer_a_job`
- `cert.provider_company`
- `cert.crew_profile`
- `cert.crew`

## Cleanup

1. Revoke pending invitations and remove synthetic jobs through controlled test
   cleanup procedures; do not weaken or delete audit history.
2. Delete disposable Auth users through the Supabase administrative dashboard.
3. Confirm cascading membership/customer cleanup completed as designed.
4. Remove test storage objects through the authorized storage interface.
5. Retain only the redacted certification record above.

Production promotion is prohibited while any required item is `blocked` or
`failed`.

## Live customer isolation harness

After the exact Preview callback and reset URLs are approved, run
`npm run test:live-security` with `RUN_LIVE_E2E=1`, `E2E_SITE_URL`, and the two
browser-safe Supabase variables supplied only through the local environment.
The harness creates disposable verified customers and checks booking, job
media, conversations, conversation attachments, cross-customer denial, and
anonymous denial. It prints assertion names only. Do not redirect debug output
or HTTP response bodies into a repository file.
