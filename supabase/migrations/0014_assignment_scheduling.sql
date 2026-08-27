-- Provider scheduling and least-privilege crew access after assignment.
create or replace function public.provider_has_assigned_job(p_job uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.assignments a where a.job_id=p_job and a.status not in ('canceled','reassignment_required') and public.can_manage_provider(a.provider_company_id))
$$;
revoke all on function public.provider_has_assigned_job(uuid) from public; grant execute on function public.provider_has_assigned_job(uuid) to authenticated;

create or replace function public.crew_has_assigned_job(p_job uuid) returns boolean language sql stable security definer set search_path=public as $$
select exists(select 1 from public.assignments a join public.crew_members cm on cm.crew_id=a.crew_id where a.job_id=p_job and cm.profile_id=auth.uid() and a.status in ('crew_assigned','crew_confirmed','ready','en_route','arrived','in_progress','completion_review'))
$$;
revoke all on function public.crew_has_assigned_job(uuid) from public; grant execute on function public.crew_has_assigned_job(uuid) to authenticated;

create policy "assigned providers read jobs" on public.jobs for select to authenticated using(public.provider_has_assigned_job(id));
create policy "assigned crews read jobs" on public.jobs for select to authenticated using(public.crew_has_assigned_job(id));
create policy "assigned providers read customers" on public.customers for select to authenticated using(exists(select 1 from public.jobs j where j.customer_id=customers.id and public.provider_has_assigned_job(j.id)));
create policy "assigned crews read customers" on public.customers for select to authenticated using(exists(select 1 from public.jobs j where j.customer_id=customers.id and public.crew_has_assigned_job(j.id)));
create policy "assigned providers read stops" on public.job_stops for select to authenticated using(public.provider_has_assigned_job(job_id));
create policy "assigned crews read stops" on public.job_stops for select to authenticated using(public.crew_has_assigned_job(job_id));
create policy "assigned providers read addresses" on public.addresses for select to authenticated using(exists(select 1 from public.job_stops s where s.address_id=addresses.id and public.provider_has_assigned_job(s.job_id)));
create policy "assigned crews read addresses" on public.addresses for select to authenticated using(exists(select 1 from public.job_stops s where s.address_id=addresses.id and public.crew_has_assigned_job(s.job_id)));
create policy "assigned providers read items" on public.job_items for select to authenticated using(public.provider_has_assigned_job(job_id));
create policy "assigned crews read items" on public.job_items for select to authenticated using(public.crew_has_assigned_job(job_id));
create policy "crew reads own assignments" on public.assignments for select to authenticated using(crew_id in (select cm.crew_id from public.crew_members cm where cm.profile_id=auth.uid()));
create policy "crew reads assigned crew" on public.crews for select to authenticated using(id in (select cm.crew_id from public.crew_members cm where cm.profile_id=auth.uid()));
create policy "crew reads assigned vehicle" on public.vehicles for select to authenticated using(exists(select 1 from public.assignments a join public.crew_members cm on cm.crew_id=a.crew_id where a.vehicle_id=vehicles.id and cm.profile_id=auth.uid() and a.status not in ('canceled','reassignment_required')));

