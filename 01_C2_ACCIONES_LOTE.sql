begin;
create or replace function public.platform_bulk_suspend(p_business_ids uuid[])
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_processed int:=0; v_failed int:=0; v_results jsonb:='[]'::jsonb;
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_business_ids is null or cardinality(p_business_ids)=0 then return jsonb_build_object('processed',0,'failed',0,'results','[]'::jsonb); end if;
 for v_id in select distinct x from unnest(p_business_ids) x where x is not null loop
  begin
   if not exists(select 1 from public.businesses where id=v_id) then raise exception 'business_not_found'; end if;
   update public.subscriptions set status='canceled',updated_at=now() where business_id=v_id;
   if not found then raise exception 'subscription_not_found'; end if;
   insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
   values(auth.uid(),v_id,'business_suspended','business',v_id,jsonb_build_object('source','super_admin_bulk'));
   v_processed:=v_processed+1;
   v_results:=v_results||jsonb_build_array(jsonb_build_object('business_id',v_id,'ok',true,'action','suspended'));
  exception when others then
   v_failed:=v_failed+1;
   v_results:=v_results||jsonb_build_array(jsonb_build_object('business_id',v_id,'ok',false,'error',sqlerrm));
  end;
 end loop;
 return jsonb_build_object('processed',v_processed,'failed',v_failed,'results',v_results);
end $$;

create or replace function public.platform_bulk_reactivate(p_business_ids uuid[],p_days integer default 30)
returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_id uuid; v_days int:=greatest(1,least(coalesce(p_days,30),365)); v_end date:=current_date+greatest(1,least(coalesce(p_days,30),365)); v_processed int:=0; v_failed int:=0; v_results jsonb:='[]'::jsonb;
begin
 if auth.uid() is null or not public.is_platform_admin() then raise exception 'forbidden' using errcode='42501'; end if;
 if p_business_ids is null or cardinality(p_business_ids)=0 then return jsonb_build_object('processed',0,'failed',0,'results','[]'::jsonb); end if;
 for v_id in select distinct x from unnest(p_business_ids) x where x is not null loop
  begin
   if not exists(select 1 from public.businesses where id=v_id) then raise exception 'business_not_found'; end if;
   update public.subscriptions set status='active',current_period_end=v_end,updated_at=now() where business_id=v_id;
   if not found then raise exception 'subscription_not_found'; end if;
   insert into public.audit_logs(actor_user_id,business_id,action,entity,entity_id,metadata)
   values(auth.uid(),v_id,'business_reactivated','business',v_id,jsonb_build_object('source','super_admin_bulk','days',v_days,'period_end',v_end));
   v_processed:=v_processed+1;
   v_results:=v_results||jsonb_build_array(jsonb_build_object('business_id',v_id,'ok',true,'action','reactivated','period_end',v_end));
  exception when others then
   v_failed:=v_failed+1;
   v_results:=v_results||jsonb_build_array(jsonb_build_object('business_id',v_id,'ok',false,'error',sqlerrm));
  end;
 end loop;
 return jsonb_build_object('processed',v_processed,'failed',v_failed,'results',v_results);
end $$;
revoke all on function public.platform_bulk_suspend(uuid[]) from public;
revoke all on function public.platform_bulk_reactivate(uuid[],integer) from public;
grant execute on function public.platform_bulk_suspend(uuid[]) to authenticated;
grant execute on function public.platform_bulk_reactivate(uuid[],integer) to authenticated;
commit;
select to_regprocedure('public.platform_bulk_suspend(uuid[])') bulk_suspend,
       to_regprocedure('public.platform_bulk_reactivate(uuid[],integer)') bulk_reactivate;
