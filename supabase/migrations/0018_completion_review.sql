create table public.completion_submissions(
 id uuid primary key default gen_random_uuid(),job_id uuid not null references public.jobs on delete restrict,assignment_id uuid not null references public.assignments on delete restrict,provider_company_id uuid not null references public.provider_companies on delete restrict,crew_id uuid not null references public.crews on delete restrict,submitted_by uuid not null references public.profiles on delete restrict,version int not null check(version>0),status text not null default 'pending_review' check(status in ('pending_review','under_review','more_information_requested','returned_to_provider','incident_review_required','approved','voided')),completion_at timestamptz not null,completion_notes text not null,work_summary text not null,items_summary text not null,customer_summary text not null,disposal_destination text,donation_destination text,disposal_receipt_status text not null default 'not_applicable' check(disposal_receipt_status in ('not_applicable','not_available','provided')),damage_declared boolean not null,incident_declared boolean not null,missing_item_declared boolean not null,access_issue_declared boolean not null,additional_scope_declared boolean not null,customer_present boolean,customer_confirmation_status text not null default 'not_requested' check(customer_confirmation_status in ('not_requested','requested','confirmed','problem_reported')),customer_confirmed_at timestamptz,reviewed_by uuid references public.profiles on delete restrict,reviewed_at timestamptz,review_notes text,customer_review_message text,request_id uuid not null,created_at timestamptz not null default now(),unique(assignment_id,version),unique(submitted_by,request_id)
);
create table public.completion_media(id uuid primary key default gen_random_uuid(),submission_id uuid not null references public.completion_submissions on delete restrict,job_id uuid not null references public.jobs on delete restrict,uploaded_by uuid not null references public.profiles on delete restrict,storage_path text not null unique,purpose text not null check(purpose in ('before','after','disposal_receipt','donation_receipt','incident','other')),customer_visible boolean not null default false,mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),byte_size bigint not null check(byte_size between 1 and 10485760),created_at timestamptz not null default now());
alter table public.completion_submissions enable row level security;alter table public.completion_media enable row level security;
create or replace function public.protect_completion_submission() returns trigger language plpgsql as $$ begin
 if tg_op='DELETE' then raise exception 'completion submission is immutable';end if;
 if row(new.job_id,new.assignment_id,new.provider_company_id,new.crew_id,new.submitted_by,new.version,new.completion_at,new.completion_notes,new.work_summary,new.items_summary,new.customer_summary,new.disposal_destination,new.donation_destination,new.disposal_receipt_status,new.damage_declared,new.incident_declared,new.missing_item_declared,new.access_issue_declared,new.additional_scope_declared,new.customer_present,new.request_id,new.created_at) is distinct from row(old.job_id,old.assignment_id,old.provider_company_id,old.crew_id,old.submitted_by,old.version,old.completion_at,old.completion_notes,old.work_summary,old.items_summary,old.customer_summary,old.disposal_destination,old.donation_destination,old.disposal_receipt_status,old.damage_declared,old.incident_declared,old.missing_item_declared,old.access_issue_declared,old.additional_scope_declared,old.customer_present,old.request_id,old.created_at) then raise exception 'submitted completion evidence is immutable';end if;return new;
