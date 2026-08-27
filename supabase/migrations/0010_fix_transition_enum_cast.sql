create or replace function public.transition_job(p_job uuid,p_command text,p_reason text default null,p_metadata jsonb default '{}',p_request_id uuid default null)
returns public.job_status language plpgsql security definer set search_path=public as $$
declare v_actor uuid:=auth.uid();v_role public.app_role;v_from public.job_status;v_to public.job_status;v_reason text:=nullif(trim(coalesce(p_reason,'')),'');v_existing text;v_customer_note text;
begin
  select role into v_role from public.profiles where id=v_actor;
  if v_role not in ('dispatcher','super_admin') then raise exception 'forbidden';end if;
  if p_request_id is not null then select metadata->>'to_status' into v_existing from public.audit_events where actor_id=v_actor and action='job.transition' and request_id=p_request_id;if v_existing is not null then return v_existing::public.job_status;end if;end if;
  select status into v_from from public.jobs where id=p_job for update;if not found then raise exception 'job not found';end if;
  v_to:=(case
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
    else null end)::public.job_status;
  if v_to is null then raise exception 'invalid transition from % using %',v_from,p_command;end if;
  if p_command in ('request_customer_information','incident_hold','require_reassignment','cancel') and length(coalesce(v_reason,''))<10 then raise exception 'a specific internal reason is required';end if;
  if p_command='mark_quote_accepted' then raise exception 'quote acceptance must be performed by the authenticated customer';end if;
  update public.jobs set status=v_to where id=p_job;
  v_customer_note:=case v_to when 'needs_customer_information' then 'MUBER needs more information to continue.' when 'quote_preparation' then 'MUBER is preparing your quote.' when 'quote_sent' then 'Your quote is ready for review.' when 'ready_for_matching' then 'MUBER is matching your job with an eligible provider.' when 'offer_sent' then 'Provider matching is in progress.' when 'assigned' then 'A provider has been assigned.' when 'crew_confirmed' then 'Your crew has been confirmed.' when 'cancelled' then 'This request has been canceled.' else 'Your request status was updated.' end;
  insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(p_job,v_to,v_actor,v_customer_note,jsonb_build_object('customer_visible',true));
  insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,reason,metadata,request_id) values(p_job,v_from,v_to,p_command,v_actor,v_role,v_reason,coalesce(p_metadata,'{}'),p_request_id);
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(v_actor,'job.transition','job',p_job,jsonb_strip_nulls(jsonb_build_object('from_status',v_from,'to_status',v_to,'command',p_command,'reason',v_reason)),p_request_id);
  return v_to;
end $$;
