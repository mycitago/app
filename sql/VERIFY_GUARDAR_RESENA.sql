-- ============================================================
-- VERIFICACIÓN
-- ============================================================

select column_name,data_type
from information_schema.columns
where table_schema='public'
  and table_name='reviews'
  and column_name in (
    'appointment_id','customer_id','reviewer_name','verified','verified_at'
  )
order by column_name;

select
  to_regprocedure(
    'public.submit_internal_review(text,integer,text,text)'
  ) is not null as submit_rpc_ok;

select pg_get_functiondef(
  'public.submit_internal_review(text,integer,text,text)'::regprocedure
);
