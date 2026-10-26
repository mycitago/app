alter table public.platform_subscription_payments
  add column if not exists period_start date,
  add column if not exists period_end date;

-- Una sola regla de fechas para pagos aprobados y extensiones administrativas.
-- La vigencia se conserva únicamente si la suscripción está activa y no ha vencido.
create or replace function public.next_billing_period(
  p_current_end date,
  p_status text,
  p_today date default current_date
) returns table (period_start date, period_end date)
language sql
immutable
set search_path to 'public', 'pg_temp'
as $function$
  with b as (
    select (
      p_status = 'active'
      and p_current_end is not null
      and p_current_end >= p_today
    ) as vigente
  )
  select
    case when vigente then p_current_end + 1 else p_today end,
    case when vigente then p_current_end else p_today end + 30
  from b;
$function$;

revoke execute on function public.next_billing_period(date, text, date) from public, anon;

create or replace function public.review_subscription_proof(
  p_proof_id uuid, p_approve boolean, p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v public.subscription_payment_proofs%rowtype;
  v_plan public.saas_plans%rowtype;
  v_subscription public.subscriptions%rowtype;
  v_subscription_id uuid;
  v_start date;
  v_end date;
begin
  if auth.uid() is null or not exists (
    select 1 from public.platform_admins where id = auth.uid()
  ) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_approve is null then raise exception 'La decisión de revisión es obligatoria'; end if;
  if not p_approve and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'El motivo del rechazo es obligatorio';
  end if;

  select * into v
  from public.subscription_payment_proofs
  where id = p_proof_id
  for update;
  if not found then raise exception 'proof_not_found'; end if;
  if v.status <> 'pending' then raise exception 'already_reviewed'; end if;

  select * into v_plan
  from public.saas_plans
  where id = v.plan_id and active = true;
  if not found or v_plan.price_monthly <> v.amount then
    raise exception 'plan_price_mismatch';
  end if;

  if p_approve then
    if nullif(btrim(coalesce(v.payment_reference, '')), '') is null then
      raise exception 'payment_reference_required';
    end if;
    if exists (
      select 1 from public.subscription_payment_proofs
      where id <> v.id and status = 'approved'
        and lower(payment_reference) = lower(v.payment_reference)
    ) then
      raise exception 'duplicate_reference';
    end if;

    select * into v_subscription
    from public.subscriptions
    where business_id = v.business_id
    for update;

    if found then
      v_subscription_id := v_subscription.id;
      select period_start, period_end into v_start, v_end
      from public.next_billing_period(
        v_subscription.current_period_end,
        v_subscription.status,
        current_date
      );
    else
      select period_start, period_end into v_start, v_end
      from public.next_billing_period(null, null, current_date);
    end if;

    if v_subscription_id is null then
      insert into public.subscriptions (
        business_id, plan, plan_id, status, price_monthly, current_period_end,
        payment_provider, billing_cycle, price_paid, period_start, period_end
      ) values (
        v.business_id, v_plan.name, v_plan.id, 'active', v_plan.price_monthly,
        v_end, 'mercado_pago_link', 'monthly', v.amount, v_start, v_end
      ) returning id into v_subscription_id;
    else
      update public.subscriptions
      set plan = v_plan.name,
          plan_id = v_plan.id,
          status = 'active',
          price_monthly = v_plan.price_monthly,
          current_period_end = v_end,
          period_start = v_start,
          period_end = v_end,
          payment_provider = 'mercado_pago_link',
          billing_cycle = 'monthly',
          price_paid = v.amount,
          updated_at = now()
      where id = v_subscription_id;
    end if;

    insert into public.platform_subscription_payments (
      business_id, subscription_id, amount, currency, status, payment_method,
      provider, provider_payment_id, description, paid_at, period_start, period_end
    ) values (
      v.business_id, v_subscription_id, v.amount, 'MXN', 'paid', 'payment_link',
      'mercado_pago', v.payment_reference, 'Comprobante aprobado: ' || v.id::text,
      now(), v_start, v_end
    );
  end if;

  update public.subscription_payment_proofs
  set status = case when p_approve then 'approved' else 'rejected' end,
      reviewed_by = auth.uid(),
      reviewed_at = now(),
      review_note = left(nullif(btrim(coalesce(p_note, '')), ''), 1000)
  where id = v.id;
  return true;
end
$function$;

-- Extensión manual separada del registro de un pago. Exige motivo auditable.
create or replace function public.mark_subscription_paid(
  p_business_id uuid,
  p_reason text default null
)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_subscription public.subscriptions%rowtype;
  v_subscription_id uuid;
  v_start date;
  v_end date;
begin
  if not public.is_platform_admin() then raise exception 'No autorizado'; end if;
  if nullif(btrim(coalesce(p_reason, '')), '') is null then
    raise exception 'El motivo de la extensión es obligatorio';
  end if;

  select * into v_subscription
  from public.subscriptions
  where business_id = p_business_id
  for update;

  if found then
    v_subscription_id := v_subscription.id;
    select period_start, period_end into v_start, v_end
    from public.next_billing_period(
      v_subscription.current_period_end,
      v_subscription.status,
      current_date
    );

    update public.subscriptions
    set status = 'active',
        period_start = v_start,
        period_end = v_end,
        current_period_end = v_end,
        updated_at = now()
    where id = v_subscription_id;
  else
    select period_start, period_end into v_start, v_end
    from public.next_billing_period(null, null, current_date);

    insert into public.subscriptions (
      business_id, status, current_period_end, period_start, period_end
    ) values (
      p_business_id, 'active', v_end, v_start, v_end
    ) returning id into v_subscription_id;
  end if;

  insert into public.audit_logs (
    actor_user_id, business_id, action, entity, entity_id, metadata
  ) values (
    auth.uid(), p_business_id, 'subscription_period_extended',
    'subscription', v_subscription_id,
    jsonb_build_object(
      'reason', left(btrim(p_reason), 1000),
      'period_start', v_start,
      'period_end', v_end,
      'source', 'super_admin_manual_extension'
    )
  );
end;
$function$;
