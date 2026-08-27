-- Provider-managed editing with server-derived ownership and active-assignment safeguards.
create or replace function public.update_provider_vehicle(p_vehicle uuid,p_data jsonb,p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_vehicle public.vehicles%rowtype;v_type text:=trim(coalesce(p_data->>'vehicle_type',''));v_active boolean:=coalesce((p_data->>'active')::boolean,false);
begin
  select * into v_vehicle from public.vehicles where id=p_vehicle for update;
  if not found or not public.can_manage_provider(v_vehicle.provider_company_id) then raise exception 'vehicle not found';end if;
  if length(trim(coalesce(p_data->>'label',''))) not between 2 and 100 then raise exception 'vehicle name required';end if;
  if v_type not in ('pickup_truck','cargo_van','box_truck','moving_truck','trailer','dump_trailer','other') then raise exception 'invalid vehicle type';end if;
  if not v_active and v_vehicle.active and exists(select 1 from public.assignments where vehicle_id=p_vehicle and status not in ('canceled','reassignment_required','completed')) then raise exception 'vehicle has an active assignment';end if;
  update public.vehicles set label=trim(p_data->>'label'),vehicle_type=v_type,make=nullif(trim(p_data->>'make'),''),model=nullif(trim(p_data->>'model'),''),model_year=nullif(p_data->>'model_year','')::int,plate_metadata=nullif(trim(p_data->>'plate_metadata'),''),capacity_class=nullif(trim(p_data->>'capacity_class'),''),cargo_dimensions=nullif(trim(p_data->>'cargo_dimensions'),''),weight_capability=nullif(trim(p_data->>'weight_capability'),''),lift_gate=coalesce((p_data->>'lift_gate')::boolean,false),ramp=coalesce((p_data->>'ramp')::boolean,false),enclosed=nullif(p_data->>'enclosed','')::boolean,service_categories=coalesce(array(select jsonb_array_elements_text(p_data->'service_categories')),'{}'),internal_notes=nullif(trim(p_data->>'internal_notes'),''),active=v_active where id=p_vehicle;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'vehicle.updated','vehicle',p_vehicle,jsonb_build_object('before',jsonb_build_object('label',v_vehicle.label,'vehicle_type',v_vehicle.vehicle_type,'active',v_vehicle.active),'after',jsonb_build_object('label',trim(p_data->>'label'),'vehicle_type',v_type,'active',v_active)),p_request_id);
end $$;
revoke all on function public.update_provider_vehicle(uuid,jsonb,uuid) from public;
grant execute on function public.update_provider_vehicle(uuid,jsonb,uuid) to authenticated;

create or replace function public.update_provider_crew(p_crew uuid,p_data jsonb,p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_crew public.crews%rowtype;v_size int:=coalesce((p_data->>'crew_size')::int,0);v_active boolean:=coalesce((p_data->>'active')::boolean,false);
begin
  select * into v_crew from public.crews where id=p_crew for update;
  if not found or not public.can_manage_provider(v_crew.provider_company_id) then raise exception 'crew not found';end if;
  if length(trim(coalesce(p_data->>'name',''))) not between 2 and 100 or v_size not between 1 and 20 then raise exception 'invalid crew';end if;
  if not v_active and v_crew.active and exists(select 1 from public.assignments where crew_id=p_crew and status not in ('canceled','reassignment_required','completed')) then raise exception 'crew has an active assignment';end if;
  update public.crews set name=trim(p_data->>'name'),crew_size=v_size,capabilities=coalesce(array(select jsonb_array_elements_text(p_data->'capabilities')),'{}'),heavy_item_capable=coalesce((p_data->>'heavy')::boolean,false),moving_eligible=coalesce((p_data->>'moving')::boolean,false),removal_eligible=coalesce((p_data->>'removal')::boolean,false),active=v_active where id=p_crew;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'crew.updated','crew',p_crew,jsonb_build_object('before',jsonb_build_object('name',v_crew.name,'crew_size',v_crew.crew_size,'active',v_crew.active),'after',jsonb_build_object('name',trim(p_data->>'name'),'crew_size',v_size,'active',v_active)),p_request_id);
end $$;
revoke all on function public.update_provider_crew(uuid,jsonb,uuid) from public;
grant execute on function public.update_provider_crew(uuid,jsonb,uuid) to authenticated;
