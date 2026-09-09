
-- MyCitaGo R1-R5 · verificación estructural
-- Ejecutar después de R1_R5_VERIFIED_REVIEWS.sql

select
  exists(select 1 from information_schema.columns where table_schema='public' and table_name='reviews' and column_name='verified') as verified_column_ok,
  to_regprocedure('public.create_review_request(uuid)') is not null as create_request_ok,
  to_regprocedure('public.get_review_request_public(text)') is not null as eligibility_ok,
  to_regprocedure('public.submit_internal_review(text,integer,text,text)') is not null as submit_ok,
  to_regprocedure('public.public_business_reviews_verified(uuid,integer)') is not null as public_projection_ok;

select indexname,indexdef
from pg_indexes
where schemaname='public'
  and tablename='reviews'
  and indexname='reviews_internal_appointment_unique';

-- Debe devolver 0: reseñas internas publicadas marcadas verified sin appointment.
select count(*) as suspicious_verified_without_appointment
from public.reviews
where source='internal' and verified=true and appointment_id is null;

-- Pruebas manuales de abuso recomendadas:
-- 1) create_review_request(cita NO completada) -> appointment_not_completed
-- 2) submit_internal_review(token válido,0,...) -> invalid_rating
-- 3) submit_internal_review(token válido,6,...) -> invalid_rating
-- 4) enviar dos veces mismo token -> request_already_used
-- 5) crear segundo token después de reseñar -> review_already_submitted
-- 6) cambiar cita completada a cancelada antes de enviar -> appointment_not_completed
-- 7) INSERT directo anon a reviews -> permiso denegado
