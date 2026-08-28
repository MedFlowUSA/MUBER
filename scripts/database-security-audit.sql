-- MUBER database security posture audit.
-- Run in the Supabase SQL Editor or a controlled administrative psql session.
-- This script reads catalog metadata only and never selects application rows.
-- A non-empty result is a failed gate; the final block raises an exception.

begin;

create temporary table security_audit_findings (
  category text not null,
  object_name text not null,
  finding text not null,
  primary key (category, object_name, finding)
) on commit drop;

insert into security_audit_findings
select 'rls', c.relname, 'RLS is not enabled'
from pg_catalog.pg_class c
join pg_catalog.pg_namespace n on n.oid = c.relnamespace
where n.nspname = 'public'
  and c.relkind in ('r', 'p')
  and not c.relrowsecurity;

insert into security_audit_findings
select 'storage', b.id, 'private bucket is public'
from storage.buckets b
where b.id in (
  'job-media',
  'provider-credentials',
  'completion-media',
  'incident-evidence',
  'conversation-attachments'
)
and b.public;

insert into security_audit_findings
select 'storage', required.id, 'required private bucket is missing'
from unnest(array[
  'job-media',
  'provider-credentials',
  'completion-media',
  'incident-evidence',
  'conversation-attachments'
]) as required(id)
where not exists(select 1 from storage.buckets b where b.id = required.id);

insert into security_audit_findings
select 'function_search_path', p.oid::regprocedure::text,
  'SECURITY DEFINER function has no explicit search_path'
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and not exists(
    select 1
    from unnest(coalesce(p.proconfig, array[]::text[])) as config(setting)
    where setting like 'search_path=%'
  );

insert into security_audit_findings
select 'function_acl', p.oid::regprocedure::text,
  'PUBLIC can execute SECURITY DEFINER function'
from pg_catalog.pg_proc p
join pg_catalog.pg_namespace n on n.oid = p.pronamespace
where n.nspname = 'public'
  and p.prosecdef
  and p.prorettype <> 'pg_catalog.trigger'::regtype
  and exists(
    select 1
    from aclexplode(coalesce(p.proacl, acldefault('f', p.proowner))) acl
    where acl.grantee = 0 and acl.privilege_type = 'EXECUTE'
  );

with required(bucket_id, command) as (
  values
    ('job-media', 'SELECT'), ('job-media', 'INSERT'),
    ('provider-credentials', 'SELECT'), ('provider-credentials', 'INSERT'),
    ('completion-media', 'SELECT'), ('completion-media', 'INSERT'),
    ('incident-evidence', 'SELECT'), ('incident-evidence', 'INSERT'),
    ('conversation-attachments', 'SELECT'), ('conversation-attachments', 'INSERT')
)
insert into security_audit_findings
select 'storage_policy', required.bucket_id || ':' || required.command,
  'required storage policy is missing'
from required
where not exists (
  select 1
  from pg_catalog.pg_policies policy
  where policy.schemaname = 'storage'
    and policy.tablename = 'objects'
    and policy.cmd = required.command
    and concat_ws(' ', policy.qual, policy.with_check) like
      '%' || required.bucket_id || '%'
);

with required(table_name, trigger_name) as (
  values
    ('job_status_events', 'immutable_job_status_events'),
    ('audit_events', 'immutable_audit_events'),
    ('job_operational_events', 'immutable_job_operational_events'),
    ('completion_submissions', 'immutable_completion_submissions'),
    ('completion_media', 'immutable_completion_media'),
    ('completion_draft_media', 'immutable_completion_draft_media'),
    ('incident_updates', 'immutable_incident_updates'),
    ('incidents', 'prevent_incident_delete'),
    ('incident_evidence', 'immutable_incident_evidence'),
    ('job_information_responses', 'immutable_job_information_responses'),
    ('job_cancellation_events', 'immutable_job_cancellation_events'),
    ('provider_status_events', 'immutable_provider_status_events'),
    ('job_messages', 'immutable_job_messages'),
    ('job_message_attachments', 'immutable_job_message_attachments')
)
insert into security_audit_findings
select 'immutability', required.table_name, 'required protection trigger is missing'
from required
where not exists (
  select 1
  from pg_catalog.pg_trigger t
  join pg_catalog.pg_class table_class on table_class.oid = t.tgrelid
  join pg_catalog.pg_namespace n on n.oid = table_class.relnamespace
  where n.nspname = 'public'
    and table_class.relname = required.table_name
    and t.tgname = required.trigger_name
    and not t.tgisinternal
    and t.tgenabled <> 'D'
);

select category, object_name, finding
from security_audit_findings
order by category, object_name, finding;

do $$
begin
  if exists(select 1 from security_audit_findings) then
    raise exception 'MUBER database security audit failed; review findings above';
  end if;
end
$$;

rollback;
