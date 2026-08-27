create or replace function public.current_service_date() returns date language sql stable security invoker set search_path=public as $$select current_date$$;
revoke all on function public.current_service_date() from public;grant execute on function public.current_service_date() to authenticated;
