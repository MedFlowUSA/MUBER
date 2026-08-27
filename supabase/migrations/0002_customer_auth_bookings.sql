-- Production hardening: customer auth, ownership RLS, idempotent booking RPC, private media.
alter table public.jobs add column reference text unique;
alter table public.jobs add column idempotency_key uuid unique;
alter table public.jobs add column time_window text;
create index jobs_customer_created_idx on public.jobs(customer_id, created_at desc);
create index jobs_status_idx on public.jobs(status);
create index job_stops_job_idx on public.job_stops(job_id);
create index job_items_job_idx on public.job_items(job_id);
create index job_media_job_idx on public.job_media(job_id);
create index job_status_events_job_idx on public.job_status_events(job_id, occurred_at);
create index addresses_customer_idx on public.addresses(customer_id);

create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path=public as $$
begin
  insert into public.profiles(id, role, full_name, phone)
  values(new.id, 'customer', nullif(new.raw_user_meta_data->>'full_name',''), nullif(new.raw_user_meta_data->>'phone',''))
  on conflict(id) do nothing;
  return new;
end $$;
create trigger on_auth_user_created after insert on auth.users for each row execute function public.handle_new_user();

create or replace function public.update_my_profile(p_full_name text, p_phone text) returns void
language plpgsql security definer set search_path=public as $$
begin
  if auth.uid() is null then raise exception 'authentication required'; end if;
  update public.profiles set full_name=nullif(trim(p_full_name),''), phone=nullif(trim(p_phone),'') where id=auth.uid();
end $$;
revoke all on function public.update_my_profile(text,text) from public;
grant execute on function public.update_my_profile(text,text) to authenticated;

create or replace function public.owns_job(p_job uuid) returns boolean
language sql stable security definer set search_path=public as $$
  select exists(select 1 from public.jobs j join public.customers c on c.id=j.customer_id where j.id=p_job and c.profile_id=auth.uid())
$$;
revoke all on function public.owns_job(uuid) from public;
grant execute on function public.owns_job(uuid) to authenticated;

create policy "customers read self" on public.customers for select to authenticated using(profile_id=auth.uid());
create policy "addresses read self" on public.addresses for select to authenticated using(customer_id in(select id from public.customers where profile_id=auth.uid()));
create policy "jobs read self" on public.jobs for select to authenticated using(customer_id in(select id from public.customers where profile_id=auth.uid()));
create policy "stops read own job" on public.job_stops for select to authenticated using(public.owns_job(job_id));
create policy "items read own job" on public.job_items for select to authenticated using(public.owns_job(job_id));
create policy "media read own job" on public.job_media for select to authenticated using(public.owns_job(job_id));
create policy "events read own job" on public.job_status_events for select to authenticated using(public.owns_job(job_id));

