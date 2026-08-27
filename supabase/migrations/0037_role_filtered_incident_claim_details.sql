-- Remove direct access to internal review columns and expose role-filtered detail RPCs.
revoke select on public.incidents from authenticated;
grant select(id,job_id,assignment_id,provider_company_id,crew_id,completion_submission_id,reporter_id,reporter_role,category,reported_severity,status,occurred_at,reported_at,description,immediate_safety_action,injury_indicator,emergency_services_indicator,damage_indicator,missing_item_indicator,hazard_indicator,customer_visible_summary,resolution_summary,resolved_at,related_support_request) on public.incidents to authenticated;
revoke select on public.claims from authenticated;
grant select(id,incident_id,job_id,provider_company_id,claimant_id,status,loss_category,customer_description,provider_response,claimed_amount_cents,currency,resolution_type,decision_at,created_by,created_at,updated_at) on public.claims to authenticated;

create or replace function public.get_incident_detail(p_incident uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_i public.incidents%rowtype;v_role public.app_role;v_internal boolean;v_customer boolean;v_provider boolean;v_updates jsonb;v_evidence jsonb;v_claims jsonb;v_reference text;
begin
  select role into v_role from public.profiles where id=auth.uid();
  select * into v_i from public.incidents where id=p_incident;
  if not found or not public.can_access_incident(p_incident) then raise exception 'incident not found';end if;
  v_internal:=v_role in ('dispatcher','compliance_admin','super_admin');v_customer:=public.owns_job(v_i.job_id);v_provider:=public.crew_has_assigned_job(v_i.job_id) or (v_i.provider_company_id is not null and public.can_manage_provider(v_i.provider_company_id));
  select reference into v_reference from public.jobs where id=v_i.job_id;
  select coalesce(jsonb_agg(jsonb_build_object('id',u.id,'from_status',u.from_status,'to_status',u.to_status,'message',u.message,'created_at',u.created_at) order by u.created_at),'[]') into v_updates from public.incident_updates u where u.incident_id=p_incident and (v_internal or (v_customer and u.customer_visible) or (v_provider and u.provider_visible));
  select coalesce(jsonb_agg(jsonb_build_object('id',e.id,'evidence_type',e.evidence_type,'description',e.description,'created_at',e.created_at) order by e.created_at),'[]') into v_evidence from public.incident_evidence e where e.incident_id=p_incident and (v_internal or e.uploaded_by=auth.uid() or (v_customer and e.customer_visible) or (v_provider and e.provider_visible));
  select coalesce(jsonb_agg(jsonb_build_object('id',c.id,'status',c.status,'loss_category',c.loss_category,'created_at',c.created_at) order by c.created_at),'[]') into v_claims from public.claims c where c.incident_id=p_incident and (v_internal or c.claimant_id=auth.uid() or (c.provider_company_id is not null and public.can_manage_provider(c.provider_company_id)));
  return jsonb_strip_nulls(jsonb_build_object('id',v_i.id,'job_id',v_i.job_id,'job_reference',v_reference,'category',v_i.category,'reported_severity',v_i.reported_severity,'internal_severity',case when v_internal then v_i.internal_severity end,'reporter_role',v_i.reporter_role,'occurred_at',v_i.occurred_at,'reported_at',v_i.reported_at,'status',v_i.status,'description',v_i.description,'immediate_safety_action',v_i.immediate_safety_action,'customer_visible_summary',v_i.customer_visible_summary,'internal_notes',case when v_internal then v_i.internal_notes end,'assigned_reviewer',case when v_internal then v_i.assigned_reviewer end,'resolution_summary',v_i.resolution_summary,'resolved_at',v_i.resolved_at,'incident_hold',(select status='incident_hold' from public.jobs where id=v_i.job_id),'updates',v_updates,'evidence',v_evidence,'claims',v_claims,'viewer_role',v_role));
end $$;

create or replace function public.get_claim_detail(p_claim uuid) returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_c public.claims%rowtype;v_role public.app_role;v_internal boolean;v_allowed boolean;v_reference text;
begin
  select role into v_role from public.profiles where id=auth.uid();select * into v_c from public.claims where id=p_claim;
  if not found then raise exception 'claim not found';end if;
  v_internal:=v_role in ('dispatcher','compliance_admin','super_admin');v_allowed:=v_internal or v_c.claimant_id=auth.uid() or (v_c.provider_company_id is not null and public.can_manage_provider(v_c.provider_company_id));
  if not v_allowed then raise exception 'claim not found';end if;
  select reference into v_reference from public.jobs where id=v_c.job_id;
  return jsonb_strip_nulls(jsonb_build_object('id',v_c.id,'incident_id',v_c.incident_id,'job_id',v_c.job_id,'job_reference',v_reference,'claimant',case when v_c.claimant_id=auth.uid() then 'you' else 'authorized participant' end,'loss_category',v_c.loss_category,'claimed_amount_cents',v_c.claimed_amount_cents,'currency',v_c.currency,'status',v_c.status,'customer_description',v_c.customer_description,'provider_response',v_c.provider_response,'resolution_type',v_c.resolution_type,'customer_visible_resolution',case when v_c.status in ('resolution_proposed','accepted','declined','closed') then v_c.resolution_type end,'internal_resolution_notes',case when v_internal then v_c.resolution_notes end,'approved_amount_placeholder_cents',case when v_internal then v_c.approved_amount_placeholder_cents end,'decision_at',v_c.decision_at,'created_at',v_c.created_at,'viewer_role',v_role,'liability_admitted',false,'payment_processed',false));
end $$;
revoke all on function public.get_incident_detail(uuid),public.get_claim_detail(uuid) from public;
grant execute on function public.get_incident_detail(uuid),public.get_claim_detail(uuid) to authenticated;
