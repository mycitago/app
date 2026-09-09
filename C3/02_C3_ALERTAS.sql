begin;
create or replace function public.platform_collect_operational_alerts() returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare v_threshold int; v_hours int; r record; q text; a int:=0; b int:=0; c int:=0;
begin
 if coalesce(auth.role(),'') <> 'service_role' and (auth.uid() is null or not public.is_platform_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 select payment_failure_threshold,ticket_stale_hours into v_threshold,v_hours from public.platform_notification_settings where id=true;
 if to_regclass('public.platform_payments') is not null and exists(select 1 from information_schema.columns where table_schema='public' and table_name='platform_payments' and column_name='business_id') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='platform_payments' and column_name='status') and exists(select 1 from information_schema.columns where table_schema='public' and table_name='platform_payments' and column_name='created_at') then
  q:='select business_id,count(*)::int n,max(created_at) latest from public.platform_payments where lower(coalesce(status,'''')::text) in (''failed'',''declined'',''past_due'') and created_at>=now()-interval ''7 days'' group by business_id having count(*) >= $1';
  for r in execute q using v_threshold loop
   insert into public.platform_operational_alerts(alert_key,category,severity,business_id,title,message,metadata) values('payment_failed_repeated:'||r.business_id,'payment_failed_repeated','critical',r.business_id,'Pagos fallidos repetidos',format('El negocio acumula %s pagos fallidos en 7 días.',r.n),jsonb_build_object('failed_count',r.n,'latest',r.latest)) on conflict(alert_key) do update set status='open',last_seen_at=now(),resolved_at=null,message=excluded.message,metadata=excluded.metadata; a:=a+1;
  end loop;
 end if;
 if to_regclass('public.support_tickets') is not null then
  for r in select t.id,t.business_id,coalesce(t.subject,'Ticket sin asunto') subject,coalesce(t.updated_at,t.created_at) waiting_since from public.support_tickets t where coalesce(t.status,'new') not in ('resolved','closed') and coalesce(t.updated_at,t.created_at)<=now()-make_interval(hours=>v_hours) loop
   insert into public.platform_operational_alerts(alert_key,category,severity,business_id,title,message,metadata) values('ticket_unanswered:'||r.id,'ticket_unanswered','high',r.business_id,'Ticket sin respuesta',format('%s lleva más de %s horas pendiente.',r.subject,v_hours),jsonb_build_object('ticket_id',r.id,'waiting_since',r.waiting_since)) on conflict(alert_key) do update set status='open',last_seen_at=now(),resolved_at=null,message=excluded.message,metadata=excluded.metadata; b:=b+1;
  end loop;
 end if;
 for r in select table_name from (values('integrations'),('business_integrations')) x(table_name) where to_regclass('public.'||table_name) is not null and exists(select 1 from information_schema.columns c1 where c1.table_schema='public' and c1.table_name=x.table_name and c1.column_name='business_id') and exists(select 1 from information_schema.columns c2 where c2.table_schema='public' and c2.table_name=x.table_name and c2.column_name='status') loop
  q:=format('select business_id,status::text from public.%I where lower(coalesce(status::text,'''')) in (''error'',''failed'',''disconnected'')',r.table_name);
  for r in execute q loop
   insert into public.platform_operational_alerts(alert_key,category,severity,business_id,title,message,metadata) values('integration_error:'||r.business_id||':'||md5(r.status),'integration_error','high',r.business_id,'Integración con error',format('Una integración reporta estado %s.',r.status),jsonb_build_object('status',r.status)) on conflict(alert_key) do update set status='open',last_seen_at=now(),resolved_at=null,message=excluded.message,metadata=excluded.metadata; c:=c+1;
  end loop;
 end loop;
 return jsonb_build_object('payment_failed_repeated',a,'ticket_unanswered',b,'integration_error',c);
end $$;
create or replace function public.platform_queue_daily_alert_digest(p_day date default current_date) returns jsonb language plpgsql security definer set search_path=public,pg_temp as $$
declare recipient text; n int; body text; k text;
begin
 if coalesce(auth.role(),'') <> 'service_role' and (auth.uid() is null or not public.is_platform_admin()) then raise exception 'forbidden' using errcode='42501'; end if;
 select nullif(btrim(alert_email),'') into recipient from public.platform_notification_settings where id=true;
 select count(*),string_agg('• ['||upper(severity)||'] '||title||' — '||message,E'\n' order by last_seen_at desc) into n,body from public.platform_operational_alerts where status='open' and severity in ('high','critical');
 if coalesce(n,0)=0 then return jsonb_build_object('queued',false,'reason','no_high_alerts'); end if;
 if recipient is null then return jsonb_build_object('queued',false,'reason','alert_email_not_configured','alerts',n); end if;
 k:='daily_alert_digest:'||p_day;
 insert into public.platform_notification_outbox(kind,channel,recipient,subject,body,payload,dedupe_key) values('daily_alert_digest','email',recipient,format('MyCitaGo · %s alertas operativas',n),format('Resumen operativo de %s\n\n%s',p_day,coalesce(body,'')),jsonb_build_object('day',p_day,'alert_count',n),k) on conflict(dedupe_key) do nothing;
 return jsonb_build_object('queued',true,'alerts',n,'dedupe_key',k);
end $$;
revoke all on function public.platform_collect_operational_alerts() from public;
revoke all on function public.platform_queue_daily_alert_digest(date) from public;
grant execute on function public.platform_collect_operational_alerts() to authenticated,service_role;
grant execute on function public.platform_queue_daily_alert_digest(date) to authenticated,service_role;
commit;
