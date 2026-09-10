-- =============================================================
-- MyCitaGo · Stripe dual payments (SANDBOX)
-- P1/P2 compatibility schema — safe/idempotent.
--
-- MONEY FLOWS ARE SEPARATE:
--   A) MyCitaGo subscription: business -> MyCitaGo
--   B) Booking payment: end customer -> connected business
--
-- This file does NOT store Stripe secret keys.
-- =============================================================

begin;

create extension if not exists "pgcrypto";

-- A connected Stripe account belongs to exactly one MyCitaGo business.
create table if not exists public.business_payment_accounts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  provider text not null default 'stripe' check (provider in ('stripe')),
  stripe_account_id text unique,
  onboarding_status text not null default 'not_started'
    check (onboarding_status in ('not_started','incomplete','complete','restricted')),
  charges_enabled boolean not null default false,
  details_submitted boolean not null default false,
  livemode boolean not null default false,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Tenant preference. This is NOT proof that Stripe enabled the method.
create table if not exists public.business_payment_settings (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  online_payments_enabled boolean not null default false,
  collection_mode text not null default 'none'
    check (collection_mode in ('none','fixed','percentage','full')),
  deposit_value numeric(12,2) not null default 0 check (deposit_value >= 0),
  prefer_card boolean not null default true,
  prefer_oxxo boolean not null default false,
  prefer_spei boolean not null default false,
  currency text not null default 'mxn' check (currency='mxn'),
  updated_at timestamptz not null default now()
);

-- Local mapping for the subscription that the business pays to MyCitaGo.
create table if not exists public.platform_billing_accounts (
  business_id uuid primary key references public.businesses(id) on delete cascade,
  stripe_customer_id text unique,
  stripe_subscription_id text unique,
  plan_id text,
  status text not null default 'not_started',
  current_period_end timestamptz,
  livemode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- One appointment can have multiple attempts; exactly one successful payment
-- is enforced by a partial unique index below.
create table if not exists public.customer_payments (
  id uuid primary key default gen_random_uuid(),
  business_id uuid not null references public.businesses(id) on delete cascade,
  appointment_id uuid not null references public.appointments(id) on delete cascade,
  provider text not null default 'stripe',
  provider_session_id text unique,
  provider_payment_intent_id text,
  connected_account_id text,
  amount numeric(12,2) not null check (amount > 0),
  currency text not null default 'mxn',
  collection_mode text not null,
  status text not null default 'pending'
    check (status in ('pending','paid','failed','expired','refunded')),
  payment_method text,
  paid_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create unique index if not exists uq_customer_payments_one_paid_appointment
  on public.customer_payments(appointment_id)
  where status='paid';

create index if not exists idx_customer_payments_business_created
  on public.customer_payments(business_id,created_at desc);

-- Webhook idempotency / audit envelope. Payload remains server-only.
create table if not exists public.payment_events (
  id uuid primary key default gen_random_uuid(),
  provider text not null default 'stripe',
  provider_event_id text not null unique,
  account_id text,
  event_type text not null,
  payload jsonb not null default '{}'::jsonb,
  processed boolean not null default false,
  error_message text,
  received_at timestamptz not null default now(),
  processed_at timestamptz
);

alter table public.business_payment_accounts enable row level security;
alter table public.business_payment_settings enable row level security;
alter table public.platform_billing_accounts enable row level security;
alter table public.customer_payments enable row level security;
alter table public.payment_events enable row level security;

-- Connected account: tenant members may read readiness; only owner/manager
-- can make tenant-side writes. Edge Functions use service role.
drop policy if exists business_payment_accounts_member_read on public.business_payment_accounts;
create policy business_payment_accounts_member_read
on public.business_payment_accounts for select to authenticated
using (
  public.is_member_of(business_id)
  or public.is_platform_admin()
);

drop policy if exists business_payment_settings_member_read on public.business_payment_settings;
create policy business_payment_settings_member_read
on public.business_payment_settings for select to authenticated
using (
  public.is_member_of(business_id)
  or public.is_platform_admin()
);

drop policy if exists business_payment_settings_owner_write on public.business_payment_settings;
create policy business_payment_settings_owner_write
on public.business_payment_settings for all to authenticated
using (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
)
with check (
  public.my_role(business_id) in ('OWNER','MANAGER')
  or public.is_platform_admin()
);

drop policy if exists platform_billing_accounts_member_read on public.platform_billing_accounts;
create policy platform_billing_accounts_member_read
on public.platform_billing_accounts for select to authenticated
using (
  public.is_member_of(business_id)
  or public.is_platform_admin()
);

drop policy if exists customer_payments_member_read on public.customer_payments;
create policy customer_payments_member_read
on public.customer_payments for select to authenticated
using (
  public.is_member_of(business_id)
  or public.is_platform_admin()
);

-- No browser policy is intentionally created for payment_events.

grant select on public.business_payment_accounts to authenticated;
grant select,insert,update on public.business_payment_settings to authenticated;
grant select on public.platform_billing_accounts to authenticated;
grant select on public.customer_payments to authenticated;

-- Safe public surface: no Stripe account IDs, no secrets, no payment history.
create or replace function public.get_public_payment_options(p_business_id uuid)
returns jsonb
language plpgsql
security definer
set search_path=public,pg_temp
as $$
declare
  s public.business_payment_settings;
  a public.business_payment_accounts;
begin
  select * into s
  from public.business_payment_settings
  where business_id=p_business_id;

  select * into a
  from public.business_payment_accounts
  where business_id=p_business_id;

  if s.business_id is null then
    return jsonb_build_object(
      'enabled',false,
      'ready',false,
      'collection_mode','none'
    );
  end if;

  return jsonb_build_object(
    'enabled',s.online_payments_enabled,
    'ready',coalesce(a.charges_enabled,false),
    'collection_mode',s.collection_mode,
    'deposit_value',s.deposit_value,
    'currency',s.currency,
    'preferences',jsonb_build_object(
      'card',s.prefer_card,
      'oxxo',s.prefer_oxxo,
      'spei',s.prefer_spei
    )
  );
end $$;

revoke all on function public.get_public_payment_options(uuid) from public;
grant execute on function public.get_public_payment_options(uuid) to anon,authenticated;

-- Seed settings only; payment acceptance stays OFF by default.
insert into public.business_payment_settings(business_id)
select b.id from public.businesses b
on conflict (business_id) do nothing;

commit;

notify pgrst, 'reload schema';

-- Verification. All *_ok columns should be true.
select
  to_regclass('public.business_payment_accounts') is not null as payment_accounts_ok,
  to_regclass('public.business_payment_settings') is not null as payment_settings_ok,
  to_regclass('public.platform_billing_accounts') is not null as platform_billing_ok,
  to_regclass('public.customer_payments') is not null as customer_payments_ok,
  to_regclass('public.payment_events') is not null as payment_events_ok,
  to_regprocedure('public.get_public_payment_options(uuid)') is not null as public_options_rpc_ok;
