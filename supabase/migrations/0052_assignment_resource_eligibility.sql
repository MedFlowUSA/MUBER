-- Revalidate concrete resources and legal credentials when an accepted provider
-- configures an assignment. Offer-time eligibility alone is not sufficient:
-- fleet, crew, credential, and provider status can change before scheduling.
create or replace function public.configure_assignment(
  p_assignment uuid,
  p_vehicle uuid,
  p_crew uuid,
  p_start timestamptz,
  p_end timestamptz,
  p_request_id uuid
) returns void
language plpgsql security definer set search_path=public as $$
declare
  v_assignment public.assignments%rowtype;
  v_vehicle public.vehicles%rowtype;
  v_crew public.crews%rowtype;
  v_review public.internal_job_reviews%rowtype;
  v_job public.jobs%rowtype;
  v_required text[];
  v_missing_credentials text[];
begin
  if p_request_id is null then raise exception 'request id required'; end if;
  if exists(
    select 1 from public.audit_events
    where actor_id=auth.uid() and action='assignment.configured' and request_id=p_request_id
  ) then return; end if;

  select * into v_assignment from public.assignments where id=p_assignment for update;
  if not found or not public.can_manage_provider(v_assignment.provider_company_id) then
    raise exception 'assignment not found';
  end if;
  if v_assignment.status not in ('accepted','crew_assigned') then
    raise exception 'assignment cannot be configured';
  end if;
  if not exists(
    select 1 from public.provider_companies
    where id=v_assignment.provider_company_id and status='approved'
  ) then raise exception 'provider is not approved and active'; end if;
  if p_start<now() or p_end<=p_start or p_end>p_start+interval '24 hours' then
    raise exception 'invalid arrival window';
  end if;

  select * into v_job from public.jobs where id=v_assignment.job_id;
  select * into v_review from public.internal_job_reviews where job_id=v_assignment.job_id;

  select * into v_vehicle from public.vehicles
  where id=p_vehicle and provider_company_id=v_assignment.provider_company_id and active;
  if not found then raise exception 'active company vehicle required'; end if;
  if not v_vehicle.insurance_eligible then
    raise exception 'vehicle is not insurance eligible';
  end if;
  if not (v_job.service::text=any(v_vehicle.service_categories)) then
    raise exception 'vehicle is not eligible for this service';
  end if;
  if v_review.required_vehicle_class is not null
    and v_vehicle.vehicle_type<>v_review.required_vehicle_class
    and v_vehicle.capacity_class is distinct from v_review.required_vehicle_class then
    raise exception 'vehicle does not meet the required class';
  end if;

  select * into v_crew from public.crews
  where id=p_crew and provider_company_id=v_assignment.provider_company_id and active;
  if not found then raise exception 'active company crew required'; end if;
  if v_job.service='move' and not v_crew.moving_eligible then
    raise exception 'crew is not moving eligible';
  end if;
  if v_job.service='remove' and not v_crew.removal_eligible then
    raise exception 'crew is not removal eligible';
  end if;
  if v_crew.crew_size<coalesce(v_review.required_crew_size,1) then
    raise exception 'crew is too small for this job';
  end if;
  if exists(select 1 from public.job_items where job_id=v_job.id and heavy)
    and not v_crew.heavy_item_capable then
    raise exception 'heavy-item capable crew required';
  end if;

  v_required:=array['general_liability','commercial_auto']::text[]
    || coalesce(v_review.credential_requirements,'{}');
  if v_job.service='move' then
    v_required:=v_required||array['cargo_insurance','ca_household_mover_permit'];
  end if;
  select coalesce(array_agg(distinct required.type order by required.type),'{}'::text[])
    into v_missing_credentials
  from unnest(v_required) required(type)
  where not exists(
    select 1 from public.provider_credentials pc
    where pc.provider_company_id=v_assignment.provider_company_id
      and pc.credential_type=required.type
      and pc.verification_status='verified'
      and (pc.expires_at is null or pc.expires_at>current_date)
  );
  if cardinality(v_missing_credentials)>0 then
    raise exception 'required provider credentials are missing or expired';
  end if;

  if exists(
    select 1 from public.assignments a
    where a.id<>p_assignment
      and a.status not in ('canceled','reassignment_required','completed')
      and (a.crew_id=p_crew or a.vehicle_id=p_vehicle)
      and tstzrange(a.scheduled_start,a.scheduled_end,'[)') && tstzrange(p_start,p_end,'[)')
  ) then raise exception 'crew or vehicle has a schedule conflict'; end if;

  update public.assignments set
    crew_id=p_crew,
    vehicle_id=p_vehicle,
    scheduled_start=p_start,
    scheduled_end=p_end,
    status='crew_assigned'
  where id=p_assignment;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id)
  values(
    auth.uid(),
    'assignment.configured',
    'assignment',
    p_assignment,
    jsonb_build_object(
      'crew_id',p_crew,
      'vehicle_id',p_vehicle,
      'scheduled_start',p_start,
      'scheduled_end',p_end,
      'resource_eligibility_revalidated',true,
      'credential_eligibility_revalidated',true
    ),
    p_request_id
  );
end $$;

revoke all on function public.configure_assignment(uuid,uuid,uuid,timestamptz,timestamptz,uuid) from public;
grant execute on function public.configure_assignment(uuid,uuid,uuid,timestamptz,timestamptz,uuid) to authenticated;
