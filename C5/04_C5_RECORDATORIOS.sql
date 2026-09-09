begin;
create or replace function public.platform_queue_billing_reminders(p_as_of date default current_date) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare days_cfg int[]; queued int:=0; r record; recipient text; end_date date; left_days int; k text;
begin
 if coalesce(auth.role(),'') <> 'service_role' and (auth.uid() is null or not public.is_platform_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 select billing_reminder_days into days_cfg from public.platform_notification_settings where id=true;
 for r in select s.business_id,s.status,s.plan_id,s.current_period_end,s.trial_end,b.name,b.email from public.subscriptions s join public.businesses b on b.id=s.business_id where s.status in ('active','trial') and coalesce(s.current_period_end,s.trial_end) is not null loop
  recipient:=nullif(btrim(coalesce(r.email,'')),''); if recipient is null then continue; end if;
  end_date:=coalesce(r.current_period_end::date,r.trial_end::date); left_days:=end_date-p_as_of; if not(left_days=any(days_cfg)) then continue; end if;
  k:=format('billing_reminder:%s:%s:%s',r.business_id,end_date,left_days);
  insert into public.platform_notification_outbox(kind,channel,business_id,recipient,subject,body,payload,dedupe_key) values('billing_reminder','email',r.business_id,recipient,format('MyCitaGo · tu periodo vence en %s día%s',left_days,case when left_days=1 then '' else 's' end),format('Hola. El periodo de %s vence el %s. Revisa tu suscripción antes de esa fecha para evitar interrupciones.',r.name,end_date),jsonb_build_object('business_id',r.business_id,'plan_id',r.plan_id,'period_end',end_date,'days_remaining',left_days),k) on conflict(dedupe_key) do nothing; if found then queued:=queued+1; end if;
 end loop;
 return jsonb_build_object('queued',queued,'as_of',p_as_of,'days',days_cfg);
end $$;
revoke all on function public.platform_queue_billing_reminders(date) from public;
grant execute on function public.platform_queue_billing_reminders(date) to authenticated,service_role;
commit;
