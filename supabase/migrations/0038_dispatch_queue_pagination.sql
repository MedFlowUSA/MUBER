create index if not exists jobs_dispatch_queue_idx on public.jobs(status,created_at desc,id desc);
create index if not exists jobs_reference_prefix_idx on public.jobs(reference text_pattern_ops);
create index if not exists incidents_queue_page_idx on public.incidents(status,reported_at desc,id desc);
create index if not exists provider_applications_queue_page_idx on public.provider_applications(status,created_at desc,id desc);
create index if not exists provider_companies_status_name_idx on public.provider_companies(status,legal_name,id);

create or replace function public.dispatch_queue_counts() returns jsonb language plpgsql stable security definer set search_path=public as $$
declare v_result jsonb;
begin
  if not public.has_any_role(array['dispatcher','super_admin']::public.app_role[]) then raise exception 'forbidden';end if;
  select jsonb_build_object(
    'new',count(*) filter(where status='submitted'),
    'needs_information',count(*) filter(where status='needs_customer_information'),
    'quotes_in_progress',count(*) filter(where status in ('needs_review','quote_preparation')),
    'offers_awaiting_action',count(*) filter(where status='offer_sent'),
    'unassigned',count(*) filter(where status in ('quote_accepted','ready_for_matching','reassignment_required')),
    'assigned',count(*) filter(where status in ('assigned','crew_confirmed','ready')),
    'active_field_work',count(*) filter(where status in ('en_route','arrived','in_progress')),
    'completion_review',count(*) filter(where status='completion_review'),
    'needs_attention',count(*) filter(where status='incident_hold')
  ) into v_result from public.jobs where status not in ('closed','completed','cancelled');
  return v_result;
end $$;
revoke all on function public.dispatch_queue_counts() from public;
grant execute on function public.dispatch_queue_counts() to authenticated;
