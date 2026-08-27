create or replace function public.get_admin_overview() returns jsonb
language plpgsql stable security definer set search_path=public as $$
declare v_role public.app_role;v_result jsonb;
begin
  select role into v_role from public.profiles where id=auth.uid();
  if v_role not in ('compliance_admin','finance_admin','super_admin') then raise exception 'forbidden'; end if;
  if v_role='finance_admin' then
    return jsonb_build_object('role',v_role,'payments_enabled',false,'message','Financial operations are not enabled in this phase.');
  end if;
  select jsonb_build_object(
    'role',v_role,
    'submitted_applications',(select count(*) from public.provider_applications where status in ('submitted','under_review','information_requested')),
    'credentials_needing_review',(select count(*) from public.provider_credentials where verification_status in ('submitted','under_review','expiring','expired')),
    'open_support_requests',(select count(*) from public.support_requests where status not in ('resolved','closed')),
    'open_incidents',(select count(*) from public.incidents where status not in ('resolved','closed','void')),
    'high_risk_incidents',(select count(*) from public.incidents where status not in ('resolved','closed','void') and coalesce(internal_severity,reported_severity) in ('high','critical')),
    'active_contractors',(select count(*) from public.provider_companies where status='approved'),
    'payments_enabled',false
  ) into v_result;
  return v_result;
end $$;
revoke all on function public.get_admin_overview() from public;
grant execute on function public.get_admin_overview() to authenticated;

create or replace function public.get_admin_audit_feed(p_limit int default 100)
returns table(id uuid,actor_name text,action text,entity_type text,entity_id uuid,occurred_at timestamptz)
language plpgsql stable security definer set search_path=public as $$
declare v_role public.app_role;
begin
  select role into v_role from public.profiles where profiles.id=auth.uid();
  if v_role not in ('compliance_admin','super_admin') then raise exception 'forbidden'; end if;
  return query select a.id,coalesce(p.full_name,'System'),a.action,a.entity_type,a.entity_id,a.occurred_at
  from public.audit_events a left join public.profiles p on p.id=a.actor_id
  where v_role='super_admin' or a.action like 'provider%' or a.action like 'credential%' or a.action like 'incident%' or a.action like 'claim%' or a.action like 'support%'
  order by a.occurred_at desc limit least(greatest(coalesce(p_limit,100),1),250);
end $$;
revoke all on function public.get_admin_audit_feed(int) from public;
grant execute on function public.get_admin_audit_feed(int) to authenticated;
