alter table public.platform_subscription_payments
  add column if not exists period_start date,
  add column if not exists period_end date;

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
  if auth.uid() is null or not exists (select 1 from public.platform_admins where id = auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;
  if p_approve is null then raise exception 'La decisión de revisión es obligatoria'; end if;
  if not p_approve and nullif(btrim(coalesce(p_note, '')), '') is null then
    raise exception 'El motivo del rechazo es obligatorio';
  end if;

  select * into v from public.subscription_payment_proofs where id = p_proof_id for update;
  if not found then raise exception 'proof_not_found'; end if;
  if v.status <> 'pending' then raise exception 'already_reviewed'; end if;

  select * into v_plan from public.saas_plans where id = v.plan_id and active = true;
  if not found or v_plan.price_monthly <> v.amount then raise exception 'plan_price_mismatch'; end if;

  if p_approve then
    if exists (
      select 1 from public.subscription_payment_proofs
      where id <> v.id and status = 'approved'
        and lower(payment_reference) = lower(v.payment_reference)
    ) then raise exception 'duplicate_reference'; end if;

    select * into v_subscription from public.subscriptions where business_id = v.business_id for update;
    if found then
      v_subscription_id := v_subscription.id;
      v_start := case
        when v_subscription.status = 'active'
          and v_subscription.current_period_end is not null
          and v_subscription.current_period_end >= current_date
        then v_subscription.current_period_end + 1
        else current_date
      end;
    else
      v_start := current_date;
    end if;
    v_end := v_start + 29;

    if v_subscription_id is null then
      insert into public.subscriptions (
        business_id, plan, plan_id, status, price_monthly, current_period_end,
        payment_provider, billing_cycle, price_paid, period_start, period_end
      ) values (
        v.business_id, v_plan.name, v_plan.id, 'active', v_plan.price_monthly, v_end,
        'mercado_pago_link', 'monthly', v.amount, v_start, v_end
      ) returning id into v_subscription_id;
    else
      update public.subscriptions
      set plan = v_plan.name, plan_id = v_plan.id, status = 'active',
          price_monthly = v_plan.price_monthly, current_period_end = v_end,
          period_start = v_start, period_end = v_end,
          payment_provider = 'mercado_pago_link', billing_cycle = 'monthly',
          price_paid = v.amount, updated_at = now()
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
      reviewed_by = auth.uid(), reviewed_at = now(),
      review_note = left(nullif(btrim(coalesce(p_note, '')), ''), 1000)
  where id = v.id;
  return true;
end
$function$;

create or replace function public.mark_subscription_paid(p_business_id uuid)
returns void
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v_current_end date;
  v_new_end date;
begin
  if not public.is_platform_admin() then raise exception 'No autorizado'; end if;

  select current_period_end into v_current_end
  from public.subscriptions where business_id = p_business_id for update;

  if not found then
    v_new_end := current_date + 30;
    insert into public.subscriptions (business_id, status, current_period_end)
    values (p_business_id, 'active', v_new_end);
  else
    v_new_end := greatest(coalesce(v_current_end, current_date), current_date) + 30;
    update public.subscriptions
    set status = 'active', current_period_end = v_new_end, updated_at = now()
    where business_id = p_business_id;
  end if;
end;
$function$;
