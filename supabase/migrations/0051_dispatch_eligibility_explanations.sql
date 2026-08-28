drop function if exists public.eligible_providers_for_job(uuid);

create function public.eligible_providers_for_job(p_job uuid)
returns table(
  provider_company_id uuid, legal_name text, eligible boolean, reasons text[], qualifications text[],
  vehicle_fit boolean, crew_fit boolean, credential_fit boolean, territory_configured boolean,
  availability_fit boolean, service_fit boolean, disposal_fit boolean, missing_credentials text[],
  matching_vehicle_count bigint, matching_crew_count bigint
)
language plpgsql stable security definer set search_path=public as $$
declare
  v_job public.jobs%rowtype; v_review public.internal_job_reviews%rowtype;
  v_provider public.provider_companies%rowtype; v_reasons text[]; v_qualifications text[]; v_required text[];
begin
  if not public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) then raise exception 'forbidden'; end if;
  select * into v_job from public.jobs where id=p_job;
  if not found then raise exception 'job not found'; end if;
  select * into v_review from public.internal_job_reviews where job_id=p_job;

  for v_provider in select * from public.provider_companies order by legal_name loop
    v_reasons := '{}'; v_qualifications := '{}';
    if v_provider.status='approved' then v_qualifications:=array_append(v_qualifications,'Approved provider organization');
    else v_reasons:=array_append(v_reasons,'Provider is not approved and active'); end if;

    availability_fit:=v_provider.available;
    if availability_fit then v_qualifications:=array_append(v_qualifications,'Provider is accepting work');
    else v_reasons:=array_append(v_reasons,'Provider is not currently available'); end if;

    service_fit:=v_job.service::text=any(v_provider.service_categories);
    if service_fit then v_qualifications:=array_append(v_qualifications,'Required service category is enabled');
    else v_reasons:=array_append(v_reasons,'Service category does not match'); end if;

    territory_configured:=coalesce(v_provider.service_area->>'description','')<>'';
    if territory_configured then v_qualifications:=array_append(v_qualifications,'Service territory is configured; dispatcher must confirm this job is in range');
    else v_reasons:=array_append(v_reasons,'Service territory is not configured'); end if;

    disposal_fit:=v_job.service<>'remove' or v_provider.disposal_capability;
    if disposal_fit and v_job.service='remove' then v_qualifications:=array_append(v_qualifications,'Disposal capability is confirmed');
    elsif not disposal_fit then v_reasons:=array_append(v_reasons,'Disposal capability is required'); end if;

    select count(*) into matching_vehicle_count from public.vehicles v
    where v.provider_company_id=v_provider.id and v.active and v.insurance_eligible
      and v_job.service::text=any(v.service_categories)
      and (v_review.required_vehicle_class is null or v.vehicle_type=v_review.required_vehicle_class or v.capacity_class=v_review.required_vehicle_class);
    vehicle_fit:=matching_vehicle_count>0;
    if vehicle_fit then v_qualifications:=array_append(v_qualifications,matching_vehicle_count||' active, insurance-eligible vehicle(s) fit');
    else v_reasons:=array_append(v_reasons,'No active, insurance-eligible vehicle fits the job'); end if;

    select count(*) into matching_crew_count from public.crews c
    where c.provider_company_id=v_provider.id and c.active and c.crew_size>=coalesce(v_review.required_crew_size,1)
      and case when v_job.service='move' then c.moving_eligible else c.removal_eligible end;
    crew_fit:=matching_crew_count>0;
    if crew_fit then v_qualifications:=array_append(v_qualifications,matching_crew_count||' active crew(s) fit');
    else v_reasons:=array_append(v_reasons,'No active crew fits the job'); end if;

    v_required:=array['general_liability','commercial_auto']::text[]||coalesce(v_review.credential_requirements,'{}');
    if v_job.service='move' then v_required:=v_required||array['cargo_insurance','ca_household_mover_permit']; end if;
    select coalesce(array_agg(distinct required.type order by required.type),'{}'::text[]) into missing_credentials
    from unnest(v_required) required(type)
    where not exists(select 1 from public.provider_credentials pc where pc.provider_company_id=v_provider.id
      and pc.credential_type=required.type and pc.verification_status='verified'
      and (pc.expires_at is null or pc.expires_at>current_date));
    credential_fit:=cardinality(missing_credentials)=0;
    if credential_fit then v_qualifications:=array_append(v_qualifications,'All required credentials are verified and unexpired');
    else v_reasons:=array_append(v_reasons,'Required credentials missing or expired: '||array_to_string(missing_credentials,', ')); end if;

    provider_company_id:=v_provider.id; legal_name:=v_provider.legal_name; reasons:=v_reasons;
    qualifications:=v_qualifications; eligible:=cardinality(v_reasons)=0; return next;
  end loop;
end $$;

revoke all on function public.eligible_providers_for_job(uuid) from public;
grant execute on function public.eligible_providers_for_job(uuid) to authenticated;
