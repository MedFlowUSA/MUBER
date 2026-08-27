-- Server-authoritative field workflow. This records milestones, not geolocation.
create or replace function public.advance_crew_assignment(p_assignment uuid,p_command text,p_request_id uuid)
returns public.job_status language plpgsql security definer set search_path=public as $$
declare v_assignment public.assignments%rowtype;v_role public.app_role;v_from public.job_status;v_to public.job_status;v_note text;v_existing text;
begin
 if p_request_id is null then raise exception 'request id required';end if;
 select metadata->>'to_status' into v_existing from public.audit_events where actor_id=auth.uid() and action='assignment.field_transition' and request_id=p_request_id;
 if v_existing is not null then return v_existing::public.job_status;end if;
 select role into v_role from public.profiles where id=auth.uid();if v_role<>'crew_lead' then raise exception 'crew lead required';end if;
 select * into v_assignment from public.assignments where id=p_assignment for update;
 if not found or not exists(select 1 from public.crew_members cm where cm.crew_id=v_assignment.crew_id and cm.profile_id=auth.uid()) then raise exception 'assignment not found';end if;
 select status into v_from from public.jobs where id=v_assignment.job_id for update;
 v_to:=(case
  when p_command='mark_ready' and v_from='crew_confirmed' and v_assignment.status='crew_confirmed' then 'ready'
  when p_command='start_en_route' and v_from='ready' and v_assignment.status='ready' then 'en_route'
  when p_command='mark_arrived' and v_from='en_route' and v_assignment.status='en_route' then 'arrived'
  when p_command='start_work' and v_from='arrived' and v_assignment.status='arrived' then 'in_progress'
  when p_command='request_completion_review' and v_from='in_progress' and v_assignment.status='in_progress' then 'completion_review'
  else null end)::public.job_status;
 if v_to is null then raise exception 'invalid field transition from % using %',v_from,p_command;end if;
 v_note:=case v_to when 'ready' then 'Your crew is ready for the scheduled appointment.' when 'en_route' then 'Your crew is en route. Live location is not available.' when 'arrived' then 'Your crew has reported arrival.' when 'in_progress' then 'Work is in progress.' when 'completion_review' then 'Work was submitted to MUBER for completion review.' end;
 update public.assignments set status=v_to::text where id=p_assignment;update public.jobs set status=v_to where id=v_assignment.job_id;
 insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_assignment.job_id,v_to,auth.uid(),v_note,jsonb_build_object('customer_visible',true,'location_tracking',false));
 insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_assignment.job_id,v_from,v_to,p_command,auth.uid(),v_role,jsonb_build_object('assignment_id',p_assignment,'location_tracking',false),p_request_id);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'assignment.field_transition','assignment',p_assignment,jsonb_build_object('job_id',v_assignment.job_id,'from_status',v_from,'to_status',v_to,'command',p_command),p_request_id);
 return v_to;
end $$;
revoke all on function public.advance_crew_assignment(uuid,text,uuid) from public;grant execute on function public.advance_crew_assignment(uuid,text,uuid) to authenticated;
create policy "assigned crews read customer timeline" on public.job_status_events for select to authenticated using(public.crew_has_assigned_job(job_id) and coalesce((metadata->>'customer_visible')::boolean,false));
