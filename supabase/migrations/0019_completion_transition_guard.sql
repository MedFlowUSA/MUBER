create or replace function public.require_completion_submission() returns trigger language plpgsql set search_path=public as $$ begin
 if old.status='in_progress' and new.status='completion_review' and not exists(select 1 from public.completion_submissions s where s.job_id=new.id and s.status='pending_review') then raise exception 'completion submission required';end if;return new;
end $$;
create trigger require_completion_before_review before update of status on public.jobs for each row execute function public.require_completion_submission();
