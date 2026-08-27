create or replace function public.notify_incident_reported() returns trigger language plpgsql security definer set search_path=public as $$
begin
  insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key)
  select p.id,'incident.reported','incident',new.id,'/dispatch/incidents','A new incident report requires operational review.',new.request_id
  from public.profiles p where p.role in ('dispatcher','compliance_admin','super_admin')
  on conflict do nothing;
  return new;
end $$;
create trigger notify_incident_reported after insert on public.incidents for each row execute function public.notify_incident_reported();

create or replace function public.notify_incident_update() returns trigger language plpgsql security definer set search_path=public as $$
declare v_incident public.incidents%rowtype;
begin
  select * into v_incident from public.incidents where id=new.incident_id;
  if new.customer_visible then
    insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key)
    values(v_incident.reporter_id,'incident.updated','incident',new.incident_id,'/customer/jobs/'||v_incident.job_id,'Your incident report has an update.',new.id)
    on conflict do nothing;
  end if;
  if new.provider_visible and v_incident.provider_company_id is not null then
    insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key)
    select om.profile_id,'incident.updated','incident',new.incident_id,'/provider/jobs','An assigned-job incident has an update.',new.id
    from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id
    where pc.id=v_incident.provider_company_id and om.role in ('provider_owner','provider_manager')
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger notify_incident_update after insert on public.incident_updates for each row execute function public.notify_incident_update();

create or replace function public.notify_job_closed() returns trigger language plpgsql security definer set search_path=public as $$
declare v_recipient uuid;
begin
  if new.status='closed' then
    select c.profile_id into v_recipient from public.jobs j join public.customers c on c.id=j.customer_id where j.id=new.job_id;
    insert into public.in_app_notifications(recipient_id,event_key,entity_type,entity_id,route,safe_preview,idempotency_key)
    values(v_recipient,'job.closed','job',new.job_id,'/customer/jobs/'||new.job_id,'Your job is closed. Support remains available.',new.id)
    on conflict do nothing;
  end if;
  return new;
end $$;
create trigger notify_job_closed after insert on public.job_status_events for each row execute function public.notify_job_closed();
