alter table public.provider_applications
  add column agreement_version text,
  add column agreement_accepted_at timestamptz,
  add column authorized_representative_attested boolean not null default false,
  add column no_guarantee_acknowledged boolean not null default false;

create or replace function public.submit_provider_application(p_id uuid)
returns void language plpgsql security definer set search_path=public as $$
declare v_application public.provider_applications%rowtype;
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  select * into v_application from public.provider_applications
  where id=p_id and applicant_id=auth.uid() and status in ('draft','information_requested') for update;
  if not found then raise exception 'application cannot be submitted'; end if;
  if not v_application.background_consent or not v_application.agreement_accepted
    or not v_application.authorized_representative_attested
    or not v_application.no_guarantee_acknowledged then
    raise exception 'all application acknowledgments are required';
  end if;
  if cardinality(v_application.service_categories)=0 then
    raise exception 'at least one service category is required';
  end if;
  update public.provider_applications set status='submitted',submitted_at=now(),
    agreement_version='terms-2026-08-26',agreement_accepted_at=now() where id=p_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(auth.uid(),'provider_application.submitted','provider_application',p_id,jsonb_build_object(
    'agreement_version','terms-2026-08-26','authorized_representative_attested',true,
    'no_guarantee_acknowledged',true,'background_review_acknowledged',true));
end $$;
revoke all on function public.submit_provider_application(uuid) from public;
grant execute on function public.submit_provider_application(uuid) to authenticated;
