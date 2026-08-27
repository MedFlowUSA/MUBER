-- Organization-level provider suspension. Historical and active work is preserved.
create table public.provider_status_events(
  id uuid primary key default gen_random_uuid(),
  provider_company_id uuid not null references public.provider_companies on delete restrict,
  from_status text not null,
  to_status text not null check(to_status in ('approved','suspended')),
  reason_category text not null check(reason_category in ('credential_issue','safety_review','service_quality','legal_or_regulatory','operational_review','provider_request','other')),
  internal_reason text not null check(length(internal_reason) between 10 and 4000),
  customer_safe_message text not null check(length(customer_safe_message) between 10 and 500),
  actor_id uuid not null references public.profiles on delete restrict,
  effective_at timestamptz not null default now(),
  review_at timestamptz,
  request_id uuid not null,
  metadata jsonb not null default '{}',
  unique(actor_id,request_id)
);
alter table public.provider_status_events enable row level security;
create trigger immutable_provider_status_events before update or delete on public.provider_status_events for each row execute function public.prevent_event_mutation();
create policy "administrators read provider status events" on public.provider_status_events for select to authenticated using(public.has_any_role(array['compliance_admin','super_admin']::public.app_role[]));

create or replace function public.block_ineligible_provider_offer() returns trigger language plpgsql set search_path=public as $$
begin
  if new.status in ('sent','viewed','accepted') and not exists(select 1 from public.provider_companies where id=new.provider_company_id and status='approved') then raise exception 'provider is not approved and active';end if;
  return new;
end $$;
create trigger enforce_provider_offer_status before insert or update of status,provider_company_id on public.provider_offers for each row execute function public.block_ineligible_provider_offer();

create or replace function public.block_ineligible_provider_assignment() returns trigger language plpgsql set search_path=public as $$
begin
  if not exists(select 1 from public.provider_companies where id=new.provider_company_id and status='approved') then raise exception 'provider is not approved and active';end if;
  return new;
end $$;
create trigger enforce_provider_assignment_status before insert or update of provider_company_id on public.assignments for each row execute function public.block_ineligible_provider_assignment();

create or replace function public.manage_provider_status(p_provider uuid,p_action text,p_reason_category text,p_internal_reason text,p_customer_message text,p_review_at timestamptz,p_request_id uuid)
returns jsonb language plpgsql security definer set search_path=public as $$
declare v_provider public.provider_companies%rowtype;v_role public.app_role;v_to text;v_active_jobs int;v_withdrawn int:=0;v_event uuid;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('compliance_admin','super_admin') then raise exception 'forbidden';end if;
  select id into v_event from public.provider_status_events where actor_id=auth.uid() and request_id=p_request_id;
  if v_event is not null then select count(*) into v_active_jobs from public.assignments where provider_company_id=p_provider and status not in ('canceled','reassignment_required','completed');return jsonb_build_object('event_id',v_event,'active_job_count',v_active_jobs);end if;
  if p_reason_category not in ('credential_issue','safety_review','service_quality','legal_or_regulatory','operational_review','provider_request','other') or length(trim(coalesce(p_internal_reason,'')))<10 or length(trim(coalesce(p_customer_message,''))) not between 10 and 500 then raise exception 'specific reasons and safe wording are required';end if;
  select * into v_provider from public.provider_companies where id=p_provider for update;if not found then raise exception 'provider not found';end if;
  v_to:=case when p_action='suspend' and v_provider.status='approved' then 'suspended' when p_action='reactivate' and v_provider.status='suspended' then 'approved' else null end;
  if v_to is null then raise exception 'invalid provider status transition';end if;
  if p_action='reactivate' and p_review_at is not null and p_review_at<now() then raise exception 'review date cannot be in the past';end if;
  select count(*) into v_active_jobs from public.assignments where provider_company_id=p_provider and status not in ('canceled','reassignment_required','completed');
  update public.provider_companies set status=v_to,available=case when v_to='suspended' then false else available end where id=p_provider;
  if v_to='suspended' then
    with withdrawn as (update public.provider_offers set status='withdrawn' where provider_company_id=p_provider and status in ('draft','sent','viewed') returning job_id)
    update public.jobs j set status='ready_for_matching' where j.id in(select job_id from withdrawn) and j.status='offer_sent';
    get diagnostics v_withdrawn=row_count;
  end if;
  insert into public.provider_status_events(provider_company_id,from_status,to_status,reason_category,internal_reason,customer_safe_message,actor_id,review_at,request_id,metadata) values(p_provider,v_provider.status,v_to,p_reason_category,trim(p_internal_reason),trim(p_customer_message),auth.uid(),p_review_at,p_request_id,jsonb_build_object('active_job_count',v_active_jobs,'withdrawn_offer_job_count',v_withdrawn,'payment_action',false)) returning id into v_event;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'provider.'||case when v_to='suspended' then 'suspended' else 'reactivated' end,'provider_company',p_provider,jsonb_build_object('from_status',v_provider.status,'to_status',v_to,'reason_category',p_reason_category,'active_job_count',v_active_jobs,'withdrawn_offer_job_count',v_withdrawn,'payment_action',false),p_request_id);
  insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) select distinct om.profile_id,'provider.'||case when v_to='suspended' then 'suspended' else 'reactivated' end,'provider_company',p_provider,'/provider/dashboard',trim(p_customer_message),p_request_id from public.organization_members om where om.organization_id=v_provider.organization_id on conflict do nothing;
  if v_to='suspended' and v_active_jobs>0 then insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key) select id,'provider.suspension_active_jobs','provider_company',p_provider,'/admin/providers','A suspended contractor has active jobs requiring dispatch review.',p_request_id from public.profiles where role in ('dispatcher','super_admin') on conflict do nothing;end if;
  return jsonb_build_object('event_id',v_event,'active_job_count',v_active_jobs,'withdrawn_offer_job_count',v_withdrawn);
end $$;

revoke all on function public.manage_provider_status(uuid,text,text,text,text,timestamptz,uuid) from public;
grant execute on function public.manage_provider_status(uuid,text,text,text,text,timestamptz,uuid) to authenticated;
grant select on public.provider_status_events to authenticated;
revoke insert,update,delete on public.provider_status_events from authenticated;
