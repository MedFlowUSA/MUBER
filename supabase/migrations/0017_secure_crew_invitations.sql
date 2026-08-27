alter table public.crew_invitations drop constraint if exists crew_invitations_provider_company_id_email_status_key;
alter table public.crew_invitations drop constraint if exists crew_invitations_status_check;
alter table public.crew_invitations add constraint crew_invitations_status_check check(status in ('pending','accepted','expired','revoked','superseded'));
alter table public.crew_invitations add column token_hash bytea,add column revoked_at timestamptz,add column superseded_by uuid references public.crew_invitations,add column delivery_status text not null default 'pending_handoff' check(delivery_status in ('pending_handoff','link_copied'));
create unique index one_pending_crew_invitation_per_email on public.crew_invitations(provider_company_id,lower(email)) where status='pending';
revoke all on function public.create_crew_invitation(uuid,text,public.app_role) from authenticated;

create or replace function public.create_secure_crew_invitation(p_crew uuid,p_email text,p_role public.app_role,p_token_hash text,p_request_id uuid)
returns uuid language plpgsql security definer set search_path=public as $$
declare v_company uuid;v_id uuid;v_actor_role public.app_role;v_email text:=lower(trim(coalesce(p_email,'')));
begin
 select c.provider_company_id into v_company from public.crews c join public.provider_companies pc on pc.id=c.provider_company_id where c.id=p_crew and c.active and pc.status='approved';
 select om.role into v_actor_role from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id where pc.id=v_company and om.profile_id=auth.uid();
 if v_actor_role not in ('provider_owner','provider_manager') then raise exception 'provider owner or manager required';end if;
 if p_role not in ('crew_lead','crew_member') or v_email !~* '^[^@[:space:]]+@[^@[:space:]]+\.[^@[:space:]]+$' or p_token_hash !~ '^[0-9a-f]{64}$' then raise exception 'invalid invitation';end if;
 if exists(select 1 from public.provider_companies pc join public.organization_members om on om.organization_id=pc.organization_id join auth.users u on u.id=om.profile_id where pc.id=v_company and lower(u.email)=v_email) then raise exception 'user is already a provider member';end if;
 update public.crew_invitations set status='superseded' where provider_company_id=v_company and lower(email)=v_email and status='pending';
 insert into public.crew_invitations(provider_company_id,crew_id,email,intended_role,invited_by,token_hash) values(v_company,p_crew,v_email,p_role,auth.uid(),decode(p_token_hash,'hex')) returning id into v_id;
 update public.crew_invitations set superseded_by=v_id where provider_company_id=v_company and lower(email)=v_email and status='superseded' and superseded_by is null;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'crew_invitation.created','crew_invitation',v_id,jsonb_build_object('role',p_role,'crew_id',p_crew,'delivery','pending_handoff'),p_request_id);
 return v_id;
end $$;
revoke all on function public.create_secure_crew_invitation(uuid,text,public.app_role,text,uuid) from public;grant execute on function public.create_secure_crew_invitation(uuid,text,public.app_role,text,uuid) to authenticated;

create or replace function public.revoke_crew_invitation(p_invitation uuid,p_request_id uuid) returns void language plpgsql security definer set search_path=public as $$
declare v_inv public.crew_invitations%rowtype;
begin
 select * into v_inv from public.crew_invitations where id=p_invitation for update;
 if not found or not public.can_manage_provider(v_inv.provider_company_id) then raise exception 'invitation not found';end if;
 if v_inv.status='revoked' then return;end if;if v_inv.status<>'pending' then raise exception 'invitation is not revocable';end if;
 update public.crew_invitations set status='revoked',revoked_at=now(),token_hash=null where id=p_invitation;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,request_id) values(auth.uid(),'crew_invitation.revoked','crew_invitation',p_invitation,p_request_id);
end $$;
revoke all on function public.revoke_crew_invitation(uuid,uuid) from public;grant execute on function public.revoke_crew_invitation(uuid,uuid) to authenticated;

create or replace function public.preview_crew_invitation(p_invitation uuid,p_token text)
returns table(provider_name text,crew_name text,intended_role public.app_role,status text,expires_at timestamptz) language sql stable security definer set search_path=public as $$
 select pc.legal_name,c.name,i.intended_role,case when i.status='pending' and i.expires_at<=now() then 'expired' else i.status end,i.expires_at
 from public.crew_invitations i join public.provider_companies pc on pc.id=i.provider_company_id left join public.crews c on c.id=i.crew_id
 where i.id=p_invitation and i.token_hash=extensions.digest(p_token,'sha256')
$$;
revoke all on function public.preview_crew_invitation(uuid,text) from public;grant execute on function public.preview_crew_invitation(uuid,text) to anon,authenticated;

create or replace function public.accept_crew_invitation(p_invitation uuid,p_token text,p_request_id uuid) returns uuid language plpgsql security definer set search_path=public as $$
declare v_inv public.crew_invitations%rowtype;v_user auth.users%rowtype;v_org uuid;v_current public.app_role;
begin
 if auth.uid() is null then raise exception 'authentication required';end if;
 select * into v_inv from public.crew_invitations where id=p_invitation for update;
 if not found or v_inv.token_hash is null or v_inv.token_hash<>extensions.digest(p_token,'sha256') then raise exception 'invitation not found';end if;
 if v_inv.status='accepted' and v_inv.accepted_by=auth.uid() then return v_inv.crew_id;end if;
 if v_inv.status<>'pending' or v_inv.expires_at<=now() then raise exception 'invitation is no longer active';end if;
 select * into v_user from auth.users where id=auth.uid();
 if v_user.email_confirmed_at is null then raise exception 'verified email required';end if;
 if lower(v_user.email)<>lower(v_inv.email) then raise exception 'signed-in email does not match invitation';end if;
 if v_inv.intended_role not in ('crew_lead','crew_member') then raise exception 'invalid crew role';end if;
 select pc.organization_id into v_org from public.provider_companies pc join public.crews c on c.provider_company_id=pc.id where pc.id=v_inv.provider_company_id and pc.status='approved' and c.id=v_inv.crew_id and c.active;
 if v_org is null then raise exception 'provider or crew is unavailable';end if;
 select role into v_current from public.profiles where id=auth.uid() for update;
 if v_current not in ('customer','crew_lead','crew_member') then raise exception 'existing role cannot accept crew invitation';end if;
 if exists(select 1 from public.organization_members om join public.organizations o on o.id=om.organization_id where om.profile_id=auth.uid() and o.kind='provider' and om.organization_id<>v_org) then raise exception 'user already belongs to another provider';end if;
 insert into public.organization_members(organization_id,profile_id,role) values(v_org,auth.uid(),v_inv.intended_role) on conflict(organization_id,profile_id) do update set role=excluded.role;
 insert into public.crew_members(crew_id,profile_id) values(v_inv.crew_id,auth.uid()) on conflict do nothing;
 update public.profiles set role=v_inv.intended_role where id=auth.uid();
 update public.crew_invitations set status='accepted',accepted_by=auth.uid(),accepted_at=now(),token_hash=null where id=p_invitation;
 insert into public.audit_events(actor_id,action,entity_type,entity_id,metadata,request_id) values(auth.uid(),'crew_invitation.accepted','crew_invitation',p_invitation,jsonb_build_object('provider_company_id',v_inv.provider_company_id,'crew_id',v_inv.crew_id,'role',v_inv.intended_role,'membership_created',true),p_request_id);
 return v_inv.crew_id;
end $$;
revoke all on function public.accept_crew_invitation(uuid,text,uuid) from public;grant execute on function public.accept_crew_invitation(uuid,text,uuid) to authenticated;
