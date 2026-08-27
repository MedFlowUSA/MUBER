create table public.provider_availability_days(
  id uuid primary key default gen_random_uuid(),provider_company_id uuid not null references public.provider_companies on delete cascade,
  service_date date not null,status text not null check(status in ('available','limited','unavailable')),
  capacity_jobs int check(capacity_jobs is null or capacity_jobs between 1 and 20),notes text check(notes is null or length(notes)<=500),
  updated_by uuid not null references public.profiles on delete restrict,created_at timestamptz not null default now(),updated_at timestamptz not null default now(),
  unique(provider_company_id,service_date)
);
alter table public.provider_availability_days enable row level security;
create trigger set_provider_availability_days_updated before update on public.provider_availability_days for each row execute function public.set_updated_at();
create policy "provider managers read own availability" on public.provider_availability_days for select to authenticated using(public.can_manage_provider(provider_company_id));
create policy "dispatch reads provider availability" on public.provider_availability_days for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
grant select on public.provider_availability_days to authenticated;
revoke insert,update,delete on public.provider_availability_days from authenticated;

create or replace function public.set_my_provider_availability(p_date date,p_status text,p_capacity int,p_notes text,p_request_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_company uuid;v_id uuid;v_role public.app_role;
begin
  select pc.id,om.role into v_company,v_role from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id where om.profile_id=auth.uid() and om.role in ('provider_owner','provider_manager') order by pc.created_at limit 1;
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

create or replace function public.remove_my_provider_availability(p_day uuid,p_request_id uuid) returns void
language plpgsql security definer set search_path=public as $$
declare v_day public.provider_availability_days%rowtype;
begin
  select * into v_day from public.provider_availability_days where id=p_day and public.can_manage_provider(provider_company_id) for update;
  if not found then raise exception 'availability entry not found'; end if;
  delete from public.provider_availability_days where id=p_day;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'provider.availability_removed','provider_availability_day',p_day,jsonb_build_object('service_date',v_day.service_date,'status',v_day.status),p_request_id);
end $$;
revoke all on function public.remove_my_provider_availability(uuid,uuid) from public;
grant execute on function public.remove_my_provider_availability(uuid,uuid) to authenticated;

create or replace function public.provider_schedule_eligible(p_provider uuid,p_job uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select not exists(select 1 from public.provider_availability_days d join public.jobs j on j.id=p_job where d.provider_company_id=p_provider and d.service_date=(j.preferred_start at time zone 'America/Los_Angeles')::date and d.status='unavailable')
  and not exists(select 1 from public.assignments a join public.jobs j on j.id=p_job where a.provider_company_id=p_provider and a.status not in ('canceled','reassignment_required') and j.preferred_start is not null and a.scheduled_start is not null and tstzrange(a.scheduled_start,coalesce(a.scheduled_end,a.scheduled_start+interval '4 hours'),'[]') && tstzrange(j.preferred_start,coalesce(j.preferred_end,j.preferred_start+interval '4 hours'),'[]'))
$$;
revoke all on function public.provider_schedule_eligible(uuid,uuid) from public;
grant execute on function public.provider_schedule_eligible(uuid,uuid) to authenticated;

create or replace function public.provider_schedule_eligibility_for_job(p_job uuid)
returns table(provider_company_id uuid,schedule_eligible boolean,schedule_reason text)
language plpgsql stable security definer set search_path=public as $$
begin
  if not public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  return query select pc.id,public.provider_schedule_eligible(pc.id,p_job),case
    when exists(select 1 from public.provider_availability_days d join public.jobs j on j.id=p_job where d.provider_company_id=pc.id and d.service_date=(j.preferred_start at time zone 'America/Los_Angeles')::date and d.status='unavailable') then 'Contractor marked the requested date unavailable'
    when not public.provider_schedule_eligible(pc.id,p_job) then 'Contractor has an existing schedule conflict'
    else null end
  from public.provider_companies pc order by pc.legal_name;
end $$;
revoke all on function public.provider_schedule_eligibility_for_job(uuid) from public;
grant execute on function public.provider_schedule_eligibility_for_job(uuid) to authenticated;

create or replace function public.enforce_provider_schedule_on_offer() returns trigger language plpgsql as $$
begin
  if new.status='sent' and not public.provider_schedule_eligible(new.provider_company_id,new.job_id) then raise exception 'provider has a calendar or schedule conflict'; end if;
  return new;
end $$;
create trigger enforce_provider_schedule_before_offer before insert or update of status,provider_company_id,job_id on public.provider_offers for each row execute function public.enforce_provider_schedule_on_offer();
