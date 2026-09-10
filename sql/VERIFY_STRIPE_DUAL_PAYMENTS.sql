-- Run after STRIPE_DUAL_PAYMENTS_SANDBOX.sql
select
  to_regclass('public.business_payment_accounts') is not null as business_payment_accounts_ok,
  to_regclass('public.business_payment_settings') is not null as business_payment_settings_ok,
  to_regclass('public.platform_billing_accounts') is not null as platform_billing_accounts_ok,
  to_regclass('public.customer_payments') is not null as customer_payments_ok,
  to_regclass('public.payment_events') is not null as payment_events_ok,
  to_regprocedure('public.get_public_payment_options(uuid)') is not null as public_payment_rpc_ok;

select table_name,column_name
from information_schema.columns
where table_schema='public'
  and (
    (table_name='business_payment_accounts' and column_name in ('business_id','stripe_account_id','onboarding_status','charges_enabled','livemode'))
    or (table_name='business_payment_settings' and column_name in ('business_id','online_payments_enabled','collection_mode','deposit_value','prefer_card','prefer_oxxo','prefer_spei'))
    or (table_name='platform_billing_accounts' and column_name in ('business_id','stripe_customer_id','stripe_subscription_id','plan_id','status'))
    or (table_name='customer_payments' and column_name in ('business_id','appointment_id','provider_session_id','amount','status'))
    or (table_name='payment_events' and column_name in ('provider_event_id','event_type','processed'))
  )
order by table_name,column_name;

-- Safety check after initial installation:
-- expected zero rows unless you have deliberately enabled a business.
select business_id,online_payments_enabled,collection_mode
from public.business_payment_settings
where online_payments_enabled=true;
