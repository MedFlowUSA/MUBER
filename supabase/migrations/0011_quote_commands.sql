-- Quote versions keep internal compensation/calculation data out of customer RLS.
drop policy if exists "customers read sent quotes" on public.quote_versions;
create policy "dispatch reads quote versions" on public.quote_versions for select to authenticated
using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));

alter table public.jobs add column accepted_quote_version_id uuid references public.quote_versions(id) on delete set null;
alter table public.quote_versions add constraint quote_reasonable_total check(total_cents<=100000000);
create index quote_versions_job_created_idx on public.quote_versions(job_id,version desc);

create or replace function public.create_quote_version(
  p_job uuid,p_service int,p_disposal int,p_travel int,p_other int,p_scope text,
  p_internal_notes text,p_provider_compensation int,p_expires timestamptz
)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_version int;v_id uuid;v_status public.job_status;
begin
  if not public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) then raise exception 'forbidden';end if;
  if least(p_service,p_disposal,p_travel,p_other)<0 or p_service+p_disposal+p_travel+p_other>100000000 then raise exception 'invalid quote amounts';end if;
  if length(trim(coalesce(p_scope,'')))<10 or p_expires<=now() or p_expires>now()+interval '30 days' then raise exception 'invalid quote details';end if;
  if p_provider_compensation is not null and (p_provider_compensation<0 or p_provider_compensation>p_service+p_disposal+p_travel+p_other) then raise exception 'invalid provider compensation estimate';end if;
  perform pg_advisory_xact_lock(hashtextextended(p_job::text,0));
  select status into v_status from public.jobs where id=p_job for update;
  if v_status<>'quote_preparation' then raise exception 'job is not ready for quote preparation';end if;
  select coalesce(max(version),0)+1 into v_version from public.quote_versions where job_id=p_job;
  update public.quote_versions set status='superseded' where job_id=p_job and status in ('draft','ready_for_review');
  insert into public.quote_versions(job_id,version,service_subtotal_cents,disposal_cents,travel_cents,other_cents,customer_scope,internal_notes,estimated_provider_compensation_cents,expires_at,status,created_by)
  values(p_job,v_version,p_service,p_disposal,p_travel,p_other,trim(p_scope),nullif(trim(coalesce(p_internal_notes,'')),''),p_provider_compensation,p_expires,'ready_for_review',auth.uid()) returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'quote.version_created','quote_version',v_id,jsonb_build_object('job_id',p_job,'version',v_version,'total_cents',p_service+p_disposal+p_travel+p_other));
  return v_id;
end $$;
revoke all on function public.create_quote_version(uuid,int,int,int,int,text,text,int,timestamptz) from public;
grant execute on function public.create_quote_version(uuid,int,int,int,int,text,text,int,timestamptz) to authenticated;

create or replace function public.send_quote(p_quote uuid,p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_quote public.quote_versions%rowtype;v_status public.job_status;v_role public.app_role;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('dispatcher','super_admin') then raise exception 'forbidden';end if;
  if exists(select 1 from public.audit_events where actor_id=auth.uid() and action='quote.sent' and request_id=p_request_id) then return;end if;
  select * into v_quote from public.quote_versions where id=p_quote for update;
  if not found or v_quote.status<>'ready_for_review' or v_quote.expires_at<=now() then raise exception 'quote cannot be sent';end if;
  select status into v_status from public.jobs where id=v_quote.job_id for update;
  if v_status<>'quote_preparation' then raise exception 'job is not ready for a quote';end if;
  if exists(select 1 from public.quote_versions where job_id=v_quote.job_id and version>v_quote.version and status<>'superseded') then raise exception 'a newer quote version exists';end if;
  update public.quote_versions set status='sent' where id=p_quote;
  update public.jobs set status='quote_sent' where id=v_quote.job_id;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_quote.job_id,'quote_sent',auth.uid(),'Your quote is ready for review.',jsonb_build_object('customer_visible',true,'quote_version',v_quote.version));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_quote.job_id,v_status,'quote_sent','send_quote',auth.uid(),v_role,jsonb_build_object('quote_id',p_quote,'version',v_quote.version),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'quote.sent','quote_version',p_quote,jsonb_build_object('job_id',v_quote.job_id,'version',v_quote.version,'total_cents',v_quote.total_cents),p_request_id);
