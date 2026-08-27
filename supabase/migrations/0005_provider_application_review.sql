-- Atomic provider application review and approval. All authorization is resolved
-- from auth.uid(); no browser-supplied reviewer or organization ID is trusted.
create or replace function public.has_any_role(p_roles public.app_role[])
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = any(p_roles)
  )
$$;
revoke all on function public.has_any_role(public.app_role[]) from public;
grant execute on function public.has_any_role(public.app_role[]) to authenticated;

create or replace function public.is_provider_member(p_organization uuid)
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists (
    select 1 from public.organization_members
    where organization_id = p_organization and profile_id = auth.uid()
  )
$$;
revoke all on function public.is_provider_member(uuid) from public;
grant execute on function public.is_provider_member(uuid) to authenticated;

-- Applicants use purpose-built submission commands. Removing direct reads keeps
-- internal review reasons inaccessible even to the application owner.
drop policy if exists "applicants read own applications" on public.provider_applications;

create policy "compliance reads provider applications"
on public.provider_applications for select to authenticated
using (public.has_any_role(array['compliance_admin','super_admin']::public.app_role[]));

create policy "compliance reads provider companies"
on public.provider_companies for select to authenticated
using (public.has_any_role(array['compliance_admin','super_admin']::public.app_role[]));

create policy "provider members read company"
on public.provider_companies for select to authenticated
using (
  public.is_provider_member(organization_id)
);

create policy "provider members read membership"
on public.organization_members for select to authenticated
using (
  profile_id = auth.uid()
  or public.is_provider_member(organization_id)
);

create or replace function public.review_provider_application(
  p_application uuid,
  p_decision text,
  p_internal_reason text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_actor uuid := auth.uid();
  v_application public.provider_applications%rowtype;
  v_organization uuid;
  v_company uuid;
  v_reason text := nullif(trim(coalesce(p_internal_reason, '')), '');
begin
  if v_actor is null or not public.has_any_role(array['compliance_admin','super_admin']::public.app_role[]) then
    raise exception 'forbidden';
  end if;
  if p_decision not in ('under_review','information_requested','approved','rejected','suspended') then
    raise exception 'invalid decision';
  end if;
  if p_decision in ('information_requested','rejected','suspended') and length(coalesce(v_reason,'')) < 10 then
    raise exception 'a specific internal reason is required';
  end if;

  select * into v_application
  from public.provider_applications
  where id = p_application
  for update;
  if not found then raise exception 'application not found'; end if;

  if p_decision = 'under_review' and v_application.status <> 'submitted' then
    raise exception 'invalid application transition';
  elsif p_decision = 'information_requested' and v_application.status not in ('submitted','under_review') then
    raise exception 'invalid application transition';
  elsif p_decision in ('approved','rejected') and v_application.status not in ('submitted','under_review') then
    raise exception 'invalid application transition';
  elsif p_decision = 'suspended' and v_application.status <> 'approved' then
    raise exception 'invalid application transition';
  end if;

  if p_decision = 'approved' then
    -- Serialize decisions for the same normalized legal name.
    perform pg_advisory_xact_lock(hashtextextended(lower(trim(v_application.legal_name)), 0));
    if exists (
      select 1 from public.provider_companies
      where lower(trim(legal_name)) = lower(trim(v_application.legal_name))
        and status <> 'suspended'
    ) then
      raise exception 'an active provider with this legal name already exists';
    end if;
    if exists (
      select 1 from public.organization_members om
      join public.organizations o on o.id = om.organization_id
      where om.profile_id = v_application.applicant_id and o.kind = 'provider'
    ) then
      raise exception 'applicant already belongs to a provider organization';
    end if;

    insert into public.organizations(name, kind)
    values (coalesce(nullif(trim(v_application.dba_name),''), trim(v_application.legal_name)), 'provider')
    returning id into v_organization;
    insert into public.provider_companies(organization_id, legal_name, status, service_area)
    values (
      v_organization,
      trim(v_application.legal_name),
      'approved',
      jsonb_build_object('description', v_application.service_territory)
    ) returning id into v_company;
    insert into public.organization_members(organization_id, profile_id, role)
    values (v_organization, v_application.applicant_id, 'provider_owner');
    update public.profiles set role = 'provider_owner' where id = v_application.applicant_id and role = 'customer';
    if not found then raise exception 'applicant is not eligible for provider-owner access'; end if;
  end if;

  update public.provider_applications
  set status = p_decision::public.provider_application_status,
      internal_reason = v_reason,
      decided_by = case when p_decision in ('approved','rejected','suspended') then v_actor else decided_by end,
      decided_at = case when p_decision in ('approved','rejected','suspended') then now() else decided_at end
  where id = p_application;

  insert into public.audit_events(actor_id, action, entity_type, entity_id, metadata)
  values (
    v_actor,
    'provider_application.' || p_decision,
    'provider_application',
    p_application,
    jsonb_strip_nulls(jsonb_build_object(
      'from_status', v_application.status,
      'to_status', p_decision,
      'reason', v_reason,
      'provider_company_id', v_company
    ))
  );
  return v_company;
end $$;
revoke all on function public.review_provider_application(uuid,text,text) from public;
grant execute on function public.review_provider_application(uuid,text,text) to authenticated;

create trigger set_provider_applications_updated
before update on public.provider_applications
for each row execute function public.set_updated_at();
