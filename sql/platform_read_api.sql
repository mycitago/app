-- MyCitaGo Platform Read API
-- Migración aditiva: no modifica SUPABASE_V6_MASTER.sql ni sustituye sus contratos.
-- La autorización real vive dentro de cada RPC. platform-api.js no es una frontera de seguridad.

create or replace function public.is_platform_admin(p_user_id uuid)
returns boolean
language sql
stable
security definer
set search_path=public,pg_temp
as $$
  select p_user_id is not null
     and exists (
       select 1
       from public.platform_admins pa
       where pa.id = p_user_id
     );
$$;
revoke all on function public.is_platform_admin(uuid) from public;

create or replace function public.platform_read_support()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc)
    from (
      select id,business_id,subject,category,priority,status,created_at
      from public.support_tickets
      order by created_at desc
      limit 30
    ) q
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.platform_read_support() from public;
grant execute on function public.platform_read_support() to authenticated;

create or replace function public.platform_read_service_templates()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.sort_order asc, q.name asc)
    from (
      select id,business_category_id,name,active,sort_order
      from public.service_templates
      order by sort_order asc,name asc
    ) q
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.platform_read_service_templates() from public;
grant execute on function public.platform_read_service_templates() to authenticated;

create or replace function public.platform_read_business_categories()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.sort_order asc, q.name asc)
    from (
      select id,name,sort_order
      from public.business_categories
      where active=true
      order by sort_order asc,name asc
    ) q
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.platform_read_business_categories() from public;
grant execute on function public.platform_read_business_categories() to authenticated;

create or replace function public.platform_read_business_invites()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc)
    from (
      select *
      from public.business_invites
      order by created_at desc
      limit 30
    ) q
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.platform_read_business_invites() from public;
grant execute on function public.platform_read_business_invites() to authenticated;

create or replace function public.platform_read_category_change_requests()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc)
    from (
      select *
      from public.business_category_change_requests
      order by created_at desc
      limit 30
    ) q
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.platform_read_category_change_requests() from public;
grant execute on function public.platform_read_category_change_requests() to authenticated;

create or replace function public.platform_read_audit_logs()
returns jsonb
language plpgsql
stable
security definer
set search_path=public,pg_temp
as $$
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode='42501';
  end if;

  return coalesce((
    select jsonb_agg(to_jsonb(q) order by q.created_at desc)
    from (
      select id,actor_user_id,business_id,action,entity,entity_id,metadata,created_at
      from public.audit_logs
      order by created_at desc
      limit 30
    ) q
  ), '[]'::jsonb);
end;
$$;
revoke all on function public.platform_read_audit_logs() from public;
grant execute on function public.platform_read_audit_logs() to authenticated;
