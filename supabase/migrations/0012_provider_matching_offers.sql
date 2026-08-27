alter table public.provider_companies add column service_categories text[] not null default '{}',add column disposal_capability boolean not null default false,add column available boolean not null default true;

create or replace function public.sync_approved_provider_capabilities() returns trigger language plpgsql security definer set search_path=public as $$
begin
  if new.status='approved' and old.status is distinct from new.status then
    update public.provider_companies pc set service_categories=new.service_categories,disposal_capability=new.disposal_capability
    from public.organization_members om where om.organization_id=pc.organization_id and om.profile_id=new.applicant_id;
  end if;return new;
end $$;
create trigger sync_provider_capabilities_after_approval after update of status on public.provider_applications for each row execute function public.sync_approved_provider_capabilities();
update public.provider_companies pc set service_categories=pa.service_categories,disposal_capability=pa.disposal_capability from public.organization_members om join public.provider_applications pa on pa.applicant_id=om.profile_id and pa.status='approved' where om.organization_id=pc.organization_id;

create unique index one_live_exclusive_offer_per_job on public.provider_offers(job_id) where status in ('sent','viewed');
create unique index one_active_assignment_per_job on public.assignments(job_id) where status not in ('canceled','reassignment_required');
create policy "dispatch reads offers" on public.provider_offers for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads assignments" on public.assignments for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "provider reads own assignments" on public.assignments for select to authenticated using(public.can_manage_provider(provider_company_id));

create or replace function public.eligible_providers_for_job(p_job uuid)
returns table(provider_company_id uuid,legal_name text,eligible boolean,reasons text[],vehicle_fit boolean,crew_fit boolean,credential_fit boolean)
language plpgsql stable security definer set search_path=public as $$
declare v_job public.jobs%rowtype;v_review public.internal_job_reviews%rowtype;v_provider public.provider_companies%rowtype;v_reasons text[];v_vehicle boolean;v_crew boolean;v_credentials boolean;v_required text[];
begin
  if not public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) then raise exception 'forbidden';end if;
  select * into v_job from public.jobs where id=p_job;if not found then raise exception 'job not found';end if;
  select * into v_review from public.internal_job_reviews where job_id=p_job;
  for v_provider in select * from public.provider_companies order by legal_name loop
    v_reasons:='{}';
    if v_provider.status<>'approved' then v_reasons:=array_append(v_reasons,'Provider is not approved and active');end if;
    if not v_provider.available then v_reasons:=array_append(v_reasons,'Provider is not currently available');end if;
    if not (v_job.service::text=any(v_provider.service_categories)) then v_reasons:=array_append(v_reasons,'Service category does not match');end if;
    if coalesce(v_provider.service_area->>'description','')='' then v_reasons:=array_append(v_reasons,'Service territory is not configured');end if;
    if v_job.service='remove' and not v_provider.disposal_capability then v_reasons:=array_append(v_reasons,'Disposal capability is required');end if;
    select exists(select 1 from public.vehicles v where v.provider_company_id=v_provider.id and v.active and v_job.service::text=any(v.service_categories) and (v_review.required_vehicle_class is null or v.vehicle_type=v_review.required_vehicle_class or v.capacity_class=v_review.required_vehicle_class)) into v_vehicle;
    if not v_vehicle then v_reasons:=array_append(v_reasons,'No active vehicle fits the job');end if;
    select exists(select 1 from public.crews c where c.provider_company_id=v_provider.id and c.active and c.crew_size>=coalesce(v_review.required_crew_size,1) and case when v_job.service='move' then c.moving_eligible else c.removal_eligible end) into v_crew;
    if not v_crew then v_reasons:=array_append(v_reasons,'No active crew fits the job');end if;
    v_required:=array['general_liability','commercial_auto']::text[]||coalesce(v_review.credential_requirements,'{}');if v_job.service='move' then v_required:=v_required||array['cargo_insurance','ca_household_mover_permit'];end if;
    select not exists(select 1 from unnest(v_required) required(type) where not exists(select 1 from public.provider_credentials pc where pc.provider_company_id=v_provider.id and pc.credential_type=required.type and pc.verification_status='verified' and (pc.expires_at is null or pc.expires_at>current_date))) into v_credentials;
    if not v_credentials then v_reasons:=array_append(v_reasons,'Required verified credentials are missing or expired');end if;
    provider_company_id:=v_provider.id;legal_name:=v_provider.legal_name;vehicle_fit:=v_vehicle;crew_fit:=v_crew;credential_fit:=v_credentials;reasons:=v_reasons;eligible:=cardinality(v_reasons)=0;return next;
  end loop;
end $$;
revoke all on function public.eligible_providers_for_job(uuid) from public;grant execute on function public.eligible_providers_for_job(uuid) to authenticated;