end $$;
create trigger immutable_completion_submissions before update or delete on public.completion_submissions for each row execute function public.protect_completion_submission();
create trigger immutable_completion_media before update or delete on public.completion_media for each row execute function public.prevent_event_mutation();
create policy "dispatcher reads completion submissions" on public.completion_submissions for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "provider reads own completion submissions" on public.completion_submissions for select to authenticated using(public.can_manage_provider(provider_company_id));
create policy "crew reads assigned completion submissions" on public.completion_submissions for select to authenticated using(public.crew_has_assigned_job(job_id));
create policy "dispatcher reads completion media" on public.completion_media for select to authenticated using(public.has_any_role(array['dispatcher','super_admin']::public.app_role[]));
create policy "provider reads own completion media" on public.completion_media for select to authenticated using(exists(select 1 from public.completion_submissions s where s.id=completion_media.submission_id and public.can_manage_provider(s.provider_company_id)));
create policy "crew reads assigned completion media" on public.completion_media for select to authenticated using(public.crew_has_assigned_job(job_id));
create policy "customer reads visible completion media" on public.completion_media for select to authenticated using(customer_visible and public.owns_job(job_id));

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('completion-media','completion-media',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf']) on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "assigned crew uploads completion objects" on storage.objects for insert to authenticated with check(bucket_id='completion-media' and (storage.foldername(name))[1]=auth.uid()::text and public.crew_has_assigned_job(((storage.foldername(name))[2])::uuid));
create policy "authorized users read completion objects" on storage.objects for select to authenticated using(bucket_id='completion-media' and exists(select 1 from public.completion_media m where m.storage_path=name and (public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) or public.crew_has_assigned_job(m.job_id) or exists(select 1 from public.completion_submissions s where s.id=m.submission_id and public.can_manage_provider(s.provider_company_id)) or (m.customer_visible and public.owns_job(m.job_id)))));

create or replace function public.submit_completion(p_assignment uuid,p_payload jsonb,p_request_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_a public.assignments%rowtype;v_job public.jobs%rowtype;v_id uuid;v_version int;v_role public.app_role;
begin
 select entity_id into v_id from public.audit_events where actor_id=auth.uid() and action='completion.submitted' and request_id=p_request_id;if v_id is not null then return v_id;end if;
 select role into v_role from public.profiles where id=auth.uid();if v_role<>'crew_lead' then raise exception 'crew lead required';end if;
 select * into v_a from public.assignments where id=p_assignment for update;if not found or v_a.status<>'in_progress' or not exists(select 1 from public.crew_members where crew_id=v_a.crew_id and profile_id=auth.uid()) then raise exception 'assignment not available';end if;
 select * into v_job from public.jobs where id=v_a.job_id for update;if v_job.status<>'in_progress' then raise exception 'job is not in progress';end if;
 if length(trim(coalesce(p_payload->>'work_summary',''))) not between 20 and 5000 or length(trim(coalesce(p_payload->>'items_summary',''))) not between 10 and 5000 or length(trim(coalesce(p_payload->>'customer_summary',''))) not between 20 and 2000 then raise exception 'completion summary is incomplete';end if;
 select coalesce(max(version),0)+1 into v_version from public.completion_submissions where assignment_id=p_assignment;
 insert into public.completion_submissions(job_id,assignment_id,provider_company_id,crew_id,submitted_by,version,completion_at,completion_notes,work_summary,items_summary,customer_summary,disposal_destination,donation_destination,disposal_receipt_status,damage_declared,incident_declared,missing_item_declared,access_issue_declared,additional_scope_declared,customer_present,request_id)
 values(v_a.job_id,v_a.id,v_a.provider_company_id,v_a.crew_id,auth.uid(),v_version,coalesce(nullif(p_payload->>'completion_at','')::timestamptz,now()),trim(coalesce(p_payload->>'completion_notes','')),trim(p_payload->>'work_summary'),trim(p_payload->>'items_summary'),trim(p_payload->>'customer_summary'),nullif(trim(p_payload->>'disposal_destination'),''),nullif(trim(p_payload->>'donation_destination'),''),coalesce(nullif(p_payload->>'disposal_receipt_status',''),'not_applicable'),coalesce((p_payload->>'damage_declared')::boolean,false),coalesce((p_payload->>'incident_declared')::boolean,false),coalesce((p_payload->>'missing_item_declared')::boolean,false),coalesce((p_payload->>'access_issue_declared')::boolean,false),coalesce((p_payload->>'additional_scope_declared')::boolean,false),nullif(p_payload->>'customer_present','')::boolean,p_request_id) returning id into v_id;
 update public.assignments set status='completion_review' where id=p_assignment;update public.jobs set status='completion_review' where id=v_a.job_id;
 insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_a.job_id,'completion_review',auth.uid(),'Work was submitted to MUBER for completion review.',jsonb_build_object('customer_visible',true));
 insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_a.job_id,'in_progress','completion_review','submit_completion',auth.uid(),v_role,jsonb_build_object('submission_id',v_id,'version',v_version),p_request_id);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'completion.submitted','completion_submission',v_id,jsonb_build_object('job_id',v_a.job_id,'assignment_id',v_a.id,'version',v_version,'incident_declared',coalesce((p_payload->>'incident_declared')::boolean,false)),p_request_id);return v_id;
