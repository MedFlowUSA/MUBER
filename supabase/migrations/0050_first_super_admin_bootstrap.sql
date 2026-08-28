-- Database-owner-only first super-administrator bootstrap. This function is
-- intentionally not granted to API roles and must be invoked from a reviewed
-- Supabase SQL session with an explicit, existing Auth user UUID.
create or replace function public.bootstrap_first_super_admin(
  p_user uuid,
  p_reason text
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_prior_role public.app_role;
  v_reason text := trim(coalesce(p_reason, ''));
begin
  perform pg_advisory_xact_lock(hashtextextended('muber:first-super-admin', 0));

  if p_user is null then raise exception 'explicit auth user UUID is required'; end if;
  if length(v_reason) not between 20 and 500 then
    raise exception 'a bootstrap reason between 20 and 500 characters is required';
  end if;
  if exists(select 1 from public.profiles where role = 'super_admin') then
    raise exception 'a super administrator already exists';
  end if;

  select role into v_prior_role
  from public.profiles
  where id = p_user
  for update;
  if v_prior_role is null then
    raise exception 'existing Supabase Auth profile was not found';
  end if;
  if v_prior_role <> 'customer' then
    raise exception 'first administrator must begin as a customer profile';
  end if;

  update public.profiles set role = 'super_admin' where id = p_user;
  insert into public.audit_events(
    actor_id,
    action,
    entity_type,
    entity_id,
    metadata
  ) values (
    null,
    'role.first_super_admin_bootstrapped',
    'profile',
    p_user,
    jsonb_build_object(
      'from_role', v_prior_role,
      'to_role', 'super_admin',
      'reason', v_reason,
      'execution_channel', 'database_owner_sql'
    )
  );
end
$$;

revoke all on function public.bootstrap_first_super_admin(uuid,text) from public;
revoke all on function public.bootstrap_first_super_admin(uuid,text) from anon;
revoke all on function public.bootstrap_first_super_admin(uuid,text) from authenticated;
revoke all on function public.bootstrap_first_super_admin(uuid,text) from service_role;

comment on function public.bootstrap_first_super_admin(uuid,text) is
  'One-time database-owner-only bootstrap. Never grant to an API role.';
