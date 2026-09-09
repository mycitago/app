-- Ejecutar después de FIX_SOLICITAR_RESENA.sql

select e.extname,n.nspname as schema_name
from pg_extension e
join pg_namespace n on n.oid=e.extnamespace
where e.extname='pgcrypto';

select
  to_regprocedure('extensions.gen_random_bytes(integer)') is not null as gen_random_bytes_ok,
  to_regprocedure('extensions.digest(text,text)') is not null as digest_ok,
  to_regprocedure('public.create_review_request(uuid)') is not null as create_request_ok,
  to_regprocedure('public.get_review_request_public(text)') is not null as public_check_ok,
  to_regprocedure('public.submit_internal_review(text,integer,text,text)') is not null as submit_review_ok;

-- Debe conservar ambos tipos de reseña cuando existan:
select source,count(*)
from public.reviews
group by source
order by source;
