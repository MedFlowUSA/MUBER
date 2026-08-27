create or replace function public.get_job_messages_page(p_job uuid,p_page int default 1,p_page_size int default 50)
returns table(id uuid,channel text,body text,sender_id uuid,sender_name text,sender_role text,created_at timestamptz,total_count bigint)
language plpgsql stable security definer set search_path=public as $$
begin
  if not(public.owns_job(p_job) or public.provider_has_assigned_job(p_job) or public.crew_has_assigned_job(p_job) or public.has_any_role(array['dispatcher','super_admin']::public.app_role[])) then raise exception 'conversation not found';end if;
  return query with visible as(
    select m.id,m.channel,m.body,m.sender_id,coalesce(pr.full_name,'MUBER user') sender_name,m.sender_role::text sender_role,m.created_at,count(*) over() total_count
    from public.job_messages m join public.profiles pr on pr.id=m.sender_id where m.job_id=p_job and public.can_read_job_message(m.job_id,m.channel)
  ),paged as(select * from visible order by created_at desc,id desc limit least(greatest(coalesce(p_page_size,50),1),100) offset (least(greatest(coalesce(p_page,1),1),10000)-1)*least(greatest(coalesce(p_page_size,50),1),100))
  select * from paged order by created_at,id;
end $$;
revoke all on function public.get_job_messages_page(uuid,int,int) from public;grant execute on function public.get_job_messages_page(uuid,int,int) to authenticated;

create or replace function public.get_job_message_attachments_page(p_job uuid,p_page int default 1,p_page_size int default 50)
returns table(id uuid,message_id uuid,mime_type text,byte_size bigint,created_at timestamptz)
language sql stable security definer set search_path=public as $$
with visible as(select m.id from public.job_messages m where m.job_id=p_job and public.can_read_job_message(m.job_id,m.channel) order by m.created_at desc,m.id desc limit least(greatest(coalesce(p_page_size,50),1),100) offset (least(greatest(coalesce(p_page,1),1),10000)-1)*least(greatest(coalesce(p_page_size,50),1),100))
select a.id,a.message_id,a.mime_type,a.byte_size,a.created_at from public.job_message_attachments a join visible v on v.id=a.message_id order by a.created_at,a.id
$$;
revoke all on function public.get_job_message_attachments_page(uuid,int,int) from public;grant execute on function public.get_job_message_attachments_page(uuid,int,int) to authenticated;
