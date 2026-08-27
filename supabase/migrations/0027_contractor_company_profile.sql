alter table public.provider_companies
  add column display_name text,
  add column business_email text,
  add column business_phone text,
  add column website text,
  add column operating_hours jsonb not null default '{}',
  add column same_day_available boolean not null default false;

create or replace function public.update_my_provider_profile(p_data jsonb,p_request_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_company public.provider_companies%rowtype;v_before jsonb;
begin
  select pc.* into v_company from public.provider_companies pc
  join public.organization_members om on om.organization_id=pc.organization_id
  where om.profile_id=auth.uid() and om.role in ('provider_owner','provider_manager')
  order by pc.created_at limit 1 for update of pc;
  if not found then raise exception 'contractor company not found'; end if;
  if length(trim(coalesce(p_data->>'display_name',''))) not between 2 and 120
    or length(trim(coalesce(p_data->>'business_email',''))) not between 5 and 254
    or length(trim(coalesce(p_data->>'business_phone',''))) not between 7 and 30
    or jsonb_typeof(coalesce(p_data->'service_area','{}'::jsonb))<>'object'
    or jsonb_typeof(coalesce(p_data->'operating_hours','{}'::jsonb))<>'object'
  then raise exception 'invalid contractor profile'; end if;
  v_before:=jsonb_build_object('display_name',v_company.display_name,'business_email',v_company.business_email,'business_phone',v_company.business_phone,'website',v_company.website,'service_area',v_company.service_area,'available',v_company.available,'same_day_available',v_company.same_day_available);
  update public.provider_companies set
    display_name=trim(p_data->>'display_name'),business_email=lower(trim(p_data->>'business_email')),
    business_phone=trim(p_data->>'business_phone'),website=nullif(trim(coalesce(p_data->>'website','')),''),
    service_area=coalesce(p_data->'service_area','{}'::jsonb),operating_hours=coalesce(p_data->'operating_hours','{}'::jsonb),
    available=coalesce((p_data->>'available')::boolean,false),same_day_available=coalesce((p_data->>'same_day_available')::boolean,false)
  where id=v_company.id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id)
  values(auth.uid(),'provider.profile_updated','provider_company',v_company.id,jsonb_build_object('before',v_before,'after',jsonb_build_object('display_name',trim(p_data->>'display_name'),'business_email',lower(trim(p_data->>'business_email')),'business_phone',trim(p_data->>'business_phone'),'website',nullif(trim(coalesce(p_data->>'website','')),''),'service_area',coalesce(p_data->'service_area','{}'::jsonb),'available',coalesce((p_data->>'available')::boolean,false),'same_day_available',coalesce((p_data->>'same_day_available')::boolean,false))),p_request_id);
  return v_company.id;
end $$;
revoke all on function public.update_my_provider_profile(jsonb,uuid) from public;
grant execute on function public.update_my_provider_profile(jsonb,uuid) to authenticated;
