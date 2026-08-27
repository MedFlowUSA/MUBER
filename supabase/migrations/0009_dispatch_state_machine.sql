alter table public.audit_events add column if not exists request_id uuid;
create unique index audit_idempotent_request_idx on public.audit_events(actor_id,action,request_id) where request_id is not null;

create table public.job_operational_events(
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs on delete cascade,
  from_status public.job_status not null,
  to_status public.job_status not null,
  command text not null,
  actor_id uuid not null references public.profiles on delete restrict,
  actor_role public.app_role not null,
  reason text,
  metadata jsonb not null default '{}',
  request_id uuid,
  occurred_at timestamptz not null default now(),
  unique(actor_id,request_id)
);
alter table public.job_operational_events enable row level security;
create trigger immutable_job_operational_events before update or delete on public.job_operational_events for each row execute function public.prevent_event_mutation();

create policy "dispatch reads jobs" on public.jobs for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads customers" on public.customers for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads addresses" on public.addresses for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads stops" on public.job_stops for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads items" on public.job_items for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads media metadata" on public.job_media for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads customer timeline" on public.job_status_events for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads operational events" on public.job_operational_events for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads internal reviews" on public.internal_job_reviews for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "dispatch reads job media objects" on storage.objects for select to authenticated using(bucket_id='job-media' and public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));

create or replace function public.normalize_new_job_status() returns trigger language plpgsql as $$
begin
  if new.status='requested' then new.status='submitted'; end if;
  return new;
end $$;
create trigger normalize_new_job before insert on public.jobs for each row execute function public.normalize_new_job_status();
create trigger normalize_new_job_event before insert on public.job_status_events for each row execute function public.normalize_new_job_status();
update public.jobs set status='submitted' where status='requested';

create or replace function public.transition_job(
  p_job uuid,
  p_command text,
  p_reason text default null,
  p_metadata jsonb default '{}',
  p_request_id uuid default null
)
returns public.job_status language plpgsql security definer set search_path=public as $$
declare
  v_actor uuid:=auth.uid(); v_role public.app_role; v_from public.job_status; v_to public.job_status;
  v_reason text:=nullif(trim(coalesce(p_reason,'')),''); v_existing text; v_customer_note text;
begin
  select role into v_role from public.profiles where id=v_actor;
  if v_role not in ('dispatcher','super_admin') then raise exception 'forbidden'; end if;
  if p_request_id is not null then
    select metadata->>'to_status' into v_existing from public.audit_events where actor_id=v_actor and action='job.transition' and request_id=p_request_id;
    if v_existing is not null then return v_existing::public.job_status; end if;
  end if;
  select status into v_from from public.jobs where id=p_job for update;
  if not found then raise exception 'job not found'; end if;

  v_to:=case
    when p_command='start_review' and v_from='submitted' then 'needs_review'
    when p_command='request_customer_information' and v_from in ('submitted','needs_review') then 'needs_customer_information'
    when p_command='resume_review' and v_from='needs_customer_information' then 'needs_review'
    when p_command='begin_quote' and v_from='needs_review' then 'quote_preparation'
    when p_command='mark_quote_sent' and v_from='quote_preparation' then 'quote_sent'
    when p_command='mark_quote_accepted' and v_from='quote_sent' then 'quote_accepted'
    when p_command='ready_for_matching' and v_from='quote_accepted' then 'ready_for_matching'
    when p_command='mark_offer_sent' and v_from='ready_for_matching' then 'offer_sent'
    when p_command='mark_assigned' and v_from in ('offer_sent','reassignment_required') then 'assigned'
    when p_command='confirm_crew' and v_from='assigned' then 'crew_confirmed'
    when p_command='mark_ready' and v_from='crew_confirmed' then 'ready'
    when p_command='incident_hold' and v_from not in ('completed','closed','cancelled') then 'incident_hold'
    when p_command='require_reassignment' and v_from in ('offer_sent','assigned','crew_confirmed','ready') then 'reassignment_required'
    when p_command='cancel' and v_from not in ('completed','closed','cancelled') then 'cancelled'
    else null end;
  if v_to is null then raise exception 'invalid transition from % using %',v_from,p_command; end if;
  if p_command in ('request_customer_information','incident_hold','require_reassignment','cancel') and length(coalesce(v_reason,''))<10 then raise exception 'a specific internal reason is required'; end if;
  if p_command='mark_quote_accepted' then raise exception 'quote acceptance must be performed by the authenticated customer'; end if;

  update public.jobs set status=v_to where id=p_job;
  v_customer_note:=case v_to
    when 'needs_customer_information' then 'MUBER needs more information to continue.'
    when 'quote_preparation' then 'MUBER is preparing your quote.'
    when 'quote_sent' then 'Your quote is ready for review.'
    when 'ready_for_matching' then 'MUBER is matching your job with an eligible provider.'
    when 'offer_sent' then 'Provider matching is in progress.'
    when 'assigned' then 'A provider has been assigned.'
    when 'crew_confirmed' then 'Your crew has been confirmed.'
    when 'cancelled' then 'This request has been canceled.'
    else 'Your request status was updated.' end;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(p_job,v_to,v_actor,v_customer_note,jsonb_build_object('customer_visible',true));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,reason,metadata,request_id) values(p_job,v_from,v_to,p_command,v_actor,v_role,v_reason,coalesce(p_metadata,'{}'),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(v_actor,'job.transition','job',p_job,jsonb_strip_nulls(jsonb_build_object('from_status',v_from,'to_status',v_to,'command',p_command,'reason',v_reason)),p_request_id);
  return v_to;
end $$;
revoke all on function public.transition_job(uuid,text,text,jsonb,uuid) from public;
grant execute on function public.transition_job(uuid,text,text,jsonb,uuid) to authenticated;

create or replace function public.save_internal_job_review(p_job uuid,p_complexity text,p_risks text[],p_crew_size int,p_vehicle text,p_credentials text[],p_notes text)
returns void language plpgsql security definer set search_path=public as $$
begin
  if not public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  if p_complexity not in ('standard','complex','high_risk') or p_crew_size not between 1 and 20 then raise exception 'invalid review'; end if;
  insert into public.internal_job_reviews(job_id,complexity,risk_flags,required_crew_size,required_vehicle_class,credential_requirements,internal_notes,reviewed_by)
  values(p_job,p_complexity,coalesce(p_risks,'{}'),p_crew_size,nullif(trim(p_vehicle),''),coalesce(p_credentials,'{}'),nullif(trim(p_notes),''),auth.uid())
  on conflict(job_id) do update set complexity=excluded.complexity,risk_flags=excluded.risk_flags,required_crew_size=excluded.required_crew_size,required_vehicle_class=excluded.required_vehicle_class,credential_requirements=excluded.credential_requirements,internal_notes=excluded.internal_notes,reviewed_by=auth.uid(),updated_at=now();
  insert into public.audit_events(actor_id,action,entity_type,entity_id) values(auth.uid(),'job.internal_review_saved','job',p_job);
end $$;
revoke all on function public.save_internal_job_review(uuid,text,text[],int,text,text[],text) from public;
grant execute on function public.save_internal_job_review(uuid,text,text[],int,text,text[],text) to authenticated;
