create index if not exists provider_offers_page_idx on public.provider_offers(provider_company_id,status,created_at desc,id desc);
create index if not exists provider_assignments_page_idx on public.assignments(provider_company_id,status,created_at desc,id desc);
create index if not exists notifications_page_idx on public.in_app_notifications(recipient_id,read_at,created_at desc,id desc);
