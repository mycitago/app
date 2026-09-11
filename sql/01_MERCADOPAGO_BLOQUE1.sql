-- CITAGO · Mercado Pago · Bloque 1
-- Base de datos para OAuth + estado de conexión
-- Ejecutar en Supabase SQL Editor.

begin;

-- 1) Mantener business_payment_accounts como tabla pública de ESTADO, no de secretos.
alter table if exists public.business_payment_accounts
  add column if not exists provider_user_id text,
  add column if not exists connection_status text,
  add column if not exists scope text,
  add column if not exists connected_at timestamptz,
  add column if not exists token_expires_at timestamptz,
  add column if not exists last_error text;

-- 2) Secretos privados del proveedor. No debe haber políticas de lectura para anon/authenticated.
create table if not exists public.business_payment_secrets (
  business_id uuid not null references public.businesses(id) on delete cascade,
  provider text not null,
  access_token text not null,
  refresh_token text,
  token_expires_at timestamptz,
  provider_user_id text,
  public_key text,
  scope text,
  livemode boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  primary key (business_id, provider)
);

alter table public.business_payment_secrets enable row level security;
revoke all on table public.business_payment_secrets from anon, authenticated;
grant all on table public.business_payment_secrets to service_role;

-- 3) Estados OAuth de un solo uso.
create table if not exists public.payment_oauth_states (
  state_hash text primary key,
  business_id uuid not null references public.businesses(id) on delete cascade,
  user_id uuid not null references auth.users(id) on delete cascade,
  provider text not null,
  expires_at timestamptz not null,
  used_at timestamptz,
  created_at timestamptz not null default now()
);

alter table public.payment_oauth_states enable row level security;
revoke all on table public.payment_oauth_states from anon, authenticated;
grant all on table public.payment_oauth_states to service_role;

create index if not exists payment_oauth_states_business_provider_idx
  on public.payment_oauth_states (business_id, provider, created_at desc);

create index if not exists payment_oauth_states_expires_idx
  on public.payment_oauth_states (expires_at);

-- 4) Índice de proveedor para las cuentas visibles de estado.
create index if not exists business_payment_accounts_provider_idx
  on public.business_payment_accounts (business_id, provider);

commit;

-- Verificación sugerida:
-- select business_id, provider, provider_user_id, connection_status, connected_at
-- from public.business_payment_accounts
-- order by updated_at desc nulls last;
