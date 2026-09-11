begin;
update public.business_payment_settings
set online_payments_enabled = false, updated_at = now()
where online_payments_enabled = true;
revoke execute on function public.record_appointment_payment(uuid,numeric,text,text) from authenticated;
notify pgrst, 'reload schema';
commit;
