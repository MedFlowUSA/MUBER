create table public.job_information_requests(
  id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs on delete restrict,
  requested_by uuid not null references public.profiles on delete restrict,prompt text not null check(length(prompt) between 10 and 2000),
  internal_context text check(internal_context is null or length(internal_context)<=4000),status text not null default 'open' check(status in ('open','responded','closed','canceled')),
  request_id uuid not null,created_at timestamptz not null default now(),responded_at timestamptz,closed_at timestamptz,unique(requested_by,request_id)
);
create table public.job_information_responses(
  id uuid primary key default gen_random_uuid(),request_id uuid not null unique references public.job_information_requests on delete restrict,
  job_id uuid not null references public.jobs on delete restrict,responder_id uuid not null references public.profiles on delete restrict,
  response text not null check(length(response) between 10 and 5000),created_at timestamptz not null default now()
);
alter table public.job_information_requests enable row level security;alter table public.job_information_responses enable row level security;
create index job_information_requests_job_idx on public.job_information_requests(job_id,status,created_at desc);
create trigger immutable_job_information_responses before update or delete on public.job_information_responses for each row execute function public.prevent_event_mutation();
create policy "customers read own information requests" on public.job_information_requests for select to authenticated using(public.owns_job(job_id));
create policy "operations read information requests" on public.job_information_requests for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "customers read own information responses" on public.job_information_responses for select to authenticated using(public.owns_job(job_id));
create policy "operations read information responses" on public.job_information_responses for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
grant select on public.job_information_requests,public.job_information_responses to authenticated;
revoke insert,update,delete on public.job_information_requests,public.job_information_responses from authenticated;

create or replace function public.request_customer_job_information(p_job uuid,p_prompt text,p_internal_context text,p_request_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_job public.jobs%rowtype;v_id uuid;v_customer uuid;v_role public.app_role;
begin
  select role into v_role from public.profiles where id=auth.uid();if v_role not in ('dispatcher','super_admin') then raise exception 'forbidden';end if;
  select * into v_job from public.jobs where id=p_job for update;if not found or v_job.status not in ('submitted','needs_review') then raise exception 'job is not available for an information request';end if;
  if length(trim(coalesce(p_prompt,''))) not between 10 and 2000 or length(coalesce(p_internal_context,''))>4000 then raise exception 'a specific customer request is required';end if;
  if exists(select 1 from public.job_information_requests where job_id=p_job and status='open') then raise exception 'an information request is already open';end if;
  insert into public.job_information_requests(job_id,requested_by,prompt,internal_context,request_id) values(p_job,auth.uid(),trim(p_prompt),nullif(trim(coalesce(p_internal_context,'')),''),p_request_id) returning id into v_id;
  update public.jobs set status='needs_customer_information' where id=p_job;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(p_job,'needs_customer_information',auth.uid(),'MUBER needs more information to continue.',jsonb_build_object('customer_visible',true,'information_request_id',v_id));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(p_job,v_job.status,'needs_customer_information','request_customer_information',auth.uid(),v_role,jsonb_build_object('information_request_id',v_id),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'job_information.requested','job_information_request',v_id,jsonb_build_object('job_id',p_job),p_request_id);
  select c.profile_id into v_customer from public.customers c where c.id=v_job.customer_id;
  insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) values(v_customer,'job_information.requested','job',p_job,'/customer/jobs/'||p_job,'MUBER needs more information about your request.',p_request_id) on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.request_customer_job_information(uuid,text,text,uuid) from public;grant execute on function public.request_customer_job_information(uuid,text,text,uuid) to authenticated;

create or replace function public.respond_to_job_information_request(p_request uuid,p_response text,p_request_id uuid) returns uuid
language plpgsql security definer set search_path=public as $$
declare v_item public.job_information_requests%rowtype;v_job public.jobs%rowtype;v_id uuid;
begin
  select * into v_item from public.job_information_requests where id=p_request for update;
  if not found or v_item.status<>'open' or not public.owns_job(v_item.job_id) then raise exception 'information request not found';end if;
  if length(trim(coalesce(p_response,''))) not between 10 and 5000 then raise exception 'a complete response is required';end if;
  select * into v_job from public.jobs where id=v_item.job_id for update;if v_job.status<>'needs_customer_information' then raise exception 'job is not awaiting information';end if;
  insert into public.job_information_responses(request_id,job_id,responder_id,response) values(p_request,v_item.job_id,auth.uid(),trim(p_response)) returning id into v_id;
  update public.job_information_requests set status='responded',responded_at=now() where id=p_request;
  update public.jobs set status='needs_review' where id=v_item.job_id;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_item.job_id,'needs_review',auth.uid(),'Your response was received. MUBER will continue reviewing your request.',jsonb_build_object('customer_visible',true,'information_request_id',p_request));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_item.job_id,v_job.status,'needs_review','customer_information_response',auth.uid(),'customer',jsonb_build_object('information_request_id',p_request,'response_id',v_id),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'job_information.responded','job_information_response',v_id,jsonb_build_object('job_id',v_item.job_id,'information_request_id',p_request),p_request_id);
  insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key)
  select p.id,'job_information.responded','job',v_item.job_id,'/dispatch/jobs/'||v_item.job_id,'A customer submitted requested job information.',p_request_id from public.profiles p where p.role in ('dispatcher','super_admin') on conflict do nothing;
  return v_id;
end $$;
revoke all on function public.respond_to_job_information_request(uuid,text,uuid) from public;grant execute on function public.respond_to_job_information_request(uuid,text,uuid) to authenticated;