create sequence public.job_reference_seq;
create or replace function public.submit_customer_booking(p_payload jsonb, p_idempotency_key uuid)
returns table(job_id uuid, job_reference text)
language plpgsql security definer set search_path=public as $$
declare v_uid uuid:=auth.uid(); v_customer uuid; v_job uuid; v_ref text; v_service public.job_service; v_item text; v_stop jsonb;
begin
  if v_uid is null then raise exception 'authentication required'; end if;
  if p_idempotency_key is null then raise exception 'idempotency key required'; end if;
  select j.id,j.reference into v_job,v_ref from public.jobs j join public.customers c on c.id=j.customer_id where c.profile_id=v_uid and j.idempotency_key=p_idempotency_key;
  if v_job is not null then return query select v_job,v_ref; return; end if;
  v_service:=(p_payload->>'service')::public.job_service;
  if v_service not in ('move','remove') or length(trim(coalesce(p_payload->>'description','')))>5000 then raise exception 'invalid booking'; end if;
  if coalesce(p_payload->>'name','')='' or coalesce(p_payload->>'email','')='' or coalesce(p_payload->>'phone','')='' then raise exception 'contact information required'; end if;
  insert into public.customers(profile_id,email,full_name,phone) values(v_uid,lower(trim(p_payload->>'email')),trim(p_payload->>'name'),trim(p_payload->>'phone'))
  on conflict(profile_id) do update set email=excluded.email,full_name=excluded.full_name,phone=excluded.phone returning id into v_customer;
  v_ref:='MUB-'||to_char(now(),'YYMM')||'-'||lpad(nextval('public.job_reference_seq')::text,6,'0');
  insert into public.jobs(customer_id,service,status,preferred_start,description,reference,idempotency_key,time_window)
  values(v_customer,v_service,'requested',nullif(p_payload->>'date','')::date,coalesce(p_payload->>'description',''),v_ref,p_idempotency_key,nullif(p_payload->>'timeWindow','')) returning id into v_job;
  for v_stop in select value from jsonb_array_elements(coalesce(p_payload->'stops','[]'::jsonb)) loop
    if coalesce(v_stop->>'line1','')='' then raise exception 'address required'; end if;
    with a as (insert into public.addresses(customer_id,line1,line2,city,region,postal_code,access_notes) values(v_customer,v_stop->>'line1',v_stop->>'line2',coalesce(v_stop->>'city','Not provided'),coalesce(v_stop->>'region','CA'),coalesce(v_stop->>'postalCode','00000'),p_payload->>'access') returning id)
    insert into public.job_stops(job_id,address_id,stop_order,stop_type) select v_job,id,(v_stop->>'order')::int,(v_stop->>'type') from a;
  end loop;
  for v_item in select jsonb_array_elements_text(coalesce(p_payload->'items','[]'::jsonb)) loop insert into public.job_items(job_id,category) values(v_job,left(v_item,120)); end loop;
  insert into public.job_status_events(job_id,status,actor_id,note) values(v_job,'requested',v_uid,'Customer submitted request');
  insert into public.audit_events(actor_id,action,entity_type,entity_id) values(v_uid,'booking.submitted','job',v_job);
  return query select v_job,v_ref;
exception when unique_violation then
  return query select j.id,j.reference from public.jobs j join public.customers c on c.id=j.customer_id where c.profile_id=v_uid and j.idempotency_key=p_idempotency_key;
end $$;
revoke all on function public.submit_customer_booking(jsonb,uuid) from public;
grant execute on function public.submit_customer_booking(jsonb,uuid) to authenticated;

insert into storage.buckets(id,name,public,file_size_limit,allowed_mime_types) values('job-media','job-media',false,10485760,array['image/jpeg','image/png','image/webp']) on conflict(id) do update set public=false,file_size_limit=10485760,allowed_mime_types=excluded.allowed_mime_types;
create policy "customers upload own job media" on storage.objects for insert to authenticated with check(bucket_id='job-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "customers read own job media" on storage.objects for select to authenticated using(bucket_id='job-media' and (storage.foldername(name))[1]=auth.uid()::text);
create policy "customers delete own unfinalized media" on storage.objects for delete to authenticated using(bucket_id='job-media' and (storage.foldername(name))[1]=auth.uid()::text);

create or replace function public.register_job_media(p_job uuid,p_path text,p_mime text,p_size bigint) returns uuid
language plpgsql security definer set search_path=public,storage as $$
declare v_id uuid;
begin
 if not public.owns_job(p_job) then raise exception 'not found'; end if;
 if p_path not like auth.uid()::text||'/'||p_job::text||'/%' then raise exception 'invalid media path'; end if;
 if p_mime not in('image/jpeg','image/png','image/webp') or p_size not between 1 and 10485760 then raise exception 'invalid media'; end if;
 if not exists(select 1 from storage.objects where bucket_id='job-media' and name=p_path and owner_id=auth.uid()::text) then raise exception 'media object not found'; end if;
 insert into public.job_media(job_id,uploaded_by,storage_path,mime_type,byte_size) values(p_job,auth.uid(),p_path,p_mime,p_size) returning id into v_id;
 return v_id;
end $$;
revoke all on function public.register_job_media(uuid,text,text,bigint) from public;
grant execute on function public.register_job_media(uuid,text,text,bigint) to authenticated;

-- Direct table writes remain denied. RPCs derive ownership from auth.uid().
