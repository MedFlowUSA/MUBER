-- Applicant-safe provider application status. The raw table remains hidden
-- because it contains internal compliance reasons and reviewer identities.
create or replace function public.my_provider_application_status()
returns table(
  id uuid,
  status text,
  legal_name text,
  dba_name text,
  submitted_at timestamptz,
  decided_at timestamptz,
  updated_at timestamptz
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pa.id,
    pa.status::text,
    pa.legal_name,
    pa.dba_name,
    pa.submitted_at,
    pa.decided_at,
    pa.updated_at
  from public.provider_applications pa
  where pa.applicant_id = auth.uid()
  order by pa.created_at desc
  limit 1
$$;

revoke all on function public.my_provider_application_status() from public;
grant execute on function public.my_provider_application_status() to authenticated;
