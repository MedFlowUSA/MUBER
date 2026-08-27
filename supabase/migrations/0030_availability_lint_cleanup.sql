create or replace function public.set_my_provider_availability(p_date date,p_status text,p_capacity int,p_notes text,p_request_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_company uuid;v_id uuid;
begin
  select pc.id into v_company from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id where om.profile_id=auth.uid() and om.role in ('provider_owner','provider_manager') order by pc.created_at limit 1;
  if v_company is null then raise exception 'contractor company not found'; end if;
  if p_date<current_date or p_date>current_date+365 or p_status not in ('available','limited','unavailable') or (p_status='limited' and coalesce(p_capacity,0) not between 1 and 20) or length(coalesce(p_notes,''))>500 then raise exception 'invalid availability'; end if;
  insert into public.provider_availability_days(provider_company_id,service_date,status,capacity_jobs,notes,updated_by)
  values(v_company,p_date,p_status,case when p_status='limited' then p_capacity else null end,nullif(trim(coalesce(p_notes,'')),''),auth.uid())
  on conflict(provider_company_id,service_date) do update set status=excluded.status,capacity_jobs=excluded.capacity_jobs,notes=excluded.notes,updated_by=auth.uid()
  returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'provider.availability_set','provider_availability_day',v_id,jsonb_build_object('service_date',p_date,'status',p_status,'capacity_jobs',case when p_status='limited' then p_capacity else null end),p_request_id);
  return v_id;
end $$;
revoke all on function public.set_my_provider_availability(date,text,int,text,uuid) from public;
grant execute on function public.set_my_provider_availability(date,text,int,text,uuid) to authenticated;
