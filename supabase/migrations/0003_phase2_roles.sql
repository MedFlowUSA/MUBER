-- Enum additions must commit before later migrations may reference them.
alter type public.app_role add value if not exists 'provider_manager';
alter type public.app_role add value if not exists 'crew_lead';
alter type public.app_role add value if not exists 'crew_member';
alter type public.app_role add value if not exists 'compliance_admin';
alter type public.app_role add value if not exists 'finance_admin';
alter type public.app_role add value if not exists 'super_admin';