create or replace function public.create_provider_offer(p_job uuid,p_provider uuid,p_duration_minutes int,p_expires timestamptz,p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_quote public.quote_versions%rowtype;v_review public.internal_job_reviews%rowtype;v_job public.jobs%rowtype;v_eligible boolean;v_offer uuid;v_pickup text;v_destination text;v_role public.app_role;
begin
  select role into v_role from public.profiles where id=auth.uid();if v_role not in ('dispatcher','super_admin') then raise exception 'forbidden';end if;
  select entity_id into v_offer from public.audit_events where actor_id=auth.uid() and action='provider_offer.sent' and request_id=p_request_id;if v_offer is not null then return v_offer;end if;
  if p_expires<=now()+interval '5 minutes' or p_expires>now()+interval '72 hours' or p_duration_minutes not between 15 and 1440 then raise exception 'invalid offer timing';end if;
  select * into v_job from public.jobs where id=p_job for update;if not found or v_job.status<>'ready_for_matching' then raise exception 'job is not ready for matching';end if;
  select ep.eligible into v_eligible from public.eligible_providers_for_job(p_job) ep where ep.provider_company_id=p_provider;if not coalesce(v_eligible,false) then raise exception 'provider is not eligible';end if;
  select * into v_quote from public.quote_versions where id=v_job.accepted_quote_version_id and status='accepted';if not found or v_quote.estimated_provider_compensation_cents is null then raise exception 'accepted quote requires provider compensation';end if;
  select a.city||', '||a.region into v_pickup from public.job_stops js join public.addresses a on a.id=js.address_id where js.job_id=p_job and js.stop_type in ('pickup','service') order by js.stop_order limit 1;
  select a.city||', '||a.region into v_destination from public.job_stops js join public.addresses a on a.id=js.address_id where js.job_id=p_job and js.stop_type='destination' order by js.stop_order limit 1;
  select * into v_review from public.internal_job_reviews where job_id=p_job;
  insert into public.provider_offers(job_id,provider_company_id,quote_version_id,approximate_pickup_area,approximate_destination_area,scope,required_vehicle,required_crew_size,estimated_duration_minutes,compensation_cents,expires_at,status,created_by)
  values(p_job,p_provider,v_quote.id,v_pickup,v_destination,v_quote.customer_scope,v_review.required_vehicle_class,v_review.required_crew_size,p_duration_minutes,v_quote.estimated_provider_compensation_cents,p_expires,'sent',auth.uid()) returning id into v_offer;
  update public.jobs set status='offer_sent' where id=p_job;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(p_job,'offer_sent',auth.uid(),'Provider matching is in progress.',jsonb_build_object('customer_visible',true));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(p_job,v_job.status,'offer_sent','create_provider_offer',auth.uid(),v_role,jsonb_build_object('provider_company_id',p_provider,'offer_id',v_offer),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'provider_offer.sent','provider_offer',v_offer,jsonb_build_object('job_id',p_job,'provider_company_id',p_provider,'eligibility_result',true),p_request_id);
  return v_offer;
end $$;
revoke all on function public.create_provider_offer(uuid,uuid,int,timestamptz,uuid) from public;grant execute on function public.create_provider_offer(uuid,uuid,int,timestamptz,uuid) to authenticated;

create or replace function public.respond_to_provider_offer(p_offer uuid,p_response text,p_decline_reason text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_offer public.provider_offers%rowtype;v_job public.jobs%rowtype;v_assignment uuid;v_role public.app_role;
begin
  select nullif(metadata->>'assignment_id','')::uuid into v_assignment from public.audit_events where actor_id=auth.uid() and action in ('provider_offer.accepted','provider_offer.declined') and request_id=p_request_id;if found then return v_assignment;end if;
  select * into v_offer from public.provider_offers where id=p_offer for update;if not found or not public.can_manage_provider(v_offer.provider_company_id) then raise exception 'offer not found';end if;
  select om.role into v_role from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id where pc.id=v_offer.provider_company_id and om.profile_id=auth.uid();if v_role not in ('provider_owner','provider_manager') then raise exception 'forbidden';end if;
  if v_offer.status not in ('sent','viewed') or v_offer.expires_at<=now() then raise exception 'offer is no longer available';end if;
  select * into v_job from public.jobs where id=v_offer.job_id for update;if v_job.status<>'offer_sent' then raise exception 'job is no longer available';end if;
  if p_response='decline' then
    if p_decline_reason not in ('schedule_conflict','vehicle_unavailable','crew_unavailable','scope_mismatch','compensation','outside_service_area','other') then raise exception 'decline reason required';end if;
    update public.provider_offers set status='declined',decline_reason=p_decline_reason,responded_by=auth.uid(),responded_at=now() where id=p_offer;update public.jobs set status='ready_for_matching' where id=v_job.id;
    insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_job.id,v_job.status,'ready_for_matching','provider_decline_offer',auth.uid(),v_role,jsonb_build_object('offer_id',p_offer,'reason_category',p_decline_reason),p_request_id);
    insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'provider_offer.declined','provider_offer',p_offer,jsonb_build_object('reason_category',p_decline_reason),p_request_id);return null;
  elsif p_response<>'accept' then raise exception 'invalid response';end if;
  insert into public.assignments(job_id,provider_company_id,status,assigned_by,assigned_at,provider_accepted_at) values(v_job.id,v_offer.provider_company_id,'accepted',v_offer.created_by,now(),now()) returning id into v_assignment;
  update public.provider_offers set status='accepted',responded_by=auth.uid(),responded_at=now() where id=p_offer;update public.provider_offers set status='superseded' where job_id=v_job.id and id<>p_offer and status in ('draft','sent','viewed');update public.jobs set status='assigned' where id=v_job.id;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_job.id,'assigned',auth.uid(),'A provider has accepted your job.',jsonb_build_object('customer_visible',true));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_job.id,v_job.status,'assigned','provider_accept_offer',auth.uid(),v_role,jsonb_build_object('offer_id',p_offer,'assignment_id',v_assignment,'provider_company_id',v_offer.provider_company_id),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'provider_offer.accepted','provider_offer',p_offer,jsonb_build_object('job_id',v_job.id,'assignment_id',v_assignment),p_request_id);return v_assignment;
end $$;
revoke all on function public.respond_to_provider_offer(uuid,text,text,uuid) from public;grant execute on function public.respond_to_provider_offer(uuid,text,text,uuid) to authenticated;
