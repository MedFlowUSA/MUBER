-- Reviewed customer cancellation requests. No payment, fee, or refund behavior.
create table public.job_cancellation_requests(
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs on delete restrict,
  customer_id uuid not null references public.customers on delete restrict,
  requested_by uuid not null references public.profiles on delete restrict,
  reason text not null check(reason in ('plans_changed','schedule_changed','service_no_longer_needed','duplicate_request','other')),
  customer_note text check(customer_note is null or length(customer_note)<=2000),
  job_state_at_request public.job_status not null,
  assignment_state_at_request text,
  scheduled_start_at_request timestamptz,
  status text not null default 'requested' check(status in ('requested','under_review','approved','declined','withdrawn','superseded')),
  reviewer_id uuid references public.profiles on delete restrict,
  decision_at timestamptz,
  customer_decision text check(customer_decision is null or length(customer_decision)<=2000),
  internal_decision_reason text check(internal_decision_reason is null or length(internal_decision_reason)<=4000),
  request_id uuid not null,
  requested_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(requested_by,request_id)
);
create unique index one_open_cancellation_request_per_job on public.job_cancellation_requests(job_id) where status in ('requested','under_review');
create index cancellation_requests_dispatch_queue on public.job_cancellation_requests(status,requested_at);
create table public.job_cancellation_events(
  id uuid primary key default gen_random_uuid(),
  cancellation_request_id uuid not null references public.job_cancellation_requests on delete restrict,
  job_id uuid not null references public.jobs on delete restrict,
  actor_id uuid not null references public.profiles on delete restrict,
  actor_role public.app_role not null,
  event_type text not null check(event_type in ('requested','review_started','approved','declined','withdrawn','superseded')),
  customer_visible_message text,
  internal_reason text,
  metadata jsonb not null default '{}',
  request_id uuid not null,
  occurred_at timestamptz not null default now(),
  unique(actor_id,request_id)
);
alter table public.job_cancellation_requests enable row level security;
alter table public.job_cancellation_events enable row level security;
create trigger set_job_cancellation_requests_updated before update on public.job_cancellation_requests for each row execute function public.set_updated_at();
create trigger immutable_job_cancellation_events before update or delete on public.job_cancellation_events for each row execute function public.prevent_event_mutation();

create policy "customers read own cancellation requests" on public.job_cancellation_requests for select to authenticated using(public.owns_job(job_id));
create policy "dispatch reads cancellation requests" on public.job_cancellation_requests for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "customers read own cancellation events" on public.job_cancellation_events for select to authenticated using(public.owns_job(job_id));
create policy "dispatch reads cancellation events" on public.job_cancellation_events for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));

create or replace function public.request_my_job_cancellation(p_job uuid,p_reason text,p_note text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_job public.jobs%rowtype;v_customer public.customers%rowtype;v_assignment public.assignments%rowtype;v_id uuid;v_role public.app_role;
begin
  select * into v_job from public.jobs where id=p_job for update;
  if not found or not public.owns_job(p_job) then raise exception 'job not found';end if;
  if v_job.status in ('completed','closed','cancelled') then raise exception 'this job cannot be canceled';end if;
  if p_reason not in ('plans_changed','schedule_changed','service_no_longer_needed','duplicate_request','other') or (p_reason='other' and length(trim(coalesce(p_note,'')))<10) or length(coalesce(p_note,''))>2000 then raise exception 'valid cancellation reason required';end if;
  select * into v_customer from public.customers where id=v_job.customer_id and profile_id=auth.uid();
  select * into v_assignment from public.assignments where job_id=p_job and status not in ('canceled','reassignment_required','completed') order by created_at desc limit 1;
  select id into v_id from public.job_cancellation_requests where requested_by=auth.uid() and request_id=p_request_id;
  if v_id is not null then return v_id;end if;
  select id into v_id from public.job_cancellation_requests where job_id=p_job and status in ('requested','under_review') order by requested_at desc limit 1;
  if v_id is not null then return v_id;end if;
  select role into v_role from public.profiles where id=auth.uid();
  insert into public.job_cancellation_requests(job_id,customer_id,requested_by,reason,customer_note,job_state_at_request,assignment_state_at_request,scheduled_start_at_request,request_id) values(p_job,v_customer.id,auth.uid(),p_reason,nullif(trim(coalesce(p_note,'')),''),v_job.status,v_assignment.status,v_assignment.scheduled_start,p_request_id) returning id into v_id;
  insert into public.job_cancellation_events(cancellation_request_id,job_id,actor_id,actor_role,event_type,customer_visible_message,metadata,request_id) values(v_id,p_job,auth.uid(),v_role,'requested','Your cancellation request is awaiting MUBER review.',jsonb_build_object('job_state',v_job.status,'assignment_state',v_assignment.status,'payment_action',false),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'cancellation.requested','job_cancellation_request',v_id,jsonb_build_object('job_id',p_job,'reason',p_reason,'job_state',v_job.status,'payment_action',false),p_request_id);
  insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) select id,'cancellation.requested','job',p_job,'/dispatch/jobs/'||p_job,'A customer cancellation request needs review.',p_request_id from public.profiles where role in ('dispatcher','super_admin');
  return v_id;
