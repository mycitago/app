create or replace function public.platform_dashboard_snapshot()
returns jsonb
language plpgsql
security definer
set search_path = public
as $$
declare
  result jsonb;
  payments_json jsonb := '[]'::jsonb;
  incidents_json jsonb := '[]'::jsonb;
begin
  if auth.uid() is null or not exists(select 1 from public.platform_admins pa where pa.id=auth.uid()) then raise exception 'forbidden'; end if;

  if to_regclass('public.platform_subscription_payments') is not null then
    execute 'select coalesce(jsonb_agg(jsonb_build_object(''business_id'',p.business_id,''amount'',p.amount,''status'',p.status,''paid_at'',p.paid_at,''created_at'',p.created_at)),''[]''::jsonb) from public.platform_subscription_payments p' into payments_json;
  end if;
  if to_regclass('public.platform_incidents') is not null then
    execute 'select coalesce(jsonb_agg(jsonb_build_object(''id'',i.id,''business_id'',i.business_id,''title'',i.title,''description'',i.description,''severity'',i.severity,''status'',i.status,''created_at'',i.created_at)),''[]''::jsonb) from public.platform_incidents i' into incidents_json;
  end if;

  select jsonb_build_object(
    'businesses', coalesce((select jsonb_agg(jsonb_build_object('id',b.id,'name',b.name,'slug',b.slug,'email',b.email,'phone',b.phone,'whatsapp',b.whatsapp,'business_category_id',b.business_category_id,'created_at',b.created_at) order by b.created_at desc) from public.businesses b),'[]'::jsonb),
    'subs', coalesce((select jsonb_agg(jsonb_build_object('business_id',s.business_id,'status',s.status,'plan_id',s.plan_id,'price_monthly',s.price_monthly,'trial_end',s.trial_end,'current_period_end',s.current_period_end,'updated_at',s.updated_at)) from public.subscriptions s),'[]'::jsonb),
    'plans', coalesce((select jsonb_agg(jsonb_build_object('id',p.id,'name',p.name,'price_monthly',p.price_monthly,'active',p.active,'sort_order',p.sort_order,'features',p.features) order by p.sort_order) from public.saas_plans p),'[]'::jsonb),
    'appointments', coalesce((select jsonb_agg(jsonb_build_object('id',a.id,'business_id',a.business_id,'appointment_date',a.appointment_date,'status',a.status,'created_at',a.created_at)) from public.appointments a),'[]'::jsonb),
    'customers', coalesce((select jsonb_agg(jsonb_build_object('business_id',c.business_id,'id',c.id,'lifetime_value',c.lifetime_value,'segment',c.segment,'last_visit',c.last_visit)) from public.customer_crm c),'[]'::jsonb),
    'integrations', coalesce((select jsonb_agg(jsonb_build_object('business_id',i.business_id,'kind',i.kind,'provider',i.provider,'enabled',i.enabled,'status',i.status,'updated_at',i.updated_at)) from public.business_integrations i),'[]'::jsonb),
    'payments', payments_json,
    'incidents', incidents_json
  ) into result;
  return result;
end;
$$;
revoke all on function public.platform_dashboard_snapshot() from public;
grant execute on function public.platform_dashboard_snapshot() to authenticated;
