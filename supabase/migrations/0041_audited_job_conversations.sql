-- Audited, job-scoped conversations with database-authoritative participants.
create table public.job_messages (
  id uuid primary key default gen_random_uuid(),
  job_id uuid not null references public.jobs on delete cascade,
  sender_id uuid not null references public.profiles on delete restrict,
  sender_role public.app_role not null,
  channel text not null check(channel in ('customer_dispatch','provider_dispatch','shared','internal')),
  body text not null check(length(body) between 1 and 5000),
  request_id uuid not null,
  created_at timestamptz not null default now(),
  unique(sender_id,request_id)
);
create index job_messages_thread_idx on public.job_messages(job_id,created_at desc,id desc);
alter table public.job_messages enable row level security;

create or replace function public.can_read_job_message(p_job uuid,p_channel text)
returns boolean language plpgsql stable security definer set search_path=public as $$
declare v_role public.app_role;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role in ('dispatcher','super_admin') then return true; end if;
  if v_role='customer' then return p_channel in ('customer_dispatch','shared') and public.owns_job(p_job); end if;
  if v_role in ('provider_owner','provider_manager') then return p_channel in ('provider_dispatch','shared') and public.provider_has_assigned_job(p_job); end if;
  if v_role in ('crew_lead','crew_member') then return p_channel in ('provider_dispatch','shared') and public.crew_has_assigned_job(p_job); end if;
  return false;
end $$;
revoke all on function public.can_read_job_message(uuid,text) from public;
grant execute on function public.can_read_job_message(uuid,text) to authenticated;

create policy "participants read authorized job messages" on public.job_messages
for select to authenticated using(public.can_read_job_message(job_id,channel));

create or replace function public.get_message_jobs()
returns table(job_id uuid,reference text,service text,status text,last_message_at timestamptz)
language sql stable security definer set search_path=public as $$
  select j.id,j.reference,j.service::text,j.status::text,max(m.created_at)
  from public.jobs j
  left join public.job_messages m on m.job_id=j.id and public.can_read_job_message(m.job_id,m.channel)
  where public.owns_job(j.id)
     or public.provider_has_assigned_job(j.id)
     or public.crew_has_assigned_job(j.id)
     or public.has_any_role(array['dispatcher','super_admin']::public.app_role[])
  group by j.id,j.reference,j.service,j.status
  order by max(m.created_at) desc nulls last,j.created_at desc,j.id desc
  limit 100
$$;
revoke all on function public.get_message_jobs() from public;
grant execute on function public.get_message_jobs() to authenticated;

create or replace function public.get_job_messages(p_job uuid,p_limit int default 100)
returns table(id uuid,channel text,body text,sender_id uuid,sender_name text,sender_role text,created_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
begin
  if not (public.owns_job(p_job) or public.provider_has_assigned_job(p_job) or public.crew_has_assigned_job(p_job) or public.has_any_role(array['dispatcher','super_admin']::public.app_role[])) then
    raise exception 'conversation not found';
  end if;
  return query
  select m.id,m.channel,m.body,m.sender_id,coalesce(p.full_name,'MUBER user'),m.sender_role::text,m.created_at
  from public.job_messages m join public.profiles p on p.id=m.sender_id
  where m.job_id=p_job and public.can_read_job_message(m.job_id,m.channel)
  order by m.created_at asc,m.id asc limit least(greatest(coalesce(p_limit,100),1),200);
end $$;
revoke all on function public.get_job_messages(uuid,int) from public;
grant execute on function public.get_job_messages(uuid,int) to authenticated;

create or replace function public.post_job_message(p_job uuid,p_channel text,p_body text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_role public.app_role;v_id uuid;v_customer uuid;v_body text:=trim(coalesce(p_body,''));
begin
  if auth.uid() is null or p_request_id is null or length(v_body) not between 1 and 5000 then raise exception 'invalid message';end if;
  select role into v_role from public.profiles where id=auth.uid();
  select id into v_id from public.job_messages where sender_id=auth.uid() and request_id=p_request_id;
  if v_id is not null then return v_id;end if;
  if v_role='customer' and not (p_channel='customer_dispatch' and public.owns_job(p_job)) then raise exception 'conversation not found';
  elsif v_role in ('provider_owner','provider_manager') and not (p_channel='provider_dispatch' and public.provider_has_assigned_job(p_job)) then raise exception 'conversation not found';
  elsif v_role in ('crew_lead','crew_member') and not (p_channel='provider_dispatch' and public.crew_has_assigned_job(p_job)) then raise exception 'conversation not found';
  elsif v_role in ('dispatcher','super_admin') and p_channel not in ('customer_dispatch','provider_dispatch','shared','internal') then raise exception 'invalid channel';
  elsif v_role not in ('customer','provider_owner','provider_manager','crew_lead','crew_member','dispatcher','super_admin') then raise exception 'forbidden';end if;
  if v_role not in ('dispatcher','super_admin') and (select count(*) from public.job_messages where sender_id=auth.uid() and created_at>now()-interval '10 minutes')>=20 then raise exception 'message rate limit reached';end if;
  insert into public.job_messages(job_id,sender_id,sender_role,channel,body,request_id) values(p_job,auth.uid(),v_role,p_channel,v_body,p_request_id) returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'job_message.sent','job_message',v_id,jsonb_build_object('job_id',p_job,'channel',p_channel,'body_length',length(v_body)),p_request_id);
  if v_role in ('dispatcher','super_admin') and p_channel in ('customer_dispatch','shared') then
    select c.profile_id into v_customer from public.jobs j join public.customers c on c.id=j.customer_id where j.id=p_job;
    insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) values(v_customer,'conversation.message','job',p_job,'/messages?job='||p_job,'MUBER sent a message about your request.',p_request_id) on conflict do nothing;
  end if;
  if v_role in ('dispatcher','super_admin') and p_channel in ('provider_dispatch','shared') then
    insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key)
    select distinct recipient,'conversation.message','job',p_job,'/messages?job='||p_job,'MUBER sent an operational job message.',p_request_id from (
      select om.profile_id recipient from public.assignments a join public.provider_companies pc on pc.id=a.provider_company_id join public.organization_members om on om.organization_id=pc.organization_id where a.job_id=p_job and a.status not in ('canceled','reassignment_required') and om.role in ('provider_owner','provider_manager')
      union select cm.profile_id from public.assignments a join public.crew_members cm on cm.crew_id=a.crew_id where a.job_id=p_job and a.status not in ('canceled','reassignment_required')
    ) recipients on conflict do nothing;
  elsif v_role not in ('dispatcher','super_admin') then
    insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key)
    select id,'conversation.reply','job',p_job,'/messages?job='||p_job,'A job conversation has a new reply.',p_request_id from public.profiles where role in ('dispatcher','super_admin') on conflict do nothing;
  end if;
  return v_id;
end $$;
revoke all on function public.post_job_message(uuid,text,text,uuid) from public;
grant execute on function public.post_job_message(uuid,text,text,uuid) to authenticated;

create trigger immutable_job_messages before update or delete on public.job_messages for each row execute function public.prevent_event_mutation();
grant select on public.job_messages to authenticated;
revoke insert,update,delete on public.job_messages from authenticated;
