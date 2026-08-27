-- Private provider credential submission and compliance review.
update public.provider_credentials
set verification_status = case verification_status
  when 'pending' then 'missing'
  else verification_status
end;

alter table public.provider_credentials
  add constraint provider_credentials_status_check
  check (verification_status in ('missing','submitted','under_review','verified','rejected','expiring','expired','suspended'));

create index provider_credentials_company_status_idx
on public.provider_credentials(provider_company_id, verification_status, expires_at);

create or replace function public.can_manage_provider(p_company uuid)
returns boolean language sql stable security definer set search_path=public as $$
  select exists (
    select 1
    from public.provider_companies pc
    join public.organization_members om on om.organization_id = pc.organization_id
    where pc.id = p_company
      and om.profile_id = auth.uid()
      and om.role in ('provider_owner','provider_manager')
  )
$$;
revoke all on function public.can_manage_provider(uuid) from public;
grant execute on function public.can_manage_provider(uuid) to authenticated;

create policy "provider managers read credentials"
on public.provider_credentials for select to authenticated
using (public.can_manage_provider(provider_company_id));

create policy "compliance reads credentials"
on public.provider_credentials for select to authenticated
using (public.has_any_role(array['compliance_admin','super_admin']::public.app_role[]));

create or replace function public.create_provider_credential(
  p_type text,
  p_number text,
  p_issuer text,
  p_issued date,
  p_expires date
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid; v_id uuid;
begin
  select pc.id into v_company
  from public.provider_companies pc
  join public.organization_members om on om.organization_id=pc.organization_id
  where om.profile_id=auth.uid() and om.role in ('provider_owner','provider_manager')
    and pc.status='approved'
  limit 1;
  if v_company is null then raise exception 'approved provider membership required'; end if;
  if trim(coalesce(p_type,'')) not in (
    'general_liability','commercial_auto','cargo_insurance','ca_household_mover_permit',
    'business_license','driver_qualification','disposal_documentation','w9_status','other'
  ) then raise exception 'invalid credential type'; end if;
  if p_expires is not null and p_issued is not null and p_expires < p_issued then
    raise exception 'expiration must follow issue date';
  end if;
  insert into public.provider_credentials(
    provider_company_id,credential_type,credential_number,issuing_authority,
    issued_at,expires_at,verification_status
  ) values (
    v_company,trim(p_type),nullif(trim(coalesce(p_number,'')),''),
    nullif(trim(coalesce(p_issuer,'')),''),p_issued,p_expires,'missing'
  ) returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'credential.created','provider_credential',v_id,jsonb_build_object('credential_type',trim(p_type)));
  return v_id;
end $$;
revoke all on function public.create_provider_credential(text,text,text,date,date) from public;
grant execute on function public.create_provider_credential(text,text,text,date,date) to authenticated;

create or replace function public.register_credential_document(p_credential uuid,p_path text)
returns void language plpgsql security definer set search_path=public,storage as $$
declare v_credential public.provider_credentials%rowtype;
begin
  select * into v_credential from public.provider_credentials where id=p_credential for update;
  if not found or not public.can_manage_provider(v_credential.provider_company_id) then raise exception 'not found'; end if;
  if p_path not like v_credential.provider_company_id::text||'/'||p_credential::text||'/%' then raise exception 'invalid document path'; end if;
  if not exists(select 1 from storage.objects where bucket_id='provider-credentials' and name=p_path) then raise exception 'document not found'; end if;
  update public.provider_credentials set private_storage_path=p_path,verification_status='submitted',submitted_at=now(),reviewer_id=null,verified_at=null,rejection_reason=null where id=p_credential;
  insert into public.audit_events(actor_id,action,entity_type,entity_id)
  values(auth.uid(),'credential.submitted','provider_credential',p_credential);
end $$;
revoke all on function public.register_credential_document(uuid,text) from public;
grant execute on function public.register_credential_document(uuid,text) to authenticated;

create or replace function public.review_provider_credential(p_credential uuid,p_decision text,p_reason text default null)
returns void language plpgsql security definer set search_path=public as $$
declare v_before public.provider_credentials%rowtype; v_reason text:=nullif(trim(coalesce(p_reason,'')),'');
begin
  if not public.has_any_role(array['compliance_admin','super_admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if p_decision not in ('under_review','verified','rejected','suspended') then raise exception 'invalid decision'; end if;
  select * into v_before from public.provider_credentials where id=p_credential for update;
  if not found then raise exception 'credential not found'; end if;
  if p_decision='under_review' and v_before.verification_status<>'submitted' then raise exception 'invalid transition'; end if;
  if p_decision in ('verified','rejected') and v_before.verification_status not in ('submitted','under_review') then raise exception 'invalid transition'; end if;
  if p_decision='suspended' and v_before.verification_status<>'verified' then raise exception 'invalid transition'; end if;
  if p_decision in ('rejected','suspended') and length(coalesce(v_reason,''))<10 then raise exception 'a specific reason is required'; end if;
  if p_decision='verified' and v_before.expires_at is not null and v_before.expires_at<=current_date then raise exception 'expired credential cannot be verified'; end if;
  update public.provider_credentials set verification_status=p_decision,reviewer_id=auth.uid(),verified_at=case when p_decision='verified' then now() else null end,rejection_reason=case when p_decision in ('rejected','suspended') then v_reason else null end where id=p_credential;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'credential.'||p_decision,'provider_credential',p_credential,jsonb_strip_nulls(jsonb_build_object('from_status',v_before.verification_status,'to_status',p_decision,'reason',v_reason)));
end $$;
revoke all on function public.review_provider_credential(uuid,text,text) from public;
grant execute on function public.review_provider_credential(uuid,text,text) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('provider-credentials','provider-credentials',false,10485760,array['application/pdf','image/jpeg','image/png','image/webp'])
on conflict(id) do update set public=false,file_size_limit=excluded.file_size_limit,allowed_mime_types=excluded.allowed_mime_types;

create policy "provider managers upload credential documents" on storage.objects
for insert to authenticated with check(
  bucket_id='provider-credentials'
  and public.can_manage_provider(((storage.foldername(name))[1])::uuid)
);
create policy "authorized users read credential documents" on storage.objects
for select to authenticated using(
  bucket_id='provider-credentials'
  and (
    public.can_manage_provider(((storage.foldername(name))[1])::uuid)
    or public.has_any_role(array['compliance_admin','super_admin']::public.app_role[])
  )
);