end $$;

create or replace function public.withdraw_my_job_cancellation(p_request uuid,p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_item public.job_cancellation_requests%rowtype;v_role public.app_role;
begin
  select * into v_item from public.job_cancellation_requests where id=p_request for update;
  if not found or v_item.requested_by<>auth.uid() then raise exception 'request not found';end if;
  if v_item.status='withdrawn' then return;end if;
  if v_item.status not in ('requested','under_review') then raise exception 'request cannot be withdrawn';end if;
  select role into v_role from public.profiles where id=auth.uid();
  update public.job_cancellation_requests set status='withdrawn',decision_at=now(),customer_decision='You withdrew this cancellation request.' where id=p_request;
  insert into public.job_cancellation_events(cancellation_request_id,job_id,actor_id,actor_role,event_type,customer_visible_message,request_id) values(p_request,v_item.job_id,auth.uid(),v_role,'withdrawn','You withdrew this cancellation request.',p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'cancellation.withdrawn','job_cancellation_request',p_request,jsonb_build_object('job_id',v_item.job_id,'payment_action',false),p_request_id);
end $$;

create or replace function public.review_job_cancellation(p_request uuid,p_action text,p_customer_message text,p_internal_reason text,p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_item public.job_cancellation_requests%rowtype;v_role public.app_role;v_assignment public.assignments%rowtype;v_event text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('dispatcher','super_admin') then raise exception 'forbidden';end if;
  select * into v_item from public.job_cancellation_requests where id=p_request for update;
  if not found then raise exception 'request not found';end if;
  if exists(select 1 from public.job_cancellation_events where actor_id=auth.uid() and request_id=p_request_id) then return;end if;
  if p_action='start_review' then
    if v_item.status<>'requested' then raise exception 'request cannot enter review';end if;
    update public.job_cancellation_requests set status='under_review',reviewer_id=auth.uid() where id=p_request;v_event:='review_started';
  elsif p_action in ('approve','decline') then
    if v_item.status not in ('requested','under_review') or length(trim(coalesce(p_customer_message,'')))<10 or length(trim(coalesce(p_internal_reason,'')))<10 then raise exception 'decision and reasons are required';end if;
    if p_action='approve' then
      perform public.transition_job(v_item.job_id,'cancel',trim(p_internal_reason),jsonb_build_object('cancellation_request_id',p_request,'payment_action',false),p_request_id);
      select * into v_assignment from public.assignments where job_id=v_item.job_id and status not in ('canceled','reassignment_required','completed') order by created_at desc limit 1;
      if found then update public.assignments set status='canceled',cancellation_reason=trim(p_internal_reason) where id=v_assignment.id;end if;
      update public.job_cancellation_requests set status='approved',reviewer_id=auth.uid(),decision_at=now(),customer_decision=trim(p_customer_message),internal_decision_reason=trim(p_internal_reason) where id=p_request;v_event:='approved';
    else
      update public.job_cancellation_requests set status='declined',reviewer_id=auth.uid(),decision_at=now(),customer_decision=trim(p_customer_message),internal_decision_reason=trim(p_internal_reason) where id=p_request;v_event:='declined';
    end if;
  else raise exception 'invalid review action';end if;
  insert into public.job_cancellation_events(cancellation_request_id,job_id,actor_id,actor_role,event_type,customer_visible_message,internal_reason,metadata,request_id) values(p_request,v_item.job_id,auth.uid(),v_role,v_event,nullif(trim(coalesce(p_customer_message,'')),''),nullif(trim(coalesce(p_internal_reason,'')),''),jsonb_build_object('payment_action',false),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'cancellation.'||v_event,'job_cancellation_request',p_request,jsonb_build_object('job_id',v_item.job_id,'payment_action',false),p_request_id);
  if v_event in ('approved','declined') then
    insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) values(v_item.requested_by,'cancellation.'||v_event,'job',v_item.job_id,'/customer/jobs/'||v_item.job_id,trim(p_customer_message),p_request_id);
    if v_assignment.provider_company_id is not null then
      insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) select distinct om.profile_id,'cancellation.'||v_event,'job',v_item.job_id,'/provider/jobs','A job cancellation decision was recorded.',p_request_id from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id where pc.id=v_assignment.provider_company_id
      on conflict do nothing;
      insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) select distinct cm.profile_id,'cancellation.'||v_event,'job',v_item.job_id,'/crew','A job cancellation decision was recorded.',p_request_id from public.crew_members cm where cm.crew_id=v_assignment.crew_id
      on conflict do nothing;
    end if;
  end if;
end $$;

revoke all on function public.request_my_job_cancellation(uuid,text,text,uuid),public.withdraw_my_job_cancellation(uuid,uuid),public.review_job_cancellation(uuid,text,text,text,uuid) from public;
grant execute on function public.request_my_job_cancellation(uuid,text,text,uuid),public.withdraw_my_job_cancellation(uuid,uuid),public.review_job_cancellation(uuid,text,text,text,uuid) to authenticated;
grant select on public.job_cancellation_requests,public.job_cancellation_events to authenticated;
revoke insert,update,delete on public.job_cancellation_requests,public.job_cancellation_events from authenticated;
