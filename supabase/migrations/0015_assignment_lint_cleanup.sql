-- Preserve assignment behavior while making the vehicle validation explicit.
create or replace function public.configure_assignment(p_assignment uuid,p_vehicle uuid,p_crew uuid,p_start timestamptz,p_end timestamptz,p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_assignment public.assignments%rowtype;v_crew public.crews%rowtype;v_review public.internal_job_reviews%rowtype;v_job public.jobs%rowtype;
begin
 if exists(select 1 from public.audit_events where actor_id=auth.uid() and action='assignment.configured' and request_id=p_request_id) then return;end if;
 select * into v_assignment from public.assignments where id=p_assignment for update;
 if not found or not public.can_manage_provider(v_assignment.provider_company_id) then raise exception 'assignment not found';end if;
 if v_assignment.status not in ('accepted','crew_assigned') then raise exception 'assignment cannot be configured';end if;
 if p_start<now() or p_end<=p_start or p_end>p_start+interval '24 hours' then raise exception 'invalid arrival window';end if;
 if not exists(select 1 from public.vehicles where id=p_vehicle and provider_company_id=v_assignment.provider_company_id and active) then raise exception 'active company vehicle required';end if;
 select * into v_crew from public.crews where id=p_crew and provider_company_id=v_assignment.provider_company_id and active;if not found then raise exception 'active company crew required';end if;
 select * into v_job from public.jobs where id=v_assignment.job_id;select * into v_review from public.internal_job_reviews where job_id=v_assignment.job_id;
 if v_job.service='move' and not v_crew.moving_eligible then raise exception 'crew is not moving eligible';end if;
 if v_job.service='remove' and not v_crew.removal_eligible then raise exception 'crew is not removal eligible';end if;
 if v_crew.crew_size<coalesce(v_review.required_crew_size,1) then raise exception 'crew is too small for this job';end if;
 if exists(select 1 from public.assignments a where a.id<>p_assignment and a.status not in ('canceled','reassignment_required','completed') and (a.crew_id=p_crew or a.vehicle_id=p_vehicle) and tstzrange(a.scheduled_start,a.scheduled_end,'[)') && tstzrange(p_start,p_end,'[)')) then raise exception 'crew or vehicle has a schedule conflict';end if;
 update public.assignments set crew_id=p_crew,vehicle_id=p_vehicle,scheduled_start=p_start,scheduled_end=p_end,status='crew_assigned' where id=p_assignment;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'assignment.configured','assignment',p_assignment,jsonb_build_object('crew_id',p_crew,'vehicle_id',p_vehicle,'scheduled_start',p_start,'scheduled_end',p_end),p_request_id);
end $$;
