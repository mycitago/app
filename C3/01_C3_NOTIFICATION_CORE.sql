begin;
create extension if not exists pgcrypto;
create table if not exists public.platform_notification_settings(
 id boolean primary key default true check(id=true), alert_email text,
 billing_reminder_days integer[] not null default array[7,3,1],
 payment_failure_threshold integer not null default 2 check(payment_failure_threshold between 1 and 20),
 ticket_stale_hours integer not null default 24 check(ticket_stale_hours between 1 and 720), updated_at timestamptz not null default now());
insert into public.platform_notification_settings(id) values(true) on conflict(id) do nothing;
create table if not exists public.platform_operational_alerts(
 id uuid primary key default gen_random_uuid(), alert_key text not null unique, category text not null,
 severity text not null check(severity in ('info','warning','high','critical')), business_id uuid references public.businesses(id) on delete cascade,
 title text not null,message text not null,status text not null default 'open' check(status in ('open','resolved')),
 metadata jsonb not null default '{}'::jsonb,first_seen_at timestamptz not null default now(),last_seen_at timestamptz not null default now(),resolved_at timestamptz);
create table if not exists public.platform_notification_outbox(
 id uuid primary key default gen_random_uuid(),kind text not null,channel text not null check(channel in ('email','whatsapp','webhook')),
 business_id uuid references public.businesses(id) on delete cascade,recipient text not null,subject text,body text not null,payload jsonb not null default '{}'::jsonb,
 dedupe_key text not null unique,status text not null default 'pending' check(status in ('pending','processing','sent','failed')),attempts integer not null default 0,
 available_at timestamptz not null default now(),locked_at timestamptz,sent_at timestamptz,last_error text,created_at timestamptz not null default now(),updated_at timestamptz not null default now());
create index if not exists idx_platform_outbox_dispatch on public.platform_notification_outbox(status,available_at,created_at);
alter table public.platform_notification_settings enable row level security;
alter table public.platform_operational_alerts enable row level security;
alter table public.platform_notification_outbox enable row level security;
drop policy if exists platform_notification_settings_admin on public.platform_notification_settings;
create policy platform_notification_settings_admin on public.platform_notification_settings for all to authenticated using(public.is_platform_admin()) with check(public.is_platform_admin());
drop policy if exists platform_operational_alerts_admin on public.platform_operational_alerts;
create policy platform_operational_alerts_admin on public.platform_operational_alerts for select to authenticated using(public.is_platform_admin());
drop policy if exists platform_notification_outbox_admin on public.platform_notification_outbox;
create policy platform_notification_outbox_admin on public.platform_notification_outbox for select to authenticated using(public.is_platform_admin());
create or replace function public.platform_claim_notification_batch(p_limit integer default 20)
returns setof public.platform_notification_outbox language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
 return query with picked as (select id from public.platform_notification_outbox where status in ('pending','failed') and available_at<=now() and attempts<5 order by created_at for update skip locked limit greatest(1,least(coalesce(p_limit,20),100)))
 update public.platform_notification_outbox o set status='processing',locked_at=now(),attempts=o.attempts+1,updated_at=now() from picked where o.id=picked.id returning o.*;
end $$;
create or replace function public.platform_complete_notification(p_id uuid,p_ok boolean,p_error text default null)
returns boolean language plpgsql security definer set search_path=public,pg_temp as $$
begin
 if coalesce(auth.role(),'') <> 'service_role' then raise exception 'forbidden' using errcode='42501'; end if;
 update public.platform_notification_outbox set status=case when p_ok then 'sent' else 'failed' end,sent_at=case when p_ok then now() else null end,last_error=case when p_ok then null else left(coalesce(p_error,'delivery_failed'),2000) end,available_at=case when p_ok then available_at else now()+make_interval(mins=>least(60,5*greatest(attempts,1))) end,locked_at=null,updated_at=now() where id=p_id;
 return found;
end $$;
revoke all on function public.platform_claim_notification_batch(integer) from public;
revoke all on function public.platform_complete_notification(uuid,boolean,text) from public;
grant execute on function public.platform_claim_notification_batch(integer) to service_role;
grant execute on function public.platform_complete_notification(uuid,boolean,text) to service_role;
commit;
