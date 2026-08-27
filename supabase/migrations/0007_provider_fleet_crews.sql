-- Provider-isolated fleet, crew, and non-activating crew invitation foundation.
create table public.crew_invitations (
  id uuid primary key default gen_random_uuid(),
  provider_company_id uuid not null references public.provider_companies on delete cascade,
  crew_id uuid references public.crews on delete cascade,
  email text not null,
  intended_role public.app_role not null check (intended_role in ('crew_lead','crew_member')),
  status text not null default 'pending' check (status in ('pending','accepted','expired','revoked')),
  invited_by uuid not null references public.profiles on delete restrict,
  expires_at timestamptz not null default (now()+interval '7 days'),
  accepted_by uuid references public.profiles on delete restrict,
  accepted_at timestamptz,
  created_at timestamptz not null default now(),
  unique(provider_company_id,email,status)
);
alter table public.crew_invitations enable row level security;

create policy "provider managers read vehicles" on public.vehicles for select to authenticated
using(public.can_manage_provider(provider_company_id));
create policy "provider managers read crews" on public.crews for select to authenticated
using(public.can_manage_provider(provider_company_id));
create policy "provider owners read crew invitations" on public.crew_invitations for select to authenticated
using(public.can_manage_provider(provider_company_id));

create or replace function public.my_provider_company()
returns uuid language sql stable security definer set search_path=public as $$
  select pc.id from public.provider_companies pc
  join public.organization_members om on om.organization_id=pc.organization_id
  where om.profile_id=auth.uid() and om.role in ('provider_owner','provider_manager') and pc.status='approved'
  limit 1
$$;
revoke all on function public.my_provider_company() from public;
grant execute on function public.my_provider_company() to authenticated;

create or replace function public.create_provider_vehicle(p_data jsonb)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid:=public.my_provider_company(); v_id uuid; v_type text:=trim(coalesce(p_data->>'vehicle_type',''));
begin
  if v_company is null then raise exception 'approved provider membership required'; end if;
  if length(trim(coalesce(p_data->>'label',''))) not between 2 and 100 then raise exception 'vehicle name required'; end if;
  if v_type not in ('pickup_truck','cargo_van','box_truck','moving_truck','trailer','dump_trailer','other') then raise exception 'invalid vehicle type'; end if;
  insert into public.vehicles(provider_company_id,label,vehicle_type,make,model,model_year,plate_metadata,capacity_class,cargo_dimensions,weight_capability,lift_gate,ramp,enclosed,service_categories,insurance_eligible,internal_notes)
  values(v_company,trim(p_data->>'label'),v_type,nullif(trim(p_data->>'make'),''),nullif(trim(p_data->>'model'),''),nullif(p_data->>'model_year','')::int,nullif(trim(p_data->>'plate_metadata'),''),nullif(trim(p_data->>'capacity_class'),''),nullif(trim(p_data->>'cargo_dimensions'),''),nullif(trim(p_data->>'weight_capability'),''),coalesce((p_data->>'lift_gate')::boolean,false),coalesce((p_data->>'ramp')::boolean,false),nullif(p_data->>'enclosed','')::boolean,coalesce(array(select jsonb_array_elements_text(p_data->'service_categories')),'{}'),false,nullif(trim(p_data->>'internal_notes'),'')) returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id) values(auth.uid(),'vehicle.created','vehicle',v_id);
  return v_id;
end $$;
revoke all on function public.create_provider_vehicle(jsonb) from public;
grant execute on function public.create_provider_vehicle(jsonb) to authenticated;

create or replace function public.set_provider_vehicle_active(p_vehicle uuid,p_active boolean)
returns void language plpgsql security definer set search_path=public as $$
declare v_company uuid;
begin
  select provider_company_id into v_company from public.vehicles where id=p_vehicle for update;
  if v_company is null or not public.can_manage_provider(v_company) then raise exception 'not found'; end if;
  update public.vehicles set active=p_active where id=p_vehicle;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'vehicle.availability_changed','vehicle',p_vehicle,jsonb_build_object('active',p_active));
end $$;
revoke all on function public.set_provider_vehicle_active(uuid,boolean) from public;
grant execute on function public.set_provider_vehicle_active(uuid,boolean) to authenticated;

create or replace function public.create_provider_crew(p_name text,p_size int,p_capabilities text[],p_heavy boolean,p_moving boolean,p_removal boolean)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid:=public.my_provider_company(); v_id uuid;
begin
  if v_company is null then raise exception 'approved provider membership required'; end if;
  if length(trim(coalesce(p_name,''))) not between 2 and 100 or p_size not between 1 and 20 then raise exception 'invalid crew'; end if;
  insert into public.crews(provider_company_id,name,crew_size,capabilities,heavy_item_capable,moving_eligible,removal_eligible)
  values(v_company,trim(p_name),p_size,coalesce(p_capabilities,'{}'),coalesce(p_heavy,false),coalesce(p_moving,false),coalesce(p_removal,false)) returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id) values(auth.uid(),'crew.created','crew',v_id);
  return v_id;
end $$;
revoke all on function public.create_provider_crew(text,int,text[],boolean,boolean,boolean) from public;
grant execute on function public.create_provider_crew(text,int,text[],boolean,boolean,boolean) to authenticated;

create or replace function public.create_crew_invitation(p_crew uuid,p_email text,p_role public.app_role)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid; v_id uuid; v_actor_role public.app_role;
begin
  select c.provider_company_id into v_company from public.crews c where c.id=p_crew;
  select om.role into v_actor_role from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id where pc.id=v_company and om.profile_id=auth.uid();
  if v_actor_role<>'provider_owner' then raise exception 'provider owner required'; end if;
  if p_role not in ('crew_lead','crew_member') or trim(coalesce(p_email,'')) !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' then raise exception 'invalid invitation'; end if;
  insert into public.crew_invitations(provider_company_id,crew_id,email,intended_role,invited_by)
  values(v_company,p_crew,lower(trim(p_email)),p_role,auth.uid()) returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'crew_invitation.created','crew_invitation',v_id,jsonb_build_object('role',p_role));
  return v_id;
end $$;
revoke all on function public.create_crew_invitation(uuid,text,public.app_role) from public;
grant execute on function public.create_crew_invitation(uuid,text,public.app_role) to authenticated;

-- Invitations deliberately have no activation command in Phase 2A. Association
-- requires a later verified-auth-user acceptance flow; possession of an email alone grants nothing.
