create type public.support_request_category as enum('customer_job','provider_application','provider_operations','business_account','account_access','privacy_access','privacy_correction','privacy_deletion','safety','other');
create type public.support_request_status as enum('new','identity_verification_required','in_review','waiting_for_requester','resolved','closed');
create table public.support_requests(
  id uuid primary key default gen_random_uuid(),profile_id uuid references public.profiles on delete set null,
  category public.support_request_category not null,name text not null,email text not null,subject text not null,details text not null,job_reference text,
  status public.support_request_status not null default 'new',identity_verified_at timestamptz,assigned_to uuid references public.profiles on delete set null,
  internal_notes text,resolution_summary text,created_at timestamptz not null default now(),updated_at timestamptz not null default now()
);
alter table public.support_requests enable row level security;
create trigger set_support_requests_updated before update on public.support_requests for each row execute function public.set_updated_at();
create policy "authorized staff read support requests" on public.support_requests for select to authenticated using(public.has_any_role(array['dispatcher','compliance_admin','super_admin']::public.app_role[]));

create or replace function public.submit_support_request(p_category text,p_name text,p_email text,p_subject text,p_details text,p_job_reference text)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_id uuid;v_email text:=lower(trim(coalesce(p_email,'')));v_category public.support_request_category;v_status public.support_request_status;
begin
  begin v_category:=p_category::public.support_request_category;exception when invalid_text_representation then raise exception 'invalid support category';end;
  if length(trim(coalesce(p_name,''))) not between 2 and 120 or v_email!~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or length(trim(coalesce(p_subject,''))) not between 5 and 160 or length(trim(coalesce(p_details,''))) not between 20 and 5000 then raise exception 'invalid support request';end if;
  if (select count(*) from public.support_requests where created_at>now()-interval '1 hour' and (email=v_email or (auth.uid() is not null and profile_id=auth.uid())))>=5 then raise exception 'too many support requests; try again later';end if;
  v_status:=case when v_category in ('privacy_access','privacy_correction','privacy_deletion') then 'identity_verification_required'::public.support_request_status else 'new'::public.support_request_status end;
  insert into public.support_requests(profile_id,category,name,email,subject,details,job_reference,status) values(auth.uid(),v_category,trim(p_name),v_email,trim(p_subject),trim(p_details),nullif(trim(coalesce(p_job_reference,'')),''),v_status) returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'support_request.submitted','support_request',v_id,jsonb_build_object('category',v_category,'authenticated',auth.uid() is not null));return v_id;
end $$;
revoke all on function public.submit_support_request(text,text,text,text,text,text) from public;grant execute on function public.submit_support_request(text,text,text,text,text,text) to anon,authenticated;

create or replace function public.review_support_request(p_request uuid,p_status public.support_request_status,p_internal_notes text,p_resolution text,p_identity_verified boolean default false)
returns void language plpgsql security definer set search_path=public as $$
declare v_before public.support_requests%rowtype;
begin
  if not public.has_any_role(array['compliance_admin','super_admin']::public.app_role[]) then raise exception 'forbidden';end if;
  select * into v_before from public.support_requests where id=p_request for update;if not found then raise exception 'request not found';end if;
  if v_before.category in ('privacy_access','privacy_correction','privacy_deletion') and v_before.identity_verified_at is null and not p_identity_verified and p_status not in ('identity_verification_required','waiting_for_requester','closed') then raise exception 'identity verification required';end if;
  if p_status in ('resolved','closed') and length(trim(coalesce(p_resolution,'')))<10 then raise exception 'resolution summary required';end if;
  update public.support_requests set status=p_status,assigned_to=auth.uid(),identity_verified_at=case when p_identity_verified then coalesce(identity_verified_at,now()) else identity_verified_at end,internal_notes=nullif(trim(coalesce(p_internal_notes,'')),''),resolution_summary=case when p_status in ('resolved','closed') then trim(p_resolution) else resolution_summary end where id=p_request;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'support_request.reviewed','support_request',p_request,jsonb_build_object('from_status',v_before.status,'to_status',p_status,'identity_verified',p_identity_verified));
end $$;
revoke all on function public.review_support_request(uuid,public.support_request_status,text,text,boolean) from public;grant execute on function public.review_support_request(uuid,public.support_request_status,text,text,boolean) to authenticated;