end $$;
revoke all on function public.send_quote(uuid,uuid) from public;
grant execute on function public.send_quote(uuid,uuid) to authenticated;

create or replace function public.get_my_quote_versions(p_job uuid)
returns table(id uuid,version int,service_subtotal_cents int,disposal_cents int,travel_cents int,other_cents int,total_cents int,currency text,customer_scope text,expires_at timestamptz,status public.quote_status,created_at timestamptz,accepted_at timestamptz)
language sql stable security definer set search_path=public as $$
  select q.id,q.version,q.service_subtotal_cents,q.disposal_cents,q.travel_cents,q.other_cents,q.total_cents,q.currency,q.customer_scope,q.expires_at,
    case when q.status='sent' and q.expires_at<=now() then 'expired'::public.quote_status else q.status end,q.created_at,q.accepted_at
  from public.quote_versions q where q.job_id=p_job and public.owns_job(q.job_id) and q.status in ('sent','viewed','accepted','declined','expired','superseded') order by q.version desc
$$;
revoke all on function public.get_my_quote_versions(uuid) from public;
grant execute on function public.get_my_quote_versions(uuid) to authenticated;

create or replace function public.accept_my_quote(p_quote uuid,p_request_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_quote public.quote_versions%rowtype;v_status public.job_status;
begin
  if exists(select 1 from public.audit_events where actor_id=auth.uid() and action='quote.accepted' and request_id=p_request_id) then return;end if;
  select * into v_quote from public.quote_versions where id=p_quote for update;
  if not found or not public.owns_job(v_quote.job_id) then raise exception 'quote not found';end if;
  if v_quote.status<>'sent' or v_quote.expires_at<=now() then raise exception 'quote is no longer available';end if;
  select status into v_status from public.jobs where id=v_quote.job_id for update;
  if v_status<>'quote_sent' then raise exception 'job is not awaiting quote acceptance';end if;
  update public.quote_versions set status='accepted',accepted_by=auth.uid(),accepted_at=now() where id=p_quote;
  update public.quote_versions set status='superseded' where job_id=v_quote.job_id and id<>p_quote and status in ('draft','ready_for_review','sent','viewed');
  update public.jobs set status='quote_accepted',accepted_quote_version_id=p_quote where id=v_quote.job_id;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_quote.job_id,'quote_accepted',auth.uid(),'You accepted quote version '||v_quote.version||'. Payment has not been collected.',jsonb_build_object('customer_visible',true,'quote_version',v_quote.version,'payment_collected',false));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_quote.job_id,v_status,'quote_accepted','customer_accept_quote',auth.uid(),'customer',jsonb_build_object('quote_id',p_quote,'version',v_quote.version,'payment_collected',false),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'quote.accepted','quote_version',p_quote,jsonb_build_object('job_id',v_quote.job_id,'version',v_quote.version,'total_cents',v_quote.total_cents,'payment_collected',false),p_request_id);
end $$;
revoke all on function public.accept_my_quote(uuid,uuid) from public;
grant execute on function public.accept_my_quote(uuid,uuid) to authenticated;

create or replace function public.enforce_quote_sent_job_state() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status='quote_sent' and old.status is distinct from new.status and not exists(select 1 from public.quote_versions where job_id=new.id and status='sent' and expires_at>now()) then raise exception 'a current sent quote is required';end if;
  return new;
end $$;
create trigger require_sent_quote_before_job_state before update of status on public.jobs for each row execute function public.enforce_quote_sent_job_state();
