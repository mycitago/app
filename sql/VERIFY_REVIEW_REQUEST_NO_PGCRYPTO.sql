-- ============================================================
-- VERIFICACION
-- Ejecutar DESPUES del fix
-- ============================================================

select pg_get_functiondef(
  'public.create_review_request(uuid)'::regprocedure
);

select
  position(
    'gen_random_bytes'
    in pg_get_functiondef(
      'public.create_review_request(uuid)'::regprocedure
    )
  ) = 0 as no_usa_gen_random_bytes,
  position(
    'gen_random_uuid'
    in pg_get_functiondef(
      'public.create_review_request(uuid)'::regprocedure
    )
  ) > 0 as usa_gen_random_uuid;

select
  to_regprocedure('public.create_review_request(uuid)') is not null as create_ok,
  to_regprocedure('public.get_review_request_public(text)') is not null as validate_ok,
  to_regprocedure('public.submit_internal_review(text,integer,text,text)') is not null as submit_ok;

select source,count(*)
from public.reviews
group by source
order by source;
