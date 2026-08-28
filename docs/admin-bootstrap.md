# MUBER first administrator bootstrap

The first MUBER super administrator is provisioned directly through Supabase.
There is no public staff-registration endpoint and setting Auth user metadata
does not grant application access.

## Preconditions

1. In the Supabase dashboard, create or verify the intended person under
   **Authentication → Users**.
2. Confirm the email belongs to the intended administrator.
3. Copy the user’s stable Auth UUID. Do not use an email address as the role key.
4. Confirm `public.profiles` contains the same UUID with the `customer` role.
5. Confirm no `super_admin` profile already exists.

## Reviewed one-time action

Open the Supabase SQL editor as the database owner and run this statement after
replacing both placeholders:

```sql
select public.bootstrap_first_super_admin(
  '<EXISTING_AUTH_USER_UUID>'::uuid,
  'Initial MUBER administrator approved by <APPROVER> on <DATE>'
);
```

The function:

- serializes concurrent bootstrap attempts;
- requires an existing customer profile;
- refuses to run if a super administrator already exists;
- changes only the selected profile’s role;
- writes `role.first_super_admin_bootstrapped` to the immutable audit log; and
- is not executable by anonymous, authenticated, or service-role API clients.

Verify the audit event and then sign in through `/admin/login`. All later staff
assignments must use the existing audited `assign_privileged_role` command from
an authenticated super-administrator context with a specific reason.

Never paste passwords, session tokens, API keys, or service-role keys into the
SQL editor, repository, issue tracker, or audit reason.