create or replace function public.configure_assignment(p_assignment uuid,p_vehicle uuid,p_crew uuid,p_start timestamptz,p_end timestamptz,p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_assignment public.assignments%rowtype;v_vehicle public.vehicles%rowtype;v_crew public.crews%rowtype;v_review public.internal_job_reviews%rowtype;v_job public.jobs%rowtype;
begin
 if exists(select 1 from public.audit_events where actor_id=auth.uid() and action='assignment.configured' and request_id=p_request_id) then return;end if;
 select * into v_assignment from public.assignments where id=p_assignment for update;
 if not found or not public.can_manage_provider(v_assignment.provider_company_id) then raise exception 'assignment not found';end if;
 if v_assignment.status not in ('accepted','crew_assigned') then raise exception 'assignment cannot be configured';end if;
 if p_start<now() or p_end<=p_start or p_end>p_start+interval '24 hours' then raise exception 'invalid arrival window';end if;
 select * into v_vehicle from public.vehicles where id=p_vehicle and provider_company_id=v_assignment.provider_company_id and active;if not found then raise exception 'active company vehicle required';end if;
 select * into v_crew from public.crews where id=p_crew and provider_company_id=v_assignment.provider_company_id and active;if not found then raise exception 'active company crew required';end if;
 select * into v_job from public.jobs where id=v_assignment.job_id;select * into v_review from public.internal_job_reviews where job_id=v_assignment.job_id;
 if v_job.service='move' and not v_crew.moving_eligible then raise exception 'crew is not moving eligible';end if;
 if v_job.service='remove' and not v_crew.removal_eligible then raise exception 'crew is not removal eligible';end if;
 if v_crew.crew_size<coalesce(v_review.required_crew_size,1) then raise exception 'crew is too small for this job';end if;
 if exists(select 1 from public.assignments a where a.id<>p_assignment and a.status not in ('canceled','reassignment_required','completed') and (a.crew_id=p_crew or a.vehicle_id=p_vehicle) and tstzrange(a.scheduled_start,a.scheduled_end,'[)') && tstzrange(p_start,p_end,'[)')) then raise exception 'crew or vehicle has a schedule conflict';end if;
 update public.assignments set crew_id=p_crew,vehicle_id=p_vehicle,scheduled_start=p_start,scheduled_end=p_end,status='crew_assigned' where id=p_assignment;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'assignment.configured','assignment',p_assignment,jsonb_build_object('crew_id',p_crew,'vehicle_id',p_vehicle,'scheduled_start',p_start,'scheduled_end',p_end),p_request_id);
end $$;
revoke all on function public.configure_assignment(uuid,uuid,uuid,timestamptz,timestamptz,uuid) from public;grant execute on function public.configure_assignment(uuid,uuid,uuid,timestamptz,timestamptz,uuid) to authenticated;

create or replace function public.crew_confirm_assignment(p_assignment uuid,p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_assignment public.assignments%rowtype;v_role public.app_role;v_status public.job_status;
begin
 if exists(select 1 from public.audit_events where actor_id=auth.uid() and action='assignment.crew_confirmed' and request_id=p_request_id) then return;end if;
 select role into v_role from public.profiles where id=auth.uid();if v_role<>'crew_lead' then raise exception 'crew lead required';end if;
 select * into v_assignment from public.assignments where id=p_assignment for update;
 if not found or v_assignment.status<>'crew_assigned' or v_assignment.scheduled_start is null or not exists(select 1 from public.crew_members cm where cm.crew_id=v_assignment.crew_id and cm.profile_id=auth.uid()) then raise exception 'assignment not available';end if;
 select status into v_status from public.jobs where id=v_assignment.job_id for update;if v_status<>'assigned' then raise exception 'job is not awaiting crew confirmation';end if;
 update public.assignments set status='crew_confirmed',crew_confirmed_at=now() where id=p_assignment;update public.jobs set status='crew_confirmed' where id=v_assignment.job_id;
 insert into public.job_status_events(job_id,status,actor_id,note,metadata) values(v_assignment.job_id,'crew_confirmed',auth.uid(),'Your crew has been confirmed.',jsonb_build_object('customer_visible',true));
 insert into public.job_operational_events(job_id,from_status,to_status,command,actor_id,actor_role,metadata,request_id) values(v_assignment.job_id,v_status,'crew_confirmed','crew_confirm_assignment',auth.uid(),v_role,jsonb_build_object('assignment_id',p_assignment),p_request_id);
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'assignment.crew_confirmed','assignment',p_assignment,jsonb_build_object('job_id',v_assignment.job_id),p_request_id);
end $$;
revoke all on function public.crew_confirm_assignment(uuid,uuid) from public;grant execute on function public.crew_confirm_assignment(uuid,uuid) to authenticated;
