create policy "uploaders delete unregistered incident evidence objects" on storage.objects for delete to authenticated using(
  bucket_id='incident-evidence'
  and owner_id=auth.uid()::text
  and (storage.foldername(name))[1]=auth.uid()::text
  and not exists(select 1 from public.incident_evidence e where e.storage_path=name)
);
