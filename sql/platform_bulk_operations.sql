-- MyCitaGo Platform · C2 bulk operations
-- Migración aditiva. La seguridad vive en cada RPC, no en el navegador.

create or replace function public.platform_bulk_suspend(p_business_ids uuid[])
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid;
  v_count integer := 0;
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if coalesce(array_length(p_business_ids, 1), 0) = 0 then
    return jsonb_build_object('processed', 0);
  end if;

  foreach v_business_id in array p_business_ids loop
    if not exists(select 1 from public.businesses where id = v_business_id) then
      raise exception 'business_not_found:%', v_business_id;
    end if;

    update public.subscriptions
       set status = 'canceled', updated_at = now()
     where business_id = v_business_id;

    insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
    values(auth.uid(),v_business_id,'business_suspended','business',v_business_id,
           jsonb_build_object('source','super_admin_bulk'));
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('processed', v_count);
end;
$$;
revoke all on function public.platform_bulk_suspend(uuid[]) from public;
grant execute on function public.platform_bulk_suspend(uuid[]) to authenticated;

create or replace function public.platform_bulk_reactivate(p_business_ids uuid[], p_days integer default 30)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  v_business_id uuid;
  v_count integer := 0;
  v_days integer := greatest(1, least(coalesce(p_days, 30), 365));
  v_end date := current_date + greatest(1, least(coalesce(p_days, 30), 365));
begin
  if auth.uid() is null or not public.is_platform_admin(auth.uid()) then
    raise exception 'forbidden' using errcode = '42501';
  end if;

  if coalesce(array_length(p_business_ids, 1), 0) = 0 then
    return jsonb_build_object('processed', 0);
  end if;

  foreach v_business_id in array p_business_ids loop
    if not exists(select 1 from public.businesses where id = v_business_id) then
      raise exception 'business_not_found:%', v_business_id;
    end if;

    update public.subscriptions
       set status = 'active', current_period_end = v_end, updated_at = now()
     where business_id = v_business_id;
    if not found then
      raise exception 'subscription_not_found:%', v_business_id;
    end if;

    insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
    values(auth.uid(),v_business_id,'business_reactivated','business',v_business_id,
           jsonb_build_object('days',v_days,'period_end',v_end,'source','super_admin_bulk'));
    v_count := v_count + 1;
  end loop;

  return jsonb_build_object('processed', v_count);
end;
$$;
revoke all on function public.platform_bulk_reactivate(uuid[],integer) from public;
grant execute on function public.platform_bulk_reactivate(uuid[],integer) to authenticated;
