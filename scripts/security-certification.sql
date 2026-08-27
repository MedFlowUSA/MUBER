-- Run only in a controlled administrative database session after setting the
-- cert.* transaction-local UUID values documented in docs/security-certification.md.
-- Output is deliberately boolean-only.
select 'customer_a_profile_exists' as check_name,
  exists(select 1 from public.profiles where id=current_setting('cert.customer_a_profile')::uuid) as passed;
select 'customer_b_profile_exists' as check_name,
  exists(select 1 from public.profiles where id=current_setting('cert.customer_b_profile')::uuid) as passed;
select 'customer_a_owns_job' as check_name,
  exists(select 1 from public.jobs j join public.customers c on c.id=j.customer_id where j.id=current_setting('cert.customer_a_job')::uuid and c.profile_id=current_setting('cert.customer_a_profile')::uuid) as passed;
select 'customer_b_does_not_own_a_job' as check_name,
  not exists(select 1 from public.jobs j join public.customers c on c.id=j.customer_id where j.id=current_setting('cert.customer_a_job')::uuid and c.profile_id=current_setting('cert.customer_b_profile')::uuid) as passed;
select 'crew_membership_matches' as check_name,
  exists(select 1 from public.crew_members where crew_id=current_setting('cert.crew')::uuid and profile_id=current_setting('cert.crew_profile')::uuid) as passed;
select 'crew_provider_matches' as check_name,
  exists(select 1 from public.crews where id=current_setting('cert.crew')::uuid and provider_company_id=current_setting('cert.provider_company')::uuid) as passed;
select 'no_public_job_media_bucket' as check_name,
  not exists(select 1 from storage.buckets where id in ('job-media','completion-media') and public) as passed;
select 'migration_audits_present' as check_name,
  exists(select 1 from public.audit_events where action in ('crew_invitation.accepted','completion.submitted')) as passed;
