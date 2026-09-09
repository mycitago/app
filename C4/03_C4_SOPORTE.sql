begin;
create or replace function public.platform_read_support_v2() returns setof jsonb language sql security definer set search_path=public,pg_temp as $$
 select to_jsonb(t)||jsonb_build_object('last_platform_reply_at',x.last_platform_reply_at,'waiting_since',coalesce(x.last_platform_reply_at,t.updated_at,t.created_at),'unanswered_hours',greatest(0,floor(extract(epoch from (now()-coalesce(x.last_platform_reply_at,t.updated_at,t.created_at)))/3600))::int)
 from public.support_tickets t left join lateral(select max(m.created_at) last_platform_reply_at from public.support_messages m where m.ticket_id=t.id and m.sender_type='platform')x on true
 where auth.uid() is not null and public.is_platform_admin()
 order by case coalesce(t.priority,'normal') when 'urgent' then 1 when 'high' then 2 when 'normal' then 3 when 'low' then 4 else 5 end,coalesce(x.last_platform_reply_at,t.updated_at,t.created_at) asc;
$$;
create or replace function public.platform_update_support_ticket(p_ticket_id uuid,p_priority text default null,p_assigned_to uuid default null,p_clear_assignee boolean default false,p_status text default null) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare before_row public.support_tickets; after_row public.support_tickets;
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_priority is not null and p_priority not in ('low','normal','high','urgent') then raise exception 'invalid_priority'; end if;
 if p_status is not null and p_status not in ('new','in_review','waiting_customer','resolved','closed') then raise exception 'invalid_status'; end if;
 select * into before_row from public.support_tickets where id=p_ticket_id for update; if before_row.id is null then raise exception 'ticket_not_found'; end if;
 update public.support_tickets set priority=coalesce(p_priority,priority),assigned_to=case when p_clear_assignee then null when p_assigned_to is not null then p_assigned_to else assigned_to end,status=coalesce(p_status,status),resolved_at=case when p_status in ('resolved','closed') then coalesce(resolved_at,now()) when p_status is not null then null else resolved_at end,updated_at=now() where id=p_ticket_id returning * into after_row;
 insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata) values(auth.uid(),after_row.business_id,'support.ticket_updated','support_ticket',after_row.id,jsonb_build_object('before',jsonb_build_object('priority',before_row.priority,'assigned_to',before_row.assigned_to,'status',before_row.status),'after',jsonb_build_object('priority',after_row.priority,'assigned_to',after_row.assigned_to,'status',after_row.status)));
 return to_jsonb(after_row);
end $$;
revoke all on function public.platform_read_support_v2() from public;
revoke all on function public.platform_update_support_ticket(uuid,text,uuid,boolean,text) from public;
grant execute on function public.platform_read_support_v2() to authenticated;
grant execute on function public.platform_update_support_ticket(uuid,text,uuid,boolean,text) to authenticated;
commit;
