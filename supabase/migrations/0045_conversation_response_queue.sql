create or replace function public.get_message_response_queue(p_page int default 1,p_page_size int default 20,p_view text default 'all')
returns table(job_id uuid,reference text,service text,status text,last_message_at timestamptz,last_preview text,unread_count bigint,needs_reply boolean,waiting_hours int,total_count bigint)
language sql stable security definer set search_path=public as $$
with actor as(select role from public.profiles where id=auth.uid()),accessible as(
 select j.id,j.reference,j.service::text service,j.status::text status,j.created_at from public.jobs j where public.owns_job(j.id) or public.provider_has_assigned_job(j.id) or public.crew_has_assigned_job(j.id) or public.has_any_role(array['dispatcher','super_admin']::public.app_role[])
),summary as(
 select a.*,lm.created_at last_message_at,left(lm.body,120) last_preview,
 (select count(*) from public.job_messages u where u.job_id=a.id and u.sender_id<>auth.uid() and public.can_read_job_message(u.job_id,u.channel) and u.created_at>coalesce(r.last_read_at,'epoch'::timestamptz)) unread_count,
 case when lm.id is null then false when actor.role in ('dispatcher','super_admin') then lm.sender_role not in ('dispatcher','super_admin') else lm.sender_role in ('dispatcher','super_admin') end needs_reply,
 case when lm.created_at is null then 0 else greatest(0,floor(extract(epoch from(now()-lm.created_at))/3600)::int) end waiting_hours
 from accessible a cross join actor left join public.job_conversation_reads r on r.job_id=a.id and r.profile_id=auth.uid()
 left join lateral(select m.id,m.body,m.created_at,m.sender_role from public.job_messages m where m.job_id=a.id and public.can_read_job_message(m.job_id,m.channel) order by m.created_at desc,m.id desc limit 1) lm on true
),filtered as(select * from summary where case when p_view='unread' then unread_count>0 when p_view='needs_reply' then needs_reply else true end)
select id,reference,service,status,last_message_at,last_preview,unread_count,needs_reply,waiting_hours,count(*) over() from filtered order by needs_reply desc,last_message_at desc nulls last,created_at desc,id desc limit least(greatest(coalesce(p_page_size,20),1),50) offset (least(greatest(coalesce(p_page,1),1),10000)-1)*least(greatest(coalesce(p_page_size,20),1),50)
$$;
revoke all on function public.get_message_response_queue(int,int,text) from public;grant execute on function public.get_message_response_queue(int,int,text) to authenticated;