end $$;
revoke all on function public.submit_completion(uuid,jsonb,uuid) from public;grant execute on function public.submit_completion(uuid,jsonb,uuid) to authenticated;

create or replace function public.register_completion_media(p_submission uuid,p_path text,p_purpose text,p_customer_visible boolean,p_mime text,p_size bigint) returns uuid language plpgsql security definer set search_path=public,storage as $$
declare v_s public.completion_submissions%rowtype;v_id uuid;
begin
 select * into v_s from public.completion_submissions where id=p_submission;
 if not found or not public.crew_has_assigned_job(v_s.job_id) then raise exception 'submission not found';end if;
 if p_path not like auth.uid()::text||'/'||v_s.job_id::text||'/%' or p_purpose not in ('before','after','disposal_receipt','donation_receipt','incident','other') or p_mime not in ('image/jpeg','image/png','image/webp','application/pdf') or p_size not between 1 and 10485760 then raise exception 'invalid completion media';end if;
 if p_purpose='incident' and p_customer_visible then raise exception 'incident evidence cannot be customer visible by default';end if;
 if not exists(select 1 from storage.objects where bucket_id='completion-media' and name=p_path and owner_id=auth.uid()::text) then raise exception 'media object not found';end if;
 insert into public.completion_media(submission_id,job_id,uploaded_by,storage_path,purpose,customer_visible,mime_type,byte_size) values(p_submission,v_s.job_id,auth.uid(),p_path,p_purpose,coalesce(p_customer_visible,false),p_mime,p_size) returning id into v_id;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata) values(auth.uid(),'completion.evidence_uploaded','completion_media',v_id,jsonb_build_object('submission_id',p_submission,'job_id',v_s.job_id,'purpose',p_purpose,'customer_visible',coalesce(p_customer_visible,false)));return v_id;
end $$;
revoke all on function public.register_completion_media(uuid,text,text,boolean,text,bigint) from public;grant execute on function public.register_completion_media(uuid,text,text,boolean,text,bigint) to authenticated;

create or replace function public.review_completion(p_submission uuid,p_action text,p_reason text,p_customer_message text,p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_s public.completion_submissions%rowtype;v_role public.app_role;v_reason text:=trim(coalesce(p_reason,''));
begin
 select role into v_role from public.profiles where id=auth.uid();if v_role not in ('dispatcher','super_admin') then raise exception 'forbidden';end if;
 if exists(select 1 from public.audit_events where actor_id=auth.uid() and action='completion.'||p_action and request_id=p_request_id) then return;end if;
 select * into v_s from public.completion_submissions where id=p_submission for update;if not found then raise exception 'submission not found';end if;
 if p_action='begin_review' and v_s.status='pending_review' then null;
 elsif p_action='request_information' and v_s.status in ('pending_review','under_review') and length(v_reason)>=10 then null;
 elsif p_action='incident_hold' and v_s.status in ('pending_review','under_review') and length(v_reason)>=10 then null;
 elsif p_action='approve' and v_s.status in ('pending_review','under_review') and length(trim(coalesce(p_customer_message,'')))>=10 then null;
 else raise exception 'invalid completion review action';end if;
 if p_action='begin_review' then update public.completion_submissions set status='under_review',reviewed_by=auth.uid(),reviewed_at=now() where id=p_submission;
 elsif p_action='request_information' then update public.completion_submissions set status='more_information_requested',reviewed_by=auth.uid(),reviewed_at=now(),review_notes=v_reason where id=p_submission;
 elsif p_action='incident_hold' then update public.completion_submissions set status='incident_review_required',reviewed_by=auth.uid(),reviewed_at=now(),review_notes=v_reason where id=p_submission;update public.jobs set status='incident_hold' where id=v_s.job_id;update public.assignments set status='completion_review' where id=v_s.assignment_id;
 else update public.completion_submissions set status='approved',reviewed_by=auth.uid(),reviewed_at=now(),review_notes=nullif(v_reason,''),customer_review_message=trim(p_customer_message),customer_confirmation_status='requested' where id=p_submission;update public.jobs set status='completed' where id=v_s.job_id;update public.assignments set status='completed' where id=v_s.assignment_id;insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_s.job_id,'completed',auth.uid(),trim(p_customer_message),jsonb_build_object('customer_visible',true,'payment_collected',false));end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'completion.'||p_action,'completion_submission',p_submission,jsonb_build_object('job_id',v_s.job_id,'reason',nullif(v_reason,''),'payment_collected',false),p_request_id);
