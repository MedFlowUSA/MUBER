create or replace function public.job_closure_readiness(p_job uuid) returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare
  v_job public.jobs%rowtype;
  v_blockers text[] := array[]::text[];
  v_completion public.completion_submissions%rowtype;
  v_hours int;
begin
  if not public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  select * into v_job from public.jobs where id=p_job;
  if not found then raise exception 'job not found'; end if;
  if v_job.status<>'completed' then v_blockers:=array_append(v_blockers,'Job is not completed'); end if;
  select * into v_completion from public.completion_submissions where job_id=p_job order by version desc limit 1;
  if not found or v_completion.status<>'approved' then v_blockers:=array_append(v_blockers,'Completion review is not approved'); end if;
  select customer_response_hours into v_hours from public.closure_policies where service=v_job.service and active;
  if v_completion.customer_confirmation_status='problem_reported' then
    v_blockers:=array_append(v_blockers,'Customer reported a completion problem');
  elsif v_completion.customer_confirmation_status<>'confirmed' and v_completion.reviewed_at+make_interval(hours=>coalesce(v_hours,72))>now() then
    v_blockers:=array_append(v_blockers,'Customer response window remains open');
  end if;
  if exists(select 1 from public.incidents where job_id=p_job and status not in ('resolved','closed','void') and coalesce(internal_severity,reported_severity) in ('high','critical')) then v_blockers:=array_append(v_blockers,'High or critical incident remains open'); end if;
  if exists(select 1 from public.claims where job_id=p_job and status not in ('declined','withdrawn','closed')) then v_blockers:=array_append(v_blockers,'Claim remains open'); end if;
  if exists(select 1 from public.completion_submissions where job_id=p_job and status in ('more_information_requested','returned_to_provider')) then v_blockers:=array_append(v_blockers,'Completion information remains requested'); end if;
  return jsonb_build_object('eligible',cardinality(v_blockers)=0,'blockers',v_blockers,'payment_settled',false);
end $$;
revoke all on function public.job_closure_readiness(uuid) from public;
grant execute on function public.job_closure_readiness(uuid) to authenticated;
