-- Manual subscription payments hardening.
-- The rejection-note constraint is intentionally NOT VALID: legacy rejected rows
-- are not retroactively checked, while new writes must satisfy the constraint.
-- The function still requires a platform admin and locks the proof row, making
-- repeated reviews of the same pending proof fail atomically.

create or replace function public.review_subscription_proof(
  p_proof_id uuid,
  p_approve boolean,
  p_note text default null
)
returns boolean
language plpgsql
security definer
set search_path to 'public', 'pg_temp'
as $function$
declare
  v public.subscription_payment_proofs%rowtype;
  v_plan public.saas_plans%rowtype;
  v_subscription_id uuid;
begin
  if auth.uid() is null
     or not exists (select 1 from public.platform_admins where id = auth.uid()) then
    raise exception 'not_authorized' using errcode = '42501';
  end if;

  if p_approve is null then
    raise exception 'La decisión de revisión es obligatoria';
  end if;

  if not p_approve
     and nullif(btrim(coalesce(p_note, '')), '') is null then
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
    if exists (
      select 1
      from public.subscription_payment_proofs
      where id <> v.id
        and status = 'approved'
        and lower(payment_reference) = lower(v.payment_reference)
    ) then
      raise exception 'duplicate_reference';
    end if;

    select id into v_subscription_id
    from public.subscriptions
    where business_id = v.business_id
    for update;

    if v_subscription_id is null then
      insert into public.subscriptions (
        business_id, plan, plan_id, status, price_monthly,
        current_period_end, payment_provider, billing_cycle,
        price_paid, period_start, period_end
      )
      values (
        v.business_id, v_plan.name, v_plan.id, 'active',
        v_plan.price_monthly, (current_date + interval '1 month')::date,
        'mercado_pago_link', 'monthly', v.amount,
        current_date, (current_date + interval '1 month')::date
      )
      returning id into v_subscription_id;
    else
      update public.subscriptions
      set plan = v_plan.name,
          plan_id = v_plan.id,
          status = 'active',
          price_monthly = v_plan.price_monthly,
          current_period_end = (greatest(current_date, current_period_end) + interval '1 month')::date,
          period_start = current_date,
          period_end = (greatest(current_date, current_period_end) + interval '1 month')::date,
          payment_provider = 'mercado_pago_link',
          billing_cycle = 'monthly',
          price_paid = v.amount,
          updated_at = now()
      where id = v_subscription_id;
    end if;

    insert into public.platform_subscription_payments (
      business_id, subscription_id, amount, currency, status,
      payment_method, provider, provider_payment_id, description, paid_at
    )
    values (
      v.business_id, v_subscription_id, v.amount, 'MXN', 'paid',
      'payment_link', 'mercado_pago', v.payment_reference,
      'Comprobante aprobado: ' || v.id::text, now()
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

do $constraint$
begin
  if not exists (
    select 1 from pg_constraint
    where conrelid = 'public.subscription_payment_proofs'::regclass
      and conname = 'proof_rejection_requires_note'
  ) then
    alter table public.subscription_payment_proofs
      add constraint proof_rejection_requires_note
      check (
        status <> 'rejected'
        or nullif(btrim(coalesce(review_note, '')), '') is not null
      )
      not valid;
  end if;
end
$constraint$;

-- Approved payment references remain globally unique. Pending references only
-- collide within the same business, preventing a fake pending proof from
-- blocking another business's legitimate payment reference.
drop index if exists public.subscription_proofs_reference_unique;
drop index if exists public.proofs_ref_approved_unique;
drop index if exists public.proofs_ref_pending_per_business;

create unique index proofs_ref_approved_unique
  on public.subscription_payment_proofs (lower(payment_reference))
  where status = 'approved';

create unique index proofs_ref_pending_per_business
  on public.subscription_payment_proofs (business_id, lower(payment_reference))
  where status = 'pending';

update storage.buckets
set allowed_mime_types = array['image/jpeg','image/png','image/webp','application/pdf']::text[],
    file_size_limit = 5242880
where id = 'subscription-receipts';
