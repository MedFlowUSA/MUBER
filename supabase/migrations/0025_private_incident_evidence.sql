create table public.incident_evidence (
  id uuid primary key default gen_random_uuid(),
  incident_id uuid not null references public.incidents on delete restrict,
  job_id uuid not null references public.jobs on delete restrict,
  uploaded_by uuid not null references public.profiles on delete restrict,
  evidence_type text not null check(evidence_type in ('photo','document','receipt','correspondence','other')),
  description text check(description is null or length(description) between 3 and 500),
  storage_path text not null unique,
  mime_type text not null check(mime_type in ('image/jpeg','image/png','image/webp','application/pdf')),
  byte_size bigint not null check(byte_size between 1 and 10485760),
  customer_visible boolean not null default false,
  provider_visible boolean not null default false,
  created_at timestamptz not null default now()
);
alter table public.incident_evidence enable row level security;
create index incident_evidence_incident_idx on public.incident_evidence(incident_id,created_at);
create trigger immutable_incident_evidence before update or delete on public.incident_evidence for each row execute function public.prevent_event_mutation();

create policy "authorized users read incident evidence" on public.incident_evidence for select to authenticated using(
  public.has_any_role(array['dispatcher','compliance_admin','super_admin']::public.app_role[])
  or uploaded_by=auth.uid()
  or (customer_visible and public.owns_job(job_id))
);
grant select on public.incident_evidence to authenticated;
revoke insert,update,delete on public.incident_evidence from authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types)
values('incident-evidence','incident-evidence',false,10485760,array['image/jpeg','image/png','image/webp','application/pdf'])
on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;

create policy "authorized users upload incident evidence objects" on storage.objects for insert to authenticated with check(
  bucket_id='incident-evidence'
  and (storage.foldername(name))[1]=auth.uid()::text
  and public.can_access_incident(((storage.foldername(name))[2])::uuid)
);
create policy "authorized users read incident evidence objects" on storage.objects for select to authenticated using(
  bucket_id='incident-evidence'
  and exists(select 1 from public.incident_evidence e where e.storage_path=name and (
    public.has_any_role(array['dispatcher','compliance_admin','super_admin']::public.app_role[])
    or e.uploaded_by=auth.uid()
    or (e.customer_visible and public.owns_job(e.job_id))
  ))
);

create or replace function public.register_incident_evidence(
  p_incident uuid,p_path text,p_type text,p_description text,p_mime text,p_size bigint,p_request_id uuid
) returns uuid language plpgsql security definer set search_path=public,storage as $$
declare v_incident public.incidents%rowtype;v_id uuid;v_customer_visible boolean;
begin
  select * into v_incident from public.incidents where id=p_incident;
  if not found or not public.can_access_incident(p_incident) then raise exception 'incident not found'; end if;
  if p_type not in ('photo','document','receipt','correspondence','other')
    or p_mime not in ('image/jpeg','image/png','image/webp','application/pdf')
    or p_size not between 1 and 10485760
    or p_path not like auth.uid()::text||'/'||p_incident::text||'/%'
    or (nullif(trim(coalesce(p_description,'')),'') is not null and length(trim(p_description)) not between 3 and 500)
  then raise exception 'invalid incident evidence'; end if;
  if not exists(select 1 from storage.objects where bucket_id='incident-evidence' and name=p_path and owner_id=auth.uid()::text) then raise exception 'evidence object not found'; end if;
  v_customer_visible:=public.owns_job(v_incident.job_id);
  insert into public.incident_evidence(incident_id,job_id,uploaded_by,evidence_type,description,storage_path,mime_type,byte_size,customer_visible)
  values(p_incident,v_incident.job_id,auth.uid(),p_type,nullif(trim(coalesce(p_description,'')),''),p_path,p_mime,p_size,v_customer_visible)
  returning id into v_id;
  insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id)
  values(auth.uid(),'incident.evidence_added','incident_evidence',v_id,jsonb_build_object('incident_id',p_incident,'evidence_type',p_type,'byte_size',p_size),p_request_id);
  return v_id;
end $$;
revoke all on function public.register_incident_evidence(uuid,text,text,text,text,bigint,uuid) from public;
grant execute on function public.register_incident_evidence(uuid,text,text,text,text,bigint,uuid) to authenticated;
