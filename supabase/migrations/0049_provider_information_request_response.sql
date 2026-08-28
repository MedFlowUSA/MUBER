alter table public.provider_applications
  add column applicant_message text,
  add column applicant_response text;

create or replace function public.review_provider_application_v2(
  p_application uuid,
  p_decision text,
  p_internal_reason text default null,
  p_applicant_message text default null
)
returns uuid
language plpgsql
security definer
set search_path = public
as $$
declare
  v_company uuid;
  v_message text := nullif(trim(coalesce(p_applicant_message, '')), '');
begin
  if p_decision = 'information_requested'
     and length(coalesce(v_message, '')) not between 10 and 1000 then
    raise exception 'a contractor-safe information request is required';
  end if;
  if p_decision <> 'information_requested' and v_message is not null then
    raise exception 'applicant message is only valid for information requests';
  end if;

  v_company := public.review_provider_application(
    p_application,
    p_decision,
    p_internal_reason
  );

  update public.provider_applications
  set applicant_message = case
        when p_decision = 'information_requested' then v_message
        else null
      end,
      applicant_response = case
        when p_decision = 'information_requested' then null
        else applicant_response
      end
  where id = p_application;
  return v_company;
end
$$;

revoke all on function public.review_provider_application_v2(uuid,text,text,text) from public;
grant execute on function public.review_provider_application_v2(uuid,text,text,text) to authenticated;

drop function public.my_provider_application_status();
create function public.my_provider_application_status()
returns table(
  id uuid,
  status text,
  legal_name text,
  dba_name text,
  submitted_at timestamptz,
  decided_at timestamptz,
  updated_at timestamptz,
  applicant_message text
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pa.id,
    pa.status::text,
    pa.legal_name,
    pa.dba_name,
    pa.submitted_at,
    pa.decided_at,
    pa.updated_at,
    case when pa.status = 'information_requested'
      then pa.applicant_message
      else null
    end
  from public.provider_applications pa
  where pa.applicant_id = auth.uid()
  order by pa.created_at desc
  limit 1
$$;
revoke all on function public.my_provider_application_status() from public;
grant execute on function public.my_provider_application_status() to authenticated;

create or replace function public.resubmit_provider_application(p_response text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_application uuid;
  v_response text := trim(coalesce(p_response, ''));
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  if length(v_response) not between 10 and 4000 then
    raise exception 'a response between 10 and 4000 characters is required';
  end if;

  select id into v_application
  from public.provider_applications
  where applicant_id = auth.uid() and status = 'information_requested'
  order by created_at desc
  limit 1
  for update;
  if v_application is null then raise exception 'application is not awaiting information'; end if;

  update public.provider_applications
  set applicant_response = v_response,
      applicant_message = null,
      status = 'submitted',
      submitted_at = now()
  where id = v_application;

  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata)
  values(
    auth.uid(),
    'provider_application.information_resubmitted',
    'provider_application',
    v_application,
    jsonb_build_object('response_provided', true)
  );
end
$$;
revoke all on function public.resubmit_provider_application(text) from public;
grant execute on function public.resubmit_provider_application(text) to authenticated;
