create index if not exists credentials_review_queue_idx on public.provider_credentials(verification_status,submitted_at desc,id desc);
create index if not exists credentials_type_queue_idx on public.provider_credentials(credential_type,submitted_at desc,id desc);
create index if not exists completion_review_queue_idx on public.completion_submissions(status,created_at desc,id desc);
create index if not exists audit_feed_page_idx on public.audit_events(occurred_at desc,id desc);
create index if not exists audit_action_page_idx on public.audit_events(action text_pattern_ops,occurred_at desc,id desc);
create index if not exists audit_entity_page_idx on public.audit_events(entity_type,occurred_at desc,id desc);

create or replace function public.get_admin_audit_feed_page(p_action_prefix text,p_entity_type text,p_limit int,p_offset int)
returns table(id uuid,actor_name text,action text,entity_type text,entity_id uuid,occurred_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path=public as $$
declare v_role public.app_role;v_limit int:=least(greatest(coalesce(p_limit,25),1),50);v_offset int:=least(greatest(coalesce(p_offset,0),0),200000);v_prefix text:=trim(coalesce(p_action_prefix,''));v_entity text:=trim(coalesce(p_entity_type,''));
begin
  select role into v_role from public.profiles where profiles.id=auth.uid();
  if v_role not in ('compliance_admin','super_admin') then raise exception 'forbidden';end if;
  if length(v_prefix)>60 or v_prefix !~ '^[a-z0-9._-]*$' or length(v_entity)>60 or v_entity !~ '^[a-z0-9_-]*$' then raise exception 'invalid audit filter';end if;
  return query with visible as(
    select a.* from public.audit_events a where (v_role='super_admin' or a.action like 'provider%' or a.action like 'credential%' or a.action like 'incident%' or a.action like 'claim%' or a.action like 'support%') and (v_prefix='' or a.action like v_prefix||'%') and (v_entity='' or a.entity_type=v_entity)
  ) select a.id,coalesce(p.full_name,'System'),a.action,a.entity_type,a.entity_id,a.occurred_at,count(*) over() from visible a left join public.profiles p on p.id=a.actor_id order by a.occurred_at desc,a.id desc limit v_limit offset v_offset;
end $$;
revoke all on function public.get_admin_audit_feed_page(text,text,int,int) from public;
grant execute on function public.get_admin_audit_feed_page(text,text,int,int) to authenticated;