end $$;
revoke all on function public.review_completion(uuid,text,text,text,uuid) from public;grant execute on function public.review_completion(uuid,text,text,text,uuid) to authenticated;

create or replace function public.respond_to_completion(p_submission uuid,p_response text,p_note text,p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_s public.completion_submissions%rowtype;v_job public.jobs%rowtype;v_customer public.customers%rowtype;v_support uuid;
begin
 if exists(select 1 from public.audit_events where actor_id=auth.uid() and action='completion.customer_'||p_response and request_id=p_request_id) then return;end if;
 select * into v_s from public.completion_submissions where id=p_submission for update;if not found or v_s.status<>'approved' or not public.owns_job(v_s.job_id) then raise exception 'completion not found';end if;
 select * into v_job from public.jobs where id=v_s.job_id for update;select c.* into v_customer from public.customers c where c.id=v_job.customer_id;
 if p_response='confirm' then
  if v_s.customer_confirmation_status='confirmed' then return;end if;if v_s.customer_confirmation_status<>'requested' then raise exception 'confirmation is not available';end if;
  update public.completion_submissions set customer_confirmation_status='confirmed',customer_confirmed_at=now() where id=p_submission;
  insert into public.completion_records(job_id,completed_by,customer_confirmed_at,notes) values(v_s.job_id,v_s.submitted_by,now(),nullif(trim(coalesce(p_note,'')),'')) on conflict(job_id) do update set customer_confirmed_at=coalesce(completion_records.customer_confirmed_at,excluded.customer_confirmed_at);
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_s.job_id,'completed',auth.uid(),'Customer confirmed completion.',jsonb_build_object('customer_visible',true,'payment_collected',false));
 elsif p_response='report_problem' then
  if length(trim(coalesce(p_note,'')))<10 then raise exception 'problem details required';end if;
  update public.completion_submissions set customer_confirmation_status='problem_reported' where id=p_submission;update public.jobs set status='incident_hold' where id=v_s.job_id;
  insert into public.support_requests(profile_id,category,name,email,subject,details,job_reference) values(auth.uid(),'safety',v_customer.full_name,v_customer.email,'Completion problem reported',trim(p_note),v_job.reference) returning id into v_support;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_s.job_id,'incident_hold',auth.uid(),'A completion concern was reported and MUBER will review it.',jsonb_build_object('customer_visible',true));
 else raise exception 'invalid customer response';end if;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'completion.customer_'||p_response,'completion_submission',p_submission,jsonb_strip_nulls(jsonb_build_object('job_id',v_s.job_id,'support_request_id',v_support,'payment_collected',false)),p_request_id);
end $$;
revoke all on function public.respond_to_completion(uuid,text,text,uuid) from public;grant execute on function public.respond_to_completion(uuid,text,text,uuid) to authenticated;

create or replace function public.get_my_completion(p_job uuid) returns table(id uuid,status text,completion_at timestamptz,customer_summary text,customer_review_message text,customer_confirmation_status text,customer_confirmed_at timestamptz) language sql stable security definer set search_path=public as $$
 select s.id,s.status,s.completion_at,s.customer_summary,s.customer_review_message,s.customer_confirmation_status,s.customer_confirmed_at from public.completion_submissions s where s.job_id=p_job and public.owns_job(s.job_id) and s.status='approved' order by s.version desc limit 1
$$;
revoke all on function public.get_my_completion(uuid) from public;grant execute on function public.get_my_completion(uuid) to authenticated;
