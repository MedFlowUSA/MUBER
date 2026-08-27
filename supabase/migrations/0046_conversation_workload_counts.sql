create or replace function public.conversation_workload_counts() returns jsonb language sql stable security definer set search_path=public as $$
with actor as(select role from public.profiles where id=auth.uid()),accessible as(
 select j.id from public.jobs j where public.owns_job(j.id) or public.provider_has_assigned_job(j.id) or public.crew_has_assigned_job(j.id) or public.has_any_role(array['dispatcher','super_admin']::public.app_role[])
),summary as(
 select a.id,lm.created_at,
 (select count(*) from public.job_messages u where u.job_id=a.id and u.sender_id<>auth.uid() and public.can_read_job_message(u.job_id,u.channel) and u.created_at>coalesce(r.last_read_at,'epoch'::timestamptz))>0 unread,
 case when lm.id is null then false when actor.role in ('dispatcher','super_admin') then lm.sender_role not in ('dispatcher','super_admin') else lm.sender_role in ('dispatcher','super_admin') end needs_reply,
 actor.role in ('dispatcher','super_admin') operational
 from accessible a cross join actor left join public.job_conversation_reads r on r.job_id=a.id and r.profile_id=auth.uid()
 left join lateral(select m.id,m.created_at,m.sender_role from public.job_messages m where m.job_id=a.id and public.can_read_job_message(m.job_id,m.channel) order by m.created_at desc,m.id desc limit 1) lm on true
)
select jsonb_build_object('unread_threads',count(*) filter(where unread),'needs_reply_threads',count(*) filter(where needs_reply),'overdue_reply_threads',count(*) filter(where needs_reply and created_at<now()-case when operational then interval '4 hours' else interval '24 hours' end)) from summary
$$;
revoke all on function public.conversation_workload_counts() from public;grant execute on function public.conversation_workload_counts() to authenticated;
