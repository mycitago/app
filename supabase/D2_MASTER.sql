-- ============================================================
-- MyCitaGo · D2 MASTER
-- Modelo operativo de cita: pagos + anticipo + reseña solicitada
-- Seguro para ejecutar más de una vez.
-- ============================================================

begin;

alter table public.customer_payments
  add column if not exists provider_preference_id text,
  add column if not exists provider_payment_id text,
  add column if not exists provider_status text,
  add column if not exists external_reference text,
  add column if not exists checkout_url text,
  add column if not exists last_error text;

alter table public.customer_payments
  alter column provider set default 'mercadopago';

create unique index if not exists customer_payments_appointment_provider_unique
  on public.customer_payments (appointment_id, provider);

create index if not exists customer_payments_provider_payment_idx
  on public.customer_payments (provider, provider_payment_id)
  where provider_payment_id is not null;

create index if not exists customer_payments_business_status_idx
  on public.customer_payments (business_id, status, created_at desc);

create or replace function public.get_public_payment_options(
  p_business_id uuid
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  s public.business_payment_settings;
  a public.business_payment_accounts;
  sec public.business_payment_secrets;
  v_ready boolean := false;
begin
  select * into s
  from public.business_payment_settings
  where business_id = p_business_id;

  if s.business_id is null then
    return jsonb_build_object(
      'enabled', false,
      'ready', false,
      'provider', 'mercadopago',
      'collection_mode', 'none'
    );
  end if;

  select * into a
  from public.business_payment_accounts
  where business_id = p_business_id
    and provider = 'mercadopago'
  limit 1;

  select * into sec
  from public.business_payment_secrets
  where business_id = p_business_id
    and provider = 'mercadopago'
  limit 1;

  v_ready :=
    coalesce(a.connection_status = 'connected', false)
    and sec.access_token is not null
    and (sec.token_expires_at is null or sec.token_expires_at > now());

  return jsonb_build_object(
    'enabled', s.online_payments_enabled,
    'ready', v_ready,
    'provider', 'mercadopago',
    'collection_mode', s.collection_mode,
    'deposit_value', s.deposit_value,
    'currency', s.currency,
    'preferences', jsonb_build_object(
      'card', s.prefer_card,
      'oxxo', s.prefer_oxxo,
      'spei', s.prefer_spei
    )
  );
end
$$;

revoke all on function public.get_public_payment_options(uuid) from public;
grant execute on function public.get_public_payment_options(uuid) to anon, authenticated;

create or replace function public.record_appointment_payment(
  p_appointment_id uuid,
  p_amount numeric,
  p_payment_method text,
  p_collection_mode text default 'manual'
)
returns jsonb
language plpgsql
security definer
set search_path = public, pg_temp
as $$
declare
  a public.appointments;
  p public.customer_payments;
  v_method text := lower(trim(coalesce(p_payment_method, '')));
  v_mode text := lower(trim(coalesce(p_collection_mode, 'manual')));
begin
  if auth.uid() is null then raise exception 'forbidden'; end if;

  select * into a
  from public.appointments
  where id = p_appointment_id;

  if a.id is null then raise exception 'appointment_not_found'; end if;

  if not public.is_member_of(a.business_id)
     and not public.is_platform_admin() then
    raise exception 'forbidden';
  end if;

  if lower(coalesce(a.status, '')) in ('cancelada','cancelled') then
    raise exception 'appointment_cancelled';
  end if;

  if p_amount is null or p_amount <= 0 then raise exception 'invalid_amount'; end if;
  if p_amount > a.price_charged then raise exception 'amount_exceeds_appointment_price'; end if;

  if v_method not in ('cash','card','transfer','other') then
    raise exception 'invalid_payment_method';
  end if;

  if v_mode not in ('manual','fixed','percentage','full','partial') then
    v_mode := 'manual';
  end if;

  insert into public.customer_payments(
    business_id, appointment_id, provider, amount, currency,
    collection_mode, status, payment_method, paid_at, updated_at
  )
  values(
    a.business_id, a.id, 'manual', round(p_amount::numeric,2), 'mxn',
    v_mode, 'paid', v_method, now(), now()
  )
  on conflict (appointment_id, provider)
  do update set
    amount = excluded.amount,
    collection_mode = excluded.collection_mode,
    status = 'paid',
    payment_method = excluded.payment_method,
    paid_at = now(),
    updated_at = now(),
    last_error = null
  returning * into p;

  return jsonb_build_object(
    'ok', true,
    'payment_id', p.id,
    'appointment_id', p.appointment_id,
    'amount', p.amount,
    'status', p.status,
    'payment_method', p.payment_method
  );
end
$$;

revoke all on function public.record_appointment_payment(uuid,numeric,text,text) from public;
grant execute on function public.record_appointment_payment(uuid,numeric,text,text) to authenticated;

notify pgrst, 'reload schema';
commit;
