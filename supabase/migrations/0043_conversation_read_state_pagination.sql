create table public.job_conversation_reads(
  profile_id uuid not null references public.profiles on delete cascade,
  job_id uuid not null references public.jobs on delete cascade,
  last_read_at timestamptz not null default now(),
  primary key(profile_id,job_id)
);
alter table public.job_conversation_reads enable row level security;
create policy "users read own conversation state" on public.job_conversation_reads for select to authenticated using(profile_id=auth.uid());
grant select on public.job_conversation_reads to authenticated;
revoke insert,update,delete on public.job_conversation_reads from authenticated;
create index job_conversation_reads_user_idx on public.job_conversation_reads(profile_id,last_read_at desc);

create or replace function public.get_message_jobs_page(p_page int default 1,p_page_size int default 20,p_unread_only boolean default false)
returns table(job_id uuid,reference text,service text,status text,last_message_at timestamptz,last_preview text,unread_count bigint,total_count bigint)
language sql stable security definer set search_path=public as $$
with accessible as (
  select j.id,j.reference,j.service::text service,j.status::text status,j.created_at
  from public.jobs j where public.owns_job(j.id) or public.provider_has_assigned_job(j.id) or public.crew_has_assigned_job(j.id) or public.has_any_role(array['dispatcher','super_admin']::public.app_role[])
), summary as (
  select a.*,lm.created_at last_message_at,left(lm.body,120) last_preview,
    (select count(*) from public.job_messages u where u.job_id=a.id and u.sender_id<>auth.uid() and public.can_read_job_message(u.job_id,u.channel) and u.created_at>coalesce(r.last_read_at,'epoch'::timestamptz)) unread_count
  from accessible a
  left join public.job_conversation_reads r on r.job_id=a.id and r.profile_id=auth.uid()
  left join lateral(select m.body,m.created_at from public.job_messages m where m.job_id=a.id and public.can_read_job_message(m.job_id,m.channel) order by m.created_at desc,m.id desc limit 1) lm on true
), filtered as(select * from summary where not p_unread_only or unread_count>0)
select id,reference,service,status,last_message_at,last_preview,unread_count,count(*) over()
from filtered order by last_message_at desc nulls last,created_at desc,id desc
limit least(greatest(coalesce(p_page_size,20),1),50)
offset (least(greatest(coalesce(p_page,1),1),10000)-1)*least(greatest(coalesce(p_page_size,20),1),50)
$$;
revoke all on function public.get_message_jobs_page(int,int,boolean) from public;
grant execute on function public.get_message_jobs_page(int,int,boolean) to authenticated;

create or replace function public.mark_job_conversation_read(p_job uuid) returns void language plpgsql security definer set search_path=public as $$
begin
  if not(public.owns_job(p_job) or public.provider_has_assigned_job(p_job) or public.crew_has_assigned_job(p_job) or public.has_any_role(array['dispatcher','super_admin']::public.app_role[])) then raise exception 'conversation not found';end if;
  insert into public.job_conversation_reads(profile_id,job_id,last_read_at) values(auth.uid(),p_job,now()) on conflict(profile_id,job_id) do update set last_read_at=excluded.last_read_at;
end $$;
revoke all on function public.mark_job_conversation_read(uuid) from public;
grant execute on function public.mark_job_conversation_read(uuid) to authenticated;
